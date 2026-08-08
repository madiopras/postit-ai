# PRD: Migrasi DaisyUI 5 & Chat-Scoped PWA (Go4)

> **Proyek:** PostIt AI — Chatbot RAG untuk FAQ & SOP Perusahaan  
> **Target:** Migrasi Frontend ke DaisyUI 5 (Tailwind CSS 4) + Scoped PWA Khusus Chat Publik (`/`)  
> **Status:** Proposal & Planning Phase (Approved Strategy)  
> **Tanggal:** 8 Agustus 2026  

---

## 1. Executive Summary & Latar Belakang

PostIt AI telah memiliki pipeline RAG yang stabil, autentikasi multi-role (Visitor, User, Admin, Super Admin), manajemen FAQ/SOP dengan versioning & attachments, serta dashboard analitik.

Pada siklus **Go4**, dilakukan modernisasi antarmuka dan peningkatan pengalaman akses melalui:
1. **Penyederhanaan & Konsistensi UI Kit dengan DaisyUI 5**:
   - DaisyUI 5 berjalan *native* di atas Tailwind CSS 4 dengan arsitektur utility-first semantik CSS murni (`btn`, `chat`, `dock`, `drawer`, `stat`, `card`, `modal`).
   - Menghilangkan *boilerplate* kustom berlebih dan menyediakan sistem tema (*light* & *dark*) yang konsisten.
2. **Implementasi Chat-Scoped PWA (Progressive Web App Khusus Chat `/`)**:
   - Berdasarkan analisis performa dan keandalan data, PWA difokuskan **hanya pada P1 (Chat Publik & Asisten AI di `/`)**.
   - Area Admin Dashboard (`/dashboard/*`) tetap beroperasi sebagai Web Application standar (*non-PWA, bypass cache*) untuk mencegah risiko data basi (*stale cache*) dan menjaga performa server tetap maksimal.

---

## 2. Analisis & Keputusan Scoped PWA (P1 Only)

### 2.1 Matriks Evaluasi & Keputusan Scope

| Modul / Halaman | Pengguna | Skenario Penggunaan | Keputusan PWA | Alasan Arsitektural |
| :--- | :--- | :--- | :---: | :--- |
| **Chat Publik / Asisten AI (`/`)** | Seluruh Karyawan (Mobile/Desktop) | Tanya-jawab instan FAQ & SOP di kantor, lapangan, atau meeting. | **PWA ENABLED (P1)** | Butuh akses cepat 1-tap homescreen, standalone fullscreen (tanpa browser URL bar), navigasi bawah (`dock`), dan precache shell cepat. |
| **Autentikasi & Profil (`/login`, User Menu)** | Semua Pengguna | Login cepat dan peralihan sesi pengguna. | **PWA ENABLED (Shared)** | Terintegrasi langsung dengan shell chat untuk kemudahan login pengguna terdaftar. |
| **Dashboard Knowledge Base (FAQ & SOP CRUD)** | Admin & Super Admin | Penulisan dokumen, upload attachments (PDF/DOCX), preview versioning. | **STANDARD WEB (No PWA Cache)** | Membutuhkan koneksi live database langsung. Caching dihindari agar terbebas dari *stale data*. |
| **AI Configuration & Monitoring (`/dashboard/config`, logs)** | Super Admin | Konfigurasi model AI, latency monitor, audit logs. | **STANDARD WEB (No PWA Cache)** | Operasi server administratif sensitif yang wajib *live request* (Bypass Service Worker). |

---

## 3. Keunggulan Arsitektur Chat-Scoped PWA

1. **Performa Ultra Cepat & Storage Minimalis (< 500 KB)**:
   - Service Worker hanya mem-precache shell chat (`/`), CSS DaisyUI, font Inter, dan icon.
   - First Contentful Paint (FCP) terbuka seketika (< 200 ms) saat dibuka dari homescreen smartphone.
2. **Zero Stale Data di Dashboard Admin**:
   - Request ke `/dashboard/*` dan endpoint mutasi data langsung diarahkan ke server (*Network Only*). Admin selalu melihat data knowledge base paling aktual.
3. **Keamanan Sesi Terisolasi**:
   - Token JWT cookie httpOnly (`simpleai_token`) untuk admin terlindungi tanpa manipulasi cache layer Service Worker.
4. **UX Mobile Native yang Terfokus**:
   - Karyawan mendapatkan pengalaman aplikasi chat native yang mulus, sementara admin menggunakan dashboard web desktop standar tanpa gangguan banner instalasi.

---

## 4. Scope & Batasan Rencana (Go4)

### In-Scope:
- Migrasi styling dan komponen dari *Untitled UI* ke **DaisyUI 5** (Tailwind CSS 4).
- Konfigurasi tema DaisyUI (`postit-light` & `postit-dark`).
- Implementasi PWA khusus chat:
  - `manifest.json` / `app/manifest.ts` dengan scope `/` dan start_url `/`.
  - Service Worker cerdas: precache static shell & bypass `/dashboard/*` + `/api/*`.
  - In-app install banner yang hanya muncul pada halaman chat (`/`).
  - Mobile bottom navigation menggunakan DaisyUI `dock`.
  - History sidebar menggunakan DaisyUI `drawer`.
- Migrasi UI Dashboard & Auth ke komponen semantik DaisyUI 5 (Web standar).

### Out-of-Scope (Non-Goals):
- Tidak meng-cache data live dashboard atau RAG SSE `/api/chat` ke dalam offline storage.
- Tidak mengubah skema database PostgreSQL/pgvector atau kontrak API backend.
- Tidak membuat native wrapper App Store / Play Store.
