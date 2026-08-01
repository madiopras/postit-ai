# Design System & UI Specification — PostIt AI

> Status: terimplementasi; audit final Phase 7 selesai  
> Tanggal: 1 Agustus 2026  
> Target: Untitled UI React v8, komponen open-source MIT saja  
> Related plan: [`goals-frontend.md`](./goals-frontend.md)

## 1. Tujuan Dokumen

Dokumen ini menjadi sumber kebenaran desain untuk migrasi frontend PostIt AI ke
Untitled UI. Isinya bersifat normatif untuk implementasi chat, authentication,
dan dashboard.

Istilah berikut digunakan:

- **MUST**: wajib dipenuhi sebelum surface dianggap selesai;
- **SHOULD**: default yang disarankan dan hanya boleh dilanggar dengan alasan
  yang tercatat;
- **MAY**: pilihan implementasi yang tidak memengaruhi acceptance utama.

Dokumen ini tidak memberikan izin penggunaan material PRO. Boundary lisensi,
source provenance, dan urutan migrasi mengikuti `goals-frontend.md`.

## 2. Product Identity

### 2.1 Final brand

Nama final seluruh aplikasi adalah **PostIt AI**. `SimpleAI` tidak lagi menjadi
alternatif nama dan seluruh kemunculannya pada frontend existing MUST diganti
sebagai bagian migrasi.

Nama `PostIt AI` MUST digunakan secara konsisten pada:

- document title dan metadata;
- chat header dan empty state;
- login page;
- dashboard sidebar;
- email/copy operasional bila ada;
- alt text dan accessible name yang menyebut produk.

Nama role atau area MAY ditambahkan sebagai descriptor, misalnya
`PostIt AI Admin`, tetapi nama produknya tidak berubah.

### 2.2 Product descriptor

Copy pendek default:

> Asisten AI untuk menemukan informasi FAQ dan SOP perusahaan.

Copy disclaimer default:

> PostIt AI dapat membuat kesalahan. Periksa kembali informasi penting.

### 2.3 Logo dan avatar

- Sebelum logo resmi tersedia, gunakan container brand dengan ikon `Bot` dari
  Lucide.
- Jangan memakai logo, avatar, illustration, atau asset Untitled UI PRO.
- Avatar assistant MUST mempunyai alt text `PostIt AI`.
- Avatar dekoratif MUST memakai `alt=""` atau `aria-hidden="true"`.
- Avatar user MAY memakai asset lokal existing selama hak pakainya jelas.

## 3. Design Principles

1. **Clarity before decoration** — hierarki, state, dan action harus dapat
   dipahami sebelum visual embellishment ditambahkan.
2. **Trust through evidence** — citation dan pembatasan akses SOP harus terlihat
   sebagai bagian inti jawaban, bukan metadata tersembunyi.
3. **One task, one focus** — chat berfokus pada percakapan; dashboard berfokus
   pada pengelolaan data. Jangan membawa navigasi admin ke dalam history chat.
4. **Accessible by default** — keyboard, focus, screen reader, contrast, dan
   reduced motion adalah baseline.
5. **Progressive disclosure** — detail source, metadata, dan destructive action
   ditampilkan saat diperlukan tanpa menyembunyikan informasi penting.
6. **Stable during streaming** — layout tidak boleh meloncat atau menarik
   posisi baca pengguna selama respons berjalan.
7. **Consistent states** — loading, empty, error, success, disabled, selected,
   dan restricted memakai pola yang sama pada seluruh produk.
8. **Small migration surface** — satu surface hanya memakai satu family
   primitive. Jangan mencampur React Aria dan Base UI/Radix dalam satu widget.

## 4. Visual Direction

Karakter visual target:

- surface netral dan lapang;
- brand indigo sebagai accent, bukan sebagai latar dominan;
- typography Inter dengan hierarchy tegas;
- border neutral tipis dan shadow ringan;
- radius medium, tidak terlalu tajam dan tidak pill pada semua elemen;
- icon line dengan ketebalan konsisten;
- density sedang pada chat dan lebih rapat pada data table;
- warna status selalu disertai label atau icon.

Yang harus dihindari:

- gradient dekoratif besar;
- glassmorphism sebagai surface utama;
- semua card memakai shadow;
- penggunaan warna literal langsung dalam page component;
- control yang terlihat aktif tetapi belum berfungsi;
- animasi layout panjang pada streaming;
- bubble chat yang memenuhi seluruh lebar desktop.

## 5. Token Architecture

### 5.1 Aturan penamaan

Selama masa transisi, token Untitled MUST memakai nama eksplisit agar tidak
bertabrakan dengan arti token shadcn existing.

Contoh:

```css
/* Target Untitled semantics */
--color-bg-primary: var(--ui-bg-primary);
--color-fg-primary: var(--ui-fg-primary);
--color-border-primary: var(--ui-border-primary);
--color-brand-solid: var(--ui-brand-solid);

/* Existing shadcn bridge tetap hidup sementara */
--color-background: var(--background);
--color-primary: var(--primary);
```

Konsekuensi penting:

- `bg-bg-primary` berarti surface utama Untitled;
- `bg-brand-solid` berarti brand CTA;
- kelas existing `bg-primary` tetap berarti brand shadcn selama transisi;
- jangan mengubah arti `--primary` dari brand menjadi surface;
- setelah seluruh consumer lama hilang, bridge shadcn MAY dihapus dalam diff
  cleanup tersendiri.

### 5.2 Primitive brand palette

Palette target menggunakan indigo Untitled UI yang dekat dengan primary project
saat ini. Nilai berikut adalah design decision project, bukan import asset PRO.

