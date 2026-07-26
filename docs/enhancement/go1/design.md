# Design System — PostIt AI

## 1. Design Principles

1. **Clarity first** — Setiap elemen punya hierarki visual yang jelas
2. **Consistency** — Design token digunakan secara disiplin di seluruh komponen
3. **Modern & clean** — Banyak whitespace, border radius halus, warna yang tidak mencolok
4. **Responsive** — Mobile-first, sidebar collapse di layar kecil

---

> **Status implementasi (diperbarui Fase 5).**
> Dokumen ini semula mendeskripsikan sistem token Material 3 yang berdiri sendiri.
> Kenyataannya token M3 hanya sebagian yang pernah aktif, dan `tailwind.config.ts`
> — tempat seluruh skala tipografi didefinisikan — **tidak pernah terbaca** oleh
> Tailwind v4 (tidak ada direktif `@config`), sehingga kelas seperti
> `text-headline-lg` tidak menghasilkan CSS sama sekali.
>
> Sejak Fase 5, sumber kebenaran tunggalnya adalah **variabel CSS shadcn** di
> `app/globals.css`. Nilai warnanya diambil dari palette M3 di bawah, jadi
> tampilannya tetap Material — yang berubah adalah pipa-nya, bukan rupanya.
> Tabel di §2.1/§2.2 kini dibaca sebagai *nilai sumber*, dan kolom "Token shadcn"
> menunjukkan nama yang benar-benar dipakai di kode.

## 2. Design Tokens

### 2.1 Warna (Light Mode)

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `primary` | `#3525cd` | CTA buttons, links, active accents |
| `primary-container` | `#4f46e5` | Solid button fills, loading bars |
| `on-primary` | `#ffffff` | Text on primary backgrounds |
| `background` | `#f8f9ff` | Main page background |
| `surface` | `#f8f9ff` | Sidebar, cards, elevated areas |
| `surface-container-low` | `#eff4ff` | Input backgrounds, hover states |
| `surface-container` | `#e5eeff` | Containers, nested surfaces |
| `surface-container-high` | `#dce9ff` | Elevated containers |
| `surface-container-highest` | `#d3e4fe` | Modals, dialogs |
| `on-surface` | `#0b1c30` | Primary text |
| `on-surface-variant` | `#464555` | Secondary/muted text |
| `secondary-container` | `#dae2fd` | Active nav item background |
| `on-secondary-container` | `#5c647a` | Active nav item text |
| `outline` | `#777587` | Standard borders |
| `outline-variant` | `#c7c4d8` | Light borders, dividers |
| `error` | `#ba1a1a` | Destructive actions, error states |
| `error-container` | `#ffdad6` | Error snackbars, backgrounds |


#### Pemetaan ke token shadcn (yang dipakai di kode)

| Nilai M3 | Token shadcn | Kelas Tailwind |
|---|---|---|
| `background` `#f8f9ff` | `--background` | `bg-background` |
| `surface-container-lowest` `#ffffff` | `--card` | `bg-card` |
| `surface-container-low` `#eff4ff` | `--muted` | `bg-muted` |
| `surface-container` `#e5eeff` | `--accent` | `bg-accent` |
| `on-surface` `#0b1c30` | `--foreground` | `text-foreground` |
| `on-surface-variant` `#464555` | `--muted-foreground` | `text-muted-foreground` |
| `primary` `#3525cd` | `--primary` | `bg-primary` / `text-primary` |
| `on-primary` `#ffffff` | `--primary-foreground` | `text-primary-foreground` |
| `secondary-container` `#dae2fd` | `--secondary` | `bg-secondary` |
| `outline-variant` `#c7c4d8` | `--border` | `border-border` |
| `outline` `#777587` | `--input` | `border-input` |
| `error` `#ba1a1a` | `--destructive` | `text-destructive` |

Selain itu ditambahkan dua peran status yang tidak ada di shadcn dan sebelumnya
di-hardcode (`bg-emerald-100`, `text-red-700`) sehingga tidak ikut dark mode:
`--success` (`#0a7a0a` / `#4ade80`) dan `--warning` (`#8a5a00` / `#fab219`).
Seluruh pasangan latar/teks diuji terhadap WCAG AA; yang terendah 5,3:1.

### 2.2 Warna (Dark Mode) — **Terimplementasi**

