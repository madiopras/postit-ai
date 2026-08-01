-- =============================================================================
-- PostIt AI — Full Database Schema for Supabase PostgreSQL
-- =============================================================================
-- This migration consolidates all existing Drizzle migrations (0000–0016) into
-- a single idempotent file that creates the complete database from scratch.
--
-- Source of truth: lib/schema.ts + drizzle/0000–0016 migration files.
-- Generated: 2026-08-02
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Extensions
-- ─────────────────────────────────────────────────────────────────────────────

-- pgvector for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FAQs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "faqs" (
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

CREATE INDEX IF NOT EXISTS "idx_faqs_status" ON "faqs" ("status");
CREATE INDEX IF NOT EXISTS "idx_faqs_category" ON "faqs" ("category");

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SOPs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "sops" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title"                text NOT NULL,
  "content"              text NOT NULL,
  "category"             text,
  "requires_login"       boolean NOT NULL DEFAULT false,
  "status"               text DEFAULT 'draft',
  "published_version_id" uuid,
  "created_at"           timestamp with time zone DEFAULT now(),
  "updated_at"           timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_sops_status" ON "sops" ("status");
CREATE INDEX IF NOT EXISTS "idx_sops_category" ON "sops" ("category");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SOP Versions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "sop_versions" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sop_id"          uuid NOT NULL,
  "version_number"  integer NOT NULL,
  "title"           text NOT NULL,
  "content"         text NOT NULL,
  "indexing_status" text NOT NULL DEFAULT 'draft',
  "created_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "published_at"    timestamp with time zone
);

ALTER TABLE "sop_versions"
  ADD CONSTRAINT "sop_versions_sop_id_sops_id_fk"
  FOREIGN KEY ("sop_id") REFERENCES "public"."sops"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "sop_versions"
  ADD CONSTRAINT "sop_versions_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sop_versions_sop_number"
  ON "sop_versions" USING btree ("sop_id", "version_number");

CREATE INDEX IF NOT EXISTS "idx_sop_versions_sop_created"
  ON "sop_versions" USING btree ("sop_id", "created_at");

-- Now add the FK from sops.published_version_id → sop_versions.id
ALTER TABLE "sops"
  ADD CONSTRAINT "sops_published_version_id_sop_versions_id_fk"
  FOREIGN KEY ("published_version_id") REFERENCES "public"."sop_versions"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SOP Attachments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "sop_attachments" (
  "id"                        uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sop_version_id"            uuid NOT NULL,
  "filename"                  text NOT NULL,
  "media_type"                text NOT NULL,
  "size"                      integer NOT NULL,
  "checksum"                  text NOT NULL,
  "data"                      bytea NOT NULL,
  "extraction_status"         text NOT NULL DEFAULT 'pending',
  "extracted_text"            text,
  "extraction_error"          text,
  "extracted_at"              timestamp with time zone,
  "parser_version"            text,
  "extracted_character_count" integer,
  "extraction_metadata"       jsonb,
  "uploaded_by"               uuid,
  "created_at"                timestamp with time zone DEFAULT now()
);

ALTER TABLE "sop_attachments"
  ADD CONSTRAINT "sop_attachments_sop_version_id_sop_versions_id_fk"
  FOREIGN KEY ("sop_version_id") REFERENCES "public"."sop_versions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "sop_attachments"
  ADD CONSTRAINT "sop_attachments_uploaded_by_users_id_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sop_attachments_version_filename"
  ON "sop_attachments" USING btree ("sop_version_id", "filename");

CREATE INDEX IF NOT EXISTS "idx_sop_attachments_version"
  ON "sop_attachments" USING btree ("sop_version_id");

