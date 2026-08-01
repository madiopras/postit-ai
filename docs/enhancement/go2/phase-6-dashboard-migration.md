# Phase 6 — Dashboard Migration

Tanggal pelaksanaan: 1 Agustus 2026  
Status: selesai

## 1. Objective

Memigrasikan seluruh surface dashboard aktif ke design language Untitled UI
tanpa mengubah kontrak API, authorization, atau behavior CRUD yang sudah ada.

## 2. Current Behaviour Sebelum Migrasi

- shell dashboard memakai sidebar, breadcrumb, dropdown, dan theme control
  shadcn/Base UI;
- overview memakai card, skeleton, toggle, serta chart wrapper lama;
- FAQ, SOP, Documents, Users, dan Admins memakai campuran primitive shadcn dan
  native control;
- Configuration dan Audit Logs memakai styling custom dengan token global lama;
- copy UI bercampur Bahasa Indonesia dan Inggris;
- beberapa table/list hanya menampilkan toast saat request awal gagal;
- aksi FAQ hanya terlihat saat row di-hover;
- preview chunk SOP memakai overlay custom tanpa focus containment.

## 3. Proposed Approach yang Diterapkan

1. Membuat composition layer dashboard lokal di
   `components/dashboard/dashboard-ui.tsx`.
2. Menggunakan primitive Untitled UI MIT yang sudah diprovenance untuk button,
   modal, dan slideout; React Aria menangani menu, switch, focus, Escape, dan
   overlay behavior.
3. Mempertahankan native semantic input/select/table untuk kontrak form existing
   yang bergantung pada event DOM dan `react-hook-form` ref.
4. Memetakan semantic class lama hanya di dalam `.ui-surface` dashboard ke token
   Untitled agar tidak mewarnai ulang surface lain secara global.
5. Memigrasikan shell lebih dahulu, kemudian overview dan modul operasional.
6. Mempertahankan endpoint, method, payload, role gate, dan mutation flow.

Tidak ada dependency baru dan tidak ada source Untitled UI baru yang disalin
pada phase ini. Primitive upstream yang digunakan tetap mengacu pada provenance
dan lisensi di `docs/third-party/untitled-ui.md`.

## 4. Files yang Berubah

### Foundation dan shell

- `components/dashboard/dashboard-ui.tsx`
- `app/dashboard/layout.tsx`
- `components/app-sidebar.tsx`
- `components/theme-toggle.tsx`
- `app/layout.tsx`
- `styles/untitled-theme.css`
- `app/dashboard/loading.tsx`
- `app/dashboard/error.tsx`

### Overview

- `app/dashboard/page.tsx`
- `components/section-cards.tsx`
- `components/chart-area-interactive.tsx`

### Modul

- `app/dashboard/faq/page.tsx`
- `app/dashboard/faq/[id]/page.tsx`
- `app/dashboard/sop/page.tsx`
- `app/dashboard/sop/[id]/page.tsx`
- `app/dashboard/documents/page.tsx`
- `app/dashboard/users/page.tsx`
- `app/dashboard/admins/page.tsx`
- `app/dashboard/config/page.tsx`
- `app/dashboard/audit-logs/page.tsx`

### Test dan evidence

- `e2e/dashboard-migration.spec.ts`
- `docs/enhancement/go2/phase-6/dashboard-overview-desktop.png`
- `docs/enhancement/go2/phase-6/dashboard-overview-dark-desktop.png`
- `docs/enhancement/go2/phase-6/dashboard-mobile-navigation.png`

## 5. Implementation Result

### 5.1 Shell dan navigation

- product name konsisten menjadi `PostIt AI`;
- sidebar desktop 280 px dan collapsed 80 px;
- mobile navigation menggunakan dismissable slideout dengan focus containment;
- skip link, landmark, breadcrumb, `aria-current`, dan visible focus tersedia;
- menu `Admin`, `Konfigurasi AI`, serta `Log audit` hanya dirender untuk Super
  Admin;
- Admin operasional tetap melihat Ringkasan, FAQ, SOP, Dokumen, dan Pengguna;
- profile menu menampilkan identitas, role, dan `Keluar`;
- theme toggle memakai Untitled Button dan tidak lagi membutuhkan provider
  tooltip global lama.

### 5.2 Overview

- card metrik memakai surface, border, radius, dan typography Untitled;
- skeleton mempertahankan dimensi card/chart;
- API error tetap berada di dalam shell dan menyediakan `Coba lagi`;
- chart Recharts dipertahankan, tetapi wrapper shadcn dihapus;
- legend dan tooltip tetap tersedia, series dibedakan label dan warna;
- categorical colors memakai slot yang ditentukan di `design.md` untuk light dan
  dark;