| Token | Hex |
|-------|-----|
| `background` | `#0a0e1a` | `--background` |
| `surface` | `#121726` | `--card`, `--popover`, `--sidebar` |
| `surface-container-low` | `#1a2035` | `--muted`, `--secondary` |
| `on-surface` | `#eaf1ff` | `--foreground` |
| `primary` | `#c3c0ff` | `--primary` |
| `on-primary-fixed` | `#0f0069` | `--primary-foreground` |
| `error` (dark) | `#ffb4ab` | `--destructive` |
| `outline` (dark) | `#2a3348` | `--border`, `--input` |

Diaktifkan lewat `next-themes` (`attribute="class"`, `defaultTheme="system"`);
tombol pengalih ada di header dashboard dan di sidebar chat.

### 2.3 Typography

> **Catatan:** skala di bawah tidak pernah menghasilkan CSS — ia didefinisikan di
> `tailwind.config.ts` yang diabaikan Tailwind v4. Sejak Fase 5 kode memakai
> kelas Tailwind bawaan; tabel ini disimpan sebagai acuan niat desain.
>
> Padanan yang dipakai: Headline Large → `text-2xl font-semibold tracking-tight`,
> Headline Medium → `text-xl font-semibold tracking-tight`, Headline Small →
> `text-lg font-semibold`, Body Large → `text-base`, Body Medium → `text-sm`,
> Body Small → `text-xs`, Label Medium → `text-sm font-medium`, Label Small →
> `text-xs font-medium`.


| Level | Font | Weight | Size | Line Height | Letter Spacing |
|-------|------|--------|------|-------------|----------------|
| **Display Large** | Geist | 700 | 36px | 44px | -0.02em |
| **Display Medium** | Geist | 700 | 32px | 40px | -0.02em |
| **Headline Large** | Geist | 600 | 30px | 36px | -0.02em |
| **Headline Medium** | Geist | 600 | 24px | 32px | -0.015em |
| **Headline Small** | Geist | 600 | 20px | 28px | -0.01em |
| **Body Large** | Inter | 400 | 16px | 24px | normal |
| **Body Medium** | Inter | 400 | 14px | 20px | normal |
| **Body Small** | Inter | 400 | 12px | 16px | normal |
| **Label Large** | Geist | 500 | 14px | 20px | normal |
| **Label Medium** | Geist | 500 | 12px | 16px | +0.02em |
| **Label Small** | Geist | 500 | 10px | 14px | +0.04em |

### 2.4 Spacing Scale

```
xs:   4px    (0.25rem)
sm:   8px    (0.5rem)
md:   16px   (1rem)
lg:   24px   (1.5rem)
xl:   32px   (2rem)
2xl:  48px   (3rem)
3xl:  64px   (4rem)
```

### 2.5 Border Radius

- **None:** 0
- **DEFAULT:** 2px (`rounded-sm`)
- **LG:** 4px (`rounded`)
- **XL:** 8px (`rounded-lg`)
- **Full:** 12px (`rounded-xl`)

### 2.6 Shadows

| Level | Shadow |
|-------|--------|
| sm | `0 1px 2px rgba(0,0,0,0.05)` |
| md | `0 2px 8px rgba(0,0,0,0.06)` |
| lg | `0 4px 16px rgba(0,0,0,0.08)` |
| xl | `0 8px 32px rgba(0,0,0,0.10)` |

---

## 3. Komponen UI

### 3.1 Button

```
Primary:   bg-primary text-on-primary rounded-xl px-4 py-2.5 
           hover:opacity-90 active:scale-[0.98] transition-all duration-150

Outline:   border border-outline text-on-surface rounded-xl px-4 py-2.5 
           hover:bg-surface-container-low active:scale-[0.98]

Ghost:     text-on-surface-variant rounded-xl px-3 py-2 
           hover:bg-surface-container-low

Icon:      p-1.5 text-on-surface-variant hover:text-primary 
           transition-colors rounded-lg

Danger:    bg-error text-on-error rounded-xl px-4 py-2.5 
           hover:opacity-90 active:scale-[0.98]

Success:   bg-emerald-600 text-white rounded-xl px-4 py-2.5 
           hover:opacity-90 active:scale-[0.98]
```

### 3.2 Input

```
Search/Text:  bg-surface-container-low border border-outline-variant 
              rounded-xl px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant
              focus:ring-2 focus:ring-primary/20 focus:border-primary 
              transition-all duration-150

Password:     Same as text + toggle visibility icon
              (eye/eye-off icon di sebelah kanan input)
```

