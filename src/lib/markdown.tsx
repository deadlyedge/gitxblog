import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import type { PluggableList } from 'unified'

const remarkPlugins: PluggableList = [remarkGfm]

const rehypePlugins: PluggableList = [
	rehypeRaw,
	rehypeSlug,
	[
		rehypeAutolinkHeadings,
		{
			properties: { className: ['anchor-link'] },
		},
	],
	rehypeHighlight,
]

type MarkdownRendererProps = {
	content: string
	className?: string
	components?: Components
}

export const MarkdownRenderer = ({
	content,
	// className,
	components,
}: MarkdownRendererProps) => (
	<ReactMarkdown
		// className={className}
		remarkPlugins={remarkPlugins}
		rehypePlugins={rehypePlugins}
		components={components}>
		{content}
	</ReactMarkdown>
)
