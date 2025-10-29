export const toSlug = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s/-]/g, "")
		.replace(/[\s/_]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")

export const ensureSlug = (value: string, fallback: string) => {
	const primary = toSlug(value)
	if (primary.length >= 3) return primary

	const secondary = toSlug(fallback)
	if (secondary.length >= 3) return secondary

	const hash = Buffer.from(fallback, "utf-8").toString("hex").slice(0, 12)
	return `post-${hash}`
}
