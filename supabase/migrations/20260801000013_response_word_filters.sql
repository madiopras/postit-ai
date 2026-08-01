-- Migration 0013: Add response word filter columns to app_config
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "response_forbidden_words" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "response_required_words" jsonb DEFAULT '[]'::jsonb NOT NULL;
