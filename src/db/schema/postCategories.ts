import { relations } from "drizzle-orm"
import {
	pgTable,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

import { categories } from "./categories"
import { posts } from "./posts"

export const postCategories = pgTable(
	"post_categories",
	{
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		categoryId: uuid("category_id")
			.notNull()
			.references(() => categories.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		pk: { columns: [table.postId, table.categoryId], name: "post_categories_post_id_category_id_pk" },
	}),
)

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
	post: one(posts, {
		fields: [postCategories.postId],
		references: [posts.id],
	}),
	category: one(categories, {
		fields: [postCategories.categoryId],
		references: [categories.id],
	}),
}))