| Token | Hex | Penggunaan utama |
|---|---:|---|
| `brand-25` | `#F5F8FF` | very subtle selected background |
| `brand-50` | `#EEF4FF` | info/brand subtle background |
| `brand-100` | `#E0EAFF` | hover subtle, badge background |
| `brand-200` | `#C7D7FE` | subtle border |
| `brand-300` | `#A4BCFD` | dark mode brand text |
| `brand-400` | `#8098F9` | dark mode solid action |
| `brand-500` | `#6172F3` | focus ring and accent |
| `brand-600` | `#444CE7` | light mode solid action |
| `brand-700` | `#3538CD` | link/pressed action |
| `brand-800` | `#2D31A6` | strong brand text |
| `brand-900` | `#2D3282` | darkest brand accent |
| `brand-950` | `#1F235B` | deep brand surface |

Primary existing `#3525CD` tidak dipakai sebagai literal baru. Perbedaan kecil
dengan `brand-700` diserap melalui token agar seluruh scale konsisten.

### 5.3 Primitive neutral palette

| Token | Hex |
|---|---:|
| `gray-25` | `#FCFCFD` |
| `gray-50` | `#F9FAFB` |
| `gray-100` | `#F2F4F7` |
| `gray-200` | `#EAECF0` |
| `gray-300` | `#D0D5DD` |
| `gray-400` | `#98A2B3` |
| `gray-500` | `#667085` |
| `gray-600` | `#475467` |
| `gray-700` | `#344054` |
| `gray-800` | `#1D2939` |
| `gray-900` | `#101828` |
| `gray-950` | `#0C111D` |

### 5.4 Semantic tokens — light mode

| Semantic token | Value | Penggunaan |
|---|---:|---|
| `ui-bg-primary` | `#FFFFFF` | page/card primary |
| `ui-bg-secondary` | `#F9FAFB` | sidebar, section background |
| `ui-bg-tertiary` | `#F2F4F7` | input idle, subtle selected |
| `ui-bg-active` | `#F2F4F7` | pressed/selected neutral |
| `ui-bg-disabled` | `#F2F4F7` | disabled control |
| `ui-bg-overlay` | `rgb(16 24 40 / 0.70)` | modal backdrop |
| `ui-fg-primary` | `#101828` | heading/body strong |
| `ui-fg-secondary` | `#344054` | body/default label |
| `ui-fg-tertiary` | `#475467` | supporting copy |
| `ui-fg-quaternary` | `#667085` | metadata/helper |
| `ui-fg-disabled` | `#98A2B3` | disabled foreground |
| `ui-fg-on-brand` | `#FFFFFF` | text/icon on brand solid |
| `ui-border-primary` | `#D0D5DD` | control/card border |
| `ui-border-secondary` | `#EAECF0` | divider/subtle border |
| `ui-border-brand` | `#6172F3` | focused/selected border |
| `ui-brand-solid` | `#444CE7` | primary CTA |
| `ui-brand-solid-hover` | `#3538CD` | CTA hover/pressed |
| `ui-brand-subtle` | `#EEF4FF` | selected/prompt chip |
| `ui-brand-text` | `#3538CD` | brand link/text |
| `ui-focus-ring` | `rgb(97 114 243 / 0.24)` | external focus halo |

### 5.5 Semantic tokens — dark mode

| Semantic token | Value | Penggunaan |
|---|---:|---|
| `ui-bg-primary` | `#0C111D` | page background |
| `ui-bg-secondary` | `#161B26` | sidebar/card |
| `ui-bg-tertiary` | `#1F242F` | input/subtle selected |
| `ui-bg-active` | `#1D2939` | pressed/selected neutral |
| `ui-bg-disabled` | `#1F242F` | disabled control |
| `ui-bg-overlay` | `rgb(0 0 0 / 0.76)` | modal backdrop |
| `ui-fg-primary` | `#F9FAFB` | heading/body strong |
| `ui-fg-secondary` | `#EAECF0` | body/default label |
| `ui-fg-tertiary` | `#D0D5DD` | supporting copy |
| `ui-fg-quaternary` | `#98A2B3` | metadata/helper |
| `ui-fg-disabled` | `#667085` | disabled foreground |
| `ui-fg-on-brand` | `#0C111D` | text/icon on light brand solid |
| `ui-border-primary` | `#344054` | control/card border |
| `ui-border-secondary` | `#1D2939` | divider/subtle border |
| `ui-border-brand` | `#8098F9` | focused/selected border |
| `ui-brand-solid` | `#8098F9` | primary CTA |
| `ui-brand-solid-hover` | `#A4BCFD` | CTA hover/pressed |
| `ui-brand-subtle` | `#1F235B` | selected/prompt chip |
| `ui-brand-text` | `#A4BCFD` | brand link/text |
| `ui-focus-ring` | `rgb(128 152 249 / 0.32)` | external focus halo |

### 5.6 Status tokens

Status MUST memakai text/icon selain warna.

| Status | Light background | Light foreground | Dark foreground |
|---|---:|---:|---:|
| Success | `#ECFDF3` | `#067647` | `#6CE9A6` |
| Warning | `#FFFAEB` | `#B54708` | `#FEC84B` |
| Error | `#FEF3F2` | `#B42318` | `#FDA29B` |
| Info | `#EEF4FF` | `#3538CD` | `#A4BCFD` |

Dark status background SHOULD memakai warna foreground terkait pada opacity
12–16%, bukan membawa background light ke dark mode.

### 5.7 Contrast baseline

Pasangan utama yang sudah dihitung sebagai baseline:

| Pair | Contrast |
|---|---:|
| `gray-900` pada putih | 17.75:1 |
| `gray-600` pada putih | 7.69:1 |
| `gray-500` pada putih | 4.97:1 |
| putih pada `brand-600` | 6.12:1 |
| `gray-50` pada `gray-950` | 18.05:1 |
| `gray-400` pada `gray-950` | 7.32:1 |
| `gray-950` pada `brand-400` | 6.98:1 |

