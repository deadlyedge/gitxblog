import { Suspense } from "react"

import { listApprovedComments } from "@/services/comments"

import { CommentComposer } from "./comments/comment-composer"
import { CommentsList } from "./comments/comments-list"

type CommentsSectionProps = {
	postId: string
}

export const CommentsSection = async ({ postId }: CommentsSectionProps) => {
	const comments = await listApprovedComments(postId)

	return (
		<section className='space-y-6 rounded-2xl border p-6 shadow-sm'>
			<div>
				<h3 className='text-lg font-semibold'>留言</h3>
				<p className='text-sm text-muted-foreground'>登入即可發佈評論，評論需管理員審核後才會顯示。</p>
			</div>
			<Suspense fallback={<p className='text-sm text-muted-foreground'>載入評論編輯器...</p>}>
				<CommentComposer postId={postId} />
			</Suspense>
			<CommentsList comments={comments} />
		</section>
	)
}