CREATE INDEX IF NOT EXISTS "idx_sop_attachments_version_extraction"
  ON "sop_attachments" USING btree ("sop_version_id", "extraction_status");

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Documents (Vector Store)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "documents" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type"              text NOT NULL,
  "title"             text NOT NULL,
  "content"           text NOT NULL,
  "chunk_index"       integer DEFAULT 0,
  "parent_id"         uuid,
  "source_id"         uuid,
  "sop_version_id"    uuid,
  "sop_attachment_id" uuid,
  "embedding"         vector(1536),
  "metadata"          jsonb DEFAULT '{}'::jsonb,
  "status"            text DEFAULT 'draft',
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now()
);

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_sop_version_id_sop_versions_id_fk"
  FOREIGN KEY ("sop_version_id") REFERENCES "public"."sop_versions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_sop_attachment_id_sop_attachments_id_fk"
  FOREIGN KEY ("sop_attachment_id") REFERENCES "public"."sop_attachments"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_documents_embedding"
  ON "documents" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "idx_documents_type_source"
  ON "documents" USING btree ("type", "source_id");

CREATE INDEX IF NOT EXISTS "idx_documents_sop_version"
  ON "documents" USING btree ("sop_version_id");

CREATE INDEX IF NOT EXISTS "idx_documents_sop_attachment"
  ON "documents" USING btree ("sop_attachment_id");

CREATE INDEX IF NOT EXISTS "idx_documents_status"
  ON "documents" USING btree ("status");

-- Full-text search index (language-neutral, using 'simple' dictionary)
CREATE INDEX IF NOT EXISTS "idx_documents_search"
  ON "documents"
  USING gin (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("content", '')));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Chats
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "chats" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title"      text DEFAULT 'New Chat',
  "visitor_id" text,
  "user_id"    uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "chats"
  ADD CONSTRAINT "chats_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_chats_visitor_id"
  ON "chats" USING btree ("visitor_id", "updated_at");

CREATE INDEX IF NOT EXISTS "idx_chats_user_id"
  ON "chats" USING btree ("user_id", "updated_at");

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Messages
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "messages" (
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

CREATE INDEX IF NOT EXISTS "idx_messages_chat_id"
  ON "messages" USING btree ("chat_id", "created_at");

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. App Config (AI Model & Retrieval Configuration)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "app_config" (
  "id"                             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "embedding_base_url"             text,
  "embedding_model"                text,
  "embedding_api_key"              text,
  "llm_base_url"                   text,
  "llm_model"                      text,
  "llm_api_key"                    text,
  "ai_persona"                     text NOT NULL DEFAULT 'You are a helpful assistant for PostIt AI.',
  "ai_tone"                        text NOT NULL DEFAULT 'professional',
  "ai_detail_level"                text NOT NULL DEFAULT 'medium',
  "ai_language"                    text NOT NULL DEFAULT 'same_as_user',
  "ai_use_emoji"                   boolean NOT NULL DEFAULT false,
  "response_knowledge_only"        boolean NOT NULL DEFAULT true,
  "response_no_hallucination"      boolean NOT NULL DEFAULT true,
  "response_fallback_message"      text NOT NULL DEFAULT 'Informasi belum tersedia dalam Knowledge Base. Silakan hubungi administrator atau pihak terkait.',
  "response_forbidden_words"       jsonb NOT NULL DEFAULT '[]'::jsonb,
  "response_required_words"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "retrieval_top_k"                integer NOT NULL DEFAULT 5,
  "retrieval_similarity_threshold" double precision NOT NULL DEFAULT 0.5,
  "retrieval_source_priority"      text NOT NULL DEFAULT 'balanced',
  "retrieval_selection_rule"       text NOT NULL DEFAULT 'highest_score',
  "retrieval_max_context_documents" integer NOT NULL DEFAULT 5,
  "is_active"                      text DEFAULT 'false',
  "updated_by"                     uuid,
  "created_at"                     timestamp with time zone DEFAULT now(),
  "updated_at"                     timestamp with time zone DEFAULT now()
);

ALTER TABLE "app_config"
  ADD CONSTRAINT "app_config_updated_by_users_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Audit Logs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id"       uuid,
  "actor_username" text NOT NULL,
  "actor_role"     text NOT NULL,
  "action"         text NOT NULL,
  "entity_type"    text NOT NULL,
  "entity_id"      text,
  "metadata"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ip_address"     text,
  "user_agent"     text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"
  ON "audit_logs" USING btree ("created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_created"
  ON "audit_logs" USING btree ("actor_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_created"
  ON "audit_logs" USING btree ("entity_type", "entity_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_created"
  ON "audit_logs" USING btree ("action", "created_at");
