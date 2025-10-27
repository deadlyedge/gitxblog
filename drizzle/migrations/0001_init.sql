CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "post_status" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "post_source" AS ENUM ('github', 'manual');
CREATE TYPE "attachment_type" AS ENUM ('image', 'file', 'link');
CREATE TYPE "user_role" AS ENUM ('admin', 'editor', 'member');
CREATE TYPE "comment_status" AS ENUM ('pending', 'approved', 'rejected', 'spam');
CREATE TYPE "sync_status" AS ENUM ('pending', 'success', 'error');
CREATE TYPE "sync_trigger" AS ENUM ('webhook', 'cron', 'manual', 'setup');

CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"email" text,
	"avatar_url" text,
	"bio" text,
	"github_username" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL UNIQUE,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"author_id" uuid NOT NULL REFERENCES "authors" ("id") ON DELETE CASCADE,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"raw_frontmatter" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"og_image_url" text,
	"status" post_status NOT NULL DEFAULT 'draft',
	"source" post_source NOT NULL DEFAULT 'github',
	"source_path" text NOT NULL,
	"source_sha" text,
	"published_at" timestamptz,
	"search_vector" tsvector,
	"is_featured" boolean NOT NULL DEFAULT false,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL REFERENCES "posts" ("id") ON DELETE CASCADE,
	"tag_id" uuid NOT NULL REFERENCES "tags" ("id") ON DELETE CASCADE,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY ("post_id", "tag_id")
);

CREATE TABLE "post_categories" (
	"post_id" uuid NOT NULL REFERENCES "posts" ("id") ON DELETE CASCADE,
	"category_id" uuid NOT NULL REFERENCES "categories" ("id") ON DELETE CASCADE,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "post_categories_post_id_category_id_pk" PRIMARY KEY ("post_id", "category_id")
);

CREATE TABLE "post_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL REFERENCES "posts" ("id") ON DELETE CASCADE,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"type" attachment_type NOT NULL DEFAULT 'link',
	"external_id" text,
	"created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"name" text,
	"image_url" text,
	"role" user_role NOT NULL DEFAULT 'member',
	"last_login_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL REFERENCES "posts" ("id") ON DELETE CASCADE,
	"user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
	"body" text NOT NULL,
	"status" comment_status NOT NULL DEFAULT 'pending',
	"anti_spam_score" integer,
	"rate_limit_key" text,
	"ip_address" text,
	"user_agent" text,
	"published_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"trigger" sync_trigger NOT NULL DEFAULT 'manual',
	"event_id" text,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"status" sync_status NOT NULL DEFAULT 'pending',
	"started_at" timestamptz NOT NULL DEFAULT now(),
	"completed_at" timestamptz,
	"error_message" text,
	"details" jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "posts_author_id_idx" ON "posts" ("author_id");
CREATE INDEX "posts_published_at_idx" ON "posts" ("published_at" DESC NULLS LAST);
CREATE INDEX "posts_search_vector_idx" ON "posts" USING gin ("search_vector");

CREATE INDEX "post_tags_tag_id_idx" ON "post_tags" ("tag_id");
CREATE INDEX "post_categories_category_id_idx" ON "post_categories" ("category_id");

CREATE INDEX "comments_post_id_idx" ON "comments" ("post_id");
CREATE INDEX "comments_status_idx" ON "comments" ("status");

CREATE INDEX "sync_log_status_idx" ON "sync_log" ("status");
CREATE INDEX "sync_log_trigger_idx" ON "sync_log" ("trigger");
