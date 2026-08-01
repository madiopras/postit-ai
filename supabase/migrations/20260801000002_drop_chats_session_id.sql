-- Migration 0002: Drop session_id from chats, replace with visitor_id approach
ALTER TABLE "chats" DROP COLUMN IF EXISTS "session_id";
