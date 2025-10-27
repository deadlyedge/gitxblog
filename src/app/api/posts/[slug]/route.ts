import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { authors, categories, postAttachments, postCategories, postTags, posts, tags } from "@/db/schema"
import { and, eq } from "drizzle-orm"

type RouteContext = {
	params: {
		slug: string
	}
}

export const GET = async (_request: Request, context: RouteContext) => {
	const { slug } = context.params

	const [post] = await db
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

	if (!post || !post.publishedAt) {
		return NextResponse.json({ error: "Post not found" }, { status: 404 })
	}

	const [tagsRows, categoriesRows, attachmentsRows] = await Promise.all([
		db
			.select({
				slug: tags.slug,
				label: tags.label,
			})
			.from(postTags)
			.innerJoin(tags, eq(tags.id, postTags.tagId))
			.where(eq(postTags.postId, post.id)),
		db
			.select({
				slug: categories.slug,
				label: categories.label,
			})
			.from(postCategories)
			.innerJoin(categories, eq(categories.id, postCategories.categoryId))
			.where(eq(postCategories.postId, post.id)),
		db
			.select({
				id: postAttachments.id,
				label: postAttachments.label,
				url: postAttachments.url,
				type: postAttachments.type,
			})
			.from(postAttachments)
			.where(eq(postAttachments.postId, post.id)),
	])

	return NextResponse.json({
		data: {
			id: post.id,
			slug: post.slug,
			title: post.title,
			summary: post.summary,
			content: post.content,
			rawFrontmatter: post.rawFrontmatter,
			ogImageUrl: post.ogImageUrl,
			publishedAt: post.publishedAt,
			createdAt: post.createdAt,
			author: {
				id: post.authorId,
				name: post.authorName,
				slug: post.authorSlug,
				avatarUrl: post.authorAvatarUrl,
			},
			tags: tagsRows,
			categories: categoriesRows,
			attachments: attachmentsRows.map((attachment) => ({
				id: attachment.id,
				label: attachment.label,
				url: attachment.url,
				type: attachment.type,
			})),
		},
	})
}
