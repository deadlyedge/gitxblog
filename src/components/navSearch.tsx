"use client"

import Link from "next/link"
import { Search } from "lucide-react"

import { Kbd, KbdGroup } from "./ui/kbd"

export const NavSearch = () => {
	return (
		<Link
			href='/search'
			className='group/navbar-search flex items-center gap-x-2 rounded-lg border border-foreground/20 px-2 py-2 transition hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50'>
			<Search className='h-4 w-4 text-zinc-500 dark:text-zinc-400' />
			<p className='text-sm font-bold transition group-hover/navbar-search:text-zinc-600 dark:group-hover/navbar-search:text-zinc-300'>
				全站搜尋
			</p>
			<KbdGroup className='ml-auto text-xs text-muted-foreground'>
				<Kbd className='rounded-lg'>⌘</Kbd>
				<span>+</span>
				<Kbd className='rounded-lg'>K</Kbd>
			</KbdGroup>
		</Link>
	)
}
