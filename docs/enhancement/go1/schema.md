# Database Schema — PostIt AI

## 1. Overview

Menggunakan **PostgreSQL 16** dengan **pgvector** extension.  
ORM: **Drizzle ORM** dengan koneksi pool via `@neondatabase/serverless` atau `postgres.js`.

### 1.1 Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 2. Table: `documents`

Vector storage untuk FAQ dan SOP chunks. Ini adalah tabel utama untuk RAG search.

```sql
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('faq', 'sop')),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  chunk_index   INT DEFAULT 0,
  parent_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
  source_id     UUID,                              -- FK ke faqs.id atau sops.id
  embedding     VECTOR(1536),
  metadata      JSONB DEFAULT '{}',
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'error')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_source_id ON documents(source_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 2.1 Drizzle Schema Definition

```typescript
import { pgTable, uuid, text, integer, vector, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull().$type<'faq' | 'sop'>(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').default(0),
  parentId: uuid('parent_id'),
  sourceId: uuid('source_id'),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata').default({}),
  status: text('status').default('draft').$type<'draft' | 'published' | 'error'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

---

## 3. Table: `faqs`

Master data untuk FAQ. Setiap FAQ di-index ke `documents` (type='faq').

```sql
CREATE TABLE faqs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  category      TEXT,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'error')),
  usage_count   INT DEFAULT 0,
  accuracy      FLOAT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_faqs_status ON faqs(status);
CREATE INDEX idx_faqs_category ON faqs(category);
```

### 3.1 Drizzle Schema

```typescript
export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category'),
  status: text('status').default('draft').$type<'draft' | 'published' | 'error'>(),
  usageCount: integer('usage_count').default(0),
  accuracy: integer('accuracy').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

---

## 4. Table: `sops`

Master data untuk SOP. SOP bisa panjang, di-chunk otomatis ke `documents` (type='sop').

```sql
CREATE TABLE sops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  category      TEXT,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'error')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sops_status ON sops(status);
CREATE INDEX idx_sops_category ON sops(category);
```

### 4.1 Drizzle Schema

```typescript
export const sops = pgTable('sops', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  status: text('status').default('draft').$type<'draft' | 'published' | 'error'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

---

## 5. Table: `chats`

Session chat. Tidak ada relasi ke user karena chat bersifat publik (tanpa login).

```sql
CREATE TABLE chats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT DEFAULT 'New Chat',
  session_id    TEXT,                 -- Untuk identifikasi session publik
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chats_session ON chats(session_id);
```

### 5.1 Drizzle Schema

```typescript
export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').default('New Chat'),
  sessionId: text('session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

---

## 6. Table: `messages`

Pesan dalam chat. Menyimpan konten dan sumber referensi.

```sql
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  sources       JSONB DEFAULT '[]',    -- [{title, content, type, score}]
  feedback      TEXT CHECK (feedback IN ('thumbs_up', 'thumbs_down', NULL)),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
```

### 6.1 Drizzle Schema

```typescript
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type<'user' | 'assistant'>(),
  content: text('content').notNull(),
  sources: jsonb('sources').default([]),
  feedback: text('feedback').$type<'thumbs_up' | 'thumbs_down'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

---

## 7. Entity Relationship Diagram

```
┌───────────┐       ┌──────────────┐       ┌───────────┐
│   faqs    │       │  documents   │       │   sops    │
├───────────┤       ├──────────────┤       ├───────────┤
│ id (PK)   │──┐    │ id (PK)      │    ┌──│ id (PK)   │
│ question  │  │    │ type         │    │  │ title     │
│ answer    │  │    │ title        │    │  │ content   │
│ category  │  │    │ content      │    │  │ category  │
│ status    │  │    │ chunk_index  │    │  │ status    │
│ usage_cnt │  │    │ parent_id    │    │  │ created_at│
│ accuracy  │  │    │ source_id    │──┐ │  │ updated_at│
│ created_at│  │    │ embedding    │  │ │  └───────────┘
│ updated_at│  │    │ metadata     │  │ │       │
└───────────┘  │    │ status       │  │ │       │
               │    │ created_at   │  │ │       │
               │    │ updated_at   │  │ │       │
               │    └──────────────┘  │ │       │
               └──────────────────────┘ │       │
                                         │       │
                                   ┌─────┘       │
                                   │             │
                              ┌────┴─────────────┴──┐
                              │       chats         │
                              ├─────────────────────┤
                              │ id (PK)             │
                              │ title               │
                              │ session_id          │
                              │ created_at          │
                              │ updated_at          │
                              └─────────┬───────────┘
                                        │ 1:N
                                        ▼
                              ┌─────────────────────┐
                              │      messages       │
                              ├─────────────────────┤
                              │ id (PK)             │
                              │ chat_id (FK)        │
                              │ role                │
                              │ content             │
                              │ sources (JSONB)     │
                              │ feedback            │
                              │ created_at          │
                              └─────────────────────┘
```

### 7.1 Relationship Summary

| Source | Target | Type | Via |
|--------|--------|------|-----|
| `faqs` | `documents` | 1:N | `documents.source_id` = `faqs.id` |
| `sops` | `documents` | 1:N | `documents.source_id` = `sops.id` |
| `documents` | `documents` | 1:N | `documents.parent_id` = `documents.id` (self-referencing untuk chunks) |
| `chats` | `messages` | 1:N | `messages.chat_id` = `chats.id` |

---

## 8. Indexing Strategy

### 8.1 Vector Search Index

```sql
-- IVFFlat index for approximate nearest neighbor search
CREATE INDEX idx_documents_embedding 
ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

- `lists = 100` optimal untuk dataset < 100K baris
- Gunakan `vector_cosine_ops` karena embedding OpenAI menggunakan cosine similarity

### 8.2 B-tree Indexes

| Table | Column | Index Name | Purpose |
|-------|--------|------------|---------|
| `documents` | `type` | `idx_documents_type` | Filter by type (faq/sop) |
| `documents` | `source_id` | `idx_documents_source_id` | Join ke faqs/sops |
| `documents` | `status` | `idx_documents_status` | Filter draft/published/error |
| `faqs` | `status` | `idx_faqs_status` | Filter by status |
| `faqs` | `category` | `idx_faqs_category` | Filter by category |
| `sops` | `status` | `idx_sops_status` | Filter by status |
| `sops` | `category` | `idx_sops_category` | Filter by category |
| `chats` | `session_id` | `idx_chats_session` | Lookup by session |
| `messages` | `chat_id` | `idx_messages_chat_id` | Join ke chats |

### 8.3 Search Query (Vector Similarity)

```sql
-- Cari dokumen similar dengan query embedding
SELECT 
  d.id,
  d.type,
  d.title,
  d.content,
  d.chunk_index,
  1 - (d.embedding <=> $query_embedding) AS similarity
FROM documents d
WHERE d.status = 'published'
ORDER BY d.embedding <=> $query_embedding
LIMIT 10;
```

Gunakan `<=>` (cosine distance) untuk mencocokkan dengan embedding dari 9router.

---

## 9. Migrations

Gunakan Drizzle Kit untuk manage migrations:

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Drop & recreate (dev only)
npx drizzle-kit drop
npx drizzle-kit push
```

### 9.1 drizzle.config.ts

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## 10. Docker Compose

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: simpleai
      POSTGRES_USER: simpleai
      POSTGRES_PASSWORD: simpleai
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U simpleai -d simpleai"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata: