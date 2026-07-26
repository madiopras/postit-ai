# Phase Plan — PostIt AI (Goal 1)

> **Project:** PostIt AI — Chatbot RAG untuk FAQ & SOP  
> **Stack:** Next.js 16 + Drizzle ORM + pgvector (PostgreSQL 17) + endpoint OpenAI-compatible  
> **Estimasi Awal:** ~7–10 hari kerja

> **Status: seluruh fase selesai.** Rencana per-fase di bawah dipertahankan apa
> adanya sebagai catatan niat. Yang benar-benar terjadi ada di bagian
> **Hasil Aktual** di akhir dokumen — urutan pengerjaannya berbeda dari rencana
> ini, karena scaffolding-nya ternyata sudah ~80% ada tetapi jalur kritisnya
> putus di beberapa titik.

---

> ⚠️ **Phase 0–8 di bawah adalah rencana awal, bukan catatan pelaksanaan.**
> Beberapa detailnya sudah tidak berlaku — `middleware.ts` kini `proxy.ts`,
> `AUTH_SECRET`/`ADMIN_EMAIL` tidak dipakai, `/api/index` dan `/api/auth/me`
> tidak pernah dibuat, dan schema Drizzle ada di `lib/` bukan `/db`. Untuk
> keadaan sebenarnya lihat **Hasil Aktual** di akhir dokumen, `architecture.md`
> §8, dan `README_SETUP.md`.

## Phase 0: Project Init & Infrastructure ⚙️ (Day 1)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 0.1 | Inisialisasi Next.js 16 | `npx create-next-app@latest` dengan App Router, TypeScript, Tailwind | — |
| 0.2 | Setup Docker (pgvector) | Jalankan `docker compose up -d` — sudah ada `docker-compose.yml` dari user | — |
| 0.3 | Install dependencies | `drizzle-orm`, `drizzle-kit`, `postgres`, `@neondatabase/serverless`, `zod`, `next-auth@beta`, `bcryptjs`, `jose`, `tailwind-merge`, `lucide-react` | 0.1 |
| 0.4 | Setup Drizzle config | `drizzle.config.ts`, `db/index.ts`, `db/schema.ts` | 0.3 |
| 0.5 | Setup env variables | `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_ROUTER_EMBEDDING`, `NEXT_PUBLIC_ROUTER_LLM` | 0.2 |
| 0.6 | Create folder structure | `app/`, `components/`, `db/`, `lib/`, `types/`, `public/` | 0.1 |
| 0.7 | Push Drizzle schema | `npx drizzle-kit push` → create all tables di PostgreSQL | 0.4, 0.2 |

**Deliverable:** ✅ Next.js project running, database connected, schema applied

---

## Phase 1: Auth & Middleware 🔐 (Day 2)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 1.1 | Setup NextAuth config | `auth.ts` dengan Credentials provider (username/password) | 0.3 |
| 1.2 | Setup bcrypt untuk password | Hash password admin, store di env atau table users | 1.1 |
| 1.3 | Create login page | `app/(auth)/login/page.tsx` — form login dengan validasi | 1.1 |
| 1.4 | Setup middleware | `middleware.ts` — protect `/dashboard/*` routes | 1.1 |
| 1.5 | Testing flow login | Coba login/logout, redirect, session persist | 1.3, 1.4 |

**Deliverable:** ✅ Login working, dashboard terlindungi

---

## Phase 2: Config System ⚙️ (Day 2)

> **NEW PHASE** — Config system adalah fondasi untuk RAG pipeline yang dinamis. Admin bisa ganti model AI tanpa deploy ulang.

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 2.1 | Create config loader | `lib/config.ts` — singleton loader dengan prioritas: DB > ENV > default | 0.4 |
| 2.2 | Config API — GET | `app/api/config/route.ts` — baca config aktif dari `app_config` table | 2.1 |
| 2.3 | Config API — PUT | `app/api/config/route.ts` — update config, set row lama `is_active=false` | 2.1 |
| 2.4 | Config API — TEST | `app/api/config/test/route.ts` — test koneksi ke embedding/LLM endpoint | 2.1 |
| 2.5 | Config UI page | `app/dashboard/config/page.tsx` — form dengan 2 kartu (Embedding + LLM) | 2.2 |
| 2.6 | Update embedding client | `lib/embedding.ts` — pakai `lib/config.ts` untuk base URL, model, API key | 2.1 |
| 2.7 | Update LLM client | `lib/llm.ts` — pakai `lib/config.ts` untuk base URL, model, API key | 2.1 |

