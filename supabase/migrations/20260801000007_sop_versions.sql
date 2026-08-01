-- Migration 0007: Create sop_versions table and link to documents/sops
CREATE TABLE IF NOT EXISTS "sop_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sop_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "indexing_status" text DEFAULT 'draft' NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "published_at" timestamp with time zone
);

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "sop_version_id" uuid;
ALTER TABLE "sops" ADD COLUMN IF NOT EXISTS "published_version_id" uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sop_versions_sop_id_sops_id_fk'
  ) THEN
    ALTER TABLE "sop_versions"
      ADD CONSTRAINT "sop_versions_sop_id_sops_id_fk"
      FOREIGN KEY ("sop_id") REFERENCES "public"."sops"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sop_versions_created_by_users_id_fk'
  ) THEN
    ALTER TABLE "sop_versions"
      ADD CONSTRAINT "sop_versions_created_by_users_id_fk"
      FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sop_versions_sop_number"
  ON "sop_versions" USING btree ("sop_id", "version_number");

CREATE INDEX IF NOT EXISTS "idx_sop_versions_sop_created"
  ON "sop_versions" USING btree ("sop_id", "created_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_sop_version_id_sop_versions_id_fk'
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_sop_version_id_sop_versions_id_fk"
      FOREIGN KEY ("sop_version_id") REFERENCES "public"."sop_versions"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_documents_sop_version"
  ON "documents" USING btree ("sop_version_id");
