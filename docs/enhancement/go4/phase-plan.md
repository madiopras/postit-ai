# Phase Plan: Migrasi Frontend ke DaisyUI 5 & Chat-Scoped PWA (Go4)

> **Proyek:** PostIt AI  
> **Dokumen:** Implementation Roadmap & Phase Execution Plan  
> **Status:** Proposal & Planning Phase (Approved Strategy)  

---

## 1. Ringkasan Rencana Fase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Fase 0: Setup DaisyUI 5 Foundation & Baseline PWA Asset                     │
│ ├─ Install daisyui@latest (DaisyUI 5) plugin Tailwind CSS 4                │
│ ├─ Konfigurasi tema DaisyUI (Light & Dark)                                  │
│ └─ Pembuatan Web Manifest & Icon Assets PWA (192x192, 512x512, apple-touch) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Fase 1: Scoped Service Worker & Offline Infrastructure                      │
│ ├─ Registrasi Service Worker lifecycle di Next.js 16 (Scope: `/`)           │
│ ├─ Strategi Caching (Precache Chat Shell, Bypass Dashboard & APIs)          │
│ ├─ Offline Fallback UI khusus halaman Chat                                  │
│ └─ In-App Install Prompt Banner (Khusus di Halaman Chat `/`)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Fase 2: Core Chat UI Modernization dengan DaisyUI (PWA Experience)          │
│ ├─ Chat Timeline (DaisyUI `chat`, `chat-start`, `chat-end`, `chat-bubble`)  │
│ ├─ Mobile PWA Bottom Nav (`dock`) & Sidebar History (`drawer`)              │
│ ├─ Chat Composer (`fieldset`, `textarea`, `btn`)                            │
│ └─ Empty State, Citations (`badge`), Loading (`loading-dots`)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Fase 3: Dashboard & Auth Surface Migration (Standard Web UI)                │
│ ├─ Halaman Login (`card`, `input`, `btn`)                                   │
│ ├─ Dashboard Shell & Sidebar (`drawer`, `menu`, `navbar`)                   │
│ ├─ Statistik & Data Tables (`stats`, `table`, `badge`, `modal`)             │
│ └─ Modul FAQ, SOP (Attachments & Versioning), Users, Admin, Config          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │

---

## 2. Detail Rencana Per Fase

### Fase 0: Setup DaisyUI 5 Foundation & Baseline PWA Asset
- **Tujuan**: Memasang plugin DaisyUI 5 pada Tailwind CSS 4 dan menyiapkan konfigurasi tema serta aset web app manifest.
- **Tasks**:
  1. `npm install daisyui@latest` (DaisyUI 5).
  2. Konfigurasi `@plugin "daisyui"` di `app/globals.css` dengan themes kustom `postit-light` & `postit-dark`.
  3. Generate icons PWA (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico`) di folder `public/icons/`.
  4. Buat `app/manifest.ts` (Next.js native manifest metadata terfokus pada Chat `/`).
  5. Setup Apple meta tags di `app/layout.tsx`.
- **Deliverable**: DaisyUI aktif dan manifest PWA terdeteksi oleh browser.

---

### Fase 1: Scoped Service Worker & Offline Infrastructure
- **Tujuan**: Menyediakan kemampuan standalone caching dan offline handling terisolasi pada Chat (`/`).
- **Tasks**:
  1. Buat Service Worker (`public/sw.js`) dengan aturan: precache shell chat (`/`), bypass penuh untuk `/dashboard/*` dan `/api/*`.
  2. Implementasi Service Worker registration hook / component di `app/layout.tsx`.
  3. Buat halaman/modal offline status yang ramah saat koneksi terputus di Chat.
  4. Buat custom hook `usePWAInstallPrompt` (hanya aktif di rute `/`) untuk menampilkan UI Install Banner yang informatif.
- **Deliverable**: Chatbot dapat diinstall ke homescreen smartphone/desktop dan shell terbuka seketika (< 200ms) tanpa memengaruhi dashboard.

---

### Fase 2: Core Chat UI Modernization dengan DaisyUI (PWA Experience)
- **Tujuan**: Mentransformasi tampilan chat publik menjadi tampilan interaktif DaisyUI dengan dukungan penuh tata letak mobile PWA.
- **Tasks**:
  1. Migrasi `components/chat/chat-message.tsx`:
     - Terapkan `chat chat-start` (asisten) & `chat chat-end` (pengguna).
     - Desain `chat-bubble` dengan styling warna semantik DaisyUI.
     - Sitasi dokumen dengan DaisyUI `badge`.
  2. Tambahkan DaisyUI `dock` (Bottom Navigation Bar) untuk tampilan layar mobile PWA (Aksi: New Chat, History Drawer, Theme, Profile).
  3. Migrasi `components/chat/conversation-sidebar.tsx` & `chat-shell.tsx` memanfaatkan DaisyUI `drawer`.
  4. Migrasi `components/chat/chat-composer.tsx` dengan DaisyUI input controls dan floating action button.
  5. Migrasi `components/chat/chat-empty-state.tsx` dengan hero cards & suggestion chips DaisyUI.
- **Deliverable**: Pengalaman Chatbot AI modern, responsif, dan optimal di mode mobile PWA.

---

### Fase 3: Dashboard & Auth Surface Migration (Standard Web UI)
- **Tujuan**: Menyelaraskan seluruh panel admin dan autentikasi ke DaisyUI 5 sebagai Web App murni.
- **Tasks**:
  1. Migrasi `app/login/page.tsx` menggunakan DaisyUI `card`, `input`, `btn`.
  2. Migrasi `app/dashboard/layout.tsx` & `app-sidebar.tsx` menggunakan `drawer` dan `menu` DaisyUI.
  3. Migrasi `app/dashboard/page.tsx` (Overview) menggunakan `stats` dan `stat-value` DaisyUI.
  4. Migrasi modul tabel data: `app/dashboard/faq`, `app/dashboard/sop`, `app/dashboard/documents`, `app/dashboard/users`, `app/dashboard/admins`, `app/dashboard/audit-logs` menggunakan DaisyUI `table`, `pagination`, `badge`, `modal`.
- **Deliverable**: Seluruh antarmuka admin konsisten menggunakan komponen semantik DaisyUI 5 tanpa caching Service Worker.

---

### Fase 4: Validasi, Performance & Audit PWA
- **Tujuan**: Memastikan fungsionalitas, performa, dan reliabilitas PWA 100% terjaga.
- **Tasks**:
  1. Jalankan unit test (`npm test`) & verifikasi tidak ada regresi pada auth, RAG, atau chat client.
  2. Jalankan type checking (`npm run typecheck`) dan linting (`npm run lint`).
  3. Pengujian installability PWA via Chrome DevTools & Lighthouse PWA Audit pada Chat (`/`).
  4. Verifikasi bahwa `/dashboard/*` tidak terkena stale cache.
  5. Buat visual review dan perbarui dokumentasi summary.
- **Deliverable**: Production-ready DaisyUI 5 + Chat-Scoped PWA release.

                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Fase 4: Validasi, Performance & Audit PWA                                   │
│ ├─ Audit Lighthouse PWA Score (Target 100% PWA criteria pada Chat `/`)      │
│ ├─ Validasi Zero-Stale Cache pada Dashboard Admin                           │
│ ├─ Validasi Unit Test (Vitest) & E2E Test (Playwright)                     │
│ ├─ Uji coba Offline & Add-to-Homescreen di Mobile & Desktop                 │
│ └─ Pembersihan Legacy Code & Final Documentation Update                     │
└─────────────────────────────────────────────────────────────────────────────┘
```
