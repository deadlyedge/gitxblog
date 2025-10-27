export const formatDate = (input: Date | string | null | undefined, locale = "zh-TW") => {
	if (!input) return ""
	const date = input instanceof Date ? input : new Date(input)
	return date.toLocaleDateString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}
