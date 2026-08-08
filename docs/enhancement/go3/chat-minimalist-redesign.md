# Roadmap Redesain Frontend Chat Minimalis & Modern (Go3)

## 1. Analisis & Visi Desain
Dokumen ini merangkum evaluasi visual, identifikasi pain points, dan rencana arsitektur antarmuka baru untuk modul percakapan **PostIt AI**. Tujuannya adalah menciptakan pengalaman percakapan AI yang **minimalis, fungsional, bersih (uncluttered), dan berstandar internasional** (mengikuti pola desain modern seperti Linear, Claude, dan ChatGPT) menggunakan sistem token desain **Untitled UI**.

---

## 2. Prinsip Desain Utama (Design Principles)
1. **Content-First & Low Visual Noise:** Mengurangi pembatas visual kaku (*hard borders*), meminimalkan dekorasi berlebihan, dan memfokuskan pandangan pengguna ke teks percakapan.
2. **Refined Typography & Hierarchy:** Menggunakan skala tipografi yang konsisten, kontras teks yang nyaman di mata (WCAG AAA/AA), serta line-height yang lapang untuk kemudahan membaca (*readability*).
3. **Subtle Surfaces & Tactile Elevation:** Memanfaatkan warna netral bertingkat (`bg-bg-primary`, `bg-bg-secondary`, `bg-bg-tertiary`), soft border (`border-border-secondary`), dan rounded corners yang kohesif (`rounded-ui-xl`, `rounded-ui-2xl`).
4. **Floating Capsule Composer:** Area input teks mengambang (*floating capsule*) yang fokus, ergonomis di mobile maupun desktop, serta responsif terhadap perubahan tinggi teks.
5. **Contextual & Responsive Micro-Interactions:** Tombol aksi yang rapi (*reveal on hover* di desktop), transisi halus pada status salin/feedback, dan indikator status interaktif.

---

## 3. Rencana Eksekusi Bertahap (Phases)

### Fase 1: Core Chat Modernization (Prioritas Tinggi - Tampilan Utama)
- **`ChatComposer`**:
  - Transformasi menjadi floating capsule dengan ambient shadow halus.
  - Penyesuaian tombol kirim dengan ikon modern dan animasi interaktif.
  - Tips helper ringkas di bawah composer.
- **`ChatMessage`**:
  - Penyempurnaan gelembung pesan pengguna (*user message bubble*) agar lebih elegan dan tidak melelahkan mata.
  - Penyempurnaan tipografi jawaban asisten AI (*markdown headings, code blocks, lists, blockquotes*).
  - Penataan toolbar aksi (Salin & Feedback) yang lebih rapi, compact, dan modern.
- **`ChatEmptyState`**:
  - Hero header dengan tipografi modern & greeting personal yang hangat.
  - Prompt suggestion chips interaktif yang dilengkapi ikon tematik (`KeyRound`, `CalendarDays`, `Receipt`, `MessageSquareQuote`).
  - Badge keamanan/SOP yang lebih minimalis dan terintegrasi.

### Fase 2: Markdown & Interactive Polish (Kenyamanan Baca & Interaksi)
- [x] Blok kode Markdown mandiri dengan badge bahasa & tombol *copy code* terpisah.
- [x] Indikator status streaming real-time dengan animasi cursor berkedip lembut.
- [x] Efek *glassmorphism* (`backdrop-blur`) pada header navigasi.

### Fase 3: Navigasi Lanjutan & Preview Sumber (Power Features)
- [x] Sidebar riwayat yang dapat di-collapse (*Collapsible Sidebar*) di layar desktop untuk mode fokus penuh.
- [x] Visualisasi sitasi sumber (*Source Citations*) dengan format pill ringkas dan drawer/modal preview dokumen.

---

## 4. Matriks Komponen & Token Desain

| Komponen | Token Utama | Perubahan Desain |
| :--- | :--- | :--- |
| **Composer Capsule** | `bg-bg-primary`, `border-border-secondary`, `shadow-ui-md` | Tampilan mengambang (*floating*), border lembut, sudut `rounded-ui-2xl`. |
| **User Bubble** | `bg-brand-solid`, `text-fg-on-brand`, `rounded-ui-2xl` | Sudut membulat modern, shadow mikro, padding seimbang. |
| **Assistant Stream** | `text-fg-secondary`, `leading-7`, `space-y-4` | Tipografi lapang, tabel bersudut melengkung, kode berlatar bersih. |
| **Prompt Chips** | `bg-bg-secondary`, `hover:bg-bg-tertiary`, `border-border-secondary` | Grid interaktif dengan ikon berwarna halus dan efek hover responsif. |

---

## 5. Verifikasi & Pengujian
- Unit test coverage (`vitest run`).
- Validasi TypeScript (`tsc --noEmit`).
- Uji kepatuhan token dan aturan arsitektur (`tests/frontend-system.test.ts`).
- Uji fungsionalitas E2E Playwright (`e2e/chat-experience.spec.ts`).
