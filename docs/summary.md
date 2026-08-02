# PostIt AI — Project Summary

> Terakhir diperbarui: 2 Agustus 2026

## 1. Deskripsi Produk

**PostIt AI** adalah aplikasi chatbot berbasis AI yang dibangun di atas
**Next.js 16** (App Router) untuk membantu pengguna internal perusahaan
menemukan informasi dari **FAQ** dan **SOP** secara instan melalui percakapan
natural language. Sistem menggunakan **RAG (Retrieval-Augmented Generation)**
dengan **PostgreSQL + pgvector** sebagai vector store dan endpoint
**OpenAI-compatible** (9router) untuk embedding dan LLM.

Aplikasi memiliki dua area utama:

- **Chat Publik (`/`)** — antarmuka tanya-jawab AI, dapat diakses tanpa login.
- **Admin Dashboard (`/dashboard/*`)** — management knowledge base, konfigurasi
  AI, user management, dan monitoring. Wajib login.

---

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, React 19.2.4) |
| Bahasa | TypeScript 5.x (strict mode) |
| Styling | Tailwind CSS 4.x + Untitled UI React v8 (MIT) |
| Interaction Primitives | React Aria Components |
| Database | PostgreSQL 17 + pgvector |
| ORM | Drizzle ORM + postgres.js |
| Auth | JWT (jose, HS256) + bcryptjs (12 rounds) |
| Enkripsi | AES-256-GCM untuk API key at rest |
| Validasi | Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |
| Testing | Vitest (unit) + Playwright (E2E) |
| Containerization | Docker (pgvector/pgvector:pg17) |

---

## 3. Status Pengembangan Keseluruhan

Proyek telah melalui **dua siklus pengembangan utama (Go1 dan Go2)** yang
seluruhnya selesai, serta tambahan fitur-fitur lanjutan.

### 3.1 Go1 — Baseline Implementation (Selesai)

Membangun fondasi aplikasi dari nol. Pada kenyataannya, scaffolding sudah ada
~80% tetapi jalur kritisnya terputus di beberapa titik. Seluruh fase selesai.

| Fase | Fokus | Status |
|---|---|---|
| P0 | Schema DB, seed admin, project setup | ✅ Selesai |
| P1 | Auth (login, logout, proteksi rute) | ✅ Selesai |
| P2 | Dashboard CRUD FAQ & SOP | ✅ Selesai |
| P3 | Configuration (app_config, API, UI) | ✅ Selesai |
| P4 | Indexing (embedding → vector store) | ✅ Selesai |
| P5 | Chat UI + streaming + feedback | ✅ Selesai |
| P6 | Polish, responsive, bug fixing | ✅ Selesai |

**Bug kritis yang ditemukan dan diperbaiki di Go1:**

- Retrieval rusak berlapis (urutan terbalik, ambang skor salah, binding vektor
  gagal)
- Model auth terbalik (chat publik terkunci, API admin terbuka)
- Tailwind config inert (tipografi tidak menghasilkan CSS)
- Menyimpan konfigurasi menghapus API key
- Resync mengorupsi konten
- Halaman form FAQ tidak ada
- Berkas statis terkunci di balik auth

### 3.2 Go2 — Frontend Migration & Feature Enhancement (Selesai)

Migrasi seluruh frontend ke design system **Untitled UI** (komponen MIT saja)
dan penambahan fitur-fitur bisnis baru. Seluruh 8 phase (0–7) selesai.

| Phase | Fokus | Status |
|---|---|---|
| Phase 0 | License gate, audit, design contract, visual baseline | ✅ Selesai |
| Phase 1 | Untitled UI foundation spike (tokens, primitives, smoke tests) | ✅ Selesai |
| Phase 2 | Chat controller & transport boundary (typed state) | ✅ Selesai |
| Phase 3 | Responsive chat shell & conversation history | ✅ Selesai |
| Phase 4 | Public chat experience (empty state, timeline, composer) | ✅ Selesai |
| Phase 5 | Identity, auth surfaces, visitor-history merge, login | ✅ Selesai |
| Phase 6 | Dashboard migration (seluruh modul) | ✅ Selesai |
| Phase 7 | Cleanup, legacy removal, release gates | ✅ Selesai |