- animasi line dimatikan agar reduced-motion dan visual capture stabil.

### 5.3 FAQ, SOP, dan Documents

- table, filter, status badge, loading, empty, serta error/retry memakai
  composition dashboard baru;
- aksi FAQ selalu dapat ditemukan, tidak hanya pada hover;
- create/edit FAQ mempertahankan Zod, `react-hook-form`, endpoint, dan payload;
- SOP list/detail mempertahankan publish, rollback, attachment, extraction,
  access restriction, serta chunk preview;
- chunk preview berpindah dari overlay custom ke modal React Aria;
- Documents mempertahankan filter query, pagination, resync, serta status vektor.

### 5.4 Users, Admins, Configuration, dan Audit Logs

- modal Users/Admins berpindah ke Untitled modal dengan dismiss, Escape, focus
  containment, dan focus restoration;
- native select adapter mempertahankan nilai role/status serta payload API;
- authorization route dan handler tidak diubah;
- field API key Configuration tetap write-only dan hanya menampilkan masked
  preview dari API;
- save/reset/test configuration mempertahankan behavior existing dan form input
  tidak dikosongkan saat request gagal;
- Audit Logs memiliki loading skeleton, empty state, inline failure, retry,
  search, table, serta pagination.

### 5.5 Bahasa dan responsive behavior

- heading, action, status, empty/error copy utama dashboard diseragamkan ke
  Bahasa Indonesia;
- table memakai horizontal overflow pada viewport sempit tanpa mengecilkan teks;
- action/header membungkus secara responsif dan primary action tetap ditemukan;
- light, dark, desktop, serta mobile tervalidasi melalui Playwright dan visual
  capture.

## 6. Risks dan Edge Cases

| Risiko | Mitigasi |
|---|---|
| Role menu berbeda dari authorization server | UI memakai `/api/auth/me`; proxy dan handler role gate existing tetap authoritative; unit dan E2E role test dipertahankan |
| Adapter form mengubah payload | Native event/ref contract dipertahankan; create user diuji sampai request body |
| Modal kehilangan focus/Escape | Modal Untitled berbasis React Aria dan diuji keyboard |
| Table request gagal dan data lama tampak valid | Inline error menggantikan content state dan menyediakan retry |
| Chart tidak responsif atau hanya mengandalkan warna | Responsive container, legend, tooltip, aria-label summary, dan label series |
| Token dashboard bocor ke chat/login | mapping compatibility hanya hidup di bawah `.ui-surface` |
| API key terekspos | field tidak diprefill; API hanya memberi masked preview; key kosong tidak dikirim saat save |
| Legacy component masih ada di repository | tidak lagi diimpor oleh route aktif; penghapusan fisik/dependency tetap scope Phase 7 setelah consumer audit |

## 7. Testing Strategy dan Hasil

### Static dan unit

- `npm run lint` — lulus;
- `npm run typecheck` — lulus;
- `npm test` — lulus, 154 test passed dan 10 skipped.

### Playwright

Host Chromium tidak dapat dijalankan karena image host tidak memiliki
`libnspr4.so`. Suite kemudian dijalankan melalui image resmi Playwright yang
sudah menjadi fallback repository:

- `make test-e2e-docker` — lulus, 30/30;
- coverage Phase 6: shell desktop, menu berbasis role, profile keyboard,
  slideout mobile, modal/form/select Users, smoke seluruh modul, dan
  overview failure/retry;
- visual capture terpisah — lulus untuk desktop light/dark dan mobile.

### Production

- `npm run build` — lulus; 31 static/dynamic pages selesai diproses.

## 8. Definition of Done

- [x] shell/navigation memakai Untitled design language;
- [x] overview cards/chart memakai token dashboard baru;
- [x] FAQ, SOP, Documents, Users, Admins, Configuration, dan Audit Logs
      dimigrasikan tanpa perubahan API;
- [x] role filtering dan authorization existing dipertahankan;
- [x] table/form memiliki loading, empty, error, dan success feedback yang
      relevan;
- [x] modal dan mobile navigation keyboard-accessible;
- [x] light/dark serta desktop/mobile tervalidasi;
- [x] route aktif tidak mengimpor `components/ui/*`;
- [x] tidak ada dependency atau source PRO baru;
- [x] lint, typecheck, unit, E2E, build, dan visual review lulus.

## 9. Deferred ke Phase 7

- hapus file shadcn/Base UI/Radix yang sudah tidak memiliki consumer;
- hapus dependency hanya setelah consumer graph final terbukti kosong;
- satukan helper/token compatibility yang masih ganda;
- audit bundle, accessibility final, third-party notices, dan release checklist.
