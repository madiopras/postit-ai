INSERT INTO "sop_versions" (
	"id",
	"sop_id",
	"version_number",
	"title",
	"content",
	"indexing_status",
	"created_at",
	"published_at"
)
SELECT
	gen_random_uuid(),
	"id",
	1,
	"title",
	"content",
	CASE
		WHEN "status" = 'published' THEN 'ready'
		WHEN "status" = 'error' THEN 'error'
		ELSE 'draft'
	END,
	COALESCE("created_at", now()),
	CASE WHEN "status" = 'published' THEN COALESCE("updated_at", now()) END
FROM "sops";
--> statement-breakpoint
UPDATE "sops"
SET "published_version_id" = "sop_versions"."id"
FROM "sop_versions"
WHERE
	"sop_versions"."sop_id" = "sops"."id"
	AND "sop_versions"."version_number" = 1
	AND "sops"."status" = 'published';
--> statement-breakpoint
UPDATE "documents"
SET "sop_version_id" = "sop_versions"."id"
FROM "sop_versions"
WHERE
	"documents"."type" = 'sop'
	AND "documents"."source_id" = "sop_versions"."sop_id"
	AND "sop_versions"."version_number" = 1;
--> statement-breakpoint
ALTER TABLE "sops"
ADD CONSTRAINT "sops_published_version_id_sop_versions_id_fk"
FOREIGN KEY ("published_version_id")
REFERENCES "public"."sop_versions"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;
