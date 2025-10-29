import { fetchRepositorySnapshot } from "../src/services/github/fetchRepository"
import { parseMarkdownFile } from "../src/services/github/markdown"

const main = async () => {
	const snapshot = await fetchRepositorySnapshot({ owner: "deadlyedge", repo: "myNotes" })
	console.log({ total: snapshot.files.length, commit: snapshot.commitSha })
	for (const file of snapshot.files) {
		const parsed = parseMarkdownFile(file)
		console.log(file.path, JSON.stringify(parsed.rawFrontmatter))
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})