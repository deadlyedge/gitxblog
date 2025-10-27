import crypto from "node:crypto"

import { NextResponse } from "next/server"

import { env } from "@/config/env"
import { syncRepository } from "@/services/github/sync"

const verifySignature = (payload: string, signature?: string | null) => {
	if (!env.WEBHOOK_SECRET) return true
	if (!signature) return false

	const hmac = crypto.createHmac("sha256", env.WEBHOOK_SECRET)
	const digest = `sha256=${hmac.update(payload).digest("hex")}`

	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export const POST = async (request: Request) => {
	const signature = request.headers.get("x-hub-signature-256")
	const event = request.headers.get("x-github-event")
	const delivery = request.headers.get("x-github-delivery") ?? undefined

	const body = await request.text()

	if (!verifySignature(body, signature)) {
		return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
	}

	if (!event) {
		return NextResponse.json({ ok: false, error: "Missing event header" }, { status: 400 })
	}

	if (!["push", "workflow_run", "workflow_dispatch"].includes(event)) {
		return NextResponse.json({ ok: true, skipped: true })
	}

type GitHubRepositoryPayload = {
	repository?: {
		name?: string
		owner?: {
			login?: string
		}
	}
	ref?: string
}

let payload: GitHubRepositoryPayload
	try {
		payload = JSON.parse(body)
	} catch {
		return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 })
	}

	const repo = payload?.repository
	const ref: string | undefined = payload?.ref
	const branch = ref?.replace("refs/heads/", "")

	if (!repo?.name || !repo?.owner?.login) {
		return NextResponse.json({ ok: false, error: "Missing repository info" }, { status: 400 })
	}

	try {
		const result = await syncRepository({
			owner: repo.owner.login,
			repo: repo.name,
			branch: branch ?? env.GITHUB_DEFAULT_BRANCH,
			trigger: "webhook",
			eventId: delivery,
		})

		return NextResponse.json({ ok: true, result })
	} catch (error) {
		console.error("[github-webhook] sync error", error)
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : "Sync failed",
			},
			{ status: 500 },
		)
	}
}