**Deliverable:** ✅ Config system working — admin bisa ganti model AI via dashboard

---

## Phase 3: Core Library — RAG Pipeline 🧠 (Day 3)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 3.1 | Create embedding client | `lib/embedding.ts` — wrapper POST ke 9router embedding endpoint (return array float[1536]) | 2.6 |
| 3.2 | Create LLM client | `lib/llm.ts` — wrapper POST ke 9router LLM endpoint (streaming SSE) | 2.7 |
| 3.3 | Create RAG pipeline | `lib/rag.ts` — 1) embed query → 2) search similar vectors → 3) build context → 4) call LLM → 5) return stream | 3.1, 3.2 |
| 3.4 | Create chunking utility | `lib/chunk.ts` — split SOP content jadi chunks (800 token, 100 overlap) | — |
| 3.5 | Create vector sync utility | `lib/vector-sync.ts` — function untuk chunk + embed + insert ke `documents` | 3.1, 3.4 |

**Deliverable:** ✅ RAG pipeline functional dengan config dinamis, bisa di-call dari API route

---

## Phase 4: Chat — UI & API 💬 (Day 4–6)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 4.1 | Create chat API route | `app/api/chat/route.ts` — POST: terima message, jalankan RAG pipeline, stream response (SSE) | 3.3 |
| 4.2 | Create chat page layout | `app/(main)/page.tsx` — full-height layout, sidebar, chat area | 0.1 |
| 4.3 | Sidebar component | `components/chat/sidebar.tsx` — list sessions, new chat button, riwayat chat | 4.2 |
| 4.4 | Chat message component | `components/chat/chat-message.tsx` — bubble user + assistant, markdown render, sources panel | 4.2 |
| 4.5 | Chat input component | `components/chat/chat-input.tsx` — textarea dengan send button, auto-resize, disabled state | 4.2 |
| 4.6 | Streaming hook | `hooks/use-chat-stream.ts` — fetch POST + baca SSE stream, update UI real-time | 4.1 |
| 4.7 | Sources panel | `components/chat/sources-panel.tsx` — accordion daftar referensi FAQ/SOP | 4.4 |
| 4.8 | Feedback thumbs | thumb up/down pada setiap assistant message | 4.4 |
| 4.9 | Session management | Simpan chat ke DB, load riwayat per session | 4.6, 0.4 |

**Deliverable:** ✅ Chat publik berfungsi — streaming, sources, feedback

---

## Phase 5: Dashboard — FAQ Management 📋 (Day 6–8)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 5.1 | Dashboard layout | `app/dashboard/layout.tsx` — sidebar navigasi (FAQ / SOP / Documents) | 1.4 |
| 5.2 | FAQ API routes | `app/api/faq/route.ts` — CRUD (GET list, POST, PUT, DELETE) + validasi zod | 0.4 |
| 5.3 | FAQ list page | `app/dashboard/faq/page.tsx` — tabel dengan search, filter category, pagination | 5.1, 5.2 |
| 5.4 | FAQ create/edit form | `app/dashboard/faq/[id]/page.tsx` — form question, answer, category, status | 5.2 |
| 5.5 | FAQ delete confirmation | Modal konfirmasi + delete + cascade ke documents | 5.2 |
| 5.6 | FAQ sync button | Sync ulang FAQ → embed → documents (call vector-sync) | 3.5, 5.2 |
| 5.7 | FAQ import/export CSV | Upload CSV massal untuk FAQ | 5.2 |

**Deliverable:** ✅ FAQ CRUD + sync working

