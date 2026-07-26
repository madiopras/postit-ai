# PRD: PostIt AI — Chatbot & Admin Dashboard

> **Brand:** PostIt AI  
> **Tagline:** Smart Answers, Instant Actions.

> **Status: terimplementasi.** Dokumen ini semula rencana; kini disesuaikan
> dengan kode yang benar-benar dibangun. Bagian yang berbeda dari rencana awal
> diberi catatan, bukan dihapus, supaya keputusannya bisa ditelusuri.
> Referensi "Design Source: Google Stitch (`docs/stitch/*.html`)" dihapus —
> direktori itu tidak pernah ada di repo.

---

## 1. Overview

PostIt AI adalah aplikasi berbasis Next.js 16 dengan dua area utama:

1. **Chatbot (Publik)** — antarmuka tanya-jawab AI modern dengan RAG dari FAQ & SOP. **Tidak perlu login.**
2. **Admin Dashboard (Terproteksi)** — management FAQ & SOP dengan CRUD, vector sync, monitoring, dan **konfigurasi model AI**. **Wajib login via admin credentials.**

Semua data disimpan di **PostgreSQL + pgvector**. Embedding & LLM menggunakan endpoint **9router** (OpenAI-compatible), yang **dapat dikonfigurasi secara dinamis** oleh admin melalui dashboard.

### Tujuan
- Memberikan jawaban instan kepada pengguna internal berdasarkan FAQ dan SOP perusahaan.
- Menyediakan dashboard bagi admin untuk mengelola knowledge base (FAQ & SOP) **dan konfigurasi model AI**.
- Setiap jawaban AI harus disertai **sumber referensi** yang jelas.
- Admin bisa mengganti model embedding/LLM, base URL, dan API key kapan saja **tanpa perlu deploy ulang**.

---

## 2. Access Model

| Area | URL | Auth | Deskripsi |
|------|-----|------|-----------|
| **Chatbot** | `/` | ❌ Tidak perlu login | Siapa pun bisa bertanya |
| **Dashboard** | `/dashboard/*` | ✅ Wajib login | Hanya admin yang bisa akses |
| **API Chat** | `/api/chat` | ❌ Tanpa auth | Chat endpoint publik |
| **API CRUD** | `/api/faq`, `/api/sop`, dll | ✅ Protected | Hanya dari sisi server/dashboard |
| **API riwayat chat** | `/api/chat/sessions*` | ❌ Tanpa auth | Diverifikasi lewat `visitorId`, bukan sesi |
| **API feedback** | `/api/feedback/[messageId]` | ❌ Tanpa auth | Idem |

> **Berbeda dari rencana:** `GET /api/faq` dan `GET /api/sop` semula dirancang
> publik. Keduanya kini terproteksi — tidak ada konsumen publik (chat hanya
> memakai `/api/chat`), sementara membiarkannya terbuka berarti mengekspos
> seluruh knowledge base termasuk draft ke siapa pun.
>
> Route publik yang menerima `visitorId` memverifikasi kepemilikan di server dan
> menjawab **404** bila tidak cocok, sehingga id percakapan tidak bisa
> dienumerasi.

### 2.1 Admin Login

> **Berbeda dari rencana.** NextAuth.js tidak jadi dipakai: paket-nya sempat
> terpasang tapi tidak pernah tersambung, dan sudah dihapus. Autentikasinya JWT
> langsung, yang sudah berfungsi dan tidak menuntut penulisan ulang proxy, login,
> serta sesi demi provider OAuth yang tidak dibutuhkan.

- Login **username + password**, diverifikasi terhadap tabel `users`
  (bukan environment variable)
- Password di-hash `bcryptjs` (12 rounds); token ditandatangani `jose` (HS256)
- Admin dibuat lewat `npm run seed:admin`, menerima `ADMIN_USERNAME` dan
  `ADMIN_PASSWORD` sebagai override agar default `admin/admin123` tidak terbawa
- Tidak ada registrasi publik
- Sesi JWT di cookie httpOnly `simpleai_token`, **berlaku 7 hari**
- `JWT_SECRET` wajib — tidak ada nilai fallback, aplikasi menolak berjalan
  tanpanya supaya default yang diketahui publik tidak bisa memalsukan token

---

## 3. Fitur Utama

### 3.1 Public Chat
- Chat real-time dengan SSE streaming.
- Konteks RAG dari FAQ + SOP yang relevan.
- Session-based (tanpa login) — setiap session punya history sendiri.
- Feedback thumbs up / thumbs down per jawaban.
- Source attribution (menampilkan sumber yang digunakan).

