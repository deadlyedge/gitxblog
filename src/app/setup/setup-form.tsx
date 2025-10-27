"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ContentSourceSettings } from "@/services/settings"

import { completeSetup } from "./actions"

type SetupFormProps = {
	defaultValues?: ContentSourceSettings | null
}

export const SetupForm = ({ defaultValues }: SetupFormProps) => {
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()

	const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault()
		setError(null)
		setSuccess(null)

		const form = event.currentTarget
		const formData = new FormData(form)

		startTransition(async () => {
			try {
				await completeSetup(formData)
				setSuccess("設定完成！已開始同步 GitHub 內容。")
				form.reset()
			} catch (err) {
				setError(err instanceof Error ? err.message : "設定失敗，請稍後再試。")
			}
		})
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-6'>
			<div className='space-y-2'>
				<label htmlFor='owner' className='text-sm font-medium'>
					GitHub Owner
				</label>
				<Input
					id='owner'
					name='owner'
					required
					placeholder='e.g. vercel'
					defaultValue={defaultValues?.owner}
				/>
			</div>
			<div className='space-y-2'>
				<label htmlFor='repo' className='text-sm font-medium'>
					Repository Name
				</label>
				<Input
					id='repo'
					name='repo'
					required
					placeholder='e.g. next.js'
					defaultValue={defaultValues?.repo}
				/>
			</div>
			<div className='space-y-2'>
				<label htmlFor='branch' className='text-sm font-medium'>
					Default Branch
				</label>
				<Input
					id='branch'
					name='branch'
					required
					placeholder='main'
					defaultValue={defaultValues?.branch ?? "main"}
				/>
			</div>
			<div className='space-y-2'>
				<label htmlFor='token' className='text-sm font-medium'>
					GitHub Token
					<span className='ml-2 text-xs text-muted-foreground'>(可選，但建議提供以提高 API 配額)</span>
				</label>
				<Input
					id='token'
					name='token'
					type='password'
					placeholder='ghp_xxxxx'
					defaultValue={defaultValues?.token}
				/>
			</div>
			<div className='space-y-2'>
				<Button type='submit' disabled={isPending} className='w-full'>
					{isPending ? "設定中..." : "完成設定並同步"}
				</Button>
				{error && <p className='text-sm text-red-500'>{error}</p>}
				{success && <p className='text-sm text-green-600'>{success}</p>}
			</div>
		</form>
	)
}
