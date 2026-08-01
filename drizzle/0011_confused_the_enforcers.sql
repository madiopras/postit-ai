ALTER TABLE "app_config" ADD COLUMN "ai_persona" text DEFAULT 'You are a helpful assistant for PostIt AI.' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "ai_tone" text DEFAULT 'professional' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "ai_detail_level" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "ai_language" text DEFAULT 'same_as_user' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "ai_use_emoji" boolean DEFAULT false NOT NULL;