Setiap mapping yang berubah MUST dihitung ulang. Placeholder, disabled text,
dan dekorasi non-esensial tidak boleh dijadikan satu-satunya pembawa informasi.

## 6. Typography

### 6.1 Font family

| Role | Font |
|---|---|
| Body | Inter |
| Display/headings | Inter |
| Code | system monospace stack |

Pada pilot chat, Inter SHOULD diaktifkan hanya pada migration boundary bila
perubahan global berisiko memengaruhi dashboard lama. Setelah seluruh frontend
dimigrasikan, Geist dan Lexend yang tidak lagi dipakai SHOULD dihapus.

### 6.2 Type scale

| Token | Size / line-height | Default weight | Penggunaan |
|---|---|---:|---|
| `text-xs` | 12 / 18 px | 400 | timestamp, metadata |
| `text-sm` | 14 / 20 px | 400 | helper, compact table |
| `text-md` | 16 / 24 px | 400 | body, message, input |
| `text-lg` | 18 / 28 px | 500 | section intro |
| `text-xl` | 20 / 30 px | 600 | card/section title |
| `display-xs` | 24 / 32 px | 600 | page title mobile |
| `display-sm` | 30 / 38 px | 600 | page title desktop |
| `display-md` | 36 / 44 px | 600 | chat empty-state hero |

Rules:

- body chat MUST minimal `text-md` pada desktop dan mobile;
- timestamp MAY memakai `text-xs` tetapi harus memenuhi contrast;
- heading memakai sentence case, bukan ALL CAPS;
- link dalam jawaban MUST dapat dibedakan selain warna, minimal underline saat
  hover dan focus;
- paragraph jawaban SHOULD maksimal 65–75 karakter per baris.

## 7. Spacing, Sizing, Radius, and Elevation

### 7.1 Spacing scale

Gunakan kelipatan 4 px dengan intermediate 2/6 px hanya untuk optical alignment.

| Token | px | Contoh |
|---|---:|---|
| `space-0.5` | 2 | icon optical offset |
| `space-1` | 4 | inline micro gap |
| `space-1.5` | 6 | compact icon gap |
| `space-2` | 8 | button/icon gap |
| `space-3` | 12 | compact padding |
| `space-4` | 16 | default component padding |
| `space-5` | 20 | roomy control padding |
| `space-6` | 24 | section gap |
| `space-8` | 32 | large group gap |
| `space-10` | 40 | page section gap |
| `space-12` | 48 | empty-state gap |
| `space-16` | 64 | major page spacing |

### 7.2 Control heights

| Size | Height | Use |
|---|---:|---|
| `sm` | 36 px | compact table/filter action |
| `md` | 40 px | default button/input |
| `lg` | 44 px | primary form/chat action |
| `xl` | 48 px | mobile prominent action |

Interactive target SHOULD minimal 40×40 px dan MUST minimal 44×44 px untuk
primary touch action pada mobile bila layout memungkinkan.

### 7.3 Radius

| Token | Value | Use |
|---|---:|---|
| `radius-xs` | 2 px | small indicator |
| `radius-sm` | 4 px | badge compact |
| `radius-md` | 6 px | small control |
| `radius-lg` | 8 px | input/button |
| `radius-xl` | 12 px | card/message/composer |
| `radius-2xl` | 16 px | modal/empty-state card |
| `radius-3xl` | 24 px | large visual container only |
| `radius-full` | 9999 px | avatar, status dot, icon button |

### 7.4 Shadows

| Token | Value | Use |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgb(16 24 40 / 0.05)` | input/button/card subtle |
| `shadow-sm` | `0 1px 3px rgb(16 24 40 / 0.10), 0 1px 2px -1px rgb(16 24 40 / 0.10)` | dropdown/small floating |
| `shadow-md` | `0 4px 8px -2px rgb(16 24 40 / 0.10), 0 2px 4px -2px rgb(16 24 40 / 0.06)` | sticky composer/modal |
| `shadow-lg` | `0 12px 16px -4px rgb(16 24 40 / 0.08), 0 4px 6px -2px rgb(16 24 40 / 0.03)` | slideout/modal only |

Card biasa SHOULD memakai border tanpa shadow. Shadow digunakan untuk elevation
nyata, bukan untuk setiap container.

## 8. Responsive System

| Breakpoint | Width | Primary behavior |
|---|---:|---|
| `xxs` | 320 px | minimum supported viewport |
| `xs` | 600 px | large phone/small tablet |
| `md` | 768 px | desktop chat sidebar begins |
| `lg` | 1024 px | dashboard full navigation |
| `xl` | 1280 px | expanded content/grid |
| `2xl` | 1440 px | maximum dashboard composition |

Page gutters:

| Viewport | Gutter |
|---|---:|
| 320–599 | 16 px |
| 600–767 | 24 px |
| 768–1279 | 24 px |
| ≥1280 | 32 px |

Rules:

- design MUST bekerja tanpa horizontal page scroll pada 320 px;
- component boleh mempunyai internal horizontal scroll untuk code/table;
- jangan menyembunyikan primary action hanya karena breakpoint;
- desktop hover state tidak boleh menjadi satu-satunya cara menemukan action;
- safe-area bottom digunakan pada sticky mobile composer.

## 9. Iconography

- Pilot memakai `lucide-react` existing.
- Default stroke width: 1.75–2 px, konsisten per component group.
- Standard sizes: 16 px metadata, 20 px control, 24 px navigation.
- Icon-only button MUST memiliki accessible name.
- Icon dekoratif MUST `aria-hidden="true"`.
- Jangan mencampur line, solid, duotone, dan duocolor dalam satu surface.
- Status icon selalu disertai text atau screen-reader label.
- Migrasi ke Untitled UI Icons adalah keputusan terpisah setelah review lisensi.

## 10. Motion and Feedback

### 10.1 Durations

| Token | Duration | Use |
|---|---:|---|
| `motion-instant` | 100 ms | pressed/icon color |
| `motion-fast` | 150 ms | hover/focus/opacity |
| `motion-base` | 200 ms | dropdown/modal enter |
| `motion-slow` | 300 ms | slideout/sidebar |

### 10.2 Easing

- enter: `cubic-bezier(0.16, 1, 0.3, 1)`;
- exit: `cubic-bezier(0.4, 0, 1, 1)`;
- color/focus: standard `ease-out`.

### 10.3 Rules

- streaming text tidak memakai per-token entrance animation;
- loading indicator tidak menyebabkan layout shift;
- `prefers-reduced-motion: reduce` MUST menonaktifkan smooth scroll dan
  non-esensial transform;
- destructive feedback muncul setelah confirmation, bukan hanya perubahan
  opacity;
- toast tidak menjadi satu-satunya tempat menyampaikan form error.

## 11. Base Components

### 11.1 Button

Variants:

| Variant | Treatment | Use |
|---|---|---|
| Primary | brand solid, on-brand text | one primary action per region |
| Secondary | white/dark surface, primary border | normal supporting action |
| Tertiary | transparent, secondary foreground | low emphasis action |
| Link | no container, brand text | inline navigation |
| Destructive | error solid or error secondary | delete/block irreversible action |

States MUST tersedia: idle, hover, pressed, focus-visible, disabled, loading.

Loading rules:

- pertahankan label agar lebar button stabil;
- spinner diletakkan sebelum label;
- button disabled selama request;
- `aria-busy="true"` saat loading.

### 11.2 Text input and textarea

Anatomy:

```text
Label (required indicator)
└── Input container
    ├── leading icon optional
    ├── value/placeholder
    └── trailing action optional
Helper or error text
```

Rules:

- visible label MUST dipakai untuk form bisnis;
- chat composer boleh memakai accessible label yang visually hidden;
- placeholder tidak menggantikan label;
- error menggunakan border, icon, dan text;
- focus memakai `ui-border-brand` plus external `ui-focus-ring`;
- disabled tetap readable tetapi tidak tampak actionable;
- textarea composer maksimal 200 px sebelum scroll internal.

### 11.3 Badge

- heights: 22–24 px;
- text: `text-xs` medium;
- variants: neutral, brand, success, warning, error;
- status badge MUST mengandung label seperti `Aktif`, `Draft`, atau `Gagal`;
- jangan memakai dot warna tanpa text untuk status penting.

### 11.4 Avatar

- sizes: 32 px chat, 40 px navigation/profile, 48 px profile detail;
- fallback memakai initials atau product icon;
- image loading failure tidak boleh mengubah layout;
- user avatar tidak menjadi indikator authentication tunggal.

### 11.5 Tooltip

- hanya untuk penjelasan tambahan, bukan label wajib;
- delay 300–500 ms;
- dapat dipicu keyboard;
- tidak digunakan pada touch sebagai satu-satunya cara memahami action.

### 11.6 Modal and slideout

- focus trap dan restore focus ditangani React Aria;
- Escape menutup kecuali sedang menjalankan destructive request yang tidak dapat
  dibatalkan;
- backdrop click MAY menutup non-destructive modal;
- destructive confirmation memakai judul spesifik dan nama target;
- mobile history memakai slideout dari kiri, maksimal 320 px atau 88vw;
- background scroll terkunci selama overlay aktif.

### 11.7 Toast and inline alert

- toast: success singkat, non-blocking confirmation;
- inline alert: error yang membutuhkan tindakan atau terkait data tertentu;
- validation error berada di dekat field;
- toast default 4–6 detik dan pause saat hover/focus;
- error copy menjelaskan apa yang gagal dan tindakan berikutnya.

## 12. Chat Design

### 12.1 Desktop wireframe

```text
┌──────────────────────┬─────────────────────────────────────────────┐
│ PostIt AI            │ Judul percakapan             Theme / User  │ 64
│ [ + Chat baru      ] ├─────────────────────────────────────────────┤
│ [ Cari percakapan  ] │                                             │
│                      │           Empty state atau                  │
│ Hari ini             │           message timeline                  │
│  • Reset password    │           max-width 768 px                  │
│  • Prosedur refund   │                                             │
│ Kemarin              │                                             │
│  • Kebijakan cuti    │                                             │
│                      │     [ scroll ke pesan terbaru ]             │
│                      │ ┌─────────────────────────────────────────┐ │
│ Login/Identity       │ │ Composer                                │ │
│ Theme                │ └─────────────────────────────────────────┘ │
└──────────────────────┴─────────────────────────────────────────────┘
       300 px                         flexible
