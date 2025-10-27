import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const rootDir = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
	test: {
		env: "node",
		globals: true,
		setupFiles: [resolve(rootDir, "vitest.setup.ts")],
		coverage: {
			reporter: ["text", "html"],
		},
	},
	resolve: {
		alias: {
			"@": resolve(rootDir, "src"),
		},
	},
})
