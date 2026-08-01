-- Migration 0014: Add retrieval configuration columns to app_config
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "retrieval_top_k" integer DEFAULT 5 NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "retrieval_similarity_threshold" double precision DEFAULT 0.5 NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "retrieval_source_priority" text DEFAULT 'balanced' NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "retrieval_selection_rule" text DEFAULT 'highest_score' NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "retrieval_max_context_documents" integer DEFAULT 5 NOT NULL;