```

### 12.2 Mobile wireframe

```text
┌──────────────────────────────────────┐
│ [History] PostIt AI       [New chat] │ 56
├──────────────────────────────────────┤
│                                      │
│      Empty state / timeline          │
│      full width minus 16 px          │
│                                      │
│          [latest message]            │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Tanyakan sesuatu...       [Send] │ │
│ └──────────────────────────────────┘ │
│ Disclaimer                           │
└──────────────────────────────────────┘
```

### 12.3 Shell dimensions

- viewport unit SHOULD menggunakan `100dvh`, dengan fallback bila diperlukan;
- sidebar desktop: 300 px target, minimum 280 px, maksimum 320 px;
- mobile header: 56 px;
- desktop header: 64 px;
- message column: maksimum 768 px;
- composer outer column: maksimum 800 px;
- scroll padding bottom MUST mengakomodasi tinggi composer dinamis;
- desktop sidebar tampil mulai `md` (768 px).

### 12.4 Conversation header

Desktop:

- judul session atau `Chat baru`;
- optional subtle assistant status, bukan model selector;
- right actions: theme dan identity menu;
- admin melihat link `Buka dashboard` dalam identity menu.

Mobile:

- history trigger;
- product name atau truncated session title;
- new chat icon button;
- identity/theme tersedia di slideout footer.

#### Menu profil

Seluruh pengguna yang login, termasuk user biasa, MUST memiliki menu profil
sederhana. Trigger memakai avatar atau initials disertai accessible name
`Buka menu profil`.

Isi minimum:

- display name, dengan username sebagai fallback;
- username;
- label role yang ramah pengguna;
- `Buka dashboard` hanya untuk Admin dan Super Admin;
- `Keluar` untuk seluruh role.

Menu profil versi pertama tidak menyediakan edit profil karena belum ada
kontrak UI/API untuk perubahan profile. User biasa tidak melihat link dashboard.
Logout MUST memiliki pending state, mencegah double submit, dan menampilkan
failure feedback bila request gagal.

### 12.5 Conversation history

Urutan groups:

1. `Hari ini`;
2. `Kemarin`;
3. `7 hari terakhir`;
4. `Lebih lama`.

Session item:

- height minimum 44 px;
- title maksimal dua baris pada mobile, satu baris desktop;
- active: `ui-brand-subtle`, `ui-brand-text`, dan current semantics;
- hover: `ui-bg-tertiary`;
- menu/delete selalu keyboard reachable;
- touch menampilkan overflow action, bukan hover-only trash;
- delete confirmation: `Hapus percakapan “{title}”?`;
- setelah delete active session, buka empty new chat state.

Search:

- local filter terhadap maksimal 50 session pada pilot;
- debounce tidak diperlukan untuk data lokal;
- clear button muncul saat ada query;
- zero result: `Tidak ada percakapan yang cocok.`;
- search tidak mengubah urutan group source.

History states:

| State | Presentation |
|---|---|
| Initial loading | 5–7 skeleton rows |
| Empty | icon neutral + `Belum ada riwayat chat` |
| Filter empty | search icon + zero-result copy + clear action |
| Error | compact inline alert + `Coba lagi` |
| Deleting | target row disabled + spinner |
| Delete failed | row restored + visible error/toast |

### 12.6 Empty state

Desktop position SHOULD sedikit di atas geometric center agar composer tetap
terlihat sebagai next action.

Content:

- brand icon 48 px dalam featured-icon container 56 px;
- heading: `Apa yang ingin Anda cari hari ini?`;
- supporting copy menjelaskan FAQ dan SOP;
- 4 suggestion cards maksimal;
- visitor notice: sebagian SOP memerlukan login;
- suggestion MUST hanya mengisi textarea, tidak langsung mengirim, lalu
  memindahkan fokus ke textarea agar pengguna dapat meninjau atau mengubahnya.

Suggested topics sementara:

- `Bagaimana cara reset password?`
- `Bagaimana prosedur pengajuan cuti?`
- `Apa prosedur reimbursement?`
- `Bagaimana menangani komplain pelanggan?`

Copy final MUST disesuaikan dengan knowledge base perusahaan sebelum release.

### 12.7 Message layout

User message:

- rata kanan;
- background `ui-brand-solid` light / dark equivalent;
- foreground `ui-fg-on-brand`;
- max width 80% mobile, 72% desktop;
- radius 12 px, sudut kanan bawah MAY 4 px;
- literal text, bukan Markdown;
- preserve newline dan wrap long word.

Assistant message:

- rata kiri;
- avatar 32 px;
- body tidak wajib memakai bubble solid; gunakan primary surface dengan border
  secondary atau plain content pada canvas untuk readability;
- max content width mengikuti 768 px column;
- Markdown menggunakan typography tokens;
- source dan feedback berada langsung setelah answer.

Message spacing:

- antar role berbeda: 24–32 px;
- consecutive same-role messages: 12–16 px;
- avatar dan content: 12 px;
- message action: 8 px dari content.

### 12.8 Markdown

- paragraph margin: 12 px;
- list indentation: 20–24 px;
- heading pertama tidak mempunyai margin top besar;
- inline code memakai neutral subtle background dan monospace;
- code block mempunyai header optional, internal horizontal scroll, dan copy;
- table ditempatkan dalam horizontal scroll container;
- link eksternal MUST aman (`rel="noopener noreferrer"` bila target baru);
- raw HTML dari model tidak dirender;
- contrast syntax highlighting MUST diuji di light/dark bila ditambahkan.

### 12.9 Streaming

States:

```text
idle → submitting → streaming → complete
                  ↘ error
                  ↘ login-required
