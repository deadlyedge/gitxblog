## 系統藍圖 (Architecture Blueprint)

本文件作為 GitxBlog 專案的工程開發指南，涵蓋資料架構、同步流程、認證整合與部署策略。所有內容以 ASCII 編碼撰寫，方便跨平台閱讀。

---

### 1. 技術棧與核心原則
- 前端 / 全棧：Next.js 16 (App Router) + React 19 + TypeScript
- 資料庫層：PostgreSQL（支援 Neon / Supabase / 自建），Drizzle ORM 管理 schema 與遷移
- 套件管理：Bun
- UI：shadcn/ui + TailwindCSS
- 認證：Clerk（OAuth + Email 支援）
- 搜尋：PostgreSQL `tsvector` + GIN 索引
- 任務與同步：GitHub Webhook + Vercel Cron Job（或自訂排程）
- 測試：Vitest + Testing Library（API 與工具函式單元測試）

原則：模組化、可測試、可擴充、盡量避免重複 API 呼叫（使用快取/資料庫快取落地）。

---

### 2. 系統模組切分
1. **Config 與環境變量**
   - `src/config/env.ts` 使用 Zod 驗證 `.env`
   - 主要變量：`DATABASE_URL`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `WEBHOOK_SECRET`
2. **資料庫層**
   - `drizzle.config.ts` + `src/db/schema/*` 定義如下資料表：
     - `authors` 默認爲 github username
     - `posts`（含 `slug`（根據title自動生成）, `title`（即爲.md文件名）, `summary`（在md文檔中搜尋'# summary'）, `content`, `og_image_url`, `published_at`, `tsv`）
     - `categories` 默認爲 ['github repo name', 'folder name']
     - `tags` 默認爲 `在md文檔中搜尋 '# tags:[tag1, tag2]'`
     - 關聯表 `postCategories`, `postTags`, `postAttachments`
     - `comments`（`status`, `anti_spam_score`, `rate_limit_bucket`）
     - `users`（Clerk 對應，含角色欄位）
     - `sync_log`（記錄 GitHub 同步狀態與錯誤）
   - 使用 `drizzle-kit` 產出遷移，並建立 `drizzle/migrations` 版本管理
   - 建立 `tsvector` generated column + GIN index
3. **GitHub 同步模組**
   - `src/services/github/fetchRemoteTree.ts`：遞迴抓取檔案樹與 Markdown 內容
   - `src/services/github/markdownParser.ts`：解析 frontmatter/meta、生成 excerpt、處理附件 URL
   - `src/services/github/sync.ts`：整合 Drizzle 寫入資料表，更新 posts/tags/categories
   - Webhook Handler：`src/app/api/github/webhook/route.ts`（驗證 `X-Hub-Signature-256`）
   - 定時任務：`src/app/api/tasks/sync/route.ts`（給 Vercel Cron 或手動觸發）
4. **快取與併發控制**
   - 透過 Drizzle transaction，確保同步一致性
   - `sync_log` 避免重複執行，包含 ETag/commit hash 紀錄
   - Server Action 及 Route Handler 使用 `cacheTag` + `revalidateTag` 控制
5. **認證與授權**
   - `src/middleware.ts` 整合 Clerk protect API
   - `src/auth/getCurrentUser.ts` 取得使用者與角色
   - Admin 設定流程：`app/setup` server actions
6. **API 與 Server Components**
   - 公開閱讀 API：`/api/posts`, `/api/posts/[slug]`, `/api/search`
   - 後台管理 API：`/api/admin/comments`, `/api/admin/sync`
   - Server Components 提供 `cache()` 包裝的資料讀取
7. **前端頁面**
   - `app/(public)`：首頁、文章頁、標籤/分類列表、搜尋頁
   - `app/(public)/posts/[slug]` 使用 Markdown renderer (rehype + syntax highlighting)
   - `app/(dashboard)`：Admin 控制台（審核評論、查看同步狀態、設定 GitHub Repo）
   - 共用 UI：Navbar、Footer、Comment 表單（Clerk Sign-in Gate）、Search Command palette
8. **防濫用與速率限制**
   - 使用 `upstash/ratelimit` 或自建 `rate_limit` 表 + middleware
   - 評論提交時檢查速度、spam score（TODO: 依關鍵字與 Link 數量計分）
9. **測試與資料**
   - Seed：`scripts/seed.ts` 透過 Drizzle 寫入示例作者/文章/標籤
   - Vitest：針對 Markdown parser、搜尋查詢組裝、API handler 做單元測試
10. **部署與 DevOps**
    - Vercel 部署流程寫進 README
    - GitHub 同步：提供 GitHub Actions 範例（呼叫 `/api/tasks/sync`）

---

### 3. 資料流程 (Data Flow)
1. **初始啟動**
   1. 使用者進入 `/setup`，未完成setup不允許進入 `/`
   2. 建立 admin (Clerk user id + email) 並指定 GitHub repo
   3. 觸發一次 `syncRepository()`，把 Markdown 寫進 DB
2. **常態運作**
   - 訪客瀏覽頁面 -> Server Components 從 DB 讀資料（快取 + revalidate tags）
   - 認證用戶評論 -> API 透過 Clerk 驗證、寫入 `comments`，預設 `status = "pending"`
   - 管理員於 `/dashboard` 審核評論、手動重新同步
3. **同步機制**
   - GitHub Webhook 推送 -> `/api/github/webhook`
   - 針對 `push`/`workflow_dispatch`，檢查 commit SHA，呼叫 `syncRepository`
   - 失敗時更新 `sync_log`，管理員可於後台查看
4. **搜尋請求**
   - `/api/search` 接收 `q`, `page`, `filters`
   - 透過 `to_tsvector('english', title || ' ' || content)` 模糊搜尋
   - 支援排序（`published_at` / `rank`）和 facet 回傳

---

### 4. 環境變量範例 (`.env.example`)
```
NODE_ENV=development
DATABASE_URL=postgres://user:password@host:5432/gitxblog
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_TOKEN=
WEBHOOK_SECRET=
SYNC_CRON_TOKEN=optional-shared-secret
```

---

### 5. 主要待辦 (Implementation Roadmap)
1. 初始化 Bun + Drizzle（新增 `drizzle.config.ts`, CLI scripts）
2. 撰寫資料表 schema 與遷移
3. 建立 GitHub 同步服務與 Markdown Parser
4. 建置 Clerk Auth、Admin Setup 流程與中介層
5. 打造 API Routes（公開 + Admin）與 Server Components
6. 實作前端 UI（shadcn/ui, SEO meta, RSC 資料抓取）
7. 完成搜尋 API + DB 索引
8. 寫測試與 seed script
9. 更新 README 與 Vercel 部署說明

以上設計做為後續開發的基準，實作過程如需調整請同步更新此文件。
