import { NavSearch } from "./navSearch"
import { Button } from "./ui/button"

export const Navbar = () => {
	return (
		<nav className='sticky top-0 left-0 w-full h-12 flex items-center justify-between gap-2 bg-foreground/20 backdrop-blur-md p-2'>
			<div className="font-bold">git x blog</div>
			<div className='flex items-center'>
				<Button variant='link'>menu</Button>
				<Button variant='link'>menu2</Button>
				<NavSearch />
			</div>
		</nav>
	)
}
