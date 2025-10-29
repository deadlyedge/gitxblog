import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

import { NavSearch } from './navSearch'
import { Button } from './ui/button'
import Link from 'next/link'

export const Navbar = () => {
	return (
		<nav className="sticky top-0 left-0 w-full h-12 flex items-center justify-between gap-2 bg-foreground/20 backdrop-blur-md p-2">
			<div className="font-bold">
				<Link href="/">git x blog</Link>
			</div>
			<div className="flex items-center">
				<NavSearch />
				<SignedIn>
					<UserButton appearance={{ elements: { avatarBox: 'ml-3' } }} />
				</SignedIn>
				<SignedOut>
					<SignInButton mode="modal">
						<Button variant="link">登入</Button>
					</SignInButton>
				</SignedOut>
			</div>
		</nav>
	)
}
