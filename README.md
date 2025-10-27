# GitxBlog

GitxBlog 是一個以 GitHub 儲存庫為單一內容來源的現代化部落格系統，採用 Next.js 16 App Router、Drizzle ORM 與 PostgreSQL 建構。專案內建自動同步 Markdown、全文檢索、Clerk 登入與評論審核流程，並提供 Vercel 部署指引。

## ✨ 功能特點

- **GitHub → Database Pipeline**：支援 Webhook 與排程同步 Markdown，並將資料緩存於 PostgreSQL。
- **Server Components + API Routes**：資料取得與後台操作均透過 RSC 與型別安全 API 完成。
- **Clerk 認證整合**：登入後才能發佈評論，並提供首次啟動的管理員設定流程。
- **評論審核與防濫用**：評論增加狀態、速率限制與簡易反濫用分數欄位。
- **PostgreSQL 全文搜尋**：使用 `tsvector` + GIN Index 實作模糊搜尋、結果排序與分頁。
- **shadcn/ui 前端介面**：首頁、文章頁、搜尋頁與評論區皆採用 shadcn/ui 元件設計，內建 OG/SEO metadata。
- **Bun 套件管理 & Vitest 測試**：使用 Bun 加速開發流程，並提供單元測試與資料種子腳本。

## 🧰 技術棧

| 分類 | 使用技術 |
| --- | --- |
| 前端 | Next.js 16、React 19、shadcn/ui、TailwindCSS 4 |
| 認證 | Clerk |
| 後端 | Drizzle ORM、Next.js API Routes、Server Components |
| 資料庫 | PostgreSQL (Neon / Supabase / 自建均可) |
| 同步 | GitHub Webhook、Vercel Cron (或自訂排程) |
| 測試 | Vitest |
| 套件管理 | Bun |

## ✅ 先決條件

- Node.js 18+（建議 20）
- Bun v1.0+
- PostgreSQL 資料庫（本地或雲端）
- GitHub Personal Access Token（用於 API 限額與私有 repo）
- Clerk 專案（用於登入與授權）

## 🚀 快速開始

1. **安裝依賴**
   ```bash
   bun install
   ```

2. **複製環境變數範例**
   ```bash
   cp .env.example .env
   ```

3. **設定 `.env` 內容**
   ```env
   DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/gitxblog
   GITHUB_OWNER=your-github-user
   GITHUB_REPO=your-blog-repo
   GITHUB_TOKEN=ghp_xxx (可選，但建議設定)
   CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   WEBHOOK_SECRET=your-github-webhook-secret
   SYNC_CRON_TOKEN=optional-shared-secret
   ```

4. **執行資料庫遷移與種子資料**
   ```bash
   bun run db:migrate
   bun run db:seed
   ```

5. **啟動開發伺服器**
   ```bash
   bun run dev
   ```

6. **首次設定**
   - 透過 `/setup` 完成管理員建立與 GitHub 儲存庫設定。
   - 系統會立即觸發第一次同步。

## 🔄 GitHub 同步流程

- **Webhook**：在 GitHub 儲存庫設定 Webhook，指向 `/api/github/webhook`，Content type 選擇 `application/json`，Secret 使用 `.env` 的 `WEBHOOK_SECRET`。
- **排程 / 手動同步**：
  - 觸發 `/api/tasks/sync`（需附上 `Authorization: Bearer SYNC_CRON_TOKEN`）
  - 管理員可呼叫 `/api/admin/sync` 執行手動同步。

## 🔐 Clerk 認證

- 將 `.env` 設定為專案的 Publishable Key 與 Secret Key。
- `ClerkProvider` 與 `authMiddleware` 已在專案內設定，相關保護路由會自動啟用。
- 管理員帳號以首次在 `/setup` 完成設定之使用者為準，可於資料庫 `users` 表調整角色。

## 🔍 全文搜尋

- 搜尋 API：`GET /api/search?q=keyword`
- 前端頁面：`/search`
- 搜尋採用 `websearch_to_tsquery` + `ts_rank` 排序，並提供分頁資訊。

## 💬 評論工作流程

1. 登入後提交評論 → 狀態為 `pending`
2. 管理員呼叫 `PATCH /api/admin/comments` 更新狀態（`approved` / `rejected` / `spam`）
3. 通過審核的評論會顯示於文章頁面。

## 🧪 測試

```bash
bun run test
```

測試覆蓋 Markdown 解析與評論反濫用規則，可透過 `vitest` 與 `@vitest/coverage-v8` 產生報告。

## 📦 資料種子

使用預設腳本建立示範作者、文章與分類：

```bash
bun run db:seed
```

## ☁️ 部署到 Vercel

1. **建立專案**：`vercel init` / Import GitHub repo。
2. **環境變數**：於 Vercel 專案設定中新增 `.env` 所需的所有變數。
3. **資料庫遷移**：可透過下列命令在 Vercel 上執行（需設定 DATABASE_URL）：
   ```bash
   vercel env pull
   bun run db:migrate
   ```
4. **Webhook**：
   - 在 GitHub Webhook 中使用 Vercel 產生的正式網域。
   - Secret 保持與 `.env` 相同。
5. **排程（可選）**：使用 [Vercel Cron](https://vercel.com/docs/cron-jobs) 呼叫 `/api/tasks/sync?branch=main`，Header 加入 `Authorization: Bearer SYNC_CRON_TOKEN`。
6. **Clerk 網域**：在 Clerk Dashboard 中新增 Vercel 網域至 Allowed Origins。

## 🗂️ 專案結構重點

```
src/
├─ app/
│  ├─ api/               # Webhook、同步、評論、搜尋等 API
│  ├─ (auth)/            # Clerk sign-in/sign-up routes
│  ├─ posts/             # 文章列表與文章頁面
│  ├─ search/            # 全文搜尋頁面
│  └─ setup/             # 首次設定流程
├─ components/           # shadcn/ui 擴充、共用元件
├─ db/                   # Drizzle ORM client 與 schema
├─ services/             # 域邏輯：GitHub 同步、Posts、Comments 等
├─ lib/                  # 共用工具 (slug、markdown 等)
└─ config/               # 環境變數驗證
```

## 🤝 貢獻

歡迎提交 Issue 與 Pull Request。建議在送出 PR 前執行：

```bash
bun run lint
bun run test
```

## 📄 授權

MIT License.
