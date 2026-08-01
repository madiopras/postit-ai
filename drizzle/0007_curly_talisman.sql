CREATE TABLE "sop_versions" (
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
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "sop_version_id" uuid;--> statement-breakpoint
ALTER TABLE "sops" ADD COLUMN "published_version_id" uuid;--> statement-breakpoint
ALTER TABLE "sop_versions" ADD CONSTRAINT "sop_versions_sop_id_sops_id_fk" FOREIGN KEY ("sop_id") REFERENCES "public"."sops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sop_versions" ADD CONSTRAINT "sop_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sop_versions_sop_number" ON "sop_versions" USING btree ("sop_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_sop_versions_sop_created" ON "sop_versions" USING btree ("sop_id","created_at");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_sop_version_id_sop_versions_id_fk" FOREIGN KEY ("sop_version_id") REFERENCES "public"."sop_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_sop_version" ON "documents" USING btree ("sop_version_id");