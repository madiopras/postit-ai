-- Migration 0001: Initial schema — users, faqs, sops, documents, chats, messages, app_config

-- ─── Users ───────────────────────────────────────────────
CREATE TABLE "users" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username"     text NOT NULL UNIQUE,
  "password"     text NOT NULL,
  "display_name" text,
  "role"         text NOT NULL DEFAULT 'user',
  "status"       text NOT NULL DEFAULT 'active',
  "blocked_at"   timestamp with time zone,
  "blocked_by"   uuid,
  "block_reason" text,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now()
);

-- ─── FAQs ────────────────────────────────────────────────
CREATE TABLE "faqs" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question"    text NOT NULL,
  "answer"      text NOT NULL,
  "category"    text,
  "status"      text DEFAULT 'draft',
  "usage_count" integer DEFAULT 0,
  "accuracy"    integer DEFAULT 0,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now()
);

CREATE INDEX "idx_faqs_status" ON "faqs" ("status");
CREATE INDEX "idx_faqs_category" ON "faqs" ("category");

-- ─── SOPs ────────────────────────────────────────────────
CREATE TABLE "sops" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title"          text NOT NULL,
  "content"        text NOT NULL,
  "category"       text,
  "requires_login" boolean NOT NULL DEFAULT false,
  "status"         text DEFAULT 'draft',
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now()
);

CREATE INDEX "idx_sops_status" ON "sops" ("status");
CREATE INDEX "idx_sops_category" ON "sops" ("category");

-- ─── Documents (Vector Store) ────────────────────────────
CREATE TABLE "documents" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type"        text NOT NULL,
  "title"       text NOT NULL,
  "content"     text NOT NULL,
  "chunk_index" integer DEFAULT 0,
  "parent_id"   uuid,
  "source_id"   uuid,
  "embedding"   vector(1536),
  "metadata"    jsonb DEFAULT '{}'::jsonb,
  "status"      text DEFAULT 'draft',
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now()
);

CREATE INDEX "idx_documents_embedding"
  ON "documents" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "idx_documents_type_source"
  ON "documents" USING btree ("type", "source_id");
CREATE INDEX "idx_documents_status"
  ON "documents" USING btree ("status");

-- ─── Chats ──────────────────────────────────────────────
CREATE TABLE "chats" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title"      text DEFAULT 'New Chat',
  "session_id" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- ─── Messages ───────────────────────────────────────────
CREATE TABLE "messages" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id"    uuid NOT NULL,
  "role"       text NOT NULL,
  "content"    text NOT NULL,
  "sources"    jsonb DEFAULT '[]'::jsonb,
  "feedback"   text,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_chat_id_chats_id_fk"
  FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX "idx_messages_chat_id"
  ON "messages" USING btree ("chat_id", "created_at");

-- ─── App Config ─────────────────────────────────────────
CREATE TABLE "app_config" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "embedding_base_url" text,
  "embedding_model"    text,
  "embedding_api_key"  text,
  "llm_base_url"       text,
  "llm_model"          text,
  "llm_api_key"        text,
  "is_active"          text DEFAULT 'false',
  "updated_by"         uuid,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now()
);

ALTER TABLE "app_config"
  ADD CONSTRAINT "app_config_updated_by_users_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
