import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { authors, posts } from "@/db/schema"
import { and, eq, sql } from "drizzle-orm"

const parseNumber = (value: string | null, fallback: number) => {
	if (!value) return fallback
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const GET = async (request: Request) => {
	const { searchParams } = new URL(request.url)
	const q = searchParams.get("q")?.trim()
	const page = parseNumber(searchParams.get("page"), 1)
	const perPage = Math.min(parseNumber(searchParams.get("limit"), 10), 50)

	if (!q) {
		return NextResponse.json({ error: "Missing search query" }, { status: 400 })
	}

	const offset = (page - 1) * perPage
	const tsQuery = sql`websearch_to_tsquery('english', ${q})`

	const whereClause = and(eq(posts.status, "published"), sql`${posts.searchVector} @@ ${tsQuery}`)

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: posts.id,
				slug: posts.slug,
				title: posts.title,
				summary: posts.summary,
				publishedAt: posts.publishedAt,
				rank: sql<number>`ts_rank(${posts.searchVector}, ${tsQuery}, 32)`,
				authorName: authors.displayName,
			})
			.from(posts)
			.leftJoin(authors, eq(posts.authorId, authors.id))
			.where(whereClause)
			.orderBy(sql`ts_rank(${posts.searchVector}, ${tsQuery}, 32) DESC`)
			.limit(perPage)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(posts)
			.where(whereClause)
			.limit(1),
	])

	const total = totalRows[0]?.count ?? 0

	return NextResponse.json({
		data: rows,
		meta: {
			page,
			perPage,
			total,
			totalPages: Math.ceil(total / perPage),
		},
	})
}
