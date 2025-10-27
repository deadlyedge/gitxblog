import { Octokit } from "@octokit/rest"

import { env } from "@/config/env"

let cached: Octokit | null = null

export const getOctokit = (token?: string) => {
	if (cached && !token) {
		return cached
	}

	const authToken = token ?? env.GITHUB_TOKEN
	const octokit = new Octokit(
		authToken
			? {
					auth: authToken,
					userAgent: "gitxblog-sync",
				}
			: { userAgent: "gitxblog-sync" },
	)

	if (!token) {
		cached = octokit
	}

	return octokit
}
