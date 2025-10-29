import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/date"
import { listPublishedPosts } from "@/services/posts"

type PostsPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

const getParam = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) return value[0] ?? null
	return value ?? null
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
	const params = await searchParams
	const pageParam = getParam(params.page)
	const tagParam = getParam(params.tag)
	const categoryParam = getParam(params.category)

	const page = Number(pageParam ?? "1")
	if (Number.isNaN(page) || page < 1) {
		notFound()
	}

	const { data, meta } = await listPublishedPosts({
		page,
		tag: tagParam,
		category: categoryParam,
	})

	return (
		<div className='space-y-6 py-10'>
			<header className='space-y-2'>
				<h1 className='text-3xl font-semibold'>全部文章</h1>
				<p className='text-sm text-muted-foreground'>
					{tagParam && (
						<>
							標籤 <Badge variant='secondary'>#{tagParam}</Badge>
						</>
					)}
					{categoryParam && (
						<>
							{" "}
							分類 <Badge variant='outline'>{categoryParam}</Badge>
						</>
					)}
				</p>
			</header>

			<div className='space-y-4'>
				{data.map((post) => (
					<Card key={post.id} className='border-l-4 border-l-primary/60'>
						<CardHeader className='space-y-2'>
							<CardDescription className='text-xs text-muted-foreground'>
								{formatDate(post.publishedAt ?? post.createdAt)}
								{post.authorName ? ` · ${post.authorName}` : null}
							</CardDescription>
							<CardTitle className='text-2xl'>
								<Link href={`/posts/${post.slug}`} className='hover:underline'>
									{post.title}
								</Link>
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-3'>
							<p className='text-sm text-muted-foreground'>{post.summary}</p>
							<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
								{post.tags.map((tag) => (
									<Link key={tag.slug} href={`/posts?tag=${tag.slug}`} className='hover:underline'>
										#{tag.label}
									</Link>
								))}
								{post.categories.map((category) => (
									<Link
										key={category.slug}
										href={`/posts?category=${category.slug}`}
										className='hover:underline'
									>
										{category.label}
									</Link>
								))}
							</div>
						</CardContent>
					</Card>
				))}
				{data.length === 0 && (
					<p className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
						目前尚無文章。
					</p>
				)}
			</div>

			<nav className='flex items-center justify-between pt-4'>
				<Button asChild disabled={meta.page <= 1} variant='outline'>
					<Link href={`/posts?page=${meta.page - 1}`}>上一頁</Link>
				</Button>
				<p className='text-sm text-muted-foreground'>
					第 {meta.page} / {Math.max(meta.totalPages, 1)} 頁
				</p>
				<Button asChild disabled={meta.page >= meta.totalPages} variant='outline'>
					<Link href={`/posts?page=${meta.page + 1}`}>下一頁</Link>
				</Button>
			</nav>
		</div>
	)
}
