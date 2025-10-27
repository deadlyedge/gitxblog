import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core"

export const systemSettings = pgTable("system_settings", {
	key: text("key").primaryKey(),
	value: jsonb("value").$type<Record<string, unknown>>().default({}),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