### 3.2 Admin Dashboard (Login Required)
- **CRUD FAQ**: Tambah, edit, hapus, publish/draft FAQ.
- **CRUD SOP**: Tambah, edit, hapus, publish/draft SOP + chunking otomatis.
- **Indexing**: Tombol "Sync" untuk mengirim data FAQ/SOP ke embedding endpoint, hasilnya disimpan di `documents` table (vector store).
- **Statistik**: jumlah FAQ publish, jumlah SOP publish, total chat hari ini.
- **Search**: Cari FAQ/SOP berdasarkan teks.
- **Configuration**: Admin dapat mengatur:

| Parameter | Contoh | Fungsi |
|-----------|--------|--------|
| `EMBEDDING_BASE_URL` | `http://localhost:20128/v1` | Base URL endpoint embedding |
| `EMBEDDING_MODEL` | `text-embedding-ada-002` | Nama model embedding |
| `EMBEDDING_API_KEY` | `sk-xxx` | API key untuk embedding |
| `LLM_BASE_URL` | `http://localhost:20128/v1` | Base URL endpoint LLM |
| `LLM_MODEL` | `gpt-4o-mini` | Nama model LLM |
| `LLM_API_KEY` | `sk-xxx` | API key untuk LLM |

- Konfigurasi disimpan di tabel `app_config` (hanya 1 row aktif).
- Semua perubahan langsung生效 tanpa restart.
- Jika parameter tidak dikonfigurasi, fallback ke environment variable.

### 3.3 Authentication
- Login page (`/login`) dengan username & password.
- JWT disimpan di cookie (httpOnly).
- Middleware proteksi route `/dashboard/*`.
- Logout.

---

## 4. Brand Identity & Design System

### 4.1 Brand
- **Nama:** PostIt AI
- **Tagline:** Smart Answers, Instant Actions.
- **Logo:** Icon `bolt` dalam kotak `bg-primary rounded-lg` (36x36px)

### 4.2 Typography
| Token | Font | Weight | Size/LineHeight |
|-------|------|--------|-----------------|
| `headline-lg` | Geist | 600 | 30px / 36px, -0.02em |
| `headline-md` | Geist | 600 | 24px / 32px, -0.015em |
| `headline-sm` | Geist | 600 | 20px / 28px, -0.01em |
| `body-lg` | Inter | 400 | 16px / 24px |
| `body-md` | Inter | 400 | 14px / 20px |
| `label-md` | Geist | 500 | 14px / 20px |
| `label-sm` | Geist | 500 | 12px / 16px, +0.02em |

### 4.3 Color Palette (Light Mode)
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#3525cd` | Tombol utama, link, aksen aktif |
| `primary-container` | `#4f46e5` | Tombol solid, progress bar |
| `on-primary` | `#ffffff` | Teks di atas primary |
| `background` | `#f8f9ff` | Background halaman |
| `surface` | `#f8f9ff` | Sidebar, card surface |
| `surface-container-low` | `#eff4ff` | Hover state, input bg |
| `surface-container` | `#e5eeff` | Container ringan |
| `surface-container-high` | `#dce9ff` | Container lebih gelap |
| `surface-container-highest` | `#d3e4fe` | Container paling gelap |
| `on-surface` | `#0b1c30` | Teks utama |
| `on-surface-variant` | `#464555` | Teks sekunder |
| `secondary-container` | `#dae2fd` | Active nav item bg |
| `on-secondary-container` | `#5c647a` | Active nav text |
| `outline` | `#777587` | Border standar |
| `outline-variant` | `#c7c4d8` | Border ringan |
| `error` | `#ba1a1a` | Tombol hapus, alert |
| `error-container` | `#ffdad6` | Background error |

### 4.4 Spacing
| Token | px |
|-------|-----|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |
| `gutter` | 16px |
| `container-max` | 1280px |

### 4.5 Border Radius
| Token | Value |
|-------|-------|
| DEFAULT | 2px |
| lg | 4px |
| xl | 8px |
| full | 12px |

### 4.6 Icons
- **Material Symbols Outlined** — `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`

---

## 5. Halaman & Layout

### 5.1 Layout Umum
- **Desktop:** Sidebar (w-64) + Main Content
- **Mobile:** Sidebar tersembunyi, toggle via hamburger button
- **Sidebar:** Brand logo + PostIt AI title + nav items + logout
- **TopAppBar:** Search bar (rounded-full) + Notifications bell + Avatar admin
- **Nav Items:** Overview, FAQ Management, SOP Listings, **Configuration**, Logout
- **Active State:** `bg-secondary-container text-on-secondary-container rounded-xl`

