import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommentsSection } from "@/components/comments-section"
import { formatDate } from "@/lib/date"
import { markdownToHtml } from "@/lib/markdown"
import { getPostBySlug, listRelatedPosts } from "@/services/posts"

type PostPageProps = {
	params: Promise<{
		slug: string
	}>
}

export const revalidate = 300

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
	const { slug } = await params
	const post = await getPostBySlug(slug)
	if (!post) {
		return {
			title: "文章不存在 - GitxBlog",
		}
	}

	const description = post.summary ?? (typeof post.content === "string" ? post.content.slice(0, 160) : "")

	return {
		title: `${post.title} | GitxBlog`,
		description,
		openGraph: {
			title: post.title,
			description,
			type: "article",
		},
	}
}

export default async function PostPage({ params }: PostPageProps) {
	const { slug } = await params
	if (!slug) {
		notFound()
	}

	const post = await getPostBySlug(slug)
	if (!post) {
		notFound()
	}

	const html = await markdownToHtml(post.content ?? "")
	const related = await listRelatedPosts(slug)

	return (
		<article className='space-y-10 py-8'>
			<header className='space-y-4 border-b pb-6'>
				<div className='space-y-2'>
					<p className='text-xs uppercase tracking-wider text-muted-foreground'>
						{formatDate(post.publishedAt ?? post.createdAt)}
					</p>
					<h1 className='text-3xl font-semibold md:text-4xl'>{post.title}</h1>
					<p className='text-sm text-muted-foreground'>{post.summary}</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					{post.tags.map((tag) => (
						<Link key={tag.slug} href={`/posts?tag=${tag.slug}`}>
							<Badge variant='secondary'>#{tag.label}</Badge>
						</Link>
					))}
					{post.categories.map((category) => (
						<Link key={category.slug} href={`/posts?category=${category.slug}`}>
							<Badge variant='outline'>{category.label}</Badge>
						</Link>
					))}
				</div>
			</header>

			<section
				className='prose prose-neutral max-w-none dark:prose-invert'
				dangerouslySetInnerHTML={{ __html: html }}
			/>

			{post.attachments.length > 0 && (
				<section className='space-y-3 rounded-2xl border bg-muted/30 p-4'>
					<h2 className='text-sm font-semibold'>附件</h2>
					<ul className='space-y-2 text-sm'>
						{post.attachments.map((attachment) => (
							<li key={attachment.id}>
								<a href={attachment.url} target='_blank' rel='noreferrer' className='hover:underline'>
									{attachment.label}
								</a>
							</li>
						))}
					</ul>
				</section>
			)}

			<CommentsSection postId={post.id} />

			{related.length > 0 && (
				<section className='space-y-3'>
					<h2 className='text-lg font-semibold'>相關文章</h2>
					<div className='grid gap-3 md:grid-cols-2'>
						{related.map((item) => (
							<Card key={item.id}>
								<CardHeader>
									<CardTitle className='text-base'>
										<Link href={`/posts/${item.slug}`} className='hover:underline'>
											{item.title}
										</Link>
									</CardTitle>
								</CardHeader>
								<CardContent className='text-sm text-muted-foreground'>
									{item.summary ?? "閱讀更多..."}
								</CardContent>
							</Card>
						))}
					</div>
				</section>
			)}
		</article>
	)
}
