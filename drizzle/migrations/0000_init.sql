CREATE TYPE "public"."post_source" AS ENUM('github', 'manual');
--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."attachment_type" AS ENUM('image', 'file', 'link');
--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor', 'member');
--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('pending', 'approved', 'rejected', 'spam');
--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'success', 'error');
--> statement-breakpoint
CREATE TYPE "public"."sync_trigger" AS ENUM('webhook', 'cron', 'manual', 'setup');
--> statement-breakpoint
CREATE TABLE "authors" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "slug" text NOT NULL,
    "display_name" text NOT NULL,
    "email" text,
    "avatar_url" text,
    "bio" text,
    "github_username" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "authors_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "author_id" uuid NOT NULL,
    "slug" text NOT NULL,
    "title" text NOT NULL,
    "summary" text,
    "content" text NOT NULL,
    "raw_frontmatter" jsonb DEFAULT '{}'::jsonb,
    "og_image_url" text,
    "status" "post_status" DEFAULT 'draft' NOT NULL,
    "source" "post_source" DEFAULT 'github' NOT NULL,
    "source_path" text NOT NULL,
    "source_sha" text,
    "published_at" timestamp with time zone,
    "search_vector" "tsvector",
    "is_featured" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "posts_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "slug" text NOT NULL,
    "label" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "tags_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "slug" text NOT NULL,
    "label" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "categories_slug_unique" UNIQUE ("slug")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
    "post_id" uuid NOT NULL,
    "tag_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
    "post_id" uuid NOT NULL,
    "category_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_attachments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "post_id" uuid NOT NULL,
    "label" text NOT NULL,
    "url" text NOT NULL,
    "type" "attachment_type" DEFAULT 'link' NOT NULL,
    "external_id" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
    "id" text PRIMARY KEY NOT NULL,
    "email" text NOT NULL,
    "name" text,
    "image_url" text,
    "role" "user_role" DEFAULT 'member' NOT NULL,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "post_id" uuid NOT NULL,
    "user_id" text NOT NULL,
    "body" text NOT NULL,
    "status" "comment_status" DEFAULT 'pending' NOT NULL,
    "anti_spam_score" integer,
    "rate_limit_key" text,
    "ip_address" text,
    "user_agent" text,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "trigger" "sync_trigger" DEFAULT 'manual' NOT NULL,
    "event_id" text,
    "repo_owner" text NOT NULL,
    "repo_name" text NOT NULL,
    "status" "sync_status" DEFAULT 'pending' NOT NULL,
    "started_at" timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at" timestamp with time zone,
    "error_message" text,
    "details" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
    "key" text PRIMARY KEY NOT NULL,
    "value" jsonb DEFAULT '{}'::jsonb,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts"
ADD CONSTRAINT "posts_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_tags"
ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_tags"
ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_categories"
ADD CONSTRAINT "post_categories_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_categories"
ADD CONSTRAINT "post_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_attachments"
ADD CONSTRAINT "post_attachments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comments"
ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comments"
ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE cascade ON UPDATE no action;