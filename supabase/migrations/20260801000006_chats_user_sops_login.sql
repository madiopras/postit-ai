-- Migration 0006: Add user_id to chats, requires_login to sops
-- (idempotent — columns may already exist from migration 0003/0001)
ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "sops" ADD COLUMN IF NOT EXISTS "requires_login" boolean DEFAULT false NOT NULL;

-- FK and index may already exist; use DO block for safety
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chats_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "chats"
      ADD CONSTRAINT "chats_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_chats_user_id"
  ON "chats" USING btree ("user_id", "updated_at");