### 3.3 Fitur Lanjutan (Selesai)

Selain Go1 dan Go2, fitur-fitur berikut juga telah diimplementasikan:

| Fitur | Status |
|---|---|
| SOP Versioning (immutable versions, publish, rollback) | ✅ Selesai |
| SOP Access Control (requiresLogin toggle per SOP) | ✅ Selesai |
| SOP Attachment (upload, storage, extraction, indexing) | ✅ Selesai |
| Attachment Extraction (TXT, CSV, PDF, DOCX, XLSX, PPTX) | ✅ Selesai |
| User Management (CRUD, aktivasi/deaktivasi, blokir) | ✅ Selesai |
| Admin Management (Super Admin, Admin) | ✅ Selesai |
| AI Configuration (model, behaviour, response rules, dictionary) | ✅ Selesai |
| Retrieval Configuration (top-k, threshold, priority, selection) | ✅ Selesai |
| Audit Logging (security audit trail) | ✅ Selesai |
| Topic-switch-safe Retrieval (standalone + contextual fallback) | ✅ Selesai |
| Retrieval Observability (structured runtime logs) | ✅ Selesai |
| Evaluation Dataset & Runner (retrieval benchmark) | ✅ Selesai |
| Hybrid Retrieval (semantic + full-text search + RRF) | ✅ Selesai |
| Response Dictionary (forbidden/required words) | ✅ Selesai |
| Visitor-to-User History Merge | ✅ Selesai |
| Copy Answer | ✅ Selesai |
| Dark Mode (konsisten di seluruh surface) | ✅ Selesai |
| WCAG A/AA Accessibility | ✅ Selesai |

---

## 4. Arsitektur Sistem

```
┌──────────────────────────────────────────────────┐
│                  Next.js 16 App                  │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │   Chat UI (Publik) │  │ Dashboard (Admin)  │  │
│  └─────────┬──────────┘  └─────────┬──────────┘  │
│            │                       │              │
│  ┌─────────┴───────────────────────┴──────────┐  │
│  │           Next.js API Routes               │  │
│  └──────────────────────┬─────────────────────┘  │
│                         │                        │
│  ┌──────────────────────┴─────────────────────┐  │
│  │    proxy.ts (allow-list auth, JWT guard)   │  │
│  └──────────────────────┬─────────────────────┘  │
└─────────────────────────┼────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                                ▼
  ┌──────────────┐              ┌──────────────────┐
  │  9router API │              │  PostgreSQL 17 + │
  │ /v1/embed    │              │  pgvector         │
  │ /v1/chat     │              │                  │
  └──────────────┘              │  10 tabel:       │
                                │  users, faqs,    │
                                │  sops,           │
                                │  sop_versions,   │
                                │  sop_attachments,│
                                │  documents,      │
                                │  chats, messages,│
                                │  app_config,     │
                                │  audit_logs      │
                                └──────────────────┘
```

---

## 5. Database Schema (10 Tabel)

| Tabel | Fungsi |
|---|---|
| `users` | Akun admin dan pengguna (role: super_admin, admin, user) |
| `faqs` | Master data FAQ |
| `sops` | Master data SOP (dengan `requires_login` dan `published_version_id`) |
| `sop_versions` | Versioning SOP immutable |
| `sop_attachments` | Lampiran per versi SOP (dengan extraction fields) |
| `documents` | Vector store (embedding 1536d, HNSW index, GIN full-text) |
| `chats` | Sesi percakapan (visitor_id atau user_id) |
| `messages` | Pesan per sesi (role, content, sources, feedback) |
| `app_config` | Konfigurasi AI (model, behaviour, rules, retrieval) |
| `audit_logs` | Log audit keamanan |

Total migrasi: **17 file** (`0000` – `0016`).

---

## 6. API Endpoints

### Publik (tanpa auth)

| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/chat` | Jawaban RAG (SSE streaming) |
| GET | `/api/chat/sessions` | Daftar percakapan visitor |
| GET/DELETE | `/api/chat/sessions/[id]` | Riwayat / hapus percakapan |
| PATCH | `/api/feedback/[messageId]` | Thumbs up/down |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Probe identitas saat ini |
| POST | `/api/chat/history/merge` | Merge history visitor ke user |
| GET | `/api/health` | Health check |

### Protected (JWT required)

| Method | Path | Fungsi |
|---|---|---|
| GET/POST | `/api/faq` | CRUD FAQ |
| GET/PUT/DELETE | `/api/faq/[id]` | Detail FAQ |
| POST | `/api/faq/[id]/sync` | Re-embed FAQ |
| GET/POST | `/api/faq/import-export` | CSV import/export |
| GET/POST/DELETE | `/api/sop` | CRUD SOP |
| GET/PUT/DELETE | `/api/sop/[id]` | Detail SOP |
| GET/POST | `/api/sop/[id]/versions` | Daftar/buat versi SOP |
| POST | `/api/sop/[id]/versions/[vId]/publish` | Publish versi |
| POST | `/api/sop/[id]/versions/[vId]/rollback` | Rollback versi |
| GET/POST/DELETE | `/api/sop/[id]/versions/[vId]/attachments` | Attachment versi |
| GET | `/api/documents` | Monitoring vector store |
| POST | `/api/documents/[id]/resync` | Re-embed dokumen |
| GET | `/api/stats` | Statistik dashboard |
| GET/PUT | `/api/config` | Konfigurasi AI |
| POST | `/api/config/test` | Uji koneksi endpoint |
| GET/POST | `/api/users` | CRUD user |
| GET/PUT/DELETE | `/api/users/[id]` | Detail user |
| GET/POST | `/api/admins` | CRUD admin |
| GET/PUT/DELETE | `/api/admins/[id]` | Detail admin |
| GET | `/api/audit-logs` | Log audit |

---

## 7. Halaman Frontend

| Route | Akses | Fungsi |
|---|---|---|
| `/` | Publik | Chat AI dengan SSE streaming |
| `/login` | Publik | Login admin/user |
| `/dashboard` | Admin | Overview (statistik, chart tren 30 hari) |
| `/dashboard/faq` | Admin | Daftar FAQ |
| `/dashboard/faq/[id]` | Admin | Form create/edit FAQ |
| `/dashboard/sop` | Admin | Daftar SOP |
| `/dashboard/sop/[id]` | Admin | Detail SOP (versioning, attachment) |
| `/dashboard/documents` | Admin | Monitoring vector store |
| `/dashboard/users` | Admin | User management |
| `/dashboard/admins` | Super Admin | Admin management |
| `/dashboard/config` | Super Admin | Konfigurasi AI |
| `/dashboard/audit-logs` | Super Admin | Log audit keamanan |

---

## 8. Testing

| Jenis | Jumlah | Tool |
|---|---|---|
| Unit tests | 158 passed, 10 skipped (db-dependent) | Vitest |
| E2E tests | 32 passed | Playwright (Docker) |
| Accessibility | WCAG A/AA otomatis via axe-core | @axe-core/playwright |
| Test files | 30 unit + 8 E2E specs | — |

**Coverage areas:** retrieval, SSE parsing, crypto, embedding, chunking,
rate-limit, auth, chat client, session groups, request sequence, config,
admin/user management, SOP versioning, attachment extraction, access control,
AI behaviour, response dictionary, hybrid retrieval, retrieval observability,
evaluation, health, frontend system guard, audit.

---

## 9. Fitur Keamanan

- ✅ Auth JWT (jose HS256, 7 hari, httpOnly cookie)
- ✅ Password hashing (bcryptjs 12 rounds)
- ✅ JWT_SECRET wajib tanpa fallback
- ✅ API key provider dienkripsi at rest (AES-256-GCM)
- ✅ Input validasi dengan Zod
- ✅ Query parameterized via Drizzle
- ✅ Rate limit per-IP di `/api/chat` (20/menit)
- ✅ Allow-list auth model (proxy.ts)
- ✅ UUID validation pada dynamic routes
- ✅ Visitor ownership verification
- ✅ Audit logging untuk operasi dashboard
- ⚠️ CSRF: mitigasi saat ini hanya `SameSite=Lax` — perlu review sebelum
  produksi

---

## 10. RAG Pipeline

```
User question
  → Embedding (standalone query)
  → Hybrid search: semantic (pgvector cosine) + full-text (GIN/tsvector)
  → Reciprocal Rank Fusion (k=60)
  → Access filter (published, requiresLogin check)
  → Jika standalone tidak menemukan → contextual fallback (history-aware)
  → LLM generation dengan system prompt konfigurasi
  → SSE streaming response + citation
