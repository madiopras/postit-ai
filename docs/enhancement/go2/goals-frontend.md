# Goals Frontend — PostIt AI dengan Untitled UI

> Status: analisis ulang dan rencana implementasi, belum diimplementasikan  
> Tanggal revisi: 1 Agustus 2026  
> Target design system: Untitled UI React v8, komponen open-source saja  
> Fokus delivery pertama: chat publik, kemudian auth dan dashboard admin

## 1. Objective

Mengembangkan seluruh frontend PostIt AI menggunakan bahasa visual dan pola
komponen **Untitled UI React**, dengan halaman chat publik sebagai pilot pertama.
Migrasi dilakukan bertahap agar streaming SSE, RAG, riwayat chat,
authentication, authorization, dan seluruh operasi dashboard yang sudah
berjalan tidak rusak.

Target akhirnya adalah satu pengalaman produk yang konsisten pada chat, login,
dan dashboard. Iterasi pertama tidak mengganti backend, schema database,
kontrak API, atau pipeline AI.

Referensi resmi:

- [Untitled UI React — Introduction](https://www.untitledui.com/react/docs/introduction)
- [Installation](https://www.untitledui.com/react/docs/installation)
- [Next.js integration](https://www.untitledui.com/react/integrations/nextjs)
- [Theming](https://www.untitledui.com/react/docs/theming)
- [Open-source repository](https://github.com/untitleduico/react)
- [License agreement](https://www.untitledui.com/license)

## 2. Ringkasan Keputusan

1. **Untitled UI menjadi target design system frontend.** Komponen shadcn yang
   sudah ada tidak dihapus sekaligus; komponen tersebut dipertahankan selama
   transisi sampai setiap surface selesai dimigrasikan.
2. **Hanya memakai komponen open-source dari repository publik yang berlisensi
   MIT.** Komponen, template halaman, Figma asset, icon PRO, private registry,
   dan material PRO lain tidak masuk scope sampai lisensinya disetujui.
3. **Stack utama tidak perlu diganti.** Repository sudah memakai React 19.2.4,
   Tailwind CSS 4.3.3, dan TypeScript 5.9.3; versi ini selaras dengan stack
   Untitled UI React saat analisis dilakukan.
4. **React Aria menjadi primitive interaksi untuk komponen Untitled UI baru.**
   Dependency-nya hanya ditambahkan setelah audit pada Phase 0.
5. **Jangan menjalankan `untitledui init` pada repository ini.** Command tersebut
   ditujukan untuk membuat project baru dan berisiko menimpa fondasi existing.
   Gunakan manual copy dari repository MIT atau CLI `add` dengan path, versi,
   dan target eksplisit setelah diff diperiksa.
6. **Untitled UI v8 harus dipin secara eksplisit.** Jangan bergantung pada
   `@latest` tanpa `--lib-version 8`, catatan versi, dan review diff.
7. **Halaman chat `/` menjadi pilot.** Setelah stabil, pola yang sama diterapkan
   ke login, dashboard shell, form, table, dialog, dan feedback UI.
8. **Fitur bisnis existing wajib dipertahankan:** streaming SSE, riwayat
   visitor/user, Markdown, sitasi FAQ/SOP, feedback, dark mode, dan proteksi
   SOP restricted.
9. **Icon tidak langsung dimigrasikan.** Lucide tetap dipakai pada fase awal
   untuk menghindari dependency dan boundary lisensi tambahan.

## 3. Batas Lisensi dan Source Provenance

Masalah lisensi adalah release gate, bukan catatan administratif setelah
implementasi.

### 3.1 Yang boleh digunakan pada scope ini

- source component yang tersedia di repository publik
  [`untitleduico/react`](https://github.com/untitleduico/react);
- komponen yang ditandai open-source/free dan dapat ditelusuri ke source MIT;
- modifikasi internal terhadap source MIT yang sudah disalin ke repository;
- dokumentasi publik sebagai panduan integrasi, bukan sumber asset PRO.

Repository publik menyatakan komponen open-source-nya memakai lisensi MIT.
License agreement Untitled UI juga membedakan komponen MIT dari produk PRO yang
memiliki perjanjian terpisah.

### 3.2 Yang tidak boleh digunakan tanpa approval lisensi

- React PRO components atau application/page examples PRO;
- source dari private GitHub, Storybook, atau private package registry;
- Figma PRO assets, illustration, avatar, logo, atau design file berbayar;
- Untitled UI Icons PRO;
- credential, API key, magic link, atau akses akun milik pihak lain;
- material yang provenance atau tier lisensinya tidak dapat dibuktikan.

### 3.3 Kontrol wajib

1. Catat nama komponen, URL source, versi/tag atau commit, tanggal pengambilan,
   dan status lisensi setiap komponen yang diadopsi.
2. Simpan notice MIT atau third-party notices sesuai kebijakan legal perusahaan.
3. Review hasil CLI sebelum commit; jangan memakai `--overwrite` terhadap file
   existing tanpa diff dan backup yang jelas.
4. Jangan login ke Untitled UI PRO pada workflow implementasi ini.
5. Bila status satu komponen meragukan, hentikan pemakaiannya dan implementasikan
   komposisi sendiri di atas primitive MIT yang disetujui.

Dokumen ini bukan pendapat hukum. Approval akhir tetap mengikuti kebijakan legal
atau procurement perusahaan.

## 4. Kondisi Saat Ini (As-Is)

### 4.1 Fondasi repository

| Area | Kondisi saat ini | Dampak terhadap Untitled UI |
|---|---|---|
| Framework | Next.js 16 App Router, React 19.2.4 | Kompatibel; interactive React Aria component tetap memerlukan client boundary |
| TypeScript | 5.9.3 | Selaras dengan versi dokumentasi Untitled UI |
| Styling | Tailwind CSS 4.3.3 | Selaras; theme harus diintegrasikan tanpa menimpa token existing |
| Design system | shadcn `base-nova`, Base UI, dan sebagian Radix | Dapat hidup sementara, tetapi bukan dua sumber kebenaran permanen |
| Theme | CSS variables semantik dengan light/dark mode | Perlu token bridge menuju palette Untitled UI |
| Icons | Lucide React | Dipertahankan pada pilot agar migrasi kecil dan aman |
| Chat | SSE streaming, Markdown, typing indicator, error state | Behavior dipertahankan dan dipisahkan dari presentasi |
| History | Maksimal 50 sesi visitor/user, load dan delete | Dapat dipresentasikan ulang dengan Untitled UI primitives |
| RAG UI | Citation FAQ/SOP dan feedback | Membutuhkan komponen domain custom |
| Auth/access | Visitor, user, admin, super admin, restricted SOP | Wajib tetap menjadi security boundary server-side |
| Testing | Vitest dan Playwright | Cukup untuk regression dan responsive E2E awal |

### 4.2 Masalah frontend yang tetap perlu diselesaikan

1. `app/page.tsx` menggabungkan transport, state, dan seluruh layout chat dalam
   satu client component besar.
2. Sidebar history belum memiliki search, grouping waktu, skeleton, empty
   result, atau error recovery.
3. Session row belum semantik untuk keyboard dan delete terlalu bergantung pada
   hover.
4. Auto-scroll setiap chunk dapat menarik pengguna yang membaca pesan lama.
5. Lebar kanvas dan bubble belum dibatasi untuk readability di layar besar.
6. Loading, changing-session, streaming, error, dan login-required belum
   mempunyai hierarchy visual konsisten.
7. Bahasa label citation masih bercampur Indonesia dan Inggris.
8. Halaman chat belum menampilkan identity/login/dashboard action yang jelas.
9. Coverage E2E frontend masih sangat minimal.
10. Nama produk belum konsisten: chat/metadata memakai `PostIt AI`, sidebar
    admin memakai `SimpleAI`.

## 5. Analisis Untitled UI

### 5.1 Model distribusi

Untitled UI bukan runtime component package tradisional. Source komponen
ditambahkan langsung ke project melalui copy/paste atau CLI sehingga tim
memiliki dan merawat salinan kode tersebut. Konsekuensinya:

- komponen dapat dimodifikasi sesuai domain PostIt AI;
- tidak ada vendor runtime untuk keseluruhan component library;
- update upstream tidak otomatis dan harus melalui review diff;
- provenance, version pinning, dan maintenance menjadi tanggung jawab project.

### 5.2 Kesesuaian teknis

| Kebutuhan Untitled UI | Repository | Status |
|---|---|---|
| React 19.2 | React 19.2.4 | Sesuai |
| Tailwind CSS 4.3 | Tailwind CSS 4.3.3 | Sesuai |
| TypeScript 5.9 | TypeScript 5.9.3 | Sesuai |
| React Aria | Belum terpasang | Dependency baru yang direncanakan |
| Inter | Sudah dipasang melalui `next/font` | Sesuai |
| CSS theme variables | Sudah ada dengan nama shadcn | Perlu mapping/migrasi |
| Dark mode | Sudah ada dengan class `.dark` | Dapat dipertahankan dan dipetakan |
| Next.js App Router | Sudah digunakan | Didukung resmi |

### 5.3 Gap utama

1. **Token collision.** Untitled UI memiliki neutral, brand scale 25–950,
   semantic foreground/background, radius, typography, dan shadow sendiri.
   Mengimpor theme penuh tanpa audit dapat mengubah dashboard secara global.
2. **Primitive collision.** UI existing memakai Base UI/Radix, sedangkan
   Untitled UI memakai React Aria. Prop, focus, portal, dan event model tidak
   selalu identik.
3. **CLI configuration collision.** Repository sudah memiliki
   `components.json` milik shadcn, sementara CLI Untitled UI juga membaca file
   bernama sama untuk version detection. CLI harus diuji pada copy terisolasi.
4. **Tidak diasumsikan ada chat template MIT siap pakai.** Chat tetap
   dikomposisikan dari Button, Input/Textarea, Modal, Dropdown, Avatar, Badge,
   Tooltip, Loading Indicator, dan application primitives terverifikasi.
5. **Migrasi icon bukan prasyarat.** Lucide dapat dipertahankan sampai komponen
   utama stabil.

### 5.4 Arah visual

Frontend baru mengikuti karakter Untitled UI:

- Inter sebagai font utama;
- neutral surfaces dengan brand color terkendali;
- border dan shadow halus untuk elevation;
- radius konsisten berdasarkan token;
- hierarchy typography jelas;
- dense information tetap readable pada dashboard;
- state hover, pressed, focus-visible, disabled, loading, invalid, dan selected;
- dark mode berasal dari semantic variables, bukan warna literal.

## 6. Strategi Migrasi Design System

### 6.1 Prinsip

- Migrasi per **surface lengkap**, bukan mengganti satu button acak di seluruh
  aplikasi.
- Pertahankan UI lama sampai satu surface selesai agar review dan rollback jelas.
- Komponen domain tidak mengetahui detail primitive lebih dari yang diperlukan.
- Setelah transisi, token warna, radius, typography, shadow, dan focus ring
  mempunyai satu sumber kebenaran.

### 6.2 Boundary masa transisi

```text
Existing production UI
├── components/ui/*                 # shadcn/Base UI/Radix; frozen kecuali bug
└── app/dashboard/*                 # tetap berjalan saat chat dimigrasikan

Untitled UI migration boundary
├── components/untitled/base/*      # source MIT terverifikasi
├── components/untitled/application/*
├── components/chat/*               # komposisi domain PostIt AI
└── styles/untitled-theme.css       # token bridge/scoped variables
```

Setelah seluruh surface dimigrasikan dan tidak ada consumer, primitive lama dan
dependency yang tidak digunakan dihapus melalui fase cleanup tersendiri.

### 6.3 Urutan surface

1. Chat publik `/` sebagai pilot.
2. Login serta error/empty/loading pages.
3. Dashboard shell dan navigasi.
4. Dashboard overview/cards/charts.
5. FAQ, SOP, Documents, Users, Admins, Configuration, dan Audit Logs.
6. Cleanup design system lama.

## 7. Scope Delivery Pertama

### 7.1 In scope

- foundation Untitled UI open-source v8;
- token bridge, typography, radius, shadow, focus ring, dan dark mode;
- public chat shell, history, empty state, timeline, citation, feedback, dan
  composer;
- visitor, authenticated, restricted SOP, loading, error, dan streaming states;
- pemisahan transport/state/presentation;
- responsive desktop/mobile dan keyboard accessibility;
- E2E serta regression test chat;
- roadmap lanjutan migrasi dashboard.

### 7.2 Out of scope delivery pertama

- perubahan RAG, LLM, embedding, system prompt, atau provider;
- schema database dan migration;
- mengganti SSE dengan AI SDK;
- attachment chat, voice input, atau model picker pengguna;
- folder/pin chat yang memerlukan persistence baru;
- komponen atau asset Untitled UI PRO;
- menghapus seluruh shadcn/Base UI/Radix sebelum dashboard dimigrasikan;
- redesign dashboard bersamaan dengan pilot chat.

## 8. Target Experience (To-Be)

### 8.1 Information architecture chat

```text
Chat Shell
├── Conversation Sidebar (desktop)
│   ├── Brand + New Chat
│   ├── Search history
│   ├── Grouped sessions
│   └── Theme + identity/login actions
├── Mobile Header + History Slideout
└── Main Conversation
    ├── Conversation header
    ├── Empty state / message timeline
    ├── Scroll-to-bottom control
    ├── Contextual error or login-required notice
    └── Sticky composer + disclaimer
```

### 8.2 Desktop

- Sidebar 280–320 px dengan neutral surface dan border halus.
- Main content terpusat dengan batas lebar baca yang konsisten.
- Header menampilkan judul, identity, theme, dan action relevan.
- Composer berada di bawah tanpa menutupi message terakhir.

### 8.3 Mobile

- History menggunakan slideout/dialog accessible berbasis React Aria.
- Slideout menutup setelah session dipilih atau new chat dibuat.
- Semua action dapat ditemukan melalui tap dan keyboard, tidak hanya hover.
- Composer menghormati virtual keyboard dan safe-area.
- Source card, table Markdown, dan code block tidak membuat page overflow.

## 9. Goals dan Acceptance Criteria

### G1 — Fondasi Untitled UI yang aman (P0)

- hanya source MIT terverifikasi yang masuk repository;
- setiap komponen memiliki catatan provenance dan versi/tag/commit;
- dependency baru dijelaskan dan dikunci melalui lockfile;
- `untitledui init`, PRO login, dan broad overwrite tidak digunakan;
- theme baru tidak mengubah dashboard sebelum dashboard dimigrasikan;
- token brand, neutral, status, typography, radius, shadow, dan focus tersedia;
- light/dark tidak mengalami flash atau hydration warning;
- tidak ada duplikasi utility `cn`/`cx` tanpa keputusan canonical helper.

### G2 — Shell chat Untitled UI yang responsif (P0)

- tidak ada horizontal overflow pada 320, 375, 768, 1024, dan 1440 px;
- sidebar desktop dan mobile slideout memakai data/action yang sama;
- content width dan spacing memakai token;
- semua icon action memiliki accessible label dan visible focus;
- tidak ada perubahan kontrak API chat.

### G3 — Riwayat percakapan mudah ditemukan (P0)

- tersedia search title case-insensitive;
- session dikelompokkan menjadi `Hari ini`, `Kemarin`, `7 hari terakhir`, dan
  `Lebih lama` berdasarkan timezone browser;
- tersedia skeleton, empty history, empty search result, error, dan retry;
- active session mempunyai selected/current state untuk assistive technology;
- session dapat dibuka/dihapus dengan mouse, touch, atau keyboard;
- delete memakai modal konfirmasi dan visible error handling.

### G4 — Empty state dan composer produktif (P0)

- greeting memakai nama user saat login dan sapaan netral untuk visitor;
- tersedia 3–4 suggestion FAQ/SOP relevan;
- visitor memahami FAQ publik dan sebagian SOP membutuhkan login;
- `Enter` mengirim, `Shift+Enter` membuat baris baru;
- textarea auto-grow hingga batas lalu scroll internal;
- send action mempunyai disabled, focus, loading, dan error state;
- focus tidak dipindahkan secara tidak terduga;
- tidak ada control microphone/attachment/model yang belum berfungsi.

### G5 — Timeline, citation, dan feedback terpercaya (P0)

- Markdown/GFM, link, list, table, dan code tidak overflow;
- auto-scroll hanya mengikuti streaming saat user dekat bagian bawah;
- tersedia scroll-to-bottom saat user membaca pesan lama;
- stale session/stream response tidak dapat menimpa session baru;
- seluruh label citation berbahasa Indonesia;
- source disclosure memiliki `aria-expanded` dan focus behavior benar;
- feedback memiliki pending, success, failure, dan visible rollback;
- login-required notice menyatu dengan message terkait;
- visitor tidak melihat isi atau source SOP restricted.

### G6 — Identity dan access state jelas (P1)

- visitor melihat login tanpa kehilangan akses FAQ publik;
- user melihat display name/username yang aman;
- admin dapat menuju dashboard;
- logout memiliki pending dan failure handling;
- behavior history visitor setelah login diputuskan;
- authorization tetap server-side, bukan hanya menyembunyikan UI.

### G7 — Dashboard migration konsisten (P1 setelah pilot)

- dashboard shell memakai navigation, page header, dropdown, dan modal Untitled
  UI yang disetujui;
- role-based menu Super Admin/Admin tetap identik secara fungsional;
- form memiliki label, description, validation, loading, dan error konsisten;
- table mendukung empty/loading/error, keyboard action, dan responsive layout;
- chart memakai semantic data colors yang dapat dibedakan;
- setiap halaman dimigrasikan pada diff terpisah dan dapat di-rollback;
- shadcn/Base UI/Radix dihapus hanya setelah tidak memiliki consumer.

### G8 — Arsitektur frontend mudah diuji (P0)

- SSE transport dipisahkan dari presentational component;
- state chat diekstrak ke typed controller/hook;
- filter/group session berupa pure functions;
- wrapper membatasi ketergantungan domain terhadap React Aria;
- tidak ada `any` baru atau unsafe assertion;
- cancellation dan stale response ditangani eksplisit;
- source yang disalin tidak membawa demo data, tracking, atau external asset.

### G9 — Quality gate frontend (P0)

- lint, typecheck, test, E2E, dan build lulus;
- E2E mencakup desktop/mobile dan keyboard-only flow;
- accessibility check otomatis ditambahkan jika dependency disetujui, atau
  checklist WCAG manual dijalankan dan dicatat;
- empty, loading, error, streaming, restricted, dan long-content diuji;
- tidak ada hydration warning atau unexpected console error;
- bundle impact React Aria dan migration dicatat sebelum merge.

## 10. Proposed Component Architecture

```text
app/
├── page.tsx                              # composition boundary chat
├── login/page.tsx                        # wave berikutnya
└── dashboard/*                           # dimigrasikan per surface

components/
├── untitled/
│   ├── base/                             # source MIT terverifikasi
│   │   ├── buttons/
│   │   ├── input/
│   │   ├── textarea/
│   │   ├── avatar/
│   │   ├── badge/
│   │   ├── dropdown/
│   │   └── tooltip/
│   └── application/
│       ├── modal/
│       ├── slideout/
│       ├── empty-state/
│       └── loading-indicator/
├── chat/
│   ├── chat-shell.tsx
│   ├── chat-header.tsx
│   ├── conversation-sidebar.tsx
│   ├── conversation-list.tsx
│   ├── conversation-list-item.tsx
│   ├── chat-empty-state.tsx
│   ├── chat-timeline.tsx
│   ├── chat-message.tsx
│   ├── source-list.tsx
│   ├── chat-composer.tsx
│   └── scroll-to-bottom.tsx
└── ui/                                   # existing; frozen selama pilot

hooks/
├── use-chat-controller.ts
├── use-chat-scroll.ts
├── use-current-user.ts
└── use-mobile.ts

lib/
├── chat-client.ts                        # typed fetch + SSE transport
├── chat-session-groups.ts                # pure filter/date grouping
├── sse.ts                                # parser existing dipertahankan
└── utils.ts                              # canonical class merge helper

styles/
└── untitled-theme.css                    # token bridge masa transisi

docs/
└── third-party/untitled-ui.md             # provenance + license inventory
```

Struktur ini adalah boundary, bukan kewajiban membuat semua file sejak awal.

## 11. Files Likely to Change

### Foundation

- `package.json` dan `package-lock.json`
- `app/globals.css`
- `app/layout.tsx` hanya jika RouteProvider/theme integration diperlukan
- `styles/untitled-theme.css` baru
- helper routing/theme/class merge yang benar-benar dibutuhkan
- third-party license/provenance document baru

### Pilot chat

- `app/page.tsx`
- consumer `components/ui/chat-sidebar.tsx`, `chat-message.tsx`, dan
  `chat-input.tsx` diganti bertahap oleh `components/chat/*`
- `hooks/use-mobile.ts`
- controller/scroll hook baru
- typed chat client dan session grouping utility baru
- Playwright spec chat baru atau perluasan spec existing

### Wave dashboard

- `app/login/page.tsx`
- `app/dashboard/layout.tsx`
- `components/app-sidebar.tsx`, `nav-main.tsx`, `nav-secondary.tsx`, dan
  `nav-user.tsx`
- halaman dashboard per modul dalam diff terpisah

Pilot frontend tidak mengubah schema, migration, retrieval, atau model config.

## 12. Implementation Plan

### Phase 0 — License gate, audit, dan design contract

1. Bekukan scope ke source MIT public dan dokumentasikan larangan PRO.
2. Catat tag/commit Untitled UI v8 sebagai baseline.
3. Audit komponen yang diperlukan: button, input, textarea, avatar, badge,
   dropdown, tooltip, modal, slideout, empty state, dan loader.
4. Uji CLI pada temporary working copy untuk mengetahui interaksi dengan
   `components.json`; jangan terapkan langsung ke working tree utama.
5. Tetapkan brand scale 25–950, neutral, typography, radius, shadow, dan focus.
6. Finalisasi nama produk, logo, suggestion prompts, dan behavior history login.
7. Ambil screenshot baseline desktop/mobile frontend saat ini.

**Exit:** legal boundary, source baseline, component inventory, dan visual
contract disetujui.

### Phase 1 — Foundation spike

1. Install hanya dependency wajib dari komponen yang dipilih. Kandidat utama:
   `react-aria-components` dan `tailwindcss-react-aria-components`;
   `tailwind-merge` sudah tersedia.
2. Tambahkan scoped theme/token bridge tanpa mengganti global theme sekaligus.
3. Tentukan apakah `RouteProvider` diperlukan; jangan menambah provider jika
   component pilot tidak membutuhkannya.
4. Pertahankan theme init saat ini hingga solusi baru terbukti tanpa flash atau
   hydration mismatch.
5. Port satu Button, Input/Textarea, Modal, dan Loading Indicator MIT.
6. Buat visual/interaction smoke test light/dark dan keyboard.

**Exit:** primitive Untitled UI dapat hidup tanpa mengubah dashboard existing.

### Phase 2 — Pisahkan behavior chat dari presentasi

1. Ekstrak typed chat controller dengan output visual tetap sama.
2. Pisahkan fetch session, delete, feedback, dan SSE transport.
3. Tambahkan AbortController atau request sequence guard.
4. Ekstrak pure utility search dan date grouping.
5. Tambahkan test success, error, abort, dan stale response.

**Exit:** UI chat dapat diganti tanpa menulis ulang kontrak jaringan.

### Phase 3 — Chat shell dan history

1. Bangun shell, desktop sidebar, dan mobile slideout dengan primitive
   Untitled UI yang disetujui.
2. Tambahkan search, grouped history, skeleton, empty, error, dan retry.
3. Ganti session row dengan control semantik.
4. Tambahkan modal konfirmasi delete dan visible failure feedback.
5. Tutup mobile slideout setelah memilih session/new chat.

**Exit:** history usable melalui mouse, touch, dan keyboard.

### Phase 4 — Empty state, timeline, dan composer

1. Terapkan greeting dan suggestion FAQ/SOP.
2. Bangun composer dengan auto-grow, focus, loading, dan safe-area behavior.
3. Terapkan content width dan message layout baru.
4. Perbaiki near-bottom streaming dan scroll-to-bottom.
5. Lokalisasi/restrukturisasi citation, feedback, error, dan login-required.

**Exit:** public chat selesai memakai Untitled UI tanpa regresi fungsional.

### Phase 5 — Identity dan auth surfaces

1. Integrasikan optional current-user state pada chat.
2. Tambahkan login/dashboard/logout action sesuai role.
3. Putuskan atau implementasikan merge history visitor ke user.
4. Migrasikan login, error, not-found, dan loading pages.

**Exit:** visitor, user, admin, dan restricted SOP memiliki UX konsisten.

### Phase 6 — Dashboard migration per modul

1. Migrasikan dashboard shell/navigation.
2. Migrasikan overview cards/charts.
3. Migrasikan FAQ, SOP, Documents, Users, Admins, Configuration, dan Audit Logs
   satu modul per diff.
4. Pertahankan authorization dan form/API behavior.
5. Tambahkan E2E sebelum pindah ke modul berikutnya.

**Exit:** seluruh frontend aktif memakai design language Untitled UI.

### Phase 7 — Cleanup dan release

1. Cari consumer shadcn/Base UI/Radix yang tersisa.
2. Hapus hanya component/dependency yang benar-benar tidak digunakan.
3. Satukan token dan helper yang masih ganda.
4. Jalankan full validation, accessibility, bundle, dan visual review.
5. Review third-party notices dan provenance inventory.

**Exit:** satu design system aktif dan Definition of Done terpenuhi.

## 13. Risks and Edge Cases

| Risiko/edge case | Dampak | Mitigasi |
|---|---|---|
| Komponen PRO masuk tanpa sengaja | Risiko lisensi | Allowlist source public MIT, provenance inventory, review setiap file |
| CLI `@latest` berubah | Tidak reproducible | `--lib-version 8`, catat commit/tag, review diff |
| CLI membaca `components.json` shadcn | Config/output rusak | Uji temporary copy; prefer manual copy jika konflik |
| `init`/`overwrite` menimpa project | Kehilangan perubahan | Jangan pakai `init`; path eksplisit; review sebelum add |
| Theme Untitled mengubah dashboard lama | Regresi luas | Scoped token bridge dan dashboard smoke test |
| Base UI/Radix bercampur React Aria | Focus/portal/event tidak konsisten | Satu primitive family per surface dan E2E keyboard |
| Helper `cn` dan `cx` berbeda | Class conflict | Pilih satu canonical helper dan test custom text token |
| Theme provider menggandakan state | Flash/hydration mismatch | Pertahankan init existing hingga replacement tervalidasi |
| RouteProvider mengubah link | Navigation regression | Tambahkan hanya jika perlu dan E2E redirect/auth |
| Manual upstream update | Fork lokal tertinggal | Catat commit dan lakukan reviewed upgrade |
| Stale session response | Pesan muncul di session salah | Abort/sequence guard |
| Streaming menarik scroll | Posisi baca hilang | Follow hanya saat near-bottom |
| Login mengganti owner history | Percakapan tampak hilang | Backend merge atau UX eksplisit |
| Markdown panjang | Overflow mobile | Overflow container dan long-content E2E |
| Icon style berbeda | Visual pilot sedikit berbeda | Konsistenkan size/stroke Lucide, review icon terpisah |
| Bundle React Aria bertambah | Load performance turun | Import granular dan ukur build/bundle |

## 14. Testing Strategy

### 14.1 Unit/focused tests

- search/grouping session termasuk title `null` dan batas hari;
- controller: new chat, switching, streaming, done, error, abort, stale response;
- citation/restricted mapping;
- token/helper class merging;
- state adapter untuk wrapped React Aria component.

### 14.2 Playwright E2E

- visitor membuka chat tanpa login;
- suggestion, Enter, dan Shift+Enter;
- desktop sidebar dan mobile slideout;
- history, active session, delete confirmation, error, dan retry;
- mocked streaming: loading, chunks, done, dan failure;
- user scroll ke atas saat streaming;
- citation, feedback success/failure, dan restricted SOP;
- login/logout dan admin dashboard link;
- light/dark tanpa hydration warning;
- keyboard-only dan visible focus;
- long Markdown/table/code tanpa page overflow;
- smoke test dashboard lama selama transisi theme.

### 14.3 Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Catat command yang benar-benar dijalankan. Jangan menyatakan lulus untuk command
yang tidak dieksekusi atau gagal karena environment.

## 15. Definition of Done

Migrasi dianggap selesai bila:

1. seluruh file Untitled UI memiliki provenance dan lisensi MIT terverifikasi;
2. tidak ada component, asset, credential, atau source PRO tanpa approval;
3. chat, login, dan dashboard aktif memakai satu design language;
4. streaming, history, citation, feedback, auth, dan restricted SOP tidak
   mengalami regresi;
5. UI berfungsi pada desktop/mobile, light/dark, mouse/touch/keyboard;
6. seluruh copy UI konsisten dalam Bahasa Indonesia;
7. tidak ada control dekoratif yang terlihat aktif tetapi tidak berfungsi;
8. token, helper, primitive, dan dependency lama tak terpakai sudah dibersihkan;
9. lint, typecheck, test, E2E, build, accessibility, bundle, dan visual review
   telah benar-benar dijalankan dan lulus;
10. diff dipisahkan per phase/surface dan dapat di-review/rollback;
11. architecture/design docs dan third-party notices sesuai hasil aktual.

## 16. Yang Harus Disiapkan Sebelum Implementasi

### Wajib

1. Approval tertulis bahwa scope hanya memakai source MIT public.
2. Nama produk final: `PostIt AI` atau `SimpleAI`.
3. Brand color utama; bila belum ada, palette existing menjadi seed brand scale.
4. Logo/avatar dengan hak pakai jelas, atau approval ikon Lucide sementara.
5. Empat suggestion prompt FAQ/SOP representatif.
6. Keputusan apakah history visitor di-merge setelah login.
7. Data uji: Super Admin, Admin, User aktif, User blocked, FAQ publik, SOP
   publik, dan SOP restricted.
8. Penanggung jawab approval visual dan acceptance testing.

### Default yang direkomendasikan

- gunakan nama `PostIt AI` agar sama dengan metadata dan chat;
- suggestion mengisi composer, tidak langsung mengirim;
- tambahkan `Copy answer`, tunda `Retry/Regenerate`;
- pertahankan Lucide pada pilot;
- gunakan primary existing sebagai seed brand Untitled;
- stabilkan chat sebelum dashboard;
- jangan hapus history visitor; jika merge belum tersedia, jelaskan perubahan
  identity dan jadikan backend merge task terpisah.

## 17. Assumptions dan Open Decisions

### Assumptions

- Bahasa utama tetap Bahasa Indonesia.
- Chat publik tetap `/`; dashboard tetap `/dashboard`.
- Model AI global dan hanya dikelola Super Admin.
- Repository tidak mendistribusikan ulang komponen sebagai UI kit/template.
- Komponen open-source v8 cukup untuk primitive pilot; chat dikomposisikan
  sendiri.

### Open decisions sebelum Phase 4–6

1. Nama dan asset brand final.
2. Merge history visitor setelah login.
3. Scope `Copy`, `Retry`, dan `Regenerate`.
4. Apakah icon tetap Lucide atau dimigrasikan setelah review lisensi.
5. Urutan modul dashboard setelah chat dan login.

Open decisions ini tidak menghalangi license audit dan foundation spike, tetapi
harus ditutup sebelum surface terkait dinyatakan final.
