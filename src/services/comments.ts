import { cache } from "react"

import { db } from "@/db/client"
import { comments, users } from "@/db/schema"
import { and, desc, eq } from "drizzle-orm"

export const computeAntiSpamScore = (body: string) => {
	const urlMatches = body.match(/https?:\/\/\S+/g)?.length ?? 0
	const upperCaseRatio = body.replace(/[^A-Z]/g, "").length / Math.max(body.length, 1)
	const repeatedCharacters = /(.)\1{4,}/.test(body) ? 1 : 0

	return Math.min(10, urlMatches * 2 + (upperCaseRatio > 0.5 ? 2 : 0) + repeatedCharacters)
}

export const listApprovedComments = cache(async (postId: string) => {
	return db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			publishedAt: comments.publishedAt,
			userName: users.name,
			userImageUrl: users.imageUrl,
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.where(and(eq(comments.postId, postId), eq(comments.status, "approved")))
		.orderBy(desc(comments.publishedAt ?? comments.createdAt))
})
