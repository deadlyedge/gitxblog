import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import type { Database } from '@/db/client'
import {
	attachmentTypeEnum,
	authors,
	categories,
	postAttachments,
	postCategories,
	postTags,
	posts,
	syncLog,
	tags,
} from '@/db/schema'
import { env } from '@/config/env'

import { fetchRepositorySnapshot } from './fetchRepository'
import { getContentSourceSettings } from '../settings'
import { parseMarkdownFile } from './markdown'
import type { NormalizedPost, SyncResult } from './types'

type SyncOptions = {
	owner?: string
	repo?: string
	branch?: string
	token?: string
	trigger?: 'webhook' | 'cron' | 'manual' | 'setup'
	eventId?: string
}

type TransactionClientFn = Parameters<Database['transaction']>[0]
type TransactionClient = TransactionClientFn extends (tx: infer T) => unknown
	? T
	: Database

const normalizeTimestamp = (value: unknown) => {
	if (value === null || value === undefined) return null
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value
	}
	if (typeof value === 'string' || typeof value === 'number') {
		const parsed = new Date(value)
		return Number.isNaN(parsed.getTime()) ? null : parsed
	}
	return null
}

const upsertAuthors = async (
	tx: TransactionClient,
	postsToSync: NormalizedPost[]
): Promise<Map<string, string>> => {
	const uniqueAuthors = new Map(
		postsToSync.map((post) => [
			post.author.slug,
			{
				slug: post.author.slug,
				displayName: post.author.displayName,
				email: post.author.email,
				avatarUrl: post.author.avatarUrl,
				githubUsername: post.author.githubUsername,
			},
		])
	)

	const values = Array.from(uniqueAuthors.values())
	if (values.length === 0) {
		return new Map<string, string>()
	}

	await tx
		.insert(authors)
		.values(values)
		.onConflictDoUpdate({
			target: authors.slug,
			set: {
				displayName: sql`excluded.display_name`,
				email: sql`excluded.email`,
				avatarUrl: sql`excluded.avatar_url`,
				githubUsername: sql`excluded.github_username`,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			},
		})

	const records = await tx
		.select({ id: authors.id, slug: authors.slug })
		.from(authors)
		.where(
			inArray(
				authors.slug,
				values.map((a) => a.slug)
			)
		)

	return new Map(
		(records as Array<{ id: string; slug: string }>).map((record) => [
			record.slug,
			record.id,
		])
	)
}

const upsertTags = async (
	tx: TransactionClient,
	items: Array<{ slug: string; label: string }>
): Promise<Map<string, string>> => {
	if (items.length === 0) return new Map<string, string>()

	await tx
		.insert(tags)
		.values(items)
		.onConflictDoUpdate({
			target: tags.slug,
			set: {
				label: sql`excluded.label`,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			},
		})

	const rows = await tx
		.select({ id: tags.id, slug: tags.slug })
		.from(tags)
		.where(
			inArray(
				tags.slug,
				items.map((item) => item.slug)
			)
		)

	return new Map(
		(rows as Array<{ id: string; slug: string }>).map((row) => [
			row.slug,
			row.id,
		])
	)
}

const upsertCategories = async (
	tx: TransactionClient,
	items: Array<{ slug: string; label: string }>
): Promise<Map<string, string>> => {
	if (items.length === 0) return new Map<string, string>()

	await tx
		.insert(categories)
		.values(items)
		.onConflictDoUpdate({
			target: categories.slug,
			set: {
				label: sql`excluded.label`,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			},
		})

	const rows = await tx
		.select({ id: categories.id, slug: categories.slug })
		.from(categories)
		.where(
			inArray(
				categories.slug,
				items.map((item) => item.slug)
			)
		)

	return new Map(
		(rows as Array<{ id: string; slug: string }>).map((row) => [
			row.slug,
			row.id,
		])
	)
}

const updateSearchVector = async (tx: TransactionClient, postId: string) => {
	await tx.execute(
		sql`update ${posts} set search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '')) where id = ${postId}`
	)
}

const syncPostRelations = async (
	tx: TransactionClient,
	postId: string,
	tagMap: Map<string, string>,
	categoryMap: Map<string, string>,
	post: NormalizedPost
) => {
	await tx.delete(postTags).where(eq(postTags.postId, postId))
	await tx.delete(postCategories).where(eq(postCategories.postId, postId))
	await tx.delete(postAttachments).where(eq(postAttachments.postId, postId))

	if (post.tags.length > 0) {
		await tx.insert(postTags).values(
			post.tags
				.map((tag) => {
					const tagId = tagMap.get(tag.slug)
					if (!tagId) return null
					return {
						postId,
						tagId,
					}
				})
				.filter(
					(value): value is { postId: string; tagId: string } => value !== null
				)
		)
	}

	if (post.categories.length > 0) {
		await tx.insert(postCategories).values(
			post.categories
				.map((category) => {
					const categoryId = categoryMap.get(category.slug)
					if (!categoryId) return null
					return {
						postId,
						categoryId,
					}
				})
				.filter(
					(value): value is { postId: string; categoryId: string } =>
						value !== null
				)
		)
	}

	if (post.attachments.length > 0) {
		await tx.insert(postAttachments).values(
			post.attachments.map((attachment) => ({
				postId,
				label: attachment.label,
				url: attachment.url,
				type: attachmentTypeEnum.enumValues.includes(attachment.type)
					? attachment.type
					: 'link',
			}))
		)
	}
}

