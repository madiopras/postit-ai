-- Migration 0003: Add visitor_id and user_id to chats, add indexes
ALTER TABLE "chats" ADD COLUMN "visitor_id" text;
ALTER TABLE "chats" ADD COLUMN "user_id" uuid;

ALTER TABLE "chats"
  ADD CONSTRAINT "chats_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX "idx_chats_visitor_id"
  ON "chats" USING btree ("visitor_id", "updated_at");

CREATE INDEX "idx_chats_user_id"
  ON "chats" USING btree ("user_id", "updated_at");
