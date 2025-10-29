import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { syncRepository } from '@/services/github/sync'
import { getContentSourceSettings } from '@/services/settings'
import { isUserAdmin } from '@/services/userSync'

export const POST = async () => {
	const { userId } = await auth()
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	if (!(await isUserAdmin(userId))) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
	}

	const settings = await getContentSourceSettings()

	try {
		const result = await syncRepository({
			owner: settings?.owner,
			repo: settings?.repo,
			branch: settings?.branch,
			trigger: 'manual',
		})
		return NextResponse.json({ data: result })
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Sync failed',
			},
			{ status: 500 }
		)
	}
}
