import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
	publicRoutes: [
		"/",
		"/posts",
		"/posts/(.*)",
		"/api/posts",
		"/api/posts/(.*)",
		"/api/search",
		"/api/github/webhook",
		"/api/tasks/sync",
		"/sign-in(.*)",
		"/sign-up(.*)",
	],
	ignoredRoutes: ["/api/github/webhook", "/api/tasks/sync"],
})

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
