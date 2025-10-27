import { relations } from "drizzle-orm"
import {
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

import { postCategories } from "./postCategories"

export const categories = pgTable("categories", {
	id: uuid("id").defaultRandom().primaryKey(),
	slug: text("slug").notNull().unique(),
	label: text("label").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const categoriesRelations = relations(categories, ({ many }) => ({
	postCategories: many(postCategories),
}))
