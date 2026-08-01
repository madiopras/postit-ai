-- Migration 0010: Add extraction columns to sop_attachments and link documents
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "sop_attachment_id" uuid;

ALTER TABLE "sop_attachments" ADD COLUMN IF NOT EXISTS "extraction_status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "sop_attachments" ADD COLUMN IF NOT EXISTS "extracted_text" text;
ALTER TABLE "sop_attachments" ADD COLUMN IF NOT EXISTS "extraction_error" text;
ALTER TABLE "sop_attachments" ADD COLUMN IF NOT EXISTS "extracted_at" timestamp with time zone;
ALTER TABLE "sop_attachments" ADD COLUMN IF NOT EXISTS "parser_version" text;
ALTER TABLE "sop_attachments" ADD COLUMN IF NOT EXISTS "extracted_character_count" integer;
ALTER TABLE "sop_attachments" ADD COLUMN IF NOT EXISTS "extraction_metadata" jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_sop_attachment_id_sop_attachments_id_fk'
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_sop_attachment_id_sop_attachments_id_fk"
      FOREIGN KEY ("sop_attachment_id") REFERENCES "public"."sop_attachments"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_documents_sop_attachment"
  ON "documents" USING btree ("sop_attachment_id");

CREATE INDEX IF NOT EXISTS "idx_sop_attachments_version_extraction"
  ON "sop_attachments" USING btree ("sop_version_id", "extraction_status");
