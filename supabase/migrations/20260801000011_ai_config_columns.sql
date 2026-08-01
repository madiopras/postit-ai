-- Migration 0011: Add AI configuration columns to app_config
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "ai_persona" text DEFAULT 'You are a helpful assistant for PostIt AI.' NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "ai_tone" text DEFAULT 'professional' NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "ai_detail_level" text DEFAULT 'medium' NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "ai_language" text DEFAULT 'same_as_user' NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "ai_use_emoji" boolean DEFAULT false NOT NULL;
