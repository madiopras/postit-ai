# Arsitektur Frontend: DaisyUI 5 & Chat-Scoped PWA (Go4)

> **Proyek:** PostIt AI  
> **Dokumen:** Architecture & Design Specification  
> **Status:** Proposal & Planning Phase (Approved Strategy)  

---

## 1. Arsitektur Komponen DaisyUI 5

DaisyUI 5 bekerja di atas Tailwind CSS 4 dengan struktur kelas semantik CSS murni. Komponen akan menggantikan dependensi kustom sebelumnya dengan pemetaan modular berikut:

### 1.1 Matriks Pemetaan Komponen (From Untitled UI -> DaisyUI 5)

| Komponen Eksisting | Komponen DaisyUI 5 Target | Class DaisyUI & Manfaat |
| :--- | :--- | :--- |
| **Chat Timeline (`chat-message.tsx`)** | `chat` | `chat chat-start`, `chat chat-end`, `chat-bubble`, `chat-header`, `chat-footer`. Bubble percakapan native yang rapi dan responsif. |
| **Mobile PWA Nav Bar** | `dock` (App Bar) | `dock dock-bottom`. Fixed navigation bar bawah khas aplikasi mobile iOS/Android untuk aksi New Chat, History, Tema, Profil. |
| **Sidebar History (`conversation-sidebar.tsx`)** | `drawer` & `menu` | `drawer`, `drawer-side`, `drawer-overlay`, `menu menu-sm`. Sidebar geser halus berbasis CSS native. |
| **Composer Input (`chat-composer.tsx`)** | `fieldset`, `textarea`, `btn` | `fieldset`, `textarea textarea-bordered`, `btn btn-circle btn-primary`. Composer mengambang yang bersih dan responsif. |
| **Tombol & Aksi** | `button` | `btn btn-primary`, `btn-secondary`, `btn-ghost`, `btn-sm`, `btn-square`. |
| **Feedback Toast / Alert** | `toast`, `alert` | `toast toast-top toast-end`, `alert alert-success`, `alert alert-error`. |
| **Loading State** | `loading` & `skeleton` | `loading loading-dots`, `loading loading-spinner`, `skeleton`. Indikator loading visual halus saat streaming AI. |
| **Dashboard Metrics & Cards** | `stat`, `card` | `stats stats-vertical lg:stats-horizontal`, `stat`, `stat-title`, `stat-value`, `card card-border`. |
| **Modal & Dialogs** | `modal` | `modal`, `modal-box`, `modal-action`, `dialog.showModal()`. Aksesibilitas HTML5 dialog native. |
| **Badges & Citations** | `badge` | `badge badge-neutral`, `badge badge-primary badge-outline`. Label sitasi sumber SOP dan status dokumen. |
| **Theme Controller** | `theme-controller` | `theme-controller toggle`. Mengganti tema DaisyUI secara instan tanpa reload. |

---

## 2. Arsitektur & Spesifikasi Scoped PWA (Chat-First)

```
                                  [ User Mobile / Desktop ]
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
                 [ Browser Window ]                       [ Standalone PWA Window ]
                 (Dashboard / Web)                        (Chatbot Publik `/`)
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              ▼
                                 [ Service Worker (sw.js) ]
                                 (Route Scope Filter)
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Cache Storage (Chat Only) ]                    [ Network Only / Bypass ]
         • App Shell Chat (`/`)                           • Dashboard (`/dashboard/*`)
         • DaisyUI Theme CSS                              • Live CRUD (`/api/sop`, `/api/faq`)
         • Font & Lucide Icons                            • SSE Streaming (`/api/chat`)
         • Manifest & Icons                               • Auth API (`/api/auth/*`)
```

### 2.1 Manifest Web App (`app/manifest.ts` atau `public/manifest.json`)
- **Nama Aplikasi:** `PostIt AI — Asisten SOP & FAQ`
- **Short Name:** `PostIt AI`
- **Display Mode:** `standalone` (menghapus URL bar dan navigasi browser)
- **Start URL:** `/`
- **Scope:** `/` (terfokus pada antarmuka chat)
- **Theme Color:** `#4f46e5` (Light) / `#1e1e2e` (Dark)
- **Background Color:** `#ffffff` / `#0f172a`
- **Orientation:** `portrait-primary` (Mobile), `any` (Desktop/Tablet)
- **Icons:**
  - 192x192 PNG (Standard Android launcher)
  - 512x512 PNG (Splash screen & HD display)
  - 180x180 Apple Touch Icon (iOS Safari)
  - Maskable Icons (Android adaptive icon support)
- **Shortcuts:**
  - `Chat Baru` -> `/`
  - `Buka Riwayat` -> `/?history=true`

### 2.2 Strategi Caching Service Worker
1. **Chat Route (`/`) & Static Assets (`Cache-First, Network Revalidate`)**:
   - Cache shell chat, bundle JS statis, font Inter, dan icon.
2. **Dashboard & Mutasi API (`Network Only / Bypass`)**:
   - Semua rute `/dashboard/*` dan `/api/*` langsung diarahkan ke live server untuk menjamin zero-stale-data dan keandalan operasi admin.
3. **SSE Stream `/api/chat` (`Network Only`)**:
   - Response streaming langsung di-stream tanpa masuk cache storage.

---

## 3. Sistem Tema (Theme System)

Konfigurasi tema DaisyUI disesuaikan dengan identitas brand **PostIt AI**:
1. **Corporate Light (`postit-light`)**: Latar bersih, kontras tinggi, brand indigo/blue profesional.
2. **Modern Dark (`postit-dark`)**: Latar gelap elegan, kontras nyaman untuk penggunaan malam hari.
3. Sinkronisasi otomatis dengan preferensi OS (`prefers-color-scheme`) dan toggle manual di header/dock.
