export const toSlug = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s/-]/g, "")
		.replace(/[\s/_]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
