import { pgEnum, pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core"

export const syncStatusEnum = pgEnum("sync_status", ["pending", "success", "error"])
export const syncTriggerEnum = pgEnum("sync_trigger", ["webhook", "cron", "manual", "setup"])

export const syncLog = pgTable("sync_log", {
	id: uuid("id").defaultRandom().primaryKey(),
	trigger: syncTriggerEnum("trigger").default("manual").notNull(),
	eventId: text("event_id"),
	repoOwner: text("repo_owner").notNull(),
	repoName: text("repo_name").notNull(),
	status: syncStatusEnum("status").default("pending").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	errorMessage: text("error_message"),
	details: jsonb("details").$type<Record<string, unknown>>().default({}),
})
