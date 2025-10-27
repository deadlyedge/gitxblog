import { relations } from "drizzle-orm"
import {
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

import { posts } from "./posts"

export const authors = pgTable("authors", {
	id: uuid("id").defaultRandom().primaryKey(),
	slug: text("slug").notNull().unique(),
	displayName: text("display_name").notNull(),
	email: text("email"),
	avatarUrl: text("avatar_url"),
	bio: text("bio"),
	githubUsername: text("github_username"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const authorsRelations = relations(authors, ({ many }) => ({
	posts: many(posts),
}))
