# Architecture — PostIt AI

## 1. System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 16 App                       │
│  ┌────────────────────────────────────────────────┐     │
│  │              Browser (Client)                   │     │
│  │  ┌──────────┐  ┌───────────────────────────┐   │     │
│  │  │ Chat UI  │  │      Dashboard UI          │   │     │
│  │  │ (Publik) │  │  (Login Required)          │   │     │
│  │  └────┬─────┘  └──────────┬────────────────┘   │     │
│  └───────┼───────────────────┼────────────────────┘     │
│          │                   │                          │
│  ┌───────┴───────────────────┴────────────────────┐     │
│  │              Next.js API Layer                   │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │     │
│  │  │ /api/chat │  │ /api/faq │  │ /api/sop     │  │     │
│  │  │ (Stream) │  │ (CRUD)   │  │ (CRUD+Chunk) │  │     │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │     │
│  │       │              │               │          │     │
│  │  ┌────┴──────────────┴───────────────┴────┐     │     │
│  │  │         Server Actions + Services       │     │     │
│  │  └────────────────┬───────────────────────┘     │     │
│  └───────────────────┼────────────────────────────┘     │
│                      │                                  │
│  ┌───────────────────┼────────────────────────────┐     │
│  │    NextAuth.js v5 │ (Credentials, JWT)         │     │
│  │    Middleware     │ (route protection)         │     │
│  └───────────────────┼────────────────────────────┘     │
└──────────────────────┼──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌─────────────────┐       ┌──────────────────────┐
│   9router API    │       │   PostgreSQL +        │
│  localhost:20128 │       │   pgvector (Docker)   │
│  /v1/embeddings  │       │                       │
│  /v1/chat/comp.  │       │  - documents (vector) │
└─────────────────┘       │  - faqs               │
                           │  - sops               │
                           │  - chats              │
                           │  - messages           │
                           │  - app_config         │ ← NEW
                           └──────────────────────┘
