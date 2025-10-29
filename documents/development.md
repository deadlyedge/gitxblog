## Architecture Blueprint

This document captures the GitxBlog architectural guidelines and extraction heuristics.

---

### 1. Tech Stack & Principles
- **Frontend / Full stack**: Next.js 16 (App Router) + React 19 + TypeScript
- **Database**: PostgreSQL (Neon / Supabase / self-hosted) with Drizzle ORM schema management
- **Package manager**: Bun
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: Clerk (OAuth + email)
- **Search**: PostgreSQL `tsvector` + GIN
- **Background tasks**: GitHub webhooks + optional Vercel Cron
- **Testing**: Vitest + Testing Library

Guiding principles: modular code, deterministic ingestion rules, minimal external API calls, and predictable caching.

---

### 2. GitHub Extraction Rules
All heuristics live in `src/services/github/rules.ts`.

| Aspect | Rule |
| --- | --- |
| Author | Default to GitHub owner unless frontmatter overrides (`author.slug/name/...`). |
| Slug | Generated from title; if short/non-Latin, fallback to hashed path (`ensureSlug`). |
| Title | Derives from markdown filename (sans extension) unless frontmatter `title` exists. |
| Summary | Prefer `# summary` block in markdown; fallback to frontmatter summary; fallback to first 180 chars. |
| Tags | Prefer inline directive `# tags:[tag1, tag2]`; fallback to frontmatter tags. |
| Categories | Default chain: `[repo, folder, subfolder...]`, merged with frontmatter categories. |
| Attachments | Frontmatter `attachments` filtered to `{label,url,type}` objects. |
| Status | `draft` if frontmatter explicitly sets it; otherwise `published`. |
| Published date | Parse ISO string / number / Date object; ignore invalid values. |
| Raw frontmatter | Stored as JSON-safe payload (dates serialised to ISO strings). |

---

### 3. Synchronisation Flow
1. **Snapshot**: `fetchRepositorySnapshot` pulls tree + content for markdown files.
2. **Extraction**: `applyExtractionRules` converts every markdown file into a `NormalizedPost`.
3. **Persistence**: `syncRepository` upserts authors/posts/tags/categories/attachments in a single transaction.
4. **Archive**: Any GitHub-sourced posts no longer present in the snapshot are marked `archived`.
5. **Search vector**: refreshed via `updateSearchVector`, ensuring `tsvector` stays current.

---

### 4. Services Overview
- `src/services/posts.ts`: aggregated read-model queries returning JSON blobs (prevents N+1 lookups).
- `src/services/github/rules.ts`: pure functions describing ingestion logic.
- `src/services/github/sync.ts`: orchestrates snapshot fetching, extraction, and persistence.
- `src/services/comments.ts`: comment moderation helpers with anti-spam scoring.
- `src/services/settings.ts`: GitHub repository configuration storage.

---

### 5. API Surface
- **Public data**: `/api/posts`, `/api/posts/[slug]`, `/api/search`
- **Admin**: `/api/admin/sync`, `/api/admin/comments`
- **Automation**: `/api/github/webhook` (GitHub), `/api/tasks/sync` (cron), `/api/clerk/webhook` (user sync)

---

### 6. Local Tasks
- `bun run db:migrate` – apply migrations
- `bun run db:seed` – seed demo content
- `bun run lint` / `bun run test`
- `bun run dev`

Keep this document updated as extraction rules or architecture evolves.
