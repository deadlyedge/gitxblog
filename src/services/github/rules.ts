import matter from "gray-matter"

import { ensureSlug } from "@/lib/slug"

import type { Frontmatter, GitHubFile, NormalizedPost } from "./types"

const SUMMARY_BLOCK_PATTERN = /#\s*summary\s*(?:\r?\n+)([\s\S]*?)(?=\r?\n\s*#|\r?\n{2,}|$)/i
const TAGS_PATTERN = /#\s*tags\s*:\s*\[([^[\]]*)\]/i

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
	const stripped = content.replace(/[#*_>`~\-[\]!()\n\r]/g, " ").replace(/\s+/g, " ").trim()
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

const extractTitleFromPath = (path: string) => {
	const decoded = decodeURIComponent(path)
	const segments = decoded.split("/")
	const filename = segments.pop() ?? decoded
	return filename.replace(/\.[^.]+$/, "").trim() || "Untitled"
}

const extractSummaryFromContent = (content: string) => {
	const match = content.match(SUMMARY_BLOCK_PATTERN)
	if (!match) return null
	return match[1].trim()
}

const extractTagsFromContent = (content: string) => {
	const match = content.match(TAGS_PATTERN)
	if (!match) return []
	return match[1]
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean)
}

const extractCategoriesFromPath = (repo: string, path: string) => {
	const decoded = decodeURIComponent(path)
	const segments = decoded.split("/")
	const directories = segments.slice(0, -1).filter(Boolean)
	const labels = [repo, ...directories]

	const unique = new Map<string, { slug: string; label: string }>()
	for (const label of labels) {
		const slug = ensureSlug(label, label)
		if (!unique.has(slug)) {
			unique.set(slug, { slug, label })
		}
	}

	return Array.from(unique.values())
}

type BaseExtraction = {
	repo: string
	owner: string
}

const normalizeFrontmatter = (data: Frontmatter, owner: string) => {
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

	const authorSlugSource =
		data.author?.slug ?? data.author?.github ?? data.author?.email ?? data.author?.name ?? owner

	return {
		title: data.title,
		slug: data.slug,
		summary: data.summary ?? data.description,
		tags: coerceArray(data.tags),
		categories: coerceArray(data.categories),
		status: typeof data.status === "string" ? data.status : undefined,
		publishedAt,
		author: {
			slug: ensureSlug(authorSlugSource, owner),
			displayName: data.author?.name ?? authorSlugSource,
			email: data.author?.email,
			avatarUrl: data.author?.avatarUrl,
			githubUsername: data.author?.github ?? owner,
		},
		ogImageUrl: (data as Record<string, unknown>)?.og_image_url as string | undefined ?? data.ogImageUrl,
		attachments,
		raw: serializeForJson({
			...data,
			publishedAt: publishedAt ? publishedAt.toISOString() : data.publishedAt,
			attachments,
		}) as Record<string, unknown>,
	}
}

export const applyExtractionRules = (
	file: GitHubFile,
	context: BaseExtraction,
): NormalizedPost => {
	const { repo, owner } = context
	const parsed = matter(file.content)
	const frontmatter = parsed.data as Frontmatter
	const normalizedFrontmatter = normalizeFrontmatter(frontmatter, owner)

	const title = normalizedFrontmatter.title ?? extractTitleFromPath(file.path)
	const slug = ensureSlug(normalizedFrontmatter.slug ?? title, file.path)

	const summaryFromContent = extractSummaryFromContent(parsed.content)
	const summary = summaryFromContent ?? normalizedFrontmatter.summary
	const finalSummary = summarize(parsed.content, summary)

	const status = normalizedFrontmatter.status === "draft" ? "draft" : "published"

	const tagsFromContent = extractTagsFromContent(parsed.content)
	const tags =
		tagsFromContent.length > 0
			? tagsFromContent
			: normalizedFrontmatter.tags

	const baseCategories = extractCategoriesFromPath(repo, file.path)
	const frontmatterCategories = normalizedFrontmatter.categories.map((category) => ({
		slug: ensureSlug(category, category),
		label: category,
	}))

	const categoriesMap = new Map<string, { slug: string; label: string }>()
	for (const category of [...baseCategories, ...frontmatterCategories]) {
		if (!categoriesMap.has(category.slug)) {
			categoriesMap.set(category.slug, category)
		}
	}
	const categories = Array.from(categoriesMap.values())

	return {
		slug,
		title,
		summary: finalSummary,
		content: parsed.content,
		sourcePath: file.path,
		sourceSha: file.sha,
		status,
		publishedAt: normalizedFrontmatter.publishedAt,
		ogImageUrl: normalizedFrontmatter.ogImageUrl,
		author: {
			slug: normalizedFrontmatter.author.slug,
			displayName: normalizedFrontmatter.author.displayName ?? owner,
			email: normalizedFrontmatter.author.email,
			avatarUrl: normalizedFrontmatter.author.avatarUrl,
			githubUsername: normalizedFrontmatter.author.githubUsername ?? owner,
		},
		tags: tags.map((tag) => ({
			slug: ensureSlug(tag, tag),
			label: tag,
		})),
		categories,
		attachments: normalizedFrontmatter.attachments,
		rawFrontmatter: normalizedFrontmatter.raw,
	}
}
