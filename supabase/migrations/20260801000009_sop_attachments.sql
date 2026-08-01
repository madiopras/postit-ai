-- Migration 0009: Create sop_attachments table
CREATE TABLE IF NOT EXISTS "sop_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sop_version_id" uuid NOT NULL,
  "filename" text NOT NULL,
  "media_type" text NOT NULL,
  "size" integer NOT NULL,
  "checksum" text NOT NULL,
  "data" bytea NOT NULL,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sop_attachments_sop_version_id_sop_versions_id_fk'
  ) THEN
    ALTER TABLE "sop_attachments"
      ADD CONSTRAINT "sop_attachments_sop_version_id_sop_versions_id_fk"
      FOREIGN KEY ("sop_version_id") REFERENCES "public"."sop_versions"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sop_attachments_uploaded_by_users_id_fk'
  ) THEN
    ALTER TABLE "sop_attachments"
      ADD CONSTRAINT "sop_attachments_uploaded_by_users_id_fk"
      FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sop_attachments_version_filename"
  ON "sop_attachments" USING btree ("sop_version_id", "filename");

CREATE INDEX IF NOT EXISTS "idx_sop_attachments_version"
  ON "sop_attachments" USING btree ("sop_version_id");
