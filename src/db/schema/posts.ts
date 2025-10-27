import { relations, sql } from "drizzle-orm"
import { boolean, customType, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { authors } from "./authors"
import { postAttachments } from "./postAttachments"
import { postCategories } from "./postCategories"
import { postTags } from "./postTags"

export const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"])
export const postSourceEnum = pgEnum("post_source", ["github", "manual"])

const tsvector = customType<{ data: string }>({
	dataType: () => "tsvector",
})

export const posts = pgTable("posts", {
	id: uuid("id").defaultRandom().primaryKey(),
	authorId: uuid("author_id")
		.notNull()
		.references(() => authors.id, { onDelete: "cascade" }),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	summary: text("summary"),
	content: text("content").notNull(),
	rawFrontmatter: jsonb("raw_frontmatter").$type<Record<string, unknown>>().default({}),
	ogImageUrl: text("og_image_url"),
	status: postStatusEnum("status").default("draft").notNull(),
	source: postSourceEnum("source").default("github").notNull(),
	sourcePath: text("source_path").notNull(),
	sourceSha: text("source_sha"),
	publishedAt: timestamp("published_at", { withTimezone: true }),
	searchVector: tsvector("search_vector"),
	isFeatured: boolean("is_featured").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => sql`CURRENT_TIMESTAMP`),
})

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(authors, {
		fields: [posts.authorId],
		references: [authors.id],
	}),
	tags: many(postTags),
	categories: many(postCategories),
	attachments: many(postAttachments),
}))
