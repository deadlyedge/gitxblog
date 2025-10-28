// import 'dotenv/config'

import { eq } from 'drizzle-orm'

import { db } from '../src/db/client'
import {
	authors,
	categories,
	postCategories,
	postTags,
	posts,
	tags,
} from '../src/db/schema'
import { toSlug } from '../src/lib/slug'

const samplePosts = [
	{
		title: '打造 GitHub 驅動的 Next.js 部落格',
		summary:
			'介紹如何透過 Next.js 16、Drizzle ORM 與 PostgreSQL 打造自動同步的技術部落格。',
		content: `# GitxBlog

這是一個示範文章，說明如何使用 GitHub Webhook 同步 Markdown 內容。`,
		tags: ['Next.js', 'Drizzle'],
		categories: ['Engineering'],
		publishedAt: new Date(),
	},
	{
		title: 'PostgreSQL 全文檢索實戰',
		summary: '利用 ts_vector 與 GIN index 建立高速搜尋介面。',
		content: `# PostgreSQL Search

使用  實作全文搜尋。`,
		tags: ['PostgreSQL', 'Search'],
		categories: ['Database'],
		publishedAt: new Date(),
	},
]

async function upsertTag(label: string) {
	const slug = toSlug(label)
	const [row] = await db
		.insert(tags)
		.values({ slug, label })
		.onConflictDoUpdate({ target: tags.slug, set: { label } })
		.returning({ id: tags.id, slug: tags.slug })
	return row
}

async function upsertCategory(label: string) {
	const slug = toSlug(label)
	const [row] = await db
		.insert(categories)
		.values({ slug, label })
		.onConflictDoUpdate({ target: categories.slug, set: { label } })
		.returning({ id: categories.id, slug: categories.slug })
	return row
}

async function main() {
	console.log('Seeding database...')

	const [author] = await db
		.insert(authors)
		.values({
			slug: 'gitx-admin',
			displayName: 'Gitx 管理員',
			email: 'admin@example.com',
		})
		.onConflictDoUpdate({
			target: authors.slug,
			set: { displayName: 'Gitx 管理員' },
		})
		.returning({ id: authors.id })

	const authorId = author?.id
	if (!authorId) {
		throw new Error('Unable to create author record')
	}

	for (const post of samplePosts) {
		const slug = toSlug(post.title)

		const [createdPost] = await db
			.insert(posts)
			.values({
				authorId,
				slug,
				title: post.title,
				summary: post.summary,
				content: post.content,
				status: 'published',
				source: 'manual',
				sourcePath: `seed/${slug}.md`,
				publishedAt: post.publishedAt,
			})
			.onConflictDoUpdate({
				target: posts.slug,
				set: {
					title: post.title,
					summary: post.summary,
					content: post.content,
					publishedAt: post.publishedAt,
				},
			})
			.returning({ id: posts.id })

		const postId = createdPost?.id
		if (!postId) continue

		await db.delete(postTags).where(eq(postTags.postId, postId))
		await db.delete(postCategories).where(eq(postCategories.postId, postId))

		const tagRows = await Promise.all(post.tags.map((tag) => upsertTag(tag)))
		const categoryRows = await Promise.all(
			post.categories.map((category) => upsertCategory(category))
		)

		if (tagRows.length > 0) {
			await db
				.insert(postTags)
				.values(tagRows.map((tag) => ({ postId, tagId: tag.id })))
		}

		if (categoryRows.length > 0) {
			await db
				.insert(postCategories)
				.values(
					categoryRows.map((category) => ({ postId, categoryId: category.id }))
				)
		}
	}

	console.log('Seed completed')
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
