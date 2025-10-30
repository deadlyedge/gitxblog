import { renderToStaticMarkup } from 'react-dom/server'

import { MarkdownRenderer } from '@/lib/markdown'

export const markdownToHtml = async (markdown: string) =>
	renderToStaticMarkup(<MarkdownRenderer content={markdown} />)
