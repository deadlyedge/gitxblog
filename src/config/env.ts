import { z } from "zod"

const baseSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	GITHUB_OWNER: z.string().optional(),
	GITHUB_REPO: z.string().optional(),
	GITHUB_TOKEN: z.string().optional(),
	GITHUB_DEFAULT_BRANCH: z.string().default("main"),
	WEBHOOK_SECRET: z.string().optional(),
	SYNC_CRON_TOKEN: z.string().optional(),
	CLERK_PUBLISHABLE_KEY: z.string().optional(),
	CLERK_SECRET_KEY: z.string().optional(),
})

const parsed = baseSchema.safeParse({
	NODE_ENV: process.env.NODE_ENV,
	DATABASE_URL: process.env.DATABASE_URL,
	GITHUB_OWNER: process.env.GITHUB_OWNER,
	GITHUB_REPO: process.env.GITHUB_REPO,
	GITHUB_TOKEN: process.env.GITHUB_TOKEN,
	GITHUB_DEFAULT_BRANCH: process.env.GITHUB_DEFAULT_BRANCH,
	WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
	SYNC_CRON_TOKEN: process.env.SYNC_CRON_TOKEN,
	CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
	CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
})

if (!parsed.success) {
	const errors = parsed.error.issues
	const combined = errors
		.map((issue) => {
			const path = issue.path.length ? issue.path.join(".") : "(root)"
			return `${path}: ${issue.message}`
		})
		.join("; ")
	throw new Error(`Invalid environment variables: ${combined}`)
}

export const env = parsed.data