### 3.3 Card

```
Default:  bg-surface border border-outline-variant rounded-xl p-4
          hover:border-primary/30 transition-colors

Config:   bg-surface border border-outline-variant rounded-xl p-6
          space-y-4

Glass:    background: rgba(255,255,255,0.7) 
          backdrop-filter: blur(8px) 
          border: 1px solid rgba(226,232,240,0.8)
```

### 3.4 Badge

```
Published:  bg-emerald-100 text-emerald-700 text-xs rounded-full px-2 py-0.5
Draft:      bg-amber-100 text-amber-700 text-xs rounded-full px-2 py-0.5
Error:      bg-red-100 text-red-700 text-xs rounded-full px-2 py-0.5
Active:     bg-green-100 text-green-700 text-xs rounded-full px-2 py-0.5
Fallback:   bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5
```

### 3.5 Table Row

```
Row:        border-b border-outline-variant hover:bg-surface-container-low
Actions:    opacity-0 group-hover:opacity-100 transition-opacity
```

### 3.6 Source Citation Chip

```
FAQ Chip:   bg-primary/10 text-primary text-xs rounded-full px-2.5 py-1 
            border border-primary/20
SOP Chip:   bg-secondary-container/50 text-on-secondary-container text-xs 
            rounded-full px-2.5 py-1 border border-secondary-container
```

### 3.7 Chat Bubbles

```
User:       bg-primary text-on-primary rounded-xl max-w-[80%] ml-auto p-3
Bot:        bg-surface border border-outline-variant rounded-xl max-w-[80%] p-3
```

### 3.8 Config Form Sections (NEW)

```
Config Card:
  bg-surface border border-outline-variant rounded-xl p-6

  Header:   flex items-center gap-3 mb-6
            Icon (24px) + Title (headline-sm) + Status Badge + Test Button

  Field:    flex flex-col gap-1.5
            Label (label-md, text-on-surface-variant)
            + Input (body-md)
            + Helper text (body-small, text-on-surface-variant)

  Divider:  border-t border-outline-variant my-4

  Footer:   flex justify-end pt-4
            Save Config button (primary)
```

---

## 4. Layout Specifications

### 4.1 Sidebar
```
Width:        w-64 (256px)
Background:   bg-surface
Border:       border-r border-outline-variant
Padding:      p-4
Gap:          gap-2 (nav items)
```

### 4.2 TopAppBar
```
Height:       h-16
Background:   bg-surface
Border:       border-b border-outline-variant
Padding:      px-6
```

### 4.3 Dashboard Content
```
Padding:       p-6
Max width:     max-w-7xl
Gap (grid):    gap-6
```

### 4.4 Config Page Layout (NEW)
```
Layout:       grid grid-cols-1 lg:grid-cols-2 gap-6
Card:         p-6
Max width:    max-w-5xl (lebih sempit dari dashboard biasa)
```

### 4.5 Chat Layout
```
Full height:   h-screen
Max chat:      max-w-3xl centered
Input:         sticky bottom-0 bg-background/80 backdrop-blur
```

---

## 5. Micro-interactions

| Element | Action | Effect |
|---------|--------|--------|
| Button | Click/Tap | `scale(0.98)` then back to `scale(1)` |
| Card | Hover | Border color changes to `primary/30` |
| Table Row | Hover | Background `surface-container-low` |
| Table Actions | Hover | Opacity 0 → 100 with transition |
| Input | Focus | Ring `primary/20` + border primary |
| Nav Item | Active | `bg-secondary-container` |
| Sidebar Item | Hover | `bg-surface-container-low` |
| Password Toggle | Click | Icon eye ↔ eye-off, input type password ↔ text |
| Test Connection | Click | Button loading spinner, badge update with result |
| Save Config | Click | Button loading, toast success/error |

Transition default: `transition-all duration-150` on all interactive elements.

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 768px | Sidebar hidden (drawer), single column, compact spacing, config cards stack vertically |
| Tablet | 768-1024px | Sidebar collapsed, grid 2 columns, config cards side by side |
| Desktop | > 1024px | Sidebar visible, full grid layout, config cards side by side |

---

## 7. Icon Guidelines

> **Diubah di Fase 5.** Semula dokumen ini mewajibkan Material Symbols Outlined,
> sementara dashboard sudah memakai `lucide-react` — jadi aplikasi menjalankan
> dua set ikon sekaligus, salah satunya lewat webfont CDN.

