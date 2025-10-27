import { relations } from "drizzle-orm"
import {
	pgTable,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

import { posts } from "./posts"
import { tags } from "./tags"

export const postTags = pgTable(
	"post_tags",
	{
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		pk: { columns: [table.postId, table.tagId], name: "post_tags_post_id_tag_id_pk" },
	}),
)

export const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, {
		fields: [postTags.postId],
		references: [posts.id],
	}),
	tag: one(tags, {
		fields: [postTags.tagId],
		references: [tags.id],
	}),
}))