### 5.2 Halaman Chat (`/`) — Publik, Tanpa Login
- **Full screen chat** — tidak ada sidebar admin
- **Chat Area:**
  - User bubble: right-aligned, `bg-primary text-on-primary rounded-xl`
  - Bot bubble: left-aligned, `bg-surface border border-outline-variant rounded-xl`
  - Streaming response dengan cursor blink
  - Actions per message: Copy, Thumbs up/down
  - **Source citations** dari FAQ/SOP — ditampilkan sebagai chip di bawah pesan bot
- **Input Area:** Text area auto-resize + Send button (icon `arrow_upward` bulat)
- **Empty State:** Ilustrasi bot + "Halo! Saya asisten virtual PostIt AI. Tanyakan seputar SOP dan FAQ perusahaan."

### 5.3 Halaman Dashboard/Overview (`/dashboard`) — Login Required
- **Header:** "Overview" + "Monitor system performance and AI interaction metrics." + date filter + Export Report
- **Stats Bento Grid (4 kolom):** Total Chats, Active Users, Resolution Rate, Avg. Response — masing-masing dengan sparkline + badge perubahan
- **AI Interaction Trends** (2/3 width): Line chart + toggle Line/Bar
- **System Status** (1/3 width): Operational indicator + progress bars, **Current Model Info** (embedding & LLM model active)
- **SOP Management Preview Table** (1/2): Title + Status + Last Updated
- **Recent Activity** (1/2): Timeline events

### 5.4 Halaman FAQ Management (`/dashboard/faq`) — Login Required
- **Header:** "FAQ Management" + "Update, organize, and monitor your AI's knowledge base." + "New FAQ"
- **Stats Cards:** Total FAQs, Active Responses, Draft Items, Avg. AI Accuracy
- **Table:** Question, Answer Snippet, Last Updated, Actions (edit/delete on hover)
- **Filter bar:** Search input + Filter
- **Pagination**
- **Quick Actions:** Import CSV, Export Selected, Archive Old

### 5.5 Halaman SOP Listings (`/dashboard/sop`) — Login Required
- **Header:** "Standard Operating Procedures" + "Sync All" + "New SOP"
- **Table:** Title, Content Preview, Created Date, Actions (sync/edit/delete)
- **Pagination** dengan numbered pages
- **Utility Cards (3 kolom):** Import Manual, AI Reviewer, API Webhooks

### 5.6 Halaman Configuration (`/dashboard/config`) — Login Required
- **Header:** "AI Model Configuration" + "Configure your AI model endpoints, API keys, and model preferences."
- **Dua Kartu Konfigurasi (Embedding & LLM)** — tampilan split yang jelas:

#### Embedding Configuration
| Field | Tipe | Placeholder |
|-------|------|-------------|
| Base URL | Input text | `http://localhost:20128/v1` |
| Model Name | Input text | `text-embedding-ada-002` |
| API Key | Input password (masked) | `sk-...` |

#### LLM Configuration
| Field | Tipe | Placeholder |
|-------|------|-------------|
| Base URL | Input text | `http://localhost:20128/v1` |
| Model Name | Input text | `gpt-4o-mini` |
| API Key | Input password (masked) | `sk-...` |

- **Test Connection** button per kartu — mengirim request test ke endpoint untuk verifikasi.
- **Save Configuration** button — menyimpan ke database.
- **Fallback indicator** — menampilkan nilai yang sedang aktif (dari env atau DB).
- **Status badge** untuk menunjukkan apakah config aktif/error/fallback.

---

## 6. Font Loading

Gunakan `next/font` untuk memuat font secara optimal:

```typescript
// Geist (headlines, labels)
import Geist from 'next/font/local'

// Inter (body)
import { Inter } from 'next/font/google'
```

---

## 7. Tech Stack

| Layer | Rencana | Terpasang |
|-------|---------|-----------|
| **Framework** | Next.js 16 | Next.js 16.2.11 — `middleware.ts` berganti nama jadi `proxy.ts` |
| **Styling** | Tailwind + token kustom | Tailwind v4, **satu** sistem token (shadcn) berisi nilai palet M3 |
| **Icons** | Material Symbols Outlined | **`lucide-react`** — ter-tree-shake, tanpa webfont CDN (lihat design.md §7) |
| **Fonts** | Geist + Inter | sama, via `next/font` |
| **Auth** | NextAuth.js v5 | **`jose` + `bcryptjs`** langsung; NextAuth dihapus |
| **Database** | PostgreSQL 16 + pgvector | PostgreSQL **17** + pgvector (Docker) |
| **ORM** | Drizzle ORM | sama — `generate` + `migrate`, bukan `push` |
| **AI SDK** | OpenAI-compatible | sama, endpoint & model diatur dari dashboard |
| **Charts** | Recharts | sama, palet kategorikal tervalidasi CVD |
| **Markdown** | — | `react-markdown` + `remark-gfm` untuk jawaban asisten |
| **Tema** | — | Script inline server-rendered; dark mode aktif |
| **Test** | — | **Vitest**, 47 test di 6 berkas |

