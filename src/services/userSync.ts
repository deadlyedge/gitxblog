import { clerkClient } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { users } from "@/db/schema"

export const ensureUserRecord = async (userId: string) => {
	const existing = await db
		.select({
			id: users.id,
			email: users.email,
			role: users.role,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	if (existing.length > 0) {
		return existing[0]
	}

	const clerkUser = await clerkClient.users.getUser(userId)
	const primaryEmail = clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)

	const [record] = await db
		.insert(users)
		.values({
			id: clerkUser.id,
			email: primaryEmail?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? "",
			name: clerkUser.fullName ?? clerkUser.username ?? primaryEmail?.emailAddress ?? "User",
			imageUrl: clerkUser.imageUrl,
			role: "member",
		})
		.onConflictDoUpdate({
			target: users.id,
			set: {
				email: primaryEmail?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? "",
				name: clerkUser.fullName ?? clerkUser.username ?? primaryEmail?.emailAddress ?? "User",
				imageUrl: clerkUser.imageUrl,
				updatedAt: new Date(),
			},
		})
		.returning({
			id: users.id,
			email: users.email,
			role: users.role,
		})

	return record
}
