import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { syncRepository } from "@/services/github/sync"
import { getContentSourceSettings } from "@/services/settings"
import { ensureUserRecord } from "@/services/userSync"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

const isAdmin = async (userId: string) => {
	const [record] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
	if (!record) {
		const ensured = await ensureUserRecord(userId)
		return ensured.role === "admin"
	}
	return record.role === "admin"
}

export const POST = async () => {
	const { userId } = auth()
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	if (!(await isAdmin(userId))) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}

	const settings = await getContentSourceSettings()

	try {
		const result = await syncRepository({
			owner: settings?.owner,
			repo: settings?.repo,
			branch: settings?.branch,
			trigger: "manual",
		})
		return NextResponse.json({ data: result })
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Sync failed",
			},
			{ status: 500 },
		)
	}
}
