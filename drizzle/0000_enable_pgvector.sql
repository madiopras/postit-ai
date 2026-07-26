-- Enable pgvector before any table that declares a `vector` column.
-- drizzle-kit never generates extension statements, so this migration is
-- hand-written and must stay ordered ahead of the schema migration.
CREATE EXTENSION IF NOT EXISTS vector;
