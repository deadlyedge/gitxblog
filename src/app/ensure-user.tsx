import { auth } from '@clerk/nextjs/server'

import { ensureUserRecord } from '@/services/userSync'

export const EnsureClerkUser = async () => {
	const { userId } = await auth()
	if (userId) {
		await ensureUserRecord(userId)
	}

	return null
}
