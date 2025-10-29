import type { Metadata } from "next"
import { LXGW_WenKai_TC } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { EnsureClerkUser } from "./ensure-user"

export const metadata: Metadata = {
	title: {
		template: "%s | GitxBlog",
		default: "GitxBlog — GitHub 驅動的現代部落格",
	},
	description:
		"使用 Next.js 16、Drizzle ORM 與 PostgreSQL 打造的 GitHub 同步部落格，支援全文搜尋、Clerk 認證與評論審核。",
	openGraph: {
		title: "GitxBlog",
		description:
			"使用 Next.js 16、Drizzle ORM 與 PostgreSQL 打造的 GitHub 同步部落格，支援全文搜尋、Clerk 認證與評論審核。",
		type: "website",
	},
}
const wenkai = LXGW_WenKai_TC({
	subsets: ["latin"],
	variable: "--font-wenkai-serif",
	weight: ["300", "700"],
})

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='zh-Hant'>
			<ClerkProvider>
				<body className={`${wenkai.className} antialiased overflow-x-hidden`}>
					<main className='mx-auto w-full md:w-3/4'>
						<EnsureClerkUser />
						<Navbar />
						{children}
					</main>
				</body>
			</ClerkProvider>
		</html>
	)
}