```

## 2. Architecture Layers

### 2.1 Presentation Layer (Client Components)
- **Chat UI** (`app/page.tsx`): Full public chat interface
- **Dashboard** (`app/dashboard/*`): Admin pages (protected by middleware)
  - **Config Page** (`app/dashboard/config/page.tsx`): UI untuk mengelola konfigurasi model AI
- Hanya menggunakan Client Components untuk interaktivitas
- Server Components untuk layout dan data fetching awal

### 2.2 API Layer (Route Handlers)
- `/api/chat` — POST, streaming response dengan RAG
- `/api/faq` — GET/POST, list & create FAQ
- `/api/faq/[id]` — PUT/DELETE, update & delete FAQ
- `/api/sop` — GET/POST, list & create SOP
- `/api/sop/[id]` — PUT/DELETE, update & delete SOP
- `/api/auth/*` — NextAuth.js endpoints
- `/api/config` — GET/PUT, baca & update konfigurasi model AI
- `/api/config/test` — POST, test koneksi ke endpoint embedding/LLM
- `/api/stats` — GET, dashboard statistics

### 2.3 Service Layer
- `lib/config.ts` — **NEW**: Config loader yang membaca dari `app_config` table (fallback ke env)
- `lib/embedding.ts` — Wrapper untuk endpoint embedding, membaca konfigurasi dari `lib/config.ts`
- `lib/llm.ts` — Wrapper untuk endpoint LLM, membaca konfigurasi dari `lib/config.ts`
- `lib/rag.ts` — RAG pipeline: embed → search pgvector → inject context
- `lib/vector-sync.ts` — Sync data ke pgvector
- `lib/chunking.ts` — Text chunking untuk SOP panjang

### 2.4 Data Layer (Drizzle ORM)
- `db/schema.ts` — All table definitions (including `app_config`)
- `db/index.ts` — Database connection pool

### 2.5 Auth Layer
- `auth.ts` — NextAuth.js v5 config (Credentials provider)
- `auth.config.ts` — Auth configuration
- `middleware.ts` — Route protection for /dashboard/*

### 2.6 Config Layer (NEW)
- `lib/config.ts` — Central config loader dengan prioritas:
  1. Cari row aktif di `app_config` table
  2. Jika tidak ada, fallback ke environment variable
  3. Cache in-memory (singleton) untuk menghindari query berulang
- Semua service (embedding, LLM) menggunakan `lib/config.ts` untuk mendapatkan konfigurasi

```
┌─────────────────────────────────────────────┐
│              lib/config.ts                   │
│                                              │
│  getConfig() → {                             │
│    embeddingBaseUrl?: string                 │
│    embeddingModel?: string                   │
│    embeddingApiKey?: string                  │
│    llmBaseUrl?: string                       │
│    llmModel?: string                         │
│    llmApiKey?: string                        │
│  }                                           │
│                                              │
│  Prioritas: DB > ENV > Default               │
└─────────────────────────────────────────────┘
```

## 3. RAG Pipeline Flow

```
User Input → getConfig() → Embedding API (dinamis) → pgvector cosine search → 
Top 5 FAQ + Top 5 SOP chunks → System prompt injection → 
getConfig() → LLM (dinamis) → Streaming response + source citations
```

### 3.1 Detail
1. User submits question via chat UI
2. `/api/chat` membaca konfigurasi dari `lib/config.ts` untuk mendapatkan endpoint & model
3. Request embedding dikirim ke `{embeddingBaseUrl}/embeddings` dengan model `{embeddingModel}`
4. Hasil embedding digunakan untuk similarity search di `documents` table
5. Ambil top 5 FAQ chunks + top 5 SOP chunks
6. Context digabung ke system prompt:

```
You are a helpful assistant for PostIt AI.
Answer based on the following context:

[FAQ chunks...]
[SOP chunks...]

Question: {user_question}
Answer with sources.
```

7. LLM streaming response dari `{llmBaseUrl}/chat/completions` dengan model `{llmModel}`
8. Setiap pesan assistant menyertakan `sources` JSONB

## 4. Data Flow for Vector Sync

### 4.1 Create/Update FAQ
```
Create FAQ → Drizzle insert `faqs` → getConfig() → embed question+answer → 
insert/update `documents` (type='faq') → set status='published'
```

### 4.2 Create/Update SOP
```
Create SOP → Drizzle insert `sops` → chunk content (500-800 tokens) → 
getConfig() → embed setiap chunk → insert `documents` (type='sop', chunk_index) → 
set status='published'
```

### 4.3 Delete
```
Delete FAQ/SOP → Drizzle delete from source table → 
delete from `documents` WHERE type='faq'/'sop' AND parent_id=id
```

## 5. Auth Flow

```
User visit /dashboard/* → middleware.ts check session →
  No session → redirect /auth/login →
  Has session → render dashboard

Login: POST /api/auth/callback/credentials →
  Verify email/password against env vars →
  Create JWT session (expire 24h) →
  Set httpOnly cookie
```

## 6. Configuration Flow (NEW)

```
Admin buka /dashboard/config →
  GET /api/config → baca dari app_config table →
  Tampilkan form dengan nilai saat ini (fallback env sebagai placeholder)

Admin edit field & klik "Test Connection" →
  POST /api/config/test { type: 'embedding' | 'llm', ... } →
  Server coba koneksi ke endpoint dengan parameter yang dimasukkan →
  Return success/failure

Admin klik "Save Configuration" →
  PUT /api/config { ... } →
  Server simpan ke app_config table (set is_active=false untuk row lama) →
  lib/config.ts invalidate cache →
  Return success response
```

## 7. Environment Variables (Baseline)

```env
# Database
DATABASE_URL=postgres://simpleai:simpleai@localhost:5432/simpleai

# 9router (AI) — FALLBACK jika tidak dikonfigurasi via dashboard
ROUTER_BASE_URL=http://localhost:20128/v1
ROUTER_API_KEY=sk-d484dc3894b87bd8-1uoge3-486e7e79
EMBEDDING_MODEL=text-embedding-ada-002
LLM_MODEL=gpt-4o-mini

# Admin Credentials
ADMIN_EMAIL=admin@postit.ai
ADMIN_PASSWORD=postit-admin-2024

# NextAuth
AUTH_SECRET=your-secret-here
AUTH_URL=http://localhost:3000
```

## 8. File Structure (Updated)

```
/app
  /page.tsx                    # Chat UI (publik)
  /layout.tsx                  # Root layout
  /globals.css                 # Global styles
  /api
    /chat/route.ts             # Chat endpoint (streaming)
    /faq/route.ts              # FAQ CRUD
    /faq/[id]/route.ts         # FAQ single CRUD
    /sop/route.ts              # SOP CRUD
    /sop/[id]/route.ts         # SOP single CRUD
    /config/route.ts           # Config GET/PUT         ← NEW
    /config/test/route.ts      # Config test connection  ← NEW
    /auth/[...nextauth]/route.ts # Auth handler
    /stats/route.ts            # Dashboard stats
  /auth
    /login/page.tsx            # Login page
  /dashboard
    /page.tsx                  # Overview
    /faq/page.tsx              # FAQ management
    /sop/page.tsx              # SOP listings
    /config/page.tsx           # Config management       ← NEW
    /layout.tsx                # Dashboard layout (sidebar+topbar)
/db
  /schema.ts                   # Drizzle schema (including app_config)
  /index.ts                    # DB connection
/lib
  /config.ts                   # Config loader (env + DB fallback) ← NEW
  /embedding.ts                # Embedding API wrapper (uses config.ts)
  /llm.ts                      # LLM API wrapper (uses config.ts)
  /rag.ts                      # RAG pipeline
  /vector-sync.ts              # Vector sync logic
  /chunking.ts                 # SOP chunking
  /auth.ts                     # Auth helpers
/components
  /chat                        # Chat UI components
  /dashboard                   # Dashboard components
  /ui                          # Reusable UI primitives
/docs                          # Documentation
/middleware.ts                 # Route protection
/auth.ts                       # NextAuth config
/auth.config.ts                # Auth config