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
│  │    jose + bcrypt  │ (Credentials, JWT 7d)      │     │
│  │    proxy.ts       │ (allow-list auth)          │     │
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
Publik:
- `/api/chat` — POST, jawaban RAG sebagai SSE
- `/api/chat/sessions` — GET, daftar percakapan milik satu `visitorId`
- `/api/chat/sessions/[id]` — GET riwayat, DELETE percakapan
- `/api/feedback/[messageId]` — PATCH thumbs up/down
- `/api/auth/login`, `/api/auth/logout`

Terproteksi JWT:
- `/api/faq` — GET/POST · `/api/faq/[id]` — GET/PUT/DELETE
- `/api/faq/[id]/sync` — POST, embed ulang satu FAQ
- `/api/faq/import-export` — GET ekspor CSV, POST impor
- `/api/sop` — GET/POST/DELETE · `/api/sop/[id]` — GET/PUT/DELETE
- `/api/documents` — GET, isi vector store
- `/api/documents/[id]/resync` — POST, bangun ulang dari record sumber
- `/api/stats` — GET, agregat dashboard
- `/api/config` — GET/PUT · `/api/config/test` — POST

Route publik yang menerima `visitorId` memverifikasi kepemilikan di server dan
menjawab 404 bila tidak cocok, sehingga id percakapan tidak bisa dienumerasi.

### 2.3 Service Layer
- `lib/config.ts` — Config loader dari `app_config` (fallback ke env), cache 30 detik
- `lib/embedding.ts` — Wrapper untuk endpoint embedding, membaca konfigurasi dari `lib/config.ts`
- `lib/llm.ts` — Wrapper untuk endpoint LLM, membaca konfigurasi dari `lib/config.ts`
- `lib/rag.ts` — `retrieveSources()` dan `ragStreamFromSources()` dipisah supaya
  pemanggil yang sudah butuh sources tidak melakukan embed dua kali
- `lib/crypto.ts` — AES-256-GCM untuk API key di `app_config`
- `lib/stats.ts` — Agregasi dashboard, dihitung di SQL
- `lib/sse.ts` — Parser frame SSE untuk klien chat
- `lib/rate-limit.ts` — Sliding window per IP untuk `/api/chat`
- `lib/vector-sync.ts` — Sync data ke pgvector
- `lib/chunking.ts` — Text chunking untuk SOP panjang

### 2.4 Data Layer (Drizzle ORM)
- `lib/schema.ts` — Definisi 7 tabel (termasuk `app_config`)
- `lib/db.ts` — Koneksi postgres-js

### 2.5 Auth Layer
- `lib/auth.ts` — Hash/compare bcrypt, sign/verify JWT (jose), `requireAuth()`
- `proxy.ts` — Allow-list rute (Next 16 mengganti nama `middleware.ts`)

  Tidak ada `auth.ts`/`auth.config.ts` NextAuth: paket itu terpasang tapi tidak
  pernah dipakai, dan sudah dihapus.

### 2.6 Config Layer
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
User Input → getConfig() → Embedding API (dinamis, SATU panggilan) →
pgvector cosine search (published, urut jarak menaik) → Top 5 gabungan →
System prompt injection → getConfig() → LLM (dinamis) →
Streaming SSE + source citations
```

### 3.1 Detail
1. User submits question via chat UI
2. `/api/chat` membaca konfigurasi dari `lib/config.ts` untuk mendapatkan endpoint & model
3. Request embedding dikirim ke `{embeddingBaseUrl}/embeddings` dengan model `{embeddingModel}`
4. Hasil embedding digunakan untuk similarity search di `documents` table
5. Ambil **5 chunk teratas secara gabungan** — bukan 5 FAQ ditambah 5 SOP.
   Peringkatnya murni berdasarkan kemiripan, jadi jawaban tidak dipaksa memuat
   SOP yang tidak relevan hanya karena kuotanya ada
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
9. Frame SSE terakhir (`event: done`) membawa `chatId`, `messageId`, `sources`,
   dan `usage` — klien butuh id-nya untuk menampilkan sitasi dan mengirim feedback

### 3.2 Hal yang berbeda dari rencana

- **Embedding hanya sekali per pesan.** Route dan `ragStream()` sempat sama-sama
  melakukan embed + search, sehingga tiap pesan membayar dua kali. `lib/rag.ts`
  kini memisahkan `retrieveSources()` dari `ragStreamFromSources()`.
- **Urutan berdasarkan jarak menaik** (`embedding <=> query`), bukan similarity.
  Ini bentuk yang bisa dilayani index HNSW, dan ambang `minScore` diterapkan di
  `WHERE` supaya `LIMIT` memilih dari kandidat yang sudah lolos ambang.
- **Hanya dokumen `published`** yang ikut dicari.
- **Rate limit 20 permintaan/menit per IP** di `/api/chat`, karena endpoint ini
  publik dan langsung menjadi corong ke API LLM berbayar.

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

NextAuth tidak jadi dipakai. Autentikasinya JWT langsung dengan `jose` +
`bcryptjs`, dan admin adalah baris di tabel `users` — bukan kredensial di
environment. Sesi berlaku 7 hari.

```
Login: POST /api/auth/login { username, password } →
  Cari user di tabel users →
  bcrypt.compare →
  jose SignJWT (HS256, 7 hari) →
  Set cookie httpOnly `simpleai_token`

