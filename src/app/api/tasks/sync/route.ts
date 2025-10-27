import { NextResponse } from "next/server"

import { env } from "@/config/env"
import { syncRepository } from "@/services/github/sync"

const authorize = (request: Request) => {
	if (!env.SYNC_CRON_TOKEN) return true
	const header = request.headers.get("authorization")
	if (!header) return false
	const [, token] = header.split(" ")
	return token === env.SYNC_CRON_TOKEN
}

export const POST = async (request: Request) => {
	if (!authorize(request)) {
		return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const branch = searchParams.get("branch") ?? env.GITHUB_DEFAULT_BRANCH
	const owner = searchParams.get("owner") ?? env.GITHUB_OWNER
	const repo = searchParams.get("repo") ?? env.GITHUB_REPO

	try {
		const result = await syncRepository({
			owner: owner ?? undefined,
			repo: repo ?? undefined,
			branch: branch ?? undefined,
			trigger: "cron",
		})

		return NextResponse.json({ ok: true, result })
	} catch (error) {
		console.error("[tasks/sync] failed", error)
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : "Sync failed",
			},
			{ status: 500 },
		)
	}
}
