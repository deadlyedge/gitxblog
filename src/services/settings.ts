import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { systemSettings } from '@/db/schema'

const CONTENT_SOURCE_KEY = 'content_source'

export type ContentSourceSettings = {
	owner: string
	repo: string
	branch?: string
	token?: string
}

export const getContentSourceSettings =
	async (): Promise<ContentSourceSettings | null> => {
		const [record] = await db
			.select({ value: systemSettings.value })
			.from(systemSettings)
			.where(eq(systemSettings.key, CONTENT_SOURCE_KEY))

		if (!record) return null

		const value = record.value as Partial<ContentSourceSettings>
		if (!value.owner || !value.repo) {
			return null
		}

		return {
			owner: value.owner,
			repo: value.repo,
			branch: value.branch,
			token: value.token,
		}
	}

export const setContentSourceSettings = async (
	input: ContentSourceSettings
) => {
	await db
		.insert(systemSettings)
		.values({
			key: CONTENT_SOURCE_KEY,
			value: input,
		})
		.onConflictDoUpdate({
			target: systemSettings.key,
			set: {
				value: input,
				updatedAt: new Date(),
			},
		})
}