Kunjungan berikutnya → proxy.ts (Next 16; dulu middleware.ts):
  Path ada di allow-list publik? → lanjut
  Tidak → verifikasi JWT dari cookie
    valid   → suntikkan x-user-id / x-user-role, lanjut
    invalid → halaman: redirect /login?redirect=…
              API   : 401 JSON (redirect ke HTML akan tampak sebagai 200 tak terparse)
```

**Allow-list, bukan deny-list.** Yang publik hanya `/`, `/login`,
`/api/auth/*`, `/api/chat`, `/api/chat/sessions*`, `/api/feedback/*`; selain itu
wajib JWT. Berkas statis (ekstensi gambar, `robots.txt`, dsb.) dikecualikan di
`matcher` — tanpa itu seluruh isi `public/` ikut diarahkan ke halaman login.

Proxy hanya cek optimistik: dokumentasi Next.js menyatakan Proxy tidak layak
jadi satu-satunya lapisan otorisasi, jadi setiap route handler admin juga
memanggil `requireAuth()` sendiri.

## 6. Configuration Flow

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
  API key dienkripsi (AES-256-GCM) sebelum menyentuh baris →
  Server simpan ke app_config (set is_active='false' untuk row lama) →
  lib/config.ts invalidate cache →
  Return success response
```

Detail yang berbeda dari rencana awal:

- **API key tidak pernah dikembalikan ke browser.** `GET /api/config` mengirim
  mask (`sk-••••••••7890`), dan form yang dikirim tanpa field key berarti
  "pertahankan yang tersimpan" — string kosong berarti "hapus". Tanpa aturan itu
  menyimpan perubahan nama model akan menghapus API key, karena form memang
  tidak pernah menerima nilainya.
- **Test Connection memakai key tersimpan** bila tidak ada yang diketik, jadi
  pengujian setelah menyimpan tidak berangkat tanpa autentikasi.
- **Cache 30 detik, per-proses.** Menyimpan hanya meng-invalidate worker yang
  melayaninya; TTL adalah batas nyata berapa lama pergantian model berlaku di
  semua worker. Pindahkan ke Redis sebelum scale-out.

## 7. Environment Variables

> ⚠️ **Versi sebelumnya dokumen ini memuat API key produksi secara utuh.**
> Key tersebut sudah masuk riwayat git, jadi **wajib dirotasi** — menghapusnya
> dari berkas saja tidak cukup. Jangan pernah menaruh nilai rahasia di dokumen;
> `.env.example` adalah satu-satunya tempat mencantumkan nama variabel, dan
> nilainya selalu kosong.

Daftar otoritatifnya ada di `.env.example` di root. Setiap variabel di sana
benar-benar dibaca kode — bisa diverifikasi dengan:

```bash
grep -rho "process\.env\.[A-Z_0-9]*" app lib scripts proxy.ts | sort -u
```

```env
# Database — juga dipakai docker-compose untuk provisioning
DATABASE_URL=postgresql://simpleai:simpleai@localhost:5432/simpleai
POSTGRES_DB=simpleai
POSTGRES_USER=simpleai
POSTGRES_PASSWORD=

# Auth — wajib, tanpa fallback. lib/auth.ts melempar error bila kosong,
# supaya nilai default yang diketahui publik tidak bisa dipakai memalsukan token.
JWT_SECRET=

# Enkripsi API key provider di tabel app_config (lib/crypto.ts, AES-256-GCM).
# Kehilangan key ini berarti API key tersimpan harus dimasukkan ulang.
CONFIG_ENCRYPTION_KEY=

# Endpoint AI — lapisan fallback. Prioritas: app_config > env > default.
ROUTER_BASE_URL=http://localhost:20128/v1
ROUTER_API_KEY=
EMBEDDING_MODEL=
LLM_MODEL=
```

Yang **tidak lagi dipakai** dan sudah dihapus: `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(admin kini baris di tabel `users`, dibuat lewat `npm run seed:admin` yang
menerima `ADMIN_USERNAME`/`ADMIN_PASSWORD` sebagai override), serta
`AUTH_SECRET` / `AUTH_URL` (NextAuth tidak jadi dipakai — lihat §5).

## 8. File Structure

Kondisi nyata setelah seluruh fase selesai. Perbedaan utama dari rencana awal:
`middleware.ts` menjadi `proxy.ts` (Next.js 16 mengganti nama konvensinya),
schema Drizzle ada di `lib/` bukan `/db`, tidak ada handler NextAuth, dan
bertambah beberapa modul yang tidak ada di rencana.

```
/app
  layout.tsx                   Root layout + script tema (server-rendered)
  page.tsx                     Chat publik (klien SSE)
  error.tsx                    Error boundary
  global-error.tsx             Boundary untuk error di root layout
  not-found.tsx                Halaman 404
  globals.css                  Token desain (satu sistem: shadcn)
  /login/page.tsx
  /dashboard
    layout.tsx                 Sidebar + header + toggle tema
    page.tsx                   Overview (statistik nyata)
    error.tsx  loading.tsx
    /faq/page.tsx              Daftar FAQ
    /faq/[id]/page.tsx         Form FAQ (`new` = mode buat)
    /sop/page.tsx  /sop/[id]/page.tsx
    /documents/page.tsx        Monitoring vector store
    /config/page.tsx           Konfigurasi model AI
  /api
    /auth/login  /auth/logout
    /chat                      POST: RAG streaming (publik)
    /chat/sessions             GET: daftar percakapan pengunjung
    /chat/sessions/[id]        GET riwayat, DELETE percakapan
    /feedback/[messageId]      PATCH thumbs up/down
    /faq  /faq/[id]  /faq/[id]/sync  /faq/import-export
    /sop  /sop/[id]
    /documents  /documents/[id]/resync
    /stats                     Agregat dashboard
    /config  /config/test
/lib
  schema.ts                    Schema Drizzle (7 tabel)
  db.ts                        Koneksi postgres-js
  auth.ts                      Hash/verify JWT + requireAuth()
  crypto.ts                    AES-256-GCM untuk secret at rest
  config.ts                    Resolusi config DB > env, cache 30 detik
  embedding.ts  llm.ts         Klien OpenAI-compatible
  rag.ts                       retrieveSources + ragStreamFromSources
  vector-sync.ts               Chunk, embed, upsert, pencarian similarity
  chunking.ts                  Pemecahan SOP
  stats.ts                     Agregasi SQL untuk dashboard
  sse.ts                       Parser frame SSE
  rate-limit.ts                Sliding window per IP
  api.ts                       Guard UUID untuk route dinamis
  avatars.ts  theme.ts  utils.ts
/hooks
  use-visitor-id.ts            Identitas browser (useSyncExternalStore)
  use-mobile.ts                Breakpoint (useSyncExternalStore)
/components                    app-sidebar, nav-*, section-cards,
                               chart-area-interactive, theme-toggle
  /ui                          Primitif shadcn + chat-message/input/sidebar
/tests                         Vitest (47 test)
/drizzle                       Migration (0000 extension, 0001 schema, 0002-3 chats)
/scripts                       seed.ts, seed-admin.ts
proxy.ts                       Allow-list auth (dulu middleware.ts)
vitest.config.ts
```