```

Rules:

- submitting menampilkan assistant placeholder dengan loader stabil;
- unnamed content chunk menambah answer tanpa re-layout container;
- status frame MAY tampil sebagai screen-reader live update, tidak wajib menjadi
  banner visual permanen;
- `done` mengaktifkan citation dan feedback setelah message id tersedia;
- auto-follow hanya aktif bila user berada sekitar 80 px dari bagian bawah;
- bila user scroll naik, tampilkan floating scroll-to-bottom;
- `aria-live="polite"` digunakan secara terkendali agar setiap token tidak
  dibacakan ulang;
- error menghapus empty placeholder dan menampilkan retry-safe guidance.

### 12.10 Citation

Collapsed trigger:

- label: `Lihat {n} sumber`;
- icon chevron;
- `aria-expanded` dan relationship ke panel;
- ditempatkan sebelum feedback actions.

Source card:

- type badge `FAQ` atau `SOP`;
- title satu atau dua baris;
- relevance label MAY tampil sebagai `Relevansi 86%`;
- snippet maksimal tiga baris;
- jangan expose raw metadata, embedding, internal path, atau restricted content;
- source restricted tidak pernah dikirim/dirender untuk visitor.

### 12.11 Feedback and message actions

Pilot actions:

- `Salin jawaban`;
- `Jawaban membantu`;
- `Jawaban kurang tepat`.

Behavior:

- icon button 36–40 px dengan tooltip dan accessible label;
- copy memberikan transient `Tersalin` state;
- copy action masuk versi pertama dan hanya aktif setelah jawaban selesai;
- kegagalan Clipboard API memberikan feedback tanpa mengubah isi jawaban;
- feedback optimistic tetapi rollback terlihat saat request gagal;
- selected feedback memakai color dan `aria-pressed`;
- `Retry/Regenerate` MUST tidak ditampilkan pada versi pertama karena dapat
  mengubah semantics persistence pesan, citation, usage, dan idempotency.

### 12.12 Composer

Anatomy:

```text
Composer container
├── textarea auto-grow
└── send icon button
Disclaimer below
```

Specification:

- width maksimum 768 px, outer 800 px;
- border `ui-border-primary`, radius 12–16 px, `shadow-md` hanya bila floating;
- idle background primary, hover border primary strong, focus border brand;
- textarea minimum 24 px content height, maximum 200 px;
- `Enter` submit, `Shift+Enter` newline;
- IME composition tidak boleh mengirim sebelum composition selesai;
- send disabled untuk empty/whitespace, missing identity readiness, atau request;
- saat streaming, send berubah disabled/loading; stop button tidak ditampilkan
  sampai backend mendukung cancellation end-to-end;
- mobile padding bottom memakai `env(safe-area-inset-bottom)`;
- focus kembali setelah successful send hanya jika focus masih berada di chat
  workflow.

### 12.13 Error and restricted access

Network/server error:

- inline alert dekat timeline/composer;
- copy: apa yang gagal dan apakah pertanyaan aman dikirim ulang;
- jangan menampilkan stack trace atau provider detail.

Login required:

- assistant message generik dari server;
- inline notice dengan lock icon;
- CTA: `Login untuk membuka SOP`;
- redirect: `/login?redirect=/`;
- tidak menampilkan title/snippet source restricted;
- setelah login, sistem SHOULD menggabungkan history visitor ke akun bila dapat
  dilakukan aman, server-side, dan idempotent;
- merge MUST memverifikasi visitorId dan user session, tidak mengambil history
  visitor lain, tidak menggandakan chat, dan tidak menghapus source history
  sebelum transaksi berhasil;
- bila merge belum dapat diimplementasikan aman, history visitor tetap disimpan
  dan UI menjelaskan bahwa konteks riwayat berubah setelah login.

## 13. Authentication Design

### 13.1 Layout

Mobile dan desktop memakai centered auth card; split-screen illustration tidak
dipakai karena asset PRO tidak masuk scope.

```text
┌──────────────────────────────────────────────┐
│                  PostIt AI                   │
│          ┌────────────────────────┐          │
│          │ Masuk                  │          │
│          │ Username               │          │
│          │ Password          Show │          │
│          │ [ Masuk              ] │          │
│          └────────────────────────┘          │
└──────────────────────────────────────────────┘
```

- card max width 400 px;
- page gutter 16 px mobile;
- logo/product name di atas heading;
- tidak ada self-registration;
- redirect context MAY dijelaskan: `Masuk untuk membuka SOP ini.`;
- auth error tampil inline dan focus dipindahkan ke summary/field yang tepat;
- password visibility button memiliki accessible state;
- submit loading mempertahankan label dan mencegah double submit.

## 14. Dashboard Design

### 14.1 Shell

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│ PostIt AI Admin      │ Page title / Breadcrumb      Theme / User   │ 64
│                      ├──────────────────────────────────────────────┤
│ Dashboard            │                                              │
│ FAQ                  │ Page header + primary action                 │
│ SOP                  │                                              │
│ Documents            │ Filters / content / table                    │
│ Users                │                                              │
│ Admins*              │                                              │
│                      │                                              │
│ Configuration*       │                                              │
│ Audit Logs*          │                                              │
│ User profile         │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
       280 px                         flexible

* sesuai role
```

Dimensions:

- navigation expanded: 280 px;
- collapsed desktop: 72–80 px bila tetap diperlukan;
- top bar: 64 px;
- content max width: 1440 px;
- content padding: 16 px mobile, 24 px tablet, 32 px desktop;
- main section gap: 24–32 px.

### 14.2 Page header

Anatomy:

- eyebrow/breadcrumb optional;
- page title `display-xs` atau `display-sm`;
- short supporting copy;
- one primary action aligned right desktop, full width mobile if critical;
- secondary actions in dropdown when more than two.

### 14.3 Navigation

- active item memakai brand subtle, brand text, icon, dan `aria-current`;
- role-based item tidak dirender untuk unauthorized role;
- section labels hanya saat membantu grouping;
- collapsed mode selalu menyediakan tooltip;
- mobile menggunakan slideout;
- logout berada di identity menu, bukan primary navigation.
- seluruh role memiliki menu profil sederhana; hanya role Admin/Super Admin
  yang melihat link dashboard dari surface chat.

### 14.4 Cards and metrics

- default card: primary surface, border secondary, radius 12 px;
- no shadow unless card floats above another surface;
- metric title `text-sm`, value `display-xs`;
- trend tidak hanya menggunakan color; sertakan arrow dan text;
- loading skeleton mempertahankan dimension;
- error pada satu card tidak menggagalkan seluruh page bila data independen.

