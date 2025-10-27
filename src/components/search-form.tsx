"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SearchFormProps = {
	defaultValue?: string
}

export const SearchForm = ({ defaultValue = "" }: SearchFormProps) => {
	const router = useRouter()
	const [value, setValue] = useState(defaultValue)

	const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault()
		const query = value.trim()
		if (!query) return
		router.push(`/search?q=${encodeURIComponent(query)}`)
	}

	return (
		<form onSubmit={onSubmit} className='flex gap-2'>
			<Input
				value={value}
				onChange={(event) => setValue(event.target.value)}
				placeholder='搜尋標題、內容或標籤...'
			/>
			<Button type='submit'>搜尋</Button>
		</form>
	)
}
