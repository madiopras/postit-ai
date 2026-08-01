-- Migration 0016: Add full-text search GIN index on documents
CREATE INDEX IF NOT EXISTS "idx_documents_search"
  ON "documents" USING gin (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("content", '')));
