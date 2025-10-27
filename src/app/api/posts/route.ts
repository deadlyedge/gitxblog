import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { authors, categories, postCategories, postTags, posts, tags } from "@/db/schema"
import { and, eq, inArray, sql, type SQL } from "drizzle-orm"

const parseNumber = (value: string | null, fallback: number) => {
	if (!value) return fallback
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const buildWhereClause = (filters: Array<SQL | undefined>) => {
	const activeFilters = filters.filter((filter): filter is SQL => Boolean(filter))
	if (activeFilters.length === 0) {
		return undefined
	}
	if (activeFilters.length === 1) {
		return activeFilters[0]
	}
	return and(...activeFilters)
}

export const GET = async (request: Request) => {
	const { searchParams } = new URL(request.url)
	const page = parseNumber(searchParams.get("page"), 1)
	const perPage = Math.min(parseNumber(searchParams.get("limit"), 10), 50)
	const tagSlug = searchParams.get("tag")
	const categorySlug = searchParams.get("category")

	const offset = (page - 1) * perPage

	const filters = [
		eq(posts.status, "published"),
		tagSlug
			? sql`exists (
        select 1
        from ${postTags} pt
        inner join ${tags} t on t.id = pt.tag_id
        where pt.post_id = ${posts.id} and t.slug = ${tagSlug}
      )`
			: undefined,
		categorySlug
			? sql`exists (
        select 1
        from ${postCategories} pc
        inner join ${categories} c on c.id = pc.category_id
        where pc.post_id = ${posts.id} and c.slug = ${categorySlug}
      )`
			: undefined,
	] as const

	const whereClause = buildWhereClause(filters as unknown as ReturnType<typeof sql<unknown>>[])

	const [responseRows, totalCountResult] = await Promise.all([
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
			.limit(perPage)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(posts)
			.where(whereClause ?? undefined)
			.limit(1),
	])

	const postIds = responseRows.map((row) => row.id)

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

	const total = totalCountResult[0]?.count ?? 0

	return NextResponse.json({
		data: responseRows.map((row) => ({
			id: row.id,
			slug: row.slug,
			title: row.title,
			summary: row.summary,
			publishedAt: row.publishedAt,
			createdAt: row.createdAt,
			author: {
				name: row.authorName,
				slug: row.authorSlug,
			},
			tags: tagsMap[row.id] ?? [],
			categories: categoriesMap[row.id] ?? [],
		})),
		meta: {
			page,
			perPage,
			total,
			totalPages: Math.ceil(total / perPage),
		},
	})
}
