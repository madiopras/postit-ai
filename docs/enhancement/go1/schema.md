# Database Schema — PostIt AI

## 1. Overview

> **Status: terimplementasi.** Sumber kebenarannya adalah `lib/schema.ts` dan
> berkas di `drizzle/`. Dokumen ini disesuaikan dengan keduanya; perbedaan dari
> rencana awal diberi catatan.

Menggunakan **PostgreSQL 17** dengan extension **pgvector**.
ORM: **Drizzle ORM**, koneksi via **`postgres.js`** (`@neondatabase/serverless`
tidak jadi dipakai).

### 1.1 Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

`uuid-ossp` tidak diperlukan: seluruh primary key memakai `gen_random_uuid()`
yang sudah built-in sejak Postgres 13.

`CREATE EXTENSION` tidak bisa dihasilkan `drizzle-kit` dari introspeksi schema,
jadi ia ditulis tangan sebagai migration pertama (`0000_enable_pgvector.sql`) dan
**harus** berada sebelum migration yang membuat tabel `documents` — kolomnya
bertipe `vector`.

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

-- Indexes (lihat §10 untuk alasannya)
CREATE INDEX idx_documents_type_source ON documents(type, source_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_embedding ON documents USING hnsw (embedding vector_cosine_ops);
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
  usage_count   INT DEFAULT 0,       -- tidak pernah diisi kode mana pun
  accuracy      INTEGER DEFAULT 0,   -- tidak pernah diisi kode mana pun
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

Satu baris = satu **percakapan**. Tidak ada relasi ke user karena chat bersifat
publik (tanpa login).

> **Berbeda dari rencana:** kolomnya `visitor_id`, bukan `session_id`.
> Rancangan awal memakai satu kolom untuk dua hal sekaligus — identitas browser
> dan identitas percakapan — dan API mencari chat dengan `findFirst(session_id)`.
> Akibatnya **satu browser selamanya hanya bisa punya satu percakapan**, dan
> sidebar riwayat mustahil berisi lebih dari satu item. `visitor_id` kini
> menandai browser (UUID di localStorage), `id` menandai percakapan.

```sql
CREATE TABLE chats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT DEFAULT 'New Chat',
  visitor_id    TEXT,                 -- identitas browser, dari localStorage
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sidebar melisting percakapan satu pengunjung, terbaru dulu.
CREATE INDEX idx_chats_visitor_id ON chats(visitor_id, updated_at);
```

`visitor_id` bukan kredensial: setiap endpoint yang menerimanya tetap
memverifikasi kepemilikan di server dan menjawab 404 bila tidak cocok.

### 5.1 Drizzle Schema

```typescript
export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').default('New Chat'),
  visitorId: text('visitor_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_chats_visitor_id').on(table.visitorId, table.updatedAt),
]);
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

## 7. Table: `users`

Akun admin. Tidak ada registrasi publik — baris dibuat lewat `npm run seed:admin`.

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,          -- bcrypt, 12 rounds
  display_name  TEXT,
  role          TEXT DEFAULT 'admin',   -- 'admin' | 'editor'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

Login memakai **username**, bukan email — rencana awal menyebut
`ADMIN_EMAIL`/`ADMIN_PASSWORD` sebagai environment variable, tapi kredensial
akhirnya disimpan di tabel ini. `role` sudah ada di schema namun belum
dimanfaatkan: semua yang bisa login diperlakukan sebagai admin.

---

## 8. Table: `app_config`

Konfigurasi model AI yang bisa diubah dari dashboard tanpa deploy ulang.
Merangkap audit trail: tiap penyimpanan menyisipkan baris baru.

```sql
CREATE TABLE app_config (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding_base_url TEXT,
  embedding_model    TEXT,
  embedding_api_key  TEXT,                  -- AES-256-GCM, prefiks 'v1:'
  llm_base_url       TEXT,
  llm_model          TEXT,
  llm_api_key        TEXT,                  -- AES-256-GCM, prefiks 'v1:'
  is_active          TEXT DEFAULT 'false',  -- 'true' | 'false', BUKAN boolean
  updated_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

- Hanya baris dengan `is_active = 'true'` yang dipakai; sisanya riwayat.
- API key **dienkripsi** (`lib/crypto.ts`) memakai `CONFIG_ENCRYPTION_KEY`.
  Nilai tanpa prefiks `v1:` dianggap peninggalan plaintext, tetap terbaca, dan
  ikut terenkripsi pada penyimpanan berikutnya.
- Key yang gagal didekripsi (mis. `CONFIG_ENCRYPTION_KEY` dirotasi) tidak
  diteruskan apa adanya — akan jatuh ke nilai environment, karena mengirim
  ciphertext sebagai bearer token lebih buruk daripada tidak mengirim apa-apa.
- Tidak ada index: tabelnya kecil dan hanya dibaca lewat cache 30 detik.

---

## 9. Entity Relationship Diagram

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
                              │ visitor_id          │
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

## 10. Indexing Strategy

### 10.1 Vector Search Index

> **Berbeda dari rencana:** HNSW, bukan IVFFlat.

```sql
CREATE INDEX idx_documents_embedding
ON documents
USING hnsw (embedding vector_cosine_ops);
```

- **HNSW** tidak butuh training dan tidak punya parameter `lists` yang harus
  ditala ulang saat dataset tumbuh; IVFFlat perlu dibangun ulang begitu jumlah
  baris jauh melewati asumsi `lists`. Untuk knowledge base yang isinya
  bertambah sedikit-sedikit lewat dashboard, HNSW lebih tidak merepotkan.
- `vector_cosine_ops` **wajib cocok** dengan operator yang dipakai query
  (`<=>`). Index dengan opclass l2/ip hanya akan diabaikan planner.
- Index ini hanya terpakai bila query mengurutkan **jarak menaik** dan
  memakai `LIMIT`. Mengurutkan `1 - jarak` menghalanginya — dan itu justru
  bentuk yang sempat dipakai, lihat §10.3.

### 10.2 B-tree Indexes

Sembilan index, semuanya dihasilkan dari `lib/schema.ts`:

| Table | Column | Index Name | Purpose |
|-------|--------|------------|---------|
| `documents` | `(type, source_id)` | `idx_documents_type_source` | Sync & delete mencari pasangan ini bersamaan |
| `documents` | `status` | `idx_documents_status` | Filter `published` saat retrieval |
| `faqs` | `status` | `idx_faqs_status` | Filter daftar dashboard |
| `faqs` | `category` | `idx_faqs_category` | Filter daftar dashboard |
| `sops` | `status` | `idx_sops_status` | Filter daftar dashboard |
| `sops` | `category` | `idx_sops_category` | Filter daftar dashboard |
| `chats` | `(visitor_id, updated_at)` | `idx_chats_visitor_id` | Sidebar: percakapan pengunjung, terbaru dulu |
| `messages` | `(chat_id, created_at)` | `idx_messages_chat_id` | Memuat satu percakapan secara berurutan |

`(type, source_id)` sengaja gabungan: id sumber berasal dari tabel berbeda,
sehingga mencocokkan `source_id` saja bisa menghapus vektor milik entitas lain.

### 10.3 Search Query (Vector Similarity)

```sql
SELECT
  d.id, d.type, d.title, d.content, d.chunk_index,
  1 - (d.embedding <=> $query) AS similarity
FROM documents d
WHERE d.status = 'published'
  AND d.embedding IS NOT NULL
  AND 1 - (d.embedding <=> $query) >= $min_score
ORDER BY d.embedding <=> $query      -- jarak MENAIK = paling mirip dulu
LIMIT $limit;
```

Tiga hal yang dulu salah dan kini menjadi aturan:

1. **Urutkan jarak, bukan similarity.** `ORDER BY 1 - (embedding <=> $query)`
   diurutkan menaik oleh Postgres, artinya dokumen **paling tidak relevan**
   yang diambil duluan. Ini pernah terjadi dan membuat chatbot menjawab dari
   konteks acak selama berbulan-bulan.
2. **Ambang skor di `WHERE`, bukan setelah `LIMIT`.** Menyaring setelahnya
   membuang seluruh halaman ketika hasil teratas berada di bawah ambang.
3. **Bind vektor sebagai teks `'[1,2,3]'::vector`.** Array JS yang disisipkan
   ke template `sql` sampai ke Postgres sebagai *record*, dan query gagal
   dengan `cannot cast type record to vector`.

Ketiganya dijaga oleh `tests/retrieval.integration.test.ts`, yang menjalankan
query ini terhadap pgvector sungguhan di schema throwaway.

---

## 11. Migrations

**Gunakan `generate` + `migrate`, jangan `push`.** `push` menyimpulkan perubahan
dari introspeksi schema, sehingga tidak akan pernah menghasilkan
`CREATE EXTENSION vector` maupun index HNSW — keduanya wajib dan karenanya
hidup di berkas migration. `push` juga tidak meninggalkan jejak yang bisa
dijalankan di server tanpa akses interaktif.

```bash
npm run db:generate    # dari lib/schema.ts
npm run db:migrate     # terapkan yang tertunda
npm run db:studio      # Drizzle Studio
```

### 11.1 Riwayat migration

| Berkas | Isi |
|--------|-----|
| `0000_enable_pgvector.sql` | `CREATE EXTENSION IF NOT EXISTS vector` — ditulis tangan, wajib mendahului tabel `documents` |
| `0001_init_schema.sql` | 7 tabel + 9 index (termasuk HNSW) + 2 foreign key |
| `0002_drop_chats_session_id.sql` | Buang `session_id` dan indexnya |
| `0003_add_chats_visitor_id.sql` | Tambah `visitor_id` + index `(visitor_id, updated_at)` |

Perubahan `session_id` → `visitor_id` sengaja dipecah jadi dua migration:
`drizzle-kit` butuh terminal interaktif untuk menanyakan apakah itu rename atau
drop+create, dan tidak punya flag non-interaktif. Tabel `chats` masih kosong,
jadi drop-lalu-tambah setara dengan rename.

> Baseline sebelumnya adalah fiksi: satu-satunya migration hanya membuat tabel
> `documents` dengan kolom lama (tanpa `status`, `chunk_index`, `source_id`,
> `parent_id`), enam tabel lain tidak punya migration sama sekali, dan tabel
> `__drizzle_migrations` tidak pernah ada di database — semuanya dibangun lewat
> `push`. Baseline ditulis ulang dari nol dan diuji dari database kosong.

### 11.2 drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

// drizzle-kit berjalan di luar Next.js, jadi .env belum termuat.
// process.loadEnvFile bawaan Node (>= 20.12) — tanpa dependency dotenv.
try {
  process.loadEnvFile('.env');
} catch {
  // Tidak ada .env (mis. CI): pakai environment yang sudah ada.
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

export default defineConfig({
  schema: './lib/schema.ts',   // bukan ./db/schema.ts
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
});
```

---

## 12. Docker Compose

```yaml
# docker-compose.yml
services:
  db:
    image: pgvector/pgvector:pg17
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