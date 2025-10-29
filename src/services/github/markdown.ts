import matter from "gray-matter"

import { toSlug } from "@/lib/slug"

import type { Frontmatter, GitHubFile, NormalizedPost } from "./types"

const coerceArray = (value?: string[] | string): string[] => {
	if (!value) return []
	if (Array.isArray(value)) return value
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean)
}

const summarize = (content: string, fallback?: string) => {
	if (fallback) return fallback
	const stripped = content.replace(/[#*_>`~\-\[\]!()\n\r]/g, " ").replace(/\s+/g, " ").trim()
	return stripped.slice(0, 180)
}

const normalizeFrontmatter = (data: Frontmatter) => {
	const tags = coerceArray(data.tags)
	const categories = coerceArray(data.categories)

	return {
		title: data.title ?? data.slug ?? "Untitled Post",
		slug: data.slug,
		summary: data.summary ?? data.description,
		tags,
		categories,
		status: (data.status === "published" ? "published" : "draft") as "published" | "draft",
		publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
		author: {
			slug: data.author?.slug ?? data.author?.github ?? data.author?.email ?? data.author?.name ?? "unknown-author",
			displayName: data.author?.name ?? data.author?.slug ?? "Unknown Author",
			email: data.author?.email,
			avatarUrl: data.author?.avatarUrl,
			githubUsername: data.author?.github,
		},
		ogImageUrl: data.ogImageUrl,
		attachments:
			data.attachments?.map((item) => ({
				label: item.label,
				url: item.url,
				type: item.type ?? "link",
			})) ?? [],
		raw: data,
	}
}

export const parseMarkdownFile = (file: GitHubFile): NormalizedPost => {
	const parsed = matter(file.content)
	const normalized = normalizeFrontmatter(parsed.data as Frontmatter)

	const fallbackTitle = file.path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Untitled"
	const slugSource = normalized.slug ?? fallbackTitle

	const authorSlug = normalized.author.slug ? toSlug(normalized.author.slug) : toSlug(normalized.author.displayName)

	return {
		slug: toSlug(slugSource),
		title: normalized.title ?? fallbackTitle,
		summary: summarize(parsed.content, normalized.summary),
		content: parsed.content,
		sourcePath: file.path,
		sourceSha: file.sha,
		status: normalized.status,
		publishedAt: normalized.publishedAt,
		ogImageUrl: normalized.ogImageUrl,
		author: {
			slug: authorSlug || "unknown-author",
			displayName: normalized.author.displayName,
			email: normalized.author.email,
			avatarUrl: normalized.author.avatarUrl,
			githubUsername: normalized.author.githubUsername,
		},
		tags: normalized.tags.map((tag) => ({
			slug: toSlug(tag),
			label: tag,
		})),
		categories: normalized.categories.map((category) => ({
			slug: toSlug(category),
			label: category,
		})),
		attachments: normalized.attachments,
		rawFrontmatter: normalized.raw,
	}
}
