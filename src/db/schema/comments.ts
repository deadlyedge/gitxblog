import { relations } from "drizzle-orm"
import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { posts } from "./posts"
import { users } from "./users"

export const commentStatusEnum = pgEnum("comment_status", ["pending", "approved", "rejected", "spam"])

export const comments = pgTable("comments", {
	id: uuid("id").defaultRandom().primaryKey(),
	postId: uuid("post_id")
		.notNull()
		.references(() => posts.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	body: text("body").notNull(),
	status: commentStatusEnum("status").default("pending").notNull(),
	antiSpamScore: integer("anti_spam_score"),
	rateLimitKey: text("rate_limit_key"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	publishedAt: timestamp("published_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const commentsRelations = relations(comments, ({ one }) => ({
	post: one(posts, {
		fields: [comments.postId],
		references: [posts.id],
	}),
	user: one(users, {
		fields: [comments.userId],
		references: [users.id],
	}),
}))