- Gunakan **`lucide-react`** saja. Alasannya: ter-tree-shake (hanya ikon yang
  dipakai yang masuk bundle), tidak menambah permintaan jaringan ke CDN, dan
  tidak menimbulkan FOUT berupa teks ligature yang sempat terbaca sebelum font
  termuat. Material Symbols dimuat sebagai webfont sehingga tidak punya satu pun
  dari sifat itu.
- Ukuran memakai kelas `size-*`, bukan `text-*`:
  - default `size-6` (24px)
  - dalam tombol `size-5` (20px)
  - kecil (chip/badge) `size-4` (16px)
- Ikon adalah komponen React, jadi warnanya mengikuti `currentColor` — beri
  warna lewat token teks (`text-muted-foreground`, `text-destructive`), jangan
  hex langsung, supaya ikut berubah di dark mode.

---

## 7.1 Avatar

Lima avatar ilustrasi di `public/avatars/*.webp` (256px, ~4KB), dipotong dari
satu sheet sumber menjadi bingkai persegi kepala-dan-bahu:

| Berkas | Dipakai untuk |
|--------|---------------|
| `admin.webp` | Akun admin di sidebar dashboard |
| `sales.webp` | Asisten di chat — headset membacanya sebagai support |
| `manajer.webp`, `akuntan.webp`, `staf-hrd.webp` | Pengunjung chat |

Aturannya:

- **WebP, bukan PNG** — sekitar seperempat ukurannya untuk ilustrasi datar
  seperti ini, dan didukung semua browser yang jadi target Next 16.
- **Pengunjung dipilih deterministik dari `visitorId`** (`lib/avatars.ts`),
  bukan acak dan bukan satu wajah untuk semua. Chat tidak punya akun, jadi tidak
  ada identitas nyata untuk digambar — tetapi menempelkan wajah yang sama pada
  setiap orang asing membuat semua percakapan tampak dari orang yang sama.
  Hasilnya konsisten antar-reload tanpa menyimpan apa pun.
- **Ikon lucide tetap menjadi fallback** `Avatar`, untuk saat gambar belum
  termuat atau `visitorId` belum diketahui.
- Jangan pakai `grayscale` pada avatar ini — warnanya justru pembedanya.

> Berkas di `public/` harus dikecualikan dari `matcher` di `proxy.ts`. Tanpa itu
> seluruh aset statis diarahkan ke `/login`.

---

## 8. Font Loading

> **Catatan:** `tailwind.config.ts` sudah dihapus di Fase 5 — Tailwind v4 tidak
> pernah membacanya (tidak ada `@config`), sehingga seluruh isinya inert. Token
> sekarang didefinisikan langsung di `app/globals.css` lewat `@theme inline`,
> dan font dimuat via `next/font` di `app/layout.tsx`.
>
> Cuplikan di bawah dipertahankan sebagai riwayat.

```typescript
// tailwind.config.ts (historis — file ini sudah tidak ada)
const config = {
  theme: {
    extend: {
      fontFamily: {
        display: ['Geist', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '2px',
        lg: '4px',
        xl: '8px',
        full: '12px',
      },
    }
  }
}
```

---

## 9. Page-Specific Designs (NEW)

### 9.1 Configuration Page (`/dashboard/config`)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔧 AI Model Configuration                                    │
│ Configure your AI model endpoints, API keys, and model       │
│ preferences.                                                 │
│                                                              │
│ ┌──────────────────────┐  ┌──────────────────────┐          │
│ │ 🤖 Embedding Model   │  │ 🧠 LLM Model         │          │
│ │                      │  │                      │          │
│ │ Status: ● Active     │  │ Status: ● Fallback   │          │
│ │                      │  │                      │          │
│ │ Base URL             │  │ Base URL             │          │
│ │ [http://...]────────]│  │ [http://...]────────]│          │
│ │                      │  │                      │          │
│ │ Model Name           │  │ Model Name           │          │
│ │ [text-embed...]─────]│  │ [gpt-4o-mini]──────]│          │
│ │                      │  │                      │          │
│ │ API Key              │  │ API Key              │          │
│ │ [sk-...]◉───────────]│  │ [sk-...]◉───────────]│          │
│ │                      │  │                      │          │
│ │ [Test Connection]    │  │ [Test Connection]    │          │
│ └──────────────────────┘  └──────────────────────┘          │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ [Save Configuration]                        ● Saved ✅ │   │
│ └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