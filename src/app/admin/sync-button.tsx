"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"

type StatusState =
	| { type: "success"; message: string }
	| { type: "error"; message: string }
	| null

export const SyncTriggerButton = () => {
	const [status, setStatus] = useState<StatusState>(null)
	const [isPending, startTransition] = useTransition()

	const handleSync = () => {
		startTransition(async () => {
			setStatus(null)
			try {
				const response = await fetch("/api/admin/sync", {
					method: "POST",
				})

				const payload = await response.json().catch(() => ({}))

				if (!response.ok) {
					throw new Error(payload?.error ?? response.statusText)
				}

				setStatus({
					type: "success",
					message: "同步流程已啟動，稍後刷新即可看到最新內容。",
				})
			} catch (error) {
				setStatus({
					type: "error",
					message: error instanceof Error ? error.message : "同步失敗，請稍後再試。",
				})
			}
		})
	}

	return (
		<div className='space-y-2'>
			<Button onClick={handleSync} disabled={isPending}>
				{isPending ? "同步中..." : "立即同步 GitHub 內容"}
			</Button>
			{status && (
				<p
					className={`text-sm ${status.type === "success" ? "text-green-600" : "text-destructive"}`}
					role='status'>
					{status.message}
				</p>
			)}
		</div>
	)
}
