import { auth } from "@clerk/nextjs/server"
import { desc } from "drizzle-orm"
import { redirect } from "next/navigation"

import { db } from "@/db/client"
import { syncLog } from "@/db/schema"
import { formatDate } from "@/lib/date"
import { isUserAdmin } from "@/services/userSync"

import { SyncTriggerButton } from "./sync-button"

const getLastSync = async () => {
	const [record] = await db
		.select({
			id: syncLog.id,
			status: syncLog.status,
			trigger: syncLog.trigger,
			startedAt: syncLog.startedAt,
			completedAt: syncLog.completedAt,
			errorMessage: syncLog.errorMessage,
		})
		.from(syncLog)
		.orderBy(desc(syncLog.startedAt))
		.limit(1)

	return record ?? null
}

export default async function AdminPage() {
	const { userId } = auth()
	if (!userId) {
		redirect("/sign-in?redirect_url=/admin")
	}

	const admin = await isUserAdmin(userId)
	if (!admin) {
		redirect("/")
	}

	const lastSync = await getLastSync()

	return (
		<div className='space-y-8 py-10'>
			<header className='space-y-2'>
				<h1 className='text-3xl font-semibold'>管理控制台</h1>
				<p className='text-sm text-muted-foreground'>
					隨時手動觸發 GitHub → Postgres 同步流程，或查看最近一次同步狀態。
				</p>
			</header>

			<section className='rounded-2xl border bg-card p-6 shadow-sm'>
				<h2 className='text-lg font-semibold'>手動同步</h2>
				<p className='mt-2 text-sm text-muted-foreground'>
					必要時可立即更新內容快取。同步會於背景執行，完成後重新整理頁面即可。
				</p>
				<div className='mt-4'>
					<SyncTriggerButton />
				</div>
			</section>

			<section className='rounded-2xl border bg-card p-6 shadow-sm'>
				<h2 className='text-lg font-semibold'>最近同步紀錄</h2>
				{lastSync ? (
					<dl className='mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2'>
						<div>
							<dt className='text-muted-foreground'>狀態</dt>
							<dd className='font-medium'>{lastSync.status.toUpperCase()}</dd>
						</div>
						<div>
							<dt className='text-muted-foreground'>觸發來源</dt>
							<dd className='font-medium'>{lastSync.trigger}</dd>
						</div>
						<div>
							<dt className='text-muted-foreground'>開始時間</dt>
							<dd className='font-medium'>{formatDate(lastSync.startedAt)}</dd>
						</div>
						<div>
							<dt className='text-muted-foreground'>完成時間</dt>
							<dd className='font-medium'>
								{lastSync.completedAt ? formatDate(lastSync.completedAt) : "執行中"}
							</dd>
						</div>
						{lastSync.errorMessage && (
							<div className='md:col-span-2'>
								<dt className='text-muted-foreground'>錯誤</dt>
								<dd className='font-medium text-destructive'>{lastSync.errorMessage}</dd>
							</div>
						)}
					</dl>
				) : (
					<p className='mt-4 text-sm text-muted-foreground'>尚無同步紀錄。</p>
				)}
			</section>
		</div>
	)
}
