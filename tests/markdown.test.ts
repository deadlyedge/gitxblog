import { parseMarkdownFile } from "@/services/github/markdown"
import { markdownToHtml } from "@/lib/markdown"

describe("markdown parser", () => {
	const markdown = `---\ntitle: Test Post\nsummary: Sample summary\ntags:\n  - Next.js\n  - TypeScript\ncategories:\n  - Engineering\nauthor:\n  name: Jane Doe\n  email: jane@example.com\nstatus: published\npublishedAt: 2024-01-01\nattachments:\n  - label: Repo\n    url: https://github.com/example/repo\n---\n\n# Hello World\n\nThis is **markdown** content.`

	it("normalizes frontmatter into a post", () => {
		const result = parseMarkdownFile({
			content: markdown,
			path: "posts/test-post.md",
			sha: "abc123",
		})

		expect(result.slug).toBe("test-post")
		expect(result.title).toBe("Test Post")
		expect(result.tags.map((tag) => tag.slug)).toEqual(["nextjs", "typescript"])
		expect(result.categories.map((category) => category.slug)).toEqual(["engineering"])
		expect(result.author.displayName).toBe("Jane Doe")
		expect(result.attachments).toHaveLength(1)
	})

	it("transforms markdown to html", async () => {
		const html = await markdownToHtml("# Title\n\n**Bold** text")
		expect(html).toContain('<h1 id="title">')
		expect(html).toContain("<strong>Bold</strong>")
	})
})
