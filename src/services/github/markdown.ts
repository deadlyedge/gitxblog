import { applyExtractionRules } from "./rules"

import type { GitHubFile } from "./types"

export const parseMarkdownFile = (
	file: GitHubFile,
	context: { owner: string; repo: string },
) => applyExtractionRules(file, context)
