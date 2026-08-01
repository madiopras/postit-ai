ALTER TABLE "app_config" ADD COLUMN "retrieval_top_k" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "retrieval_similarity_threshold" double precision DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "retrieval_source_priority" text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "retrieval_selection_rule" text DEFAULT 'highest_score' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "retrieval_max_context_documents" integer DEFAULT 5 NOT NULL;