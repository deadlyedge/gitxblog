import { cache } from "react"

import { db } from "@/db/client"
import {
	authors,
	categories,
	postAttachments,
	postCategories,
	postTags,
	posts,
	tags,
} from "@/db/schema"
import { and, eq, inArray, sql, type SQL } from "drizzle-orm"

type ListOptions = {
	page?: number
	limit?: number
	tag?: string | null
	category?: string | null
}

type PostListItem = Awaited<ReturnType<typeof listPublishedPosts>>["data"][number]

type SearchOptions = {
	query: string
	page?: number
	limit?: number
}

const buildFilters = (tag?: string | null, category?: string | null) => {
	const filters: SQL[] = [eq(posts.status, "published")]

	if (tag) {
		filters.push(
			sql`exists (
        select 1 from ${postTags} pt
        inner join ${tags} t on t.id = pt.tag_id
        where pt.post_id = ${posts.id} and t.slug = ${tag}
      )`,
		)
	}

	if (category) {
		filters.push(
			sql`exists (
        select 1 from ${postCategories} pc
        inner join ${categories} c on c.id = pc.category_id
        where pc.post_id = ${posts.id} and c.slug = ${category}
      )`,
		)
	}

	switch (filters.length) {
		case 0:
			return undefined
		case 1:
			return filters[0]
		default:
			return and(...filters)
	}
}

export const listPublishedPosts = cache(async (options: ListOptions = {}) => {
	const page = Math.max(1, options.page ?? 1)
	const limit = Math.min(Math.max(1, options.limit ?? 10), 50)
	const offset = (page - 1) * limit
	const whereClause = buildFilters(options.tag, options.category)

	const [rows, totalResult] = await Promise.all([
		db
			.select({
				id: posts.id,
				slug: posts.slug,
				title: posts.title,
				summary: posts.summary,
				publishedAt: posts.publishedAt,
				createdAt: posts.createdAt,
				authorName: authors.displayName,
				authorSlug: authors.slug,
			})
			.from(posts)
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(whereClause ?? undefined)
			.orderBy(sql`COALESCE(${posts.publishedAt}, ${posts.createdAt}) DESC`)
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(posts)
			.where(whereClause ?? undefined)
			.limit(1),
	])

	const postIds = rows.map((row) => row.id)

	const [tagsRows, categoriesRows] = await Promise.all([
		postIds.length > 0
			? db
					.select({
						postId: postTags.postId,
						slug: tags.slug,
						label: tags.label,
					})
					.from(postTags)
					.innerJoin(tags, eq(postTags.tagId, tags.id))
					.where(inArray(postTags.postId, postIds))
			: [],
		postIds.length > 0
			? db
					.select({
						postId: postCategories.postId,
						slug: categories.slug,
						label: categories.label,
					})
					.from(postCategories)
					.innerJoin(categories, eq(postCategories.categoryId, categories.id))
					.where(inArray(postCategories.postId, postIds))
			: [],
	])

	const tagsMap = tagsRows.reduce<Record<string, Array<{ slug: string; label: string }>>>((acc, row) => {
		acc[row.postId] = acc[row.postId] ?? []
		acc[row.postId].push({ slug: row.slug, label: row.label })
		return acc
	}, {})

	const categoriesMap = categoriesRows.reduce<Record<string, Array<{ slug: string; label: string }>>>((acc, row) => {
		acc[row.postId] = acc[row.postId] ?? []
		acc[row.postId].push({ slug: row.slug, label: row.label })
		return acc
	}, {})

	const total = totalResult[0]?.count ?? 0

	return {
		data: rows.map((row) => ({
			...row,
			tags: tagsMap[row.id] ?? [],
			categories: categoriesMap[row.id] ?? [],
		})),
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	}
})

export const getPostBySlug = cache(async (slug: string) => {
	const [row] = await db
		.select({
			id: posts.id,
			slug: posts.slug,
			title: posts.title,
			summary: posts.summary,
			content: posts.content,
			rawFrontmatter: posts.rawFrontmatter,
			ogImageUrl: posts.ogImageUrl,
			publishedAt: posts.publishedAt,
			createdAt: posts.createdAt,
			authorId: authors.id,
			authorName: authors.displayName,
			authorSlug: authors.slug,
			authorAvatarUrl: authors.avatarUrl,
		})
		.from(posts)
		.leftJoin(authors, eq(posts.authorId, authors.id))
		.where(and(eq(posts.slug, slug), eq(posts.status, "published")))
		.limit(1)

	if (!row) return null

	const [tagsRows, categoriesRows, attachmentsRows] = await Promise.all([
		db
			.select({
				slug: tags.slug,
				label: tags.label,
			})
			.from(postTags)
			.innerJoin(tags, eq(tags.id, postTags.tagId))
			.where(eq(postTags.postId, row.id)),
		db
			.select({
				slug: categories.slug,
				label: categories.label,
			})
			.from(postCategories)
			.innerJoin(categories, eq(categories.id, postCategories.categoryId))
			.where(eq(postCategories.postId, row.id)),
		db
			.select({
				id: postAttachments.id,
				label: postAttachments.label,
				url: postAttachments.url,
				type: postAttachments.type,
			})
			.from(postAttachments)
			.where(eq(postAttachments.postId, row.id)),
	])

	return {
		...row,
		tags: tagsRows,
		categories: categoriesRows,
		attachments: attachmentsRows,
	}
})

export const listRelatedPosts = cache(async (slug: string, limit = 3) => {
	const post = await getPostBySlug(slug)
	if (!post) return []

	const tagSlugs = post.tags.map((tag) => tag.slug)

	if (tagSlugs.length === 0) return []

	const relatedIds = await db
		.selectDistinct({ postId: postTags.postId })
		.from(postTags)
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(
			and(
				inArray(tags.slug, tagSlugs),
				sql`${postTags.postId} != ${post.id}`,
			),
		)
		.limit(limit * 3)

	const ids = relatedIds.map((row) => row.postId)
	if (ids.length === 0) return []

	return db
		.select({
			id: posts.id,
			slug: posts.slug,
			title: posts.title,
			summary: posts.summary,
			publishedAt: posts.publishedAt,
		})
		.from(posts)
		.where(and(eq(posts.status, "published"), inArray(posts.id, ids)))
		.orderBy(sql`COALESCE(${posts.publishedAt}, ${posts.createdAt}) DESC`)
		.limit(limit)
})

export const searchPosts = cache(async ({ query, page = 1, limit = 10 }: SearchOptions) => {
	const normalizedPage = Math.max(1, page)
	const normalizedLimit = Math.min(Math.max(1, limit), 50)
	const offset = (normalizedPage - 1) * normalizedLimit
	const tsQuery = sql`websearch_to_tsquery('english', ${query})`

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: posts.id,
				slug: posts.slug,
				title: posts.title,
				summary: posts.summary,
				publishedAt: posts.publishedAt,
				rank: sql<number>`ts_rank(${posts.searchVector}, ${tsQuery}, 32)`,
			})
			.from(posts)
			.where(and(eq(posts.status, "published"), sql`${posts.searchVector} @@ ${tsQuery}`))
			.orderBy(sql`ts_rank(${posts.searchVector}, ${tsQuery}, 32) DESC`)
			.limit(normalizedLimit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(posts)
			.where(and(eq(posts.status, "published"), sql`${posts.searchVector} @@ ${tsQuery}`))
			.limit(1),
	])

	return {
		data: rows,
		meta: {
			page: normalizedPage,
			limit: normalizedLimit,
			total: totalRows[0]?.count ?? 0,
			totalPages: Math.ceil((totalRows[0]?.count ?? 0) / normalizedLimit),
		},
	}
})

export type { PostListItem }