---

## 8. UI/UX Guidelines

### 8.1 Chat Page
- Full-height layout (100vh) dengan sidebar chat history di kiri (desktop) / hidden di mobile.
- Tombol "New Chat" di sidebar.
- Chat bubble: user di kanan (primary color), bot di kiri (neutral).
- Input field sticky bottom + tombol send.
- Loading animasi (dots) saat bot mengetik.
- Source attribution: badge kecil di bawah jawaban bot (FAQ / SOP).
- Feedback thumbs up/down per jawaban.

### 8.2 Dashboard
- Sidebar navigasi (Dashboard, FAQ, SOP, Configuration, Logout).
- Card statistik di overview.
- Tabel dengan search, filter status, pagination.
- Modal/Inline form untuk create/edit.
- Tombol "Sync" untuk publish sekaligus index ke vector store.

### 8.3 Login
- Card centered dengan form username & password.
- Error message jika gagal.

### 8.4 Configuration Page
- Split panel: Embedding (kiri) dan LLM (kanan) di desktop, stack di mobile.
- Setiap field punya icon dan label yang jelas.
- API Key field menggunakan `type="password"` dengan toggle show/hide.
- Test Connection: button dengan loading spinner, hasilnya ditampilkan sebagai toast/snackbar.
- Save: button dengan konfirmasi, toast sukses/gagal.

---

## 9. Non-Functional Requirements

- **Responsive**: mobile-first, sidebar collapse on mobile.
- **Lightweight**: minimal dependencies, optimal page load.
- **Secure**: JWT httpOnly cookie, hash password dengan bcryptjs, API key disimpan terenkripsi di database.
- **Fast**: streaming chat tanpa blocking.

---

## 10. Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── chat/route.ts
│   │   ├── embed/route.ts
│   │   ├── faq/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── index/route.ts
│   │   ├── sop/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── config/
│   │   │   ├── route.ts          # GET/PUT app_config
│   │   │   └── test/route.ts     # POST test koneksi
│   │   └── stats/route.ts
│   ├── chat/
│   │   └── page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── faq/
│   │   │   └── page.tsx
│   │   ├── sop/
│   │   │   └── page.tsx
│   │   └── config/
│   │       └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   └── Sidebar.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── FaqTable.tsx
│   │   ├── FaqForm.tsx
│   │   ├── SopTable.tsx
│   │   ├── SopForm.tsx
│   │   └── ConfigForm.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Toast.tsx
│       └── Spinner.tsx
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── config.ts                 # Config loader (env + DB fallback)
│   ├── embedding.ts
│   ├── llm.ts
│   ├── rag.ts
│   ├── schema.ts
│   ├── crypto.ts                 # AES-256-GCM untuk secret at rest
│   ├── stats.ts                  # Agregasi dashboard
│   ├── sse.ts                    # Parser frame SSE
│   ├── rate-limit.ts             # Sliding window per IP
│   ├── api.ts                    # Guard UUID
│   └── utils.ts
├── tests/                        # Vitest — 47 test
├── proxy.ts                      # (Next 16 mengganti nama middleware.ts)
├── vitest.config.ts
├── drizzle.config.ts
├── package.json
├── docker-compose.yml
└── .env
```

---

## 11. API Endpoints

Daftar aktual. Perbedaan dari rencana: `/api/auth/me` dan `/api/index` tidak
pernah dibuat (yang pertama tidak dibutuhkan, indexing terjadi otomatis saat
simpan), sementara route chat-session, feedback, documents, sync dan stats
bertambah.

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/auth/login` | – | Login, set cookie JWT |
| POST | `/api/auth/logout` | – | Hapus cookie |
| POST | `/api/chat` | – | Jawaban RAG (SSE). Rate limit 20/menit per IP |
| GET | `/api/chat/sessions?visitorId=` | – | Daftar percakapan pengunjung |
| GET | `/api/chat/sessions/[id]?visitorId=` | – | Riwayat satu percakapan |
| DELETE | `/api/chat/sessions/[id]?visitorId=` | – | Hapus percakapan |
| PATCH | `/api/feedback/[messageId]` | – | Thumbs up/down pada jawaban |
| GET | `/api/faq` | JWT | Daftar FAQ (search, kategori, status, paginasi) |
| POST | `/api/faq` | JWT | Buat FAQ, langsung di-embed |
| GET/PUT/DELETE | `/api/faq/[id]` | JWT | Baca, ubah, hapus |
| POST | `/api/faq/[id]/sync` | JWT | Embed ulang satu FAQ |
| GET/POST | `/api/faq/import-export` | JWT | Ekspor / impor CSV |
| GET/POST/DELETE | `/api/sop` | JWT | Daftar, buat, hapus (via `?id=`) |
| GET/PUT/DELETE | `/api/sop/[id]` | JWT | Baca, ubah, hapus |
| GET | `/api/documents` | JWT | Isi vector store (filter tipe/status/tanpa-vektor) |
| POST | `/api/documents/[id]/resync` | JWT | Bangun ulang dari record sumber |
| GET | `/api/stats` | JWT | Agregat dashboard + tren 30 hari |
| GET/PUT | `/api/config` | JWT | Baca (key ter-mask) / simpan konfigurasi |
| POST | `/api/config/test` | JWT | Uji koneksi endpoint |

