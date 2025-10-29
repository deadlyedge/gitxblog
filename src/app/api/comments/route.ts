import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { comments, posts } from '@/db/schema'
import { computeAntiSpamScore } from '@/services/comments'
import { ensureUserRecord } from '@/services/userSync'
import { and, eq, sql } from 'drizzle-orm'

const createCommentSchema = z.object({
	postId: z.string().uuid(),
	body: z
		.string()
		.min(10, '評論至少需要 10 個字元')
		.max(4000, '評論長度不可超過 4000 字元'),
})

const RATE_LIMIT_WINDOW_SECONDS = 30

export const POST = async (request: Request) => {
	const { userId } = await auth()
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	let payload: unknown
	try {
		payload = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
	}

	const parsed = createCommentSchema.safeParse(payload)
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.flatten().formErrors.join(', ') },
			{ status: 400 }
		)
	}

	const { postId, body } = parsed.data

	const [post] = await db
		.select({ id: posts.id })
		.from(posts)
		.where(and(eq(posts.id, postId), eq(posts.status, 'published')))
		.limit(1)

	if (!post) {
		return NextResponse.json({ error: 'Post not found' }, { status: 404 })
	}

	const [recent] = await db
		.select({ count: sql<number>`count(*)` })
		.from(comments)
		.where(
			and(
				eq(comments.userId, userId),
				eq(comments.postId, postId),
				sql`${comments.createdAt} > NOW() - INTERVAL '${RATE_LIMIT_WINDOW_SECONDS} seconds'`
			)
		)

	if ((recent?.count ?? 0) > 0) {
		return NextResponse.json(
			{
				error: `請稍候 ${RATE_LIMIT_WINDOW_SECONDS} 秒後再發佈評論。`,
			},
			{ status: 429 }
		)
	}

	await ensureUserRecord(userId)

	const spamScore = computeAntiSpamScore(body)

	const [created] = await db
		.insert(comments)
		.values({
			postId,
			userId,
			body,
			status: 'pending',
			antiSpamScore: spamScore,
			rateLimitKey: `${userId}:${postId}`,
		})
		.returning({
			id: comments.id,
			status: comments.status,
			createdAt: comments.createdAt,
		})

	return NextResponse.json(
		{
			data: created,
			message: '評論已提交，待管理員審核後顯示。',
		},
		{ status: 201 }
	)
}
