import Link from "next/link"

import { SearchForm } from "@/components/search-form"
import { Badge } from "@/components/ui/badge"
import { searchPosts } from "@/services/posts"
import { formatDate } from "@/lib/date"

type SearchPageProps = {
	searchParams: {
		q?: string
		page?: string
	}
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
	const query = searchParams.q?.trim()
	const page = Number(searchParams.page ?? "1")

	const results = query ? await searchPosts({ query, page }) : null

	return (
		<div className='space-y-8 py-10'>
			<div className='space-y-3'>
				<h1 className='text-3xl font-semibold'>搜尋</h1>
				<p className='text-sm text-muted-foreground'>透過 PostgreSQL 全文檢索快速找到 Markdown 內容。</p>
				<SearchForm defaultValue={query ?? ""} />
			</div>

			{query ? (
				<div className='space-y-4'>
					<div className='flex items-center justify-between text-sm text-muted-foreground'>
						<span>
							關鍵字 <Badge variant='secondary'>{query}</Badge>
						</span>
						<span>共 {results?.meta.total ?? 0} 筆結果</span>
					</div>
					<ul className='space-y-4'>
						{results?.data.map((row) => (
							<li key={row.id} className='rounded-lg border p-4 hover:border-foreground'>
								<Link href={`/posts/${row.slug}`} className='space-y-1'>
									<h2 className='text-lg font-semibold hover:underline'>{row.title}</h2>
									<p className='text-xs text-muted-foreground'>
										{formatDate(row.publishedAt)} · Relevance {row.rank.toFixed(2)}
									</p>
									<p className='text-sm text-muted-foreground line-clamp-2'>{row.summary}</p>
								</Link>
							</li>
						))}
					</ul>
					{(results?.data.length ?? 0) === 0 && (
						<p className='text-sm text-muted-foreground'>沒有找到相符的內容。</p>
					)}
				</div>
			) : (
				<p className='text-sm text-muted-foreground'>輸入關鍵字開始搜尋。</p>
			)}
		</div>
	)
}
