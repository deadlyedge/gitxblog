"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = {
	default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
	secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
	outline: "text-foreground",
}

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
	variant?: keyof typeof badgeVariants
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
			badgeVariants[variant],
			className,
		)}
		{...props}
	/>
))
Badge.displayName = "Badge"

export { Badge, badgeVariants }
