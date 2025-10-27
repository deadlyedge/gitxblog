import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/config/env"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as {
	conn?: ReturnType<typeof postgres>
}

if (!env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not configured")
}

const client = globalForDb.conn ?? postgres(env.DATABASE_URL, { prepare: false, max: 10 })

if (env.NODE_ENV !== "production") {
	globalForDb.conn = client
}

export const db = drizzle(client, { schema })
export type Database = typeof db
export * from "./schema"
