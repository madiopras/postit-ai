-- Migration 0012: Add response configuration columns to app_config
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "response_knowledge_only" boolean DEFAULT true NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "response_no_hallucination" boolean DEFAULT true NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "response_fallback_message" text DEFAULT 'Informasi belum tersedia dalam Knowledge Base. Silakan hubungi administrator atau pihak terkait.' NOT NULL;