export const syncRepository = async ({
	owner,
	repo,
	branch,
	token,
	trigger = 'manual',
	eventId,
}: SyncOptions = {}): Promise<SyncResult> => {
	let resolvedOwner = owner ?? env.GITHUB_OWNER
	let resolvedRepo = repo ?? env.GITHUB_REPO
	let resolvedBranch = branch ?? env.GITHUB_DEFAULT_BRANCH
	let resolvedToken = token ?? env.GITHUB_TOKEN

	if (!resolvedOwner || !resolvedRepo) {
		const stored = await getContentSourceSettings()
		if (stored) {
			resolvedOwner = resolvedOwner ?? stored.owner
			resolvedRepo = resolvedRepo ?? stored.repo
			resolvedBranch =
				resolvedBranch ?? stored.branch ?? env.GITHUB_DEFAULT_BRANCH
			resolvedToken = resolvedToken ?? stored.token
		}
	}

	if (!resolvedOwner || !resolvedRepo) {
		throw new Error('GitHub repository details are not configured')
	}

	const snapshot = await fetchRepositorySnapshot({
		owner: resolvedOwner,
		repo: resolvedRepo,
		branch: resolvedBranch,
		token: resolvedToken,
	})
	const normalizedPosts = snapshot.files.map(parseMarkdownFile)

	const [logRecord] = await db
		.insert(syncLog)
		.values({
			trigger,
			eventId,
			repoOwner: resolvedOwner,
			repoName: resolvedRepo,
			status: 'pending',
			details: {
				branch: snapshot.branch,
				commitSha: snapshot.commitSha,
				totalFiles: snapshot.files.length,
			},
		})
		.returning({ id: syncLog.id })

	try {
		const result = await db.transaction(async (tx) => {
			const authorMap = await upsertAuthors(tx, normalizedPosts)

			const uniqueTags = new Map<string, { slug: string; label: string }>()
			const uniqueCategories = new Map<
				string,
				{ slug: string; label: string }
			>()

			for (const post of normalizedPosts) {
				post.tags.forEach((tag) => uniqueTags.set(tag.slug, tag))
				post.categories.forEach((category) =>
					uniqueCategories.set(category.slug, category)
				)
			}

			const tagMap = await upsertTags(tx, Array.from(uniqueTags.values()))
			const categoryMap = await upsertCategories(
				tx,
				Array.from(uniqueCategories.values())
			)

			let postsSynced = 0

			for (const post of normalizedPosts) {
				const authorId = authorMap.get(post.author.slug)
				if (!authorId) continue

				const publishedAt = normalizeTimestamp(post.publishedAt)

				console.debug('[syncRepository] upserting post', {
					slug: post.slug,
					sourcePath: post.sourcePath,
					publishedAtOriginal: post.publishedAt,
					publishedAt,
					publishedAtType: typeof post.publishedAt,
				})

				let upserted
				try {
					;[upserted] = await tx
						.insert(posts)
						.values({
							authorId,
							slug: post.slug,
							title: post.title,
							summary: post.summary,
							content: post.content,
							rawFrontmatter: JSON.parse(JSON.stringify(post.rawFrontmatter ?? {})),
							ogImageUrl: post.ogImageUrl,
							status: post.status,
							source: 'github',
							sourcePath: post.sourcePath,
							sourceSha: post.sourceSha,
							publishedAt,
						})
						.onConflictDoUpdate({
							target: posts.slug,
							set: {
								authorId,
								title: post.title,
								summary: post.summary,
								content: post.content,
								rawFrontmatter: JSON.parse(JSON.stringify(post.rawFrontmatter ?? {})),
								ogImageUrl: post.ogImageUrl,
								status: post.status,
								sourcePath: post.sourcePath,
								sourceSha: post.sourceSha,
								publishedAt,
								updatedAt: sql`CURRENT_TIMESTAMP`,
							},
						})
						.returning({ id: posts.id })
				} catch (error) {
					console.error('[syncRepository] Failed to upsert post', {
						slug: post.slug,
						path: post.sourcePath,
						publishedAt: post.publishedAt,
						rawFrontmatter: post.rawFrontmatter,
						error,
					})
					throw error
				}

				if (!upserted) continue

				await syncPostRelations(tx, upserted.id, tagMap, categoryMap, post)
				await updateSearchVector(tx, upserted.id)
				postsSynced += 1
			}

			let postsArchived = 0
			if (normalizedPosts.length > 0) {
				if (slugs.length > 0) {
					console.debug('[syncRepository] archiving posts not in', slugs.map((slug) => ({ slug, type: typeof slug })))
					// execute the update and read rowCount from the result
					try {
						const res = await tx
							.update(posts)
							.set({ status: 'archived' })
							.where(
								and(eq(posts.source, 'github'), notInArray(posts.slug, slugs))
							)
							.execute()
						postsArchived =
							(res as unknown as { rowCount?: number })?.rowCount ?? 0
					} catch (archiveError) {
						console.error('[syncRepository] Failed to archive stale posts', {
							slugs,
							archiveError,
						})
					}
				}
			}

			return {
				postsSynced,
				postsArchived,
				tagsSynced: uniqueTags.size,
				categoriesSynced: uniqueCategories.size,
				errors: [],
			} satisfies SyncResult
		})

		await db
			.update(syncLog)
			.set({
				status: 'success',
				completedAt: new Date(),
				details: {
					branch: snapshot.branch,
					commitSha: snapshot.commitSha,
					postsSynced: result.postsSynced,
					postsArchived: result.postsArchived,
					tagsSynced: result.tagsSynced,
					categoriesSynced: result.categoriesSynced,
				},
			})
			.where(eq(syncLog.id, logRecord.id))

		return result
	} catch (error) {
		console.error('[syncRepository] sync failed', error)
		await db
			.update(syncLog)
			.set({
				status: 'error',
				completedAt: new Date(),
				errorMessage:
					error instanceof Error ? error.message : 'Unknown sync error',
			})
			.where(eq(syncLog.id, logRecord.id))

		throw error
	}
}
