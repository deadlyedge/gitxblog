import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listPublishedPosts } from "@/services/posts"
import { formatDate } from "@/lib/date"

export default async function Home() {
	const { data: posts } = await listPublishedPosts({ limit: 6 })

	return (
		<div className='space-y-12 py-10'>
			<section className='rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-12 text-white shadow-lg'>
				<div className='space-y-4'>
					<p className='inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/80'>
						GitHub 驅動的現代部落格
					</p>
					<h1 className='text-3xl font-semibold md:text-4xl'>
						自動同步 GitHub Markdown，搭配 Next.js 16、Drizzle ORM 與 PostgreSQL 打造內容管線。
					</h1>
					<p className='max-w-2xl text-sm text-white/80'>
						支援全文搜尋、評論審核、Webhook 快取刷新，並內建 Vercel 部署指引。登入即可留言，管理員可在控制台中手動同步或審核評論。
					</p>
					<div className='flex flex-wrap gap-3'>
						<Button asChild size='lg'>
							<Link href='/posts'>瀏覽全部文章</Link>
						</Button>
						<Button asChild size='lg' variant='secondary'>
							<Link href='/setup'>首次設定</Link>
						</Button>
					</div>
				</div>
			</section>

			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h2 className='text-xl font-semibold'>最新文章</h2>
					<Button asChild size='sm' variant='ghost'>
						<Link href='/posts'>更多文章</Link>
					</Button>
				</div>
				<div className='grid gap-4 md:grid-cols-2'>
					{posts.map((post) => (
						<Card key={post.id} className='group transition hover:shadow-lg'>
							<CardHeader>
								<CardTitle className='line-clamp-2 text-lg'>
									<Link href={`/posts/${post.slug}`} className='hover:underline'>
										{post.title}
									</Link>
								</CardTitle>
								<CardDescription className='flex items-center justify-between text-xs'>
									<span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
									{post.authorName && <span>{post.authorName}</span>}
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-3 text-sm text-muted-foreground'>
								<p className='line-clamp-3'>{post.summary}</p>
								<div className='flex flex-wrap gap-2'>
									{post.tags.map((tag) => (
										<Link
											key={tag.slug}
											href={`/posts?tag=${tag.slug}`}
											className='rounded-full border px-2 py-1 text-xs hover:border-foreground'
										>
											#{tag.label}
										</Link>
									))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</section>
		</div>
	)
}
