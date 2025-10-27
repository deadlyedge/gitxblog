import { relations } from "drizzle-orm"
import {
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core"

import { comments } from "./comments"

export const userRoleEnum = pgEnum("user_role", ["admin", "editor", "member"])

export const users = pgTable("users", {
	id: text("id").primaryKey(), // Clerk user id
	email: text("email").notNull(),
	name: text("name"),
	imageUrl: text("image_url"),
	role: userRoleEnum("role").default("member").notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
	comments: many(comments),
}))
