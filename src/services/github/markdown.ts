import matter from "gray-matter"

import { ensureSlug, toSlug } from "@/lib/slug"

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

const parseDateValue = (input: unknown) => {
	if (input === null || input === undefined) return undefined

	if (input instanceof Date) {
		return Number.isNaN(input.getTime()) ? undefined : input
	}

	if (typeof input === "number" || typeof input === "string") {
		const parsed = new Date(input)
		return Number.isNaN(parsed.getTime()) ? undefined : parsed
	}

	return undefined
}

const serializeForJson = (value: unknown): unknown => {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
	}

	if (Array.isArray(value)) {
		return value
			.map((item) => serializeForJson(item))
			.filter((item) => item !== undefined)
	}

	if (value && typeof value === "object") {
		return Object.entries(value as Record<string, unknown>).reduce(
			(acc, [key, entry]) => {
				const serialized = serializeForJson(entry)
				if (serialized !== undefined) {
					acc[key] = serialized
				}
				return acc
			},
			{} as Record<string, unknown>,
		)
	}

	return value ?? undefined
}

const normalizeFrontmatter = (data: Frontmatter) => {
	const tags = coerceArray(data.tags)
	const categories = coerceArray(data.categories)
	const publishedAt = parseDateValue(data.publishedAt)
	const attachments =
		data.attachments
			?.map((item) => {
				if (!item || typeof item !== "object") return null
				const { label, url, type } = item as {
					label?: string
					url?: string
					type?: "image" | "file" | "link"
				}
				if (!label || !url) return null
				return {
					label,
					url,
					type: type ?? "link",
				}
			})
			.filter((item): item is { label: string; url: string; type: "image" | "file" | "link" } => Boolean(item)) ?? []

	return {
		title: data.title ?? data.slug ?? "Untitled Post",
		slug: data.slug,
		summary: data.summary ?? data.description,
		tags,
		categories,
		status: (data.status === "published" ? "published" : "draft") as "published" | "draft",
		publishedAt,
		author: {
			slug: data.author?.slug ?? data.author?.github ?? data.author?.email ?? data.author?.name ?? "unknown-author",
			displayName: data.author?.name ?? data.author?.slug ?? "Unknown Author",
			email: data.author?.email,
			avatarUrl: data.author?.avatarUrl,
			githubUsername: data.author?.github,
		},
		ogImageUrl: data.ogImageUrl,
		attachments,
		raw: serializeForJson({
			...data,
			publishedAt: publishedAt ? publishedAt.toISOString() : data.publishedAt,
			attachments,
		}) as Record<string, unknown>,
	}
}

export const parseMarkdownFile = (file: GitHubFile): NormalizedPost => {
	const parsed = matter(file.content)
	const normalized = normalizeFrontmatter(parsed.data as Frontmatter)

	const fallbackTitle = file.path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Untitled"
	const slugSource = normalized.slug ?? fallbackTitle
	const slug = ensureSlug(slugSource, file.path)

	const authorSlug = normalized.author.slug ? toSlug(normalized.author.slug) : toSlug(normalized.author.displayName)

	return {
		slug,
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