### 14.5 Tables

Table anatomy:

- filter/search bar;
- column header;
- row content;
- row actions;
- pagination/status footer bila diperlukan.

Rules:

- minimum row height 52 px;
- header `text-xs`/`text-sm` medium, foreground tertiary;
- hover subtle dan selected state terpisah;
- action tidak hanya terlihat pada hover;
- mobile memilih responsive card list atau internal horizontal scroll berdasarkan
  kebutuhan, bukan mengecilkan text;
- loading menggunakan skeleton rows;
- empty state menjelaskan next action;
- error state mempunyai retry;
- destructive bulk action memerlukan confirmation.

### 14.6 Forms

- max readable width 720 px untuk single-column settings;
- dua kolom hanya pada field yang benar-benar sejajar dan viewport ≥1024 px;
- label selalu visible;
- required indicator dan helper copy konsisten;
- validation on blur/submit, bukan error saat user baru mulai mengetik;
- API error dipetakan ke field bila spesifik, selain itu inline alert form;
- sticky footer hanya untuk form panjang dan tidak menutupi content;
- save button menunjukkan pending dan success feedback;
- API key tidak pernah ditampilkan kembali secara penuh.

### 14.7 Charts

Pertahankan categorical colors existing karena sudah diuji untuk separation:

| Slot | Light | Dark |
|---|---:|---:|
| Chart 1 | `#2A78D6` | `#3987E5` |
| Chart 2 | `#EB6834` | `#D95926` |
| Chart 3 | `#1BAF7A` | `#199E70` |
| Chart 4 | `#EDA100` | `#C98500` |
| Chart 5 | `#E87BA4` | `#D55181` |

- legend dan tooltip wajib;
- jangan mengandalkan hue saja;
- axis/label memakai foreground tertiary/quaternary;
- chart empty/error state tidak berupa area kosong tanpa penjelasan.

## 15. State Matrix

Setiap surface MUST merancang state berikut sebelum coding dianggap selesai:

| State | Chat | Form | Table/list | Navigation |
|---|---|---|---|---|
| Initial loading | history/message skeleton | initial field skeleton bila perlu | skeleton rows | stable shell |
| Empty | empty conversation/history | default values | explanatory empty state | no special state |
| Partial | streaming answer | dirty fields | some cards fail | role-filtered items |
| Success | completed answer/feedback | saved confirmation | updated row | active item |
| Error | inline alert, retry guidance | field/form error | inline error + retry | safe fallback |
| Disabled | composer/send | field/button | unavailable row action | unauthorized hidden |
| Restricted | SOP login notice | permission note | protected action hidden/disabled | role gate |
| Offline/timeout | non-destructive retry copy | preserve input | preserve filter/page | shell remains usable |

## 16. Accessibility Requirements

### 16.1 Keyboard

- seluruh interactive element dapat dicapai dengan Tab/Shift+Tab;
- Enter/Space mengikuti semantics React Aria;
- Escape menutup dropdown/modal/slideout;
- focus order mengikuti visual order;
- focus kembali ke trigger setelah overlay ditutup;
- skip link SHOULD tersedia pada dashboard kompleks;
- chat composer shortcut tidak berjalan saat IME composition.

### 16.2 Screen reader

- landmark: header, nav, main, complementary sidebar;
- page mempunyai satu `h1`;
- active navigation/session memakai `aria-current` atau selected semantics;
- disclosure memakai `aria-expanded` dan relationship valid;
- feedback toggle memakai `aria-pressed`;
- status singkat memakai polite live region;
- streaming tidak membacakan ulang seluruh answer setiap chunk;
- icon-only button mempunyai accessible name unik.

### 16.3 Visual

- normal text memenuhi WCAG AA 4.5:1;
- large text dan non-text essential control memenuhi minimal 3:1;
- focus ring terlihat pada light/dark dan tidak terpotong;
- zoom 200% tidak menghilangkan action atau informasi;
- status tidak hanya mengandalkan warna;
- target touch mengikuti ukuran pada §7.2.

## 17. Content Design

### 17.1 Language

- Bahasa utama: Indonesia;
- istilah teknis boleh dipertahankan bila lebih umum, tetapi satu istilah dipakai
  konsisten;
- hindari campuran seperti `Hide sources`, `match`, dan `source` pada UI final;
- gunakan sentence case.

### 17.2 Voice and tone

- jelas, profesional, dan ramah;
- singkat pada label/action;
- error tidak menyalahkan pengguna;
- restricted message menjelaskan alasan dan next action tanpa membocorkan isi;
- destructive confirmation menyebut objek yang terdampak.

### 17.3 Standard labels

| Intent | Label |
|---|---|
| New conversation | `Chat baru` |
| Search history | `Cari percakapan` |
| Send | `Kirim pesan` |
| Open sources | `Lihat {n} sumber` |
| Copy | `Salin jawaban` |
| Copy success | `Tersalin` |
| Open profile | `Buka menu profil` |
| Profile | `Profil` |
| Logout | `Keluar` |
| Positive feedback | `Jawaban membantu` |
| Negative feedback | `Jawaban kurang tepat` |
| Delete chat | `Hapus percakapan` |
| Retry | `Coba lagi` |
| Login for SOP | `Login untuk membuka SOP` |
| Go to dashboard | `Buka dashboard` |

## 18. Theme Migration Mapping

Mapping sementara dari token existing ke target:

