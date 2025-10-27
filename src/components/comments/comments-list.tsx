"use client"

import Image from "next/image"

import { formatDate } from "@/lib/date"

type Comment = {
	id: string
	body: string
	createdAt: Date | null
	publishedAt: Date | null
	userName: string | null
	userImageUrl: string | null
}

type CommentsListProps = {
	comments: Comment[]
}

export const CommentsList = ({ comments }: CommentsListProps) => {
	if (comments.length === 0) {
		return <p className='text-sm text-muted-foreground'>目前尚無評論。</p>
	}

	return (
		<ul className='space-y-4'>
			{comments.map((comment) => (
				<li key={comment.id} className='flex gap-3 rounded-lg border p-3'>
					<div className='relative h-10 w-10 overflow-hidden rounded-full bg-muted'>
						{comment.userImageUrl ? (
							<Image src={comment.userImageUrl} alt={comment.userName ?? "user avatar"} fill className='object-cover' />
						) : (
							<span className='flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground'>
								{comment.userName?.slice(0, 1).toUpperCase() ?? "U"}
							</span>
						)}
					</div>
					<div className='flex-1 space-y-1'>
						<div className='flex items-center justify-between text-xs text-muted-foreground'>
							<span className='font-medium text-foreground'>{comment.userName ?? "匿名用戶"}</span>
							<span>{formatDate(comment.publishedAt ?? comment.createdAt)}</span>
						</div>
						<p className='text-sm leading-relaxed'>{comment.body}</p>
					</div>
				</li>
			))}
		</ul>
	)
}