---

## Phase 6: Dashboard — SOP Management 📄 (Day 8–9)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 6.1 | SOP API routes | `app/api/sop/route.ts` — CRUD + validasi zod | 0.4 |
| 6.2 | SOP list page | `app/dashboard/sop/page.tsx` — tabel dengan search, filter category | 5.1, 6.1 |
| 6.3 | SOP create/edit form | Form title, content (textarea/markdown), category, status | 6.1 |
| 6.4 | SOP chunk preview | Preview how SOP akan di-chunk dan indexed | 3.4, 6.1 |
| 6.5 | SOP sync button | Sync SOP → chunk → embed → documents | 3.5, 6.1 |

**Deliverable:** ✅ SOP CRUD + chunking + sync working

---

## Phase 7: Dashboard — Documents Monitoring 📊 (Day 9–10)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 7.1 | Documents list page | `app/dashboard/documents/page.tsx` — tabel semua vector documents (status, type, source) | 5.1 |
| 7.2 | Filter & search | Filter by type (faq/sop), status, source_id, search content | 7.1 |
| 7.3 | Sync status indicator | Show sync progress, last sync time, error count | 7.1 |
| 7.4 | Manual resync | Button to resync failed documents | 7.1 |

**Deliverable:** ✅ Documents monitoring + resync

---

## Phase 8: Polish & Production 🚀 (Day 10–11)

| # | Task | Detail | Depends On |
|---|------|--------|------------|
| 8.1 | Error boundaries | Wrap chat, faq, sop pages dengan ErrorBoundary | 4.x, 5.x, 6.x |
| 8.2 | Loading states | Skeleton components, loading.tsx setiap page | 4.x, 5.x, 6.x |
| 8.3 | Toast notifications | Success/error toast untuk CRUD operations | 5.x, 6.x |
| 8.4 | Responsive design | Test & fix mobile view untuk chat & dashboard | 4.x, 5.x, 6.x |
| 8.5 | Rate limiting | Apply rate limit middleware untuk `/api/chat` | 4.1 |
| 8.6 | Testing | Test flow: login → CRUD FAQ → chat → verify RAG response | All |
| 8.7 | README update | Dokumentasi cara setup, env, dan run | All |

**Deliverable:** ✅ Production-ready app

---

## Dependency Graph

```
Phase 0 (Infra)
   │
   ▼
Phase 1 (Auth) ──────────────► Phase 2 (Config System)
   │                                 │
   ▼                                 ▼
Phase 3 (RAG Pipeline) ◄─────────────┘
   │
   ▼
Phase 4 (Chat UI) ─────────────► Phase 5 (FAQ Dashboard)
   │                                 │
   ▼                                 ▼
Phase 6 (SOP Dashboard)       Phase 7 (Documents Monitor)
   │                                 │
   └──────────────┬──────────────────┘
                  ▼
           Phase 8 (Polish)
```

## Priority Matrix

| Feature | Priority | Effort | Phase |
|---------|----------|--------|-------|
| Config System | 🔴 Critical | Medium | P2 |
| Chat publik streaming | 🔴 Critical | Medium | P4 |
| FAQ CRUD + sync | 🔴 Critical | Medium | P5 |
| SOP CRUD + sync | 🟡 High | Medium | P6 |
| Login & auth | 🔴 Critical | Low | P1 |
| RAG pipeline | 🔴 Critical | Medium | P3 |
| Documents monitoring | 🟢 Nice-to-have | Low | P7 |
| Import/export CSV | 🟢 Nice-to-have | Low | P5 |

---

## How to Execute

1. Kerjakan **per phase**, jangan skip
2. Setiap selesai 1 phase, **test dulu** sebelum lanjut
3. Jika ada error di phase sebelumnya, **fix dulu** baru lanjut
4. Gunakan `git checkout -b feature/phase-N` per phase
5. Commit message prefix: `feat(phase-N): ...`

