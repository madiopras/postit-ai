# PRD: PostIt AI — Chatbot & Admin Dashboard

> **Brand:** PostIt AI  
> **Tagline:** Smart Answers, Instant Actions.  
> **Design Source:** Google Stitch (`docs/stitch/*.html`)

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

### 2.1 Admin Login
- Login sederhana menggunakan **credentials** (email + password) via NextAuth.js v5 (Auth.js)
- Admin credentials disimpan di environment variables:
  - `ADMIN_EMAIL=admin@postit.ai`
  - `ADMIN_PASSWORD=postit-admin-2024`
- Tidak ada registrasi publik
- Session menggunakan JWT, expire 24 jam

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

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Server Actions, Streaming) |
| **Styling** | Tailwind CSS + custom design tokens |
| **Icons** | Material Symbols Outlined |
| **Fonts** | Geist (local) + Inter (Google Fonts) |
| **Auth** | NextAuth.js v5 (Credentials provider) |
| **Database** | PostgreSQL 16 + pgvector (Docker) |
| **ORM** | Drizzle ORM |
| **AI SDK** | OpenAI-compatible (via 9router atau endpoint lain) |
| **Charts** | Recharts (dashboard) |

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
│   └── utils.ts
├── middleware.ts
├── drizzle.config.ts
├── package.json
├── docker-compose.yml
└── .env
```

---

## 11. API Endpoints

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/auth/login` | - | Login admin, return JWT cookie |
| POST | `/api/auth/logout` | - | Hapus cookie JWT |
| GET | `/api/auth/me` | JWT | Get current user info |
| POST | `/api/chat` | - | Chat dengan RAG (SSE stream) |
| GET | `/api/faq` | - | List FAQ (published) |
| POST | `/api/faq` | JWT | Create FAQ |
| PUT | `/api/faq/[id]` | JWT | Update FAQ |
| DELETE | `/api/faq/[id]` | JWT | Delete FAQ |
| GET | `/api/sop` | - | List SOP (published) |
| POST | `/api/sop` | JWT | Create SOP |
| PUT | `/api/sop/[id]` | JWT | Update SOP |
| DELETE | `/api/sop/[id]` | JWT | Delete SOP |
| POST | `/api/index` | JWT | Process & index FAQ/SOP ke vector store |
| **GET** | **`/api/config`** | **JWT** | **Get current configuration** |
| **PUT** | **`/api/config`** | **JWT** | **Update configuration** |
| **POST** | **`/api/config/test`** | **JWT** | **Test koneksi ke endpoint** |

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
  is_active          BOOLEAN DEFAULT true,
  updated_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

Hanya 1 row dengan `is_active = true` yang digunakan. Semua config lama tetap disimpan untuk audit trail.

---

## 13. Milestone

| Fase | Fitur | Durasi |
|------|-------|--------|
| P0 | Schema DB, seed admin, setup project | Done |
| P1 | Auth (login, logout, middleware) | Next |
| P2 | Dashboard CRUD FAQ & SOP | Next |
| P3 | Configuration (app_config, API, UI) | Next |
| P4 | Indexing (embedding → vector store) | Next |
| P5 | Chat UI + streaming + feedback | Next |
| P6 | Polish, responsive, bug fixing | Final |