| Existing semantic | Target semantic | Catatan |
|---|---|---|
| `background` | `ui-bg-primary` | page background |
| `card` | `ui-bg-primary` / `ui-bg-secondary` | pilih berdasarkan elevation |
| `muted` | `ui-bg-tertiary` | subtle container |
| `foreground` | `ui-fg-primary` | strong text |
| `muted-foreground` | `ui-fg-tertiary` | helper/metadata |
| `primary` | `ui-brand-solid` | brand action only |
| `primary-foreground` | `ui-fg-on-brand` | on brand solid |
| `border` | `ui-border-primary/secondary` | pilih hierarchy |
| `ring` | `ui-border-brand` + `ui-focus-ring` | two-part focus |
| `destructive` | error semantic | jangan raw red utility |
| `success` | success semantic | background/text pair |
| `warning` | warning semantic | background/text pair |

Mapping ini tidak berarti semua old token diganti global pada Phase 1. Pilot
MUST membuktikan mapping pada scoped surface lebih dulu.

## 19. Component Migration Map

| Existing | Target | Strategy |
|---|---|---|
| `components/ui/button.tsx` | Untitled Button | port MIT, adapt domain consumers per surface |
| `components/ui/input.tsx` | Untitled Input | pertahankan react-hook-form contract melalui adapter |
| `components/ui/textarea.tsx` | Untitled Textarea | composer tetap domain component |
| `components/ui/dialog.tsx` | Untitled Modal | jangan campur portal/focus primitives |
| `components/ui/sheet.tsx` | Untitled Slideout | pilot mobile history |
| `components/ui/dropdown-menu.tsx` | Untitled Dropdown | migrate per complete menu |
| `components/ui/avatar.tsx` | Untitled Avatar | preserve local fallback behavior |
| `components/ui/badge.tsx` | Untitled Badge | map status semantics |
| `components/ui/tooltip.tsx` | Untitled Tooltip | migrate with trigger action |
| `components/ui/chat-*` | `components/chat/*` | rewrite composition, preserve API behavior |
| `components/ui/sidebar.tsx` | Untitled navigation composition | migrate dashboard after chat |

## 20. Visual QA Checklist

### Global

- [ ] Product name konsisten.
- [ ] Inter aktif pada surface yang dimigrasikan.
- [ ] Tidak ada warna literal di page/domain component.
- [ ] Light dan dark memakai semantic token.
- [ ] Focus ring terlihat dan tidak terpotong.
- [ ] Reduced motion bekerja.
- [ ] Tidak ada asset atau komponen PRO.

### Chat

- [ ] Layout stabil pada 320, 375, 600, 768, 1024, dan 1440 px.
- [ ] History search/group/empty/error/delete tervalidasi.
- [ ] Mobile slideout keyboard/touch accessible.
- [ ] Empty state dan suggestion tidak menutup composer.
- [ ] Suggestion mengisi textarea tanpa mengirim otomatis.
- [ ] Streaming tidak menarik user yang scroll ke atas.
- [ ] Markdown/table/code tidak membuat page overflow.
- [ ] Citation dan feedback mempunyai semantics yang benar.
- [ ] Salin jawaban berfungsi dan memberi feedback `Tersalin`.
- [ ] Retry/Regenerate tidak ditampilkan.
- [ ] User biasa mempunyai menu profil dan logout tanpa link dashboard.
- [ ] Merge history visitor aman, atau fallback mempertahankan history dan
      menjelaskan perubahan konteks.
- [ ] Restricted SOP tidak bocor pada visitor.
- [ ] Composer aman terhadap IME dan virtual keyboard.

### Auth

- [ ] Label field visible.
- [ ] Error dan loading terbaca.
- [ ] Redirect context dipertahankan.
- [ ] Tidak ada self-registration CTA.

### Dashboard

- [ ] Role-based navigation tetap benar.
- [ ] Page header dan primary action konsisten.
- [ ] Table/form mempunyai loading, empty, error, dan success state.
- [ ] Mobile action tetap dapat ditemukan.
- [ ] Chart dapat dipahami tanpa hue saja.

## 21. Design Definition of Done

Satu surface dinyatakan design-complete bila:

1. seluruh layout, component, state, copy, dan responsive behavior yang relevan
   telah ditentukan;
2. komponen Untitled yang dipakai mempunyai provenance MIT;
3. light/dark token mapping tersedia;
4. keyboard, screen-reader semantics, focus, contrast, dan reduced-motion sudah
   dicakup;
5. loading, empty, partial, success, error, disabled, dan restricted state sudah
   memiliki presentation;
6. visual QA dilakukan pada viewport target;
7. tidak ada control dummy atau asset tanpa hak pakai;
8. penyimpangan dari dokumen ini dicatat dan disetujui sebelum merge.

## 22. Confirmed and Closed Design Decisions

### 22.1 Keputusan yang sudah final

1. Nama seluruh aplikasi adalah `PostIt AI`.
2. Suggestion hanya mengisi textarea, memindahkan fokus, dan tidak auto-submit.
3. History visitor diupayakan merge ke akun bila aman; fallback tidak boleh
   menghapus history visitor.
4. Seluruh user login memiliki menu profil sederhana dan logout.
5. User biasa tidak melihat link dashboard.
6. `Copy answer` masuk versi pertama.
7. `Retry/Regenerate` ditunda karena memengaruhi persistence.
8. Chat diselesaikan sebelum dashboard.

### 22.2 Keputusan penutupan release pertama

1. Container brand dan ikon `Bot` Lucide adalah identitas release pertama;
   logo final dapat menggantinya kemudian tanpa mengubah layout atau kontrak.
2. Empat suggestion yang ada menjadi copy release pertama. Content owner tetap
   dapat memperbaruinya ketika knowledge base produksi berubah.
3. Dashboard diselesaikan setelah chat dan login, lalu dimigrasikan per modul
   pada Phase 6.
4. Lucide dipertahankan sebagai icon system release pertama. Penggantian icon
   system berada di luar scope migrasi ini dan membutuhkan review lisensi baru.
