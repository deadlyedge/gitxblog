import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { db } from "@/db/client"
import { users } from "@/db/schema"
import { getContentSourceSettings } from "@/services/settings"

import { SetupForm } from "./setup-form"

const hasAdminUser = async () => {
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.role, "admin"))
		.limit(1)

	return existing.length > 0
}

export default async function SetupPage() {
	const { userId } = auth()
	if (!userId) {
		redirect("/sign-in?redirect_url=/setup")
	}

	const [adminExists, repoSettings] = await Promise.all([hasAdminUser(), getContentSourceSettings()])

	if (adminExists && repoSettings?.owner && repoSettings?.repo) {
		redirect("/")
	}

	return (
		<div className='mx-auto max-w-xl space-y-6 py-12'>
			<div>
				<h1 className='text-2xl font-semibold'>GitxBlog 首次設定</h1>
				<p className='mt-2 text-sm text-muted-foreground'>
					指定將同步的 GitHub 儲存庫，並將目前登入的帳號標記為站點管理員。
				</p>
			</div>
			<SetupForm defaultValues={repoSettings} />
		</div>
	)
}
