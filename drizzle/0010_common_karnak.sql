ALTER TABLE "documents" ADD COLUMN "sop_attachment_id" uuid;--> statement-breakpoint
ALTER TABLE "sop_attachments" ADD COLUMN "extraction_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "sop_attachments" ADD COLUMN "extracted_text" text;--> statement-breakpoint
ALTER TABLE "sop_attachments" ADD COLUMN "extraction_error" text;--> statement-breakpoint
ALTER TABLE "sop_attachments" ADD COLUMN "extracted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sop_attachments" ADD COLUMN "parser_version" text;--> statement-breakpoint
ALTER TABLE "sop_attachments" ADD COLUMN "extracted_character_count" integer;--> statement-breakpoint
ALTER TABLE "sop_attachments" ADD COLUMN "extraction_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_sop_attachment_id_sop_attachments_id_fk" FOREIGN KEY ("sop_attachment_id") REFERENCES "public"."sop_attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_sop_attachment" ON "documents" USING btree ("sop_attachment_id");--> statement-breakpoint
CREATE INDEX "idx_sop_attachments_version_extraction" ON "sop_attachments" USING btree ("sop_version_id","extraction_status");