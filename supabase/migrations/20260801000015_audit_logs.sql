-- Migration 0015: Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid,
  "actor_username" text NOT NULL,
  "actor_role" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_id_users_id_fk'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_actor_id_users_id_fk"
      FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"
  ON "audit_logs" USING btree ("created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_created"
  ON "audit_logs" USING btree ("actor_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_created"
  ON "audit_logs" USING btree ("entity_type", "entity_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_created"
  ON "audit_logs" USING btree ("action", "created_at");
