# GitxBlog

GitxBlog is a Next.js 16 + PostgreSQL blogging platform that mirrors content from a GitHub repository into a local cache. It uses server components, shadcn/ui, Clerk authentication, and Drizzle ORM. This README covers data modelling, ingestion rules, required environment variables, and day-to-day workflows.

---

## ✨ Highlights
- **GitHub-first content pipeline** – synchronise markdown files via webhook or cron.
- **Deterministic extraction rules** – titles, summaries, tags, and categories are derived automatically (see below).
- **Typed data layer** – Drizzle ORM schema with JSON-backed frontmatter snapshot.
- **Search-ready** – PostgreSQL `tsvector` + GIN index for fuzzy search.
- **Clerk integration** – sign-in gates for comments and admin actions with webhook backfill.
- **Pre-aggregated read models** – JSON aggregation keeps React server components lean.

---

## 📦 Tech Stack
| Layer | Tooling |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui, Tailwind CSS |
| Data | PostgreSQL, Drizzle ORM |
| Auth | Clerk |
| Jobs | GitHub webhooks, optional Vercel Cron |
| Testing | Vitest |
| Package manager | Bun |

---

## 🧠 GitHub Extraction Rules
The ingestion logic lives in `src/services/github/rules.ts`. For each markdown file we apply the following heuristics:

| Field | Rule |
| --- | --- |
| Author | Defaults to GitHub owner (`owner`); overridable via frontmatter (`author.slug/name/email/...`). |
| Slug | Generated from title; if the slug is shorter than 3 characters a hashed fallback (`post-<hash>`) is used. |
| Title | Derived from the filename (without extension) unless frontmatter `title` is present. |
| Summary | Priority order: `# summary` block → frontmatter summary → first 180 characters of the body. |
| Tags | Priority order: `# tags:[tag1, tag2]` inline directive → frontmatter `tags`. |
| Categories | `[repo, folder, subfolder...]` augmented with frontmatter `categories` (duplicates removed). |
| Attachments | Frontmatter `attachments` filtered to `{label,url,type}` objects. |
| Status | `draft` only when explicitly set in frontmatter; otherwise `published`. |
| Published date | Accepts ISO strings, epoch numbers, or `Date` objects. Invalid values are ignored. |
| Raw frontmatter | Serialised to JSON with dates converted to ISO strings so it remains database safe. |

---

## 🗄️ Data Model Overview
- `authors` – GitHub owners/contributors with avatar, email, slug.
- `posts` – article metadata, markdown content, JSON frontmatter snapshot, `tsvector` search column.
- `tags`, `categories` – canonical vocabularies.
- `postTags`, `postCategories`, `postAttachments` – many-to-many join tables.
- `comments` – Clerk user comments with moderation state and anti-spam score.
- `sync_log` – audits of each GitHub sync run.
- `system_settings` – stores GitHub repo configuration.

Key indexes are defined directly in the Drizzle schema (GIN on `search_vector`, foreign-key indexes on join tables).

---

## 🔄 Synchronisation Flow
1. `fetchRepositorySnapshot` grabs the commit SHA, tree, and markdown contents.
2. `applyExtractionRules` transforms each file into a `NormalizedPost` object.
3. `syncRepository` upserts authors, posts, tags, categories, and attachments within a single transaction.
4. Any GitHub-sourced post not present in the snapshot is marked `archived`.
5. `search_vector` is recalculated so search endpoints remain fresh.

Trigger sync via:
- GitHub webhook → `/api/github/webhook`
- Manual admin action → `/api/admin/sync`
- Scheduled task → `/api/tasks/sync`

---

## ⚙️ Environment Variables
Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgres://user:password@host:5432/gitxblog
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_TOKEN=                 # required for private repos or higher rate limits
GITHUB_DEFAULT_BRANCH=main
WEBHOOK_SECRET=
SYNC_CRON_TOKEN=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
```

The Clerk webhook is available at `/api/clerk/webhook` and keeps the local `users` table aligned with Clerk events.

---

## 🛠️ Useful Scripts
| Command | Description |
| --- | --- |
| `bun run dev` | Start the Next.js dev server |
| `bun run lint` | ESLint validation |
| `bun run test` | Vitest suite |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:seed` | Insert sample content |

---

## 🧭 Code Structure Highlights
- `src/services/github/rules.ts` – pure extraction rules (easy to test & tweak).
- `src/services/github/sync.ts` – sync orchestration with detailed logging.
- `src/services/posts.ts` – aggregated JSON read models to avoid N+1 queries.
- `src/services/comments.ts` – moderation helpers and anti-spam scoring.
- `src/app/posts` – post listings and detail pages (server components).

---

## ✅ Next Steps / Tips
- Adjust the rule set in `src/services/github/rules.ts` if your markdown format changes.
- Update `scripts/seed.ts` to reflect any schema tweaks.
- For production, wire GitHub webhooks and Clerk webhooks to the deployed URLs.

Happy blogging! ✨
