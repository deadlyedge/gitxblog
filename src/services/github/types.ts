import type { Octokit } from "@octokit/rest"

export type GitHubClient = Octokit

export type GitHubFile = {
	path: string
	sha: string
	content: string
}

export type Frontmatter = {
	title?: string
	slug?: string
	summary?: string
	description?: string
	tags?: string[] | string
	categories?: string[] | string
	author?: {
		slug?: string
		name?: string
		email?: string
		avatarUrl?: string
		github?: string
	}
	publishedAt?: string
	status?: "draft" | "published"
	ogImageUrl?: string
	attachments?: Array<{
		label: string
		url: string
		type?: "image" | "file" | "link"
	}>
	[key: string]: unknown
}

export type NormalizedPost = {
	slug: string
	title: string
	summary?: string
	content: string
	sourcePath: string
	sourceSha: string
	status: "draft" | "published" | "archived"
	publishedAt?: Date
	ogImageUrl?: string
	author: {
		slug: string
		displayName: string
		email?: string
		avatarUrl?: string
		githubUsername?: string
	}
	tags: Array<{ slug: string; label: string }>
	categories: Array<{ slug: string; label: string }>
	attachments: Array<{
		label: string
		url: string
		type: "image" | "file" | "link"
	}>
	rawFrontmatter: Record<string, unknown>
}

export type SyncResult = {
	postsSynced: number
	postsArchived: number
	tagsSynced: number
	categoriesSynced: number
	errors: string[]
}
