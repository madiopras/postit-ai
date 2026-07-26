ALTER TABLE "chats" ADD COLUMN "visitor_id" text;--> statement-breakpoint
CREATE INDEX "idx_chats_visitor_id" ON "chats" USING btree ("visitor_id","updated_at");