```

Fitur retrieval:

- Topic-switch-safe (standalone-first, contextual fallback)
- Hybrid retrieval (semantic + lexical)
- Configurable top-k, threshold, source priority, selection rule
- SOP restricted access enforcement
- Structured retrieval observability logs
- Evaluation dataset & runner

---

## 11. Design System

- **Design system:** Untitled UI React v8 (komponen MIT open-source saja)
- **Interaction:** React Aria Components
- **Token:** Single semantic token source (`styles/untitled-theme.css`)
- **Font:** Inter
- **Icons:** Lucide React
- **Theme:** Light/dark dengan `prefers-color-scheme` support
- **Responsive:** Desktop dan mobile (320–1440px)
- **Accessibility:** WCAG A/AA, keyboard, focus, screen reader

Legacy shadcn/Base UI/Radix sudah sepenuhnya dihapus pada Phase 7.

---

## 12. Yang Belum Dikerjakan / Backlog

| Item | Prioritas | Catatan |
|---|---|---|
| CSRF token | 🔴 Tinggi | Saat ini hanya `SameSite=Lax`, perlu review sebelum produksi |
| Retry/Regenerate answer | 🟡 Sedang | Ditunda — perlu desain persistence dan idempotency |
| Secret rotation | 🔴 Tinggi | Google API key dan ROUTER_API_KEY pernah masuk git history |
| Legacy Office format (DOC/XLS/PPT) | 🟢 Rendah | Tidak termasuk scope saat ini |
| OCR PDF (scan-only PDF) | 🟢 Rendah | Tidak termasuk scope saat ini |
| Retrieval quality tuning | 🟡 Sedang | Evaluation dataset perlu dikalibrasi dengan knowledge produksi |
| LLM query rewriting | 🟢 Rendah | Menunggu bukti kebutuhan dari data evaluasi |
| Logo final | 🟢 Rendah | Saat ini menggunakan ikon Bot Lucide, replaceable |
| User avatar upload | 🟢 Rendah | Saat ini menggunakan initials |
| Scale-out config cache | 🟡 Sedang | Cache 30 detik per-proses, perlu Redis untuk multi-worker |
| drizzle-kit dev audit fix | 🟢 Rendah | 4 moderate dev-only findings, tidak bisa di-fix tanpa breaking change |

---

## 13. Cara Menjalankan

### First-time Setup

```bash
make setup ADMIN_PASSWORD='your-strong-password-12chars'
```

Perintah ini menjalankan: install dependencies → generate `.env` → start
PostgreSQL → migrate → seed admin.

### Development

```bash
make dev              # Start dev server
make seed             # Seed sample FAQ/SOP (butuh AI endpoint)
```

### Validation

```bash
make validate         # lint + typecheck + test + E2E + build
# atau individual:
npm run lint
npm run typecheck
npm test
make test-e2e-docker  # E2E via official Playwright Docker image
npm run build
```

### Evaluation

```bash
make eval-retrieval   # Benchmark retrieval quality
```

---

## 14. Struktur Direktori Utama

```
/app
  layout.tsx, page.tsx (chat), login/, error.tsx, not-found.tsx
  /dashboard
    layout.tsx, page.tsx (overview)
    /faq, /sop, /documents, /users, /admins, /config, /audit-logs
  /api
    /auth, /chat, /feedback, /faq, /sop, /documents, /config,
    /stats, /users, /admins, /audit-logs, /health
  /dev/ui-foundation (dev-only)