> Poin 4 tidak diikuti: semua pekerjaan berada di satu branch
> `feat/postit-baseline` dengan satu commit per fase. Alasannya, seluruh kerja
> sebelumnya belum pernah ter-commit sama sekali (repo hanya berisi
> `Initial commit from Create Next App`), sehingga yang lebih mendesak adalah
> menyelamatkannya lebih dulu sebagai baseline.

---

## Hasil Aktual

Pengerjaan tidak mengikuti Phase 0–8 di atas. Setelah menganalisis kode yang
ada, urutannya disusun ulang berdasarkan **apa yang memblokir produk agar bisa
berfungsi**, bukan berdasarkan urutan fitur.

Temuan pembuka: `README_SETUP.md` mencentang "Phase 1–8 complete" untuk
semuanya, padahal chatbot-nya **tidak pernah berfungsi sekali pun**. Klaim itu
kemungkinan besar penyebab bug retrieval bertahan tanpa terdeteksi — tidak ada
yang merasa perlu memverifikasi apa yang sudah dinyatakan selesai.

| Fase | Fokus | Commit |
|------|-------|--------|
| 0 | P0 blockers: inversi retrieval, model auth terbalik, JWT secret | `4260060` |
| 1 | Fondasi DB & DevEx: npm scripts, `.env.example`, baseline migration, index | `4260060` |
| 2 | Chat publik end-to-end: parser SSE, riwayat, feedback, rate limit | `594bb4a` |
| 3 | Admin CRUD lengkap: form FAQ, route sync, perbaikan transaksi & resync | `fe3bf01` |
| 4 | Dashboard nyata + Documents monitoring | `c40ad7a` |
| 5 | Unifikasi design system, dark mode, render markdown | `047d929` |
| 6 | Hardening: enkripsi key, error boundary, perbaikan kehilangan data | `630a9cc` |
| 7 | Test pertama proyek, hapus kode mati, koreksi dokumentasi | `a3df23d` |

### Bug utama yang ditemukan dan diperbaiki

Yang paling merusak, semuanya tidak terlihat dari luar:

1. **Retrieval rusak berlapis.** Query mengurutkan *similarity menaik* sehingga
   mengembalikan dokumen paling tidak relevan; ambang skor dijalankan setelah
   `LIMIT` sehingga sering membuang seluruh halaman; dan query-nya bahkan tidak
   bisa dieksekusi (`cannot cast type record to vector`). Fungsi itu tampaknya
   belum pernah benar-benar berjalan.
2. **Model auth terbalik.** Chat publik terkunci di balik login, sementara
   `POST /api/faq`, `/api/sop`, `/api/embed`, dan `/api/documents/*/resync`
   terbuka tanpa autentikasi.
3. **`tailwind.config.ts` inert.** Tailwind v4 mengabaikan config JS tanpa
   direktif `@config`, sehingga seluruh skala tipografi — ~100 pemakaian —
   tidak pernah menghasilkan CSS.
4. **Menyimpan konfigurasi menghapus API key.** Form tidak pernah menerima key,
   lalu mengirim string kosong yang disimpan sebagai `null`.
5. **Resync mengorupsi konten.** Ia me-resync memakai judul dan isi milik
   *chunk*, sehingga `"Judul (Part 2/3)"` diumpankan balik sebagai dokumen utuh.
6. **Halaman form FAQ tidak ada sama sekali** — daftar FAQ menautkan ke rute
   yang 404, jadi FAQ hanya bisa dibaca dan dihapus.
7. **Berkas statis terkunci di balik auth** — seluruh isi `public/` diarahkan
   ke `/login`.

### Yang tidak jadi dikerjakan

- `/api/index` dan `/api/auth/me` — tidak dibutuhkan; indexing terjadi otomatis
  saat menyimpan.
- NextAuth — dihapus; auth JWT langsung sudah berfungsi.
- Suite E2E berbasis browser — lingkungan pengembangan tidak punya browser
  headless. Ini gap yang paling layak ditutup berikutnya.

---

*Terakhir diperbarui: setelah Fase 7 selesai — dokumen ini disesuaikan dengan
kode yang benar-benar dibangun.*