Semua respons memakai amplop `{ success, data?, meta?, error? }`. Id dinamis
yang bukan UUID dijawab **404**, bukan 500 — Postgres menolak cast `uuid` dan
errornya dulu lolos sebagai 500.

---

## 12. Database Schema (Tambahan)

### app_config
```sql
CREATE TABLE app_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding_base_url TEXT,
  embedding_model    TEXT,
  embedding_api_key  TEXT,   -- encrypted at rest
  llm_base_url       TEXT,
  llm_model          TEXT,
  llm_api_key        TEXT,   -- encrypted at rest
  is_active          TEXT DEFAULT 'false',   -- 'true' | 'false', bukan boolean
  updated_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

Hanya 1 row dengan `is_active = 'true'` yang digunakan. Semua config lama tetap
disimpan untuk audit trail.

**Catatan implementasi:**

- `is_active` bertipe `TEXT` (`'true'`/`'false'`), bukan `BOOLEAN` — schema
  Drizzle mendefinisikannya begitu dan query membandingkan terhadap string.
- Komentar "encrypted at rest" **kini benar**. Sempat tidak: key tersimpan
  plaintext sampai diperbaiki dengan AES-256-GCM (`lib/crypto.ts`), memakai
  `CONFIG_ENCRYPTION_KEY`. Nilai lama tanpa prefiks `v1:` tetap terbaca dan
  ikut terenkripsi saat penyimpanan berikutnya.
- Karena tiap penyimpanan menyisipkan baris **baru** (tabel ini merangkap audit
  trail), key yang tidak dikirim harus dibawa maju secara eksplisit — kalau
  tidak, mengubah nama model saja akan menghapus key dari baris aktif.

---

## 13. Milestone

Selesai seluruhnya. Penomoran di sini (P0–P6) berbeda dari `phase-plan.md`
(Phase 0–8) — lihat dokumen itu untuk rincian per fase beserta apa yang
sebenarnya ditemukan.

| Fase | Fitur | Status |
|------|-------|--------|
| P0 | Schema DB, seed admin, setup project | ✅ Selesai — baseline migration ditulis ulang; `push` diganti `generate`+`migrate` |
| P1 | Auth (login, logout, proteksi rute) | ✅ Selesai — model auth dibalik dari deny-list ke allow-list |
| P2 | Dashboard CRUD FAQ & SOP | ✅ Selesai — halaman form FAQ dibangun dari nol |
| P3 | Configuration (app_config, API, UI) | ✅ Selesai — plus enkripsi key dan mask |
| P4 | Indexing (embedding → vector store) | ✅ Selesai — urutan retrieval diperbaiki, binding pgvector diperbaiki |
| P5 | Chat UI + streaming + feedback | ✅ Selesai — parser SSE ditulis ulang, riwayat & sitasi berfungsi |
| P6 | Polish, responsive, bug fixing | ✅ Selesai — dark mode, error boundary, drawer mobile, 47 test |

### Yang belum dikerjakan

- **Suite E2E berbasis browser.** Lingkungan pengembangan tidak punya browser
  headless, jadi UI diverifikasi lewat CSS terkompilasi, respons HTTP, dan
  hitungan kontras — bukan secara visual. Playwright adalah langkah berikutnya.
- **Audit logging** untuk mutasi dashboard (`rules.md` §8 masih menandainya terbuka).
- **Kolom `accuracy` di `faqs`** tidak pernah diisi apa pun.
- **Kualitas retrieval belum ditala** — belum ada reranking, hybrid search, atau
  query rewriting; masih top-5 cosine murni atas dokumen `published`.
