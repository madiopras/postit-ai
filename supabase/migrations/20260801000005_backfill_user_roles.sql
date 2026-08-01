-- Migration 0005: Backfill user roles for Go2 role model
-- Existing Go1 accounts were all treated as full administrators regardless of
-- the stored role. Preserve that access for `admin`, while the unused `editor`
-- role becomes the operational Go2 `admin` role. Unknown legacy values are
-- downgraded to `user` rather than receiving administrative privileges.
UPDATE "users"
SET
  "role" = CASE
    WHEN "role" = 'admin' THEN 'super_admin'
    WHEN "role" = 'editor' THEN 'admin'
    WHEN "role" IN ('super_admin', 'user') THEN "role"
    ELSE 'user'
  END,
  "updated_at" = now();
