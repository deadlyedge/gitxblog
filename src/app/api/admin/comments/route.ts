import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/db/client"
import { comments, posts, users } from "@/db/schema"
import { ensureUserRecord } from "@/services/userSync"
import { eq, sql } from "drizzle-orm"

const updateSchema = z.object({
	commentId: z.string().uuid(),
	status: z.enum(["approved", "rejected", "spam"]),
})

const requireAdmin = async (userId: string) => {
	const [record] = await db
		.select({ role: users.role })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	if (!record) {
		const ensured = await ensureUserRecord(userId)
		return ensured.role === "admin"
	}

	return record.role === "admin"
}

export const GET = async () => {
	const { userId } = auth()
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	if (!(await requireAdmin(userId))) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}

	const pending = await db
		.select({
			id: comments.id,
			postId: comments.postId,
			body: comments.body,
			status: comments.status,
			antiSpamScore: comments.antiSpamScore,
			createdAt: comments.createdAt,
			authorId: users.id,
			authorEmail: users.email,
			postTitle: posts.title,
			postSlug: posts.slug,
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.innerJoin(posts, eq(comments.postId, posts.id))
		.where(eq(comments.status, "pending"))
		.orderBy(sql`${comments.createdAt} DESC`)
		.limit(50)

	return NextResponse.json({ data: pending })
}

export const PATCH = async (request: Request) => {
	const { userId } = auth()
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	if (!(await requireAdmin(userId))) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}

	let payload: unknown
	try {
		payload = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	const parsed = updateSchema.safeParse(payload)
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten().formErrors.join(", ") }, { status: 400 })
	}

	const { commentId, status } = parsed.data

	const [updated] = await db
		.update(comments)
		.set({
			status,
			updatedAt: new Date(),
			publishedAt: status === "approved" ? new Date() : null,
		})
		.where(eq(comments.id, commentId))
		.returning({
			id: comments.id,
			status: comments.status,
			publishedAt: comments.publishedAt,
		})

	if (!updated) {
		return NextResponse.json({ error: "Comment not found" }, { status: 404 })
	}

	return NextResponse.json({ data: updated })
}
