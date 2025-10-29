import pLimit from 'p-limit'

import { env } from '@/config/env'
import { getOctokit } from './client'
import type { GitHubFile } from './types'

type FetchRepositoryOptions = {
	owner?: string
	repo?: string
	branch?: string
	token?: string
	filter?: (path: string) => boolean
}

export type RepositorySnapshot = {
	files: GitHubFile[]
	commitSha: string
	treeSha: string
	branch: string
	owner: string
	repo: string
}

const DEFAULT_FILE_FILTER = (path: string) =>
	path.endsWith('.md') || path.endsWith('.mdx') || path.endsWith('.markdown')

export const fetchRepositorySnapshot = async ({
	owner = env.GITHUB_OWNER,
	repo = env.GITHUB_REPO,
	branch = env.GITHUB_DEFAULT_BRANCH ?? 'main',
	token,
	filter = DEFAULT_FILE_FILTER,
}: FetchRepositoryOptions): Promise<RepositorySnapshot> => {
	if (!owner || !repo) {
		throw new Error('GitHub repository owner and name are required')
	}

	const octokit = getOctokit(token)
	const branchInfo = await octokit.rest.repos.getBranch({
		owner,
		repo,
		branch,
	})

	const commitSha = branchInfo.data.commit.sha
	const treeSha = branchInfo.data.commit.commit.tree.sha
	const tree = await octokit.rest.git.getTree({
		owner,
		repo,
		tree_sha: treeSha,
		recursive: 'true',
	})

	const markdownNodes = tree.data.tree.filter(
		(node) => node.type === 'blob' && filter(node.path ?? '')
	)
	const limit = pLimit(5)

	const files = await Promise.all(
		markdownNodes.map((node) =>
			limit(async () => {
				const path = node.path ?? ''
				const res = await octokit.rest.repos.getContent({
					owner,
					repo,
					path,
					ref: commitSha,
				})

				if (!('content' in res.data) || !res.data.content) {
					return {
						path,
						sha: node.sha ?? '',
						content: '',
					}
				}

				const buffer = Buffer.from(
					res.data.content,
					res.data.encoding as BufferEncoding
				)
				return {
					path,
					sha: node.sha ?? '',
					content: buffer.toString('utf-8'),
				}
			})
		)
	)

	return {
		files,
		commitSha,
		treeSha,
		branch,
		owner,
		repo,
	}
}
