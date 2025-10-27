import { relations } from "drizzle-orm"
import {
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"

import { postTags } from "./postTags"

export const tags = pgTable("tags", {
	id: uuid("id").defaultRandom().primaryKey(),
	slug: text("slug").notNull().unique(),
	label: text("label").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const tagsRelations = relations(tags, ({ many }) => ({
	postTags: many(postTags),
}))