/lib
  schema.ts, db.ts, auth.ts, crypto.ts, config.ts,
  embedding.ts, llm.ts, rag.ts, vector-sync.ts, chunking.ts,
  attachment-extraction.ts, sop-versioning.ts, sop-attachments.ts,
  chat-client.ts, chat-identity.ts, chat-history.ts, chat-session-groups.ts,
  stats.ts, audit.ts, rate-limit.ts, api.ts, sse.ts,
  request-sequence.ts, auth-client.ts, response-dictionary.ts,
  retrieval-evaluation.ts, retrieval-observability.ts, theme.ts, utils.ts
/components
  /chat (shell, composer, timeline, message, profile, sidebar, etc.)
  /dashboard (dashboard-ui.tsx)
  /untitled (button, input, textarea, modal, slideout, tooltip, loader)
  app-sidebar.tsx, section-cards.tsx, chart-area-interactive.tsx, theme-toggle.tsx
/hooks
  use-chat-controller.ts, use-chat-scroll.ts, use-current-user.ts,
  use-visitor-id.ts, use-mobile.ts
/tests (30 unit test files)
/e2e (8 E2E spec files)
/drizzle (17 migration files)
/evaluations (retrieval benchmark dataset)
/scripts (seed.ts, seed-admin.ts, init-env.mjs, evaluate-retrieval.ts)
/styles (untitled-theme.css)
/docs (enhancement plans, third-party notices)
proxy.ts, Makefile, Dockerfile, docker-compose.yml
```

---

## 15. Git History Ringkas

| Commit | Deskripsi |
|---|---|
| `02c9431` | Initial commit from Create Next App |
| `4260060` | Baseline PostIt AI + phase 0/1 fixes |
| `594bb4a` | Public chat end-to-end |
| `fe3bf01` | Admin CRUD lengkap, sync fix |
| `c40ad7a` | Real dashboard + Documents monitoring |
| `047d929` | Unified design system, dark mode, markdown |
| `630a9cc` | Encrypt API keys, error boundaries |
| `a3df23d` | First tests, delete dead code, fix docs |
| `94a4452`–`c654628` | Theme, config, FAQ, avatar fixes |
| `4ae6cfd` | Align Go1 docs with implementation |
| `051fac1` | All Go2 features (force push) |
| `c73cb5b` | New retrieval (hybrid, topic-switch) |
| `1758c23` | Diff fix |

---

## 16. Kesimpulan

PostIt AI telah mencapai tahap **feature-complete** untuk seluruh requirement
yang direncanakan di Go1 dan Go2. Seluruh modul utama — chat publik dengan RAG,
authentication/authorization, dashboard admin lengkap (FAQ, SOP dengan
versioning dan attachment, user/admin management, AI configuration, monitoring,
audit logs), serta frontend migration ke Untitled UI — telah diimplementasikan
dan divalidasi.

Yang menjadi prioritas selanjutnya untuk **production readiness** adalah:

1. **Rotasi secret** yang pernah terekspos di git history.
2. **CSRF protection** yang memadai (bukan hanya `SameSite=Lax`).
3. **Kalibrasi retrieval** dengan knowledge base produksi.
4. **Desain Retry/Regenerate** dengan semantik persistence yang benar.
