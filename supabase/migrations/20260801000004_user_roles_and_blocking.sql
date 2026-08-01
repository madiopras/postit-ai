-- Migration 0004: Add user role defaults, status, and blocking fields
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_by" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "block_reason" text;
