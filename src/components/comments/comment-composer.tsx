"use client"

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type CommentComposerProps = {
	postId: string
}

export const CommentComposer = ({ postId }: CommentComposerProps) => {
	const [value, setValue] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const submitComment = async () => {
		setIsSubmitting(true)
		setError(null)
		setMessage(null)

		try {
			const response = await fetch("/api/comments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					postId,
					body: value,
				}),
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error ?? "提交失敗")
			}

			setValue("")
			setMessage(result.message ?? "評論已提交，待審核。")
		} catch (err) {
			setError(err instanceof Error ? err.message : "提交失敗，請稍後再試。")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className='space-y-4'>
			<SignedOut>
				<div className='rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground'>
					<p>登入後即可留言。</p>
					<SignInButton mode='modal'>
						<Button className='mt-3'>登入 GITxBlog</Button>
					</SignInButton>
				</div>
			</SignedOut>
			<SignedIn>
				<div className='space-y-3'>
					<Textarea
						value={value}
						onChange={(event) => setValue(event.target.value)}
						placeholder='分享你的想法...'
						minLength={10}
						maxLength={4000}
					/>
					<div className='flex justify-between text-xs text-muted-foreground'>
						<span>{value.length} / 4000</span>
						<Button disabled={isSubmitting || value.length < 10} size='sm' onClick={submitComment}>
							{isSubmitting ? "送出中..." : "送出評論"}
						</Button>
					</div>
					{message && <p className='text-sm text-green-600'>{message}</p>}
					{error && <p className='text-sm text-red-500'>{error}</p>}
				</div>
			</SignedIn>
		</div>
	)
}
