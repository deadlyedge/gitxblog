import { relations } from "drizzle-orm"
import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

import { posts } from "./posts"

export const attachmentTypeEnum = pgEnum("attachment_type", ["image", "file", "link"])

export const postAttachments = pgTable("post_attachments", {
	id: uuid("id").defaultRandom().primaryKey(),
	postId: uuid("post_id")
		.notNull()
		.references(() => posts.id, { onDelete: "cascade" }),
	label: text("label").notNull(),
	url: text("url").notNull(),
	type: attachmentTypeEnum("type").default("link").notNull(),
	externalId: text("external_id"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const postAttachmentsRelations = relations(postAttachments, ({ one }) => ({
	post: one(posts, {
		fields: [postAttachments.postId],
		references: [posts.id],
	}),
}))
