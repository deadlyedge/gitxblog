'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db/client'
import { users } from '@/db/schema'
import { syncRepository } from '@/services/github/sync'
import { setContentSourceSettings } from '@/services/settings'

const setupSchema = z.object({
	owner: z.string().min(1, 'Owner is required'),
	repo: z.string().min(1, 'Repository name is required'),
	branch: z.string().min(1, 'Branch is required').default('main'),
	token: z
		.string()
		.optional()
		.transform((value) =>
			value && value.trim().length > 0 ? value.trim() : undefined
		),
})

export const completeSetup = async (formData: FormData) => {
	const { userId } = await auth()
	if (!userId) {
		throw new Error('You must be signed in to complete setup.')
	}

	const parsed = setupSchema.safeParse({
		owner: formData.get('owner'),
		repo: formData.get('repo'),
		branch: formData.get('branch') ?? 'main',
		token: formData.get('token'),
	})

	if (!parsed.success) {
		throw new Error(
			parsed.error.issues.map((issue) => issue.message).join(', ')
		)
	}

	const clerkUser = await currentUser()
	if (!clerkUser) {
		throw new Error('Unable to load Clerk user context.')
	}

	const { owner, repo, branch, token } = parsed.data

	await setContentSourceSettings({
		owner,
		repo,
		branch,
		token,
	})

	const primaryEmail = clerkUser.emailAddresses.find(
		(email) => email.id === clerkUser.primaryEmailAddressId
	)

	await db
		.insert(users)
		.values({
			id: clerkUser.id,
			email:
				primaryEmail?.emailAddress ??
				clerkUser.emailAddresses[0]?.emailAddress ??
				'',
			name:
				clerkUser.fullName ??
				clerkUser.username ??
				primaryEmail?.emailAddress ??
				'Administrator',
			imageUrl: clerkUser.imageUrl,
			role: 'admin',
		})
		.onConflictDoUpdate({
			target: users.id,
			set: {
				email:
					primaryEmail?.emailAddress ??
					clerkUser.emailAddresses[0]?.emailAddress ??
					'',
				name:
					clerkUser.fullName ??
					clerkUser.username ??
					primaryEmail?.emailAddress ??
					'Administrator',
				imageUrl: clerkUser.imageUrl,
				role: 'admin',
				updatedAt: new Date(),
			},
		})

	try {
		await syncRepository({
			owner,
			repo,
			branch,
			token,
			trigger: 'setup',
		})
	} catch (error) {
		console.error('[setup] initial sync failed', error)
		// Proceed even if sync fails to avoid blocking setup
	}

	revalidatePath('/')
	revalidatePath('/posts')

	return { success: true }
}
