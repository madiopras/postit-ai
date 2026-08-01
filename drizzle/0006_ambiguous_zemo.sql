ALTER TABLE "chats" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "sops" ADD COLUMN "requires_login" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chats_user_id" ON "chats" USING btree ("user_id","updated_at");