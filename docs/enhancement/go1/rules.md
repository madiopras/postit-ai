# Rules & Conventions — PostIt AI

> **Status: terimplementasi.** Konvensi di bawah dipertahankan; yang berubah
> saat pembangunan diberi catatan langsung di tempatnya. Bisa diperiksa dengan
> `npm run lint`, `npm run typecheck`, dan `npm test` — ketiganya bersih.

## 1. Coding Standards

### 1.1 TypeScript
- Strict mode: `"strict": true` di tsconfig
- No `any` — gunakan `unknown` jika tipe tidak diketahui
- Gunakan branded types untuk UUID: `type UUID = string & { __brand: 'uuid' }`
- Prefer `interface` untuk public API, `type` untuk union/utility
- Semua fungsi async harus punya explicit return type
- Gunakan `zod` untuk runtime validation di API routes

### 1.2 File Naming Conventions

| Pattern | File | Contoh |
|---------|------|--------|
| `kebab-case` | `/app`, `/components`, `/lib` | `chat-input.tsx`, `faq-table.tsx` |
| `camelCase` | Variables, functions | `handleSubmit()`, `syncVectors()` |
| `PascalCase` | Components, types, classes | `ChatBubble`, `MessageList` |
| `UPPER_CASE` | Environment variables, constants | `DATABASE_URL`, `API_ENDPOINT` |
| `.ts` | Non-React files (lib, db, api) | `embedding.ts`, `rag.ts` |
| `.tsx` | React files (components, pages) | `page.tsx`, `chat-input.tsx` |
| `route.ts` | Next.js API route handlers | `route.ts` inside `app/api/chat/` |
| `page.tsx` | Next.js page components | `page.tsx` inside `app/dashboard/faq/` |
| `layout.tsx` | Next.js layout components | `layout.tsx` inside `app/dashboard/` |

### 1.3 Import Ordering

```typescript
// 1. Node built-in
import { randomUUID } from 'node:crypto';

// 2. Third-party (alphabetical)
import { and, eq, sql } from 'drizzle-orm';
import { SignJWT } from 'jose';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// 3. Internal modules (alphabetical by path)
import { auth } from '@/auth';
import { db } from '@/db';
import { documents, faqs } from '@/db/schema';
import { embed } from '@/lib/embedding';
import { getChatCompletion } from '@/lib/llm';

// 4. Types
import type { NextRequest } from 'next/server';
import type { Message } from '@/types/chat';
```

---

## 2. API Conventions

### 2.1 Response Format

**Success:**
```typescript
{
  success: true,
  data: { ... },
  meta?: { total, page, pageSize }
}
```

**Error:**
```typescript
{
  success: false,
  error: {
    code: 'FAQ_NOT_FOUND',
    message: 'FAQ with id xyz not found'
  }
}
```

### 2.2 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | GET success, PUT/PATCH success |
| 201 | POST create success |
| 204 | DELETE success |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable entity |
| 500 | Internal server error |

### 2.3 Streaming Response (Chat)

```typescript
// Server → Client
event: message
data: {"content": "Hello", "sources": []}

event: source
data: {"title": "FAQ: Apa itu PostIt AI?", "type": "faq", "score": 0.89}

event: done
data: {"id": "msg-uuid", "usage": {"prompt_tokens": 120, "completion_tokens": 45}}
```

---

## 3. Database Conventions

### 3.1 Naming
- Table names: plural snake_case (`faqs`, `sops`, `documents`)
- Column names: snake_case (`created_at`, `source_id`, `chunk_index`)
- Drizzle field names: camelCase (`createdAt`, `sourceId`, `chunkIndex`)
- Index names: `idx_{table}_{column}` (`idx_faqs_status`)
- Foreign key columns: `{referenced_table}_id` (`source_id` → `faqs.id`)

### 3.2 Timestamps
- Semua tabel harus punya `created_at` dan `updated_at` (kecuali `messages` yang hanya `created_at`)
- Gunakan `TIMESTAMPTZ` (TIMESTAMP WITH TIME ZONE)
- Default: `NOW()`
- Update trigger untuk `updated_at`:

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each table
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

### 3.3 Vector Sync Rules

1. **Create/Update FAQ** → Auto-sync ke `documents` dengan `type='faq'`
2. **Create/Update SOP** → Chunk content, embed setiap chunk, sync ke `documents` dengan `type='sop'`
3. **Delete FAQ/SOP** → Cascade delete semua `documents` yang terkait
4. **Batch sync** → Endpoint `/api/faq/sync` dan `/api/sop/sync` untuk sync ulang semua data
5. **Status handling** → Data baru dimasukkan di status `'published'`, jika gagal embed → `'error'`

### 3.4 Chunking Rules (SOP)

```typescript
// Aturan chunking untuk SOP
const CHUNK_CONFIG = {
  maxTokens: 800,           // Max token per chunk
  overlapTokens: 100,       // Overlap antar chunk
  separator: '\n\n',        // Preferred separator (paragraph)
  secondarySeparator: '\n', // Fallback separator (line)
};
```

---

## 4. Next.js Conventions

### 4.1 App Router Rules
- **Server Component** adalah default. Gunakan `'use client'` hanya jika perlu interaktivitas
- Chat UI → Client Component
- Dashboard layout → Server Component
- Dashboard content (tables, forms) → Client Component
- API Route Handler → Server-side only (jangan import client hooks)
- Gunakan `fetch` di Server Component, bukan axios/fetch wrapper client-side

### 4.2 Proxy (dulu Middleware)

> **Next.js 16 mengganti nama konvensi `middleware.ts` menjadi `proxy.ts`**
> (ada codemod resmi `middleware-to-proxy`), dan Proxy kini default ke runtime
> Node.js. NextAuth tidak dipakai, jadi tidak ada `export { auth as middleware }`.

```typescript
// proxy.ts
const PUBLIC_PATHS = new Set([
  '/', '/login', '/api/auth/login', '/api/auth/logout',
  '/api/chat', '/api/chat/sessions',
]);
const PUBLIC_PREFIXES = ['/api/chat/sessions/', '/api/feedback/'];

export async function proxy(request: NextRequest) { /* … */ }

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:webp|avif|png|jpe?g|gif|svg|ico|webmanifest|txt|xml|woff2?)$).*)',
  ],
};
```

Aturannya:

- **Allow-list, bukan deny-list.** Yang tidak disebut publik wajib JWT. Versi
  deny-list sempat melewatkan seluruh `/api/*` dengan asumsi tiap handler
  memeriksa sendiri — padahal hanya `/api/config*` yang melakukannya.
- **Kecualikan berkas statis di `matcher`.** Tanpa daftar ekstensi itu, seluruh
  isi `public/` ikut diarahkan ke `/login`.
- **Proxy bukan lapisan otorisasi tunggal.** Dokumentasi Next.js menyatakan
  demikian, jadi setiap route handler admin tetap memanggil `requireAuth()`.
- **Balas JSON 401 untuk `/api/*`,** bukan redirect — klien API akan membaca
  halaman login HTML sebagai 200 yang tak terparse.

### 4.3 Route Groups

Route group `(auth)` / `(main)` tidak jadi dipakai; strukturnya cukup datar:
`/` (chat publik), `/login`, dan `/dashboard/*`.

---

## 5. Component Patterns

### 5.1 Component Structure

```typescript
// components/chat/chat-input.tsx
'use client';

// 1. Types (jika tidak di file terpisah)
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

// 2. Hooks only at top level
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  // 3. State hooks
  const [input, setInput] = useState('');

  // 4. Event handlers (useCallback)
  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  }, [input, onSend]);

  // 5. Render
  return ( ... );
}
```

### 5.2 State Management
- **No global state library.** Gunakan URL search params, React context ringan, atau `useState` + prop drilling
- Chat state → `useState` di halaman chat
- Dashboard data → `fetch` di route handler + `useState`/`useSWR`
- Auth session → `useSession()` dari NextAuth

### 5.3 Error Boundaries
- Setiap fitur (Chat, Dashboard FAQ, Dashboard SOP) harus punya error boundary sendiri
- Error boundary component → `components/ui/error-boundary.tsx`

```typescript
'use client';

export class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

### 5.4 Loading States
- Gunakan `loading.tsx` di setiap folder `app/` untuk streaming SSR
- Skeleton components untuk data yang sedang di-fetch
- Button loading state: `disabled + spinner SVG`

---

## 6. Git & CI Conventions

### 6.1 Branch Naming
```
feature/nama-fitur   → feature/faq-crud
fix/bug-name         → fix/embedding-timeout
chore/               → chore/update-deps
docs/                → docs/add-api-docs
```

### 6.2 Commit Messages
```
feat: add FAQ CRUD endpoints
fix: handle empty embedding response
chore: update drizzle-kit to v0.30
docs: update README with setup guide
style: format code with prettier
refactor: simplify RAG pipeline
test: add unit tests for chunking
```

---

## 7. Error Handling Strategy

### 7.1 Data Validation
- Gunakan **zod** untuk validasi input user di API routes
- Jangan percaya apapun dari client

```typescript
import { z } from 'zod';

const createFaqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  category: z.string().max(100).optional(),
});
```

### 7.2 API Error Handler Wrapper

```typescript
// lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

// Usage in route handler
export async function GET() {
  try {
    const data = await db.select().from(faqs);
    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

---

## 8. Security Checklist

Status akhir. Yang dicentang sudah diverifikasi terhadap kode, bukan diasumsikan.

- [x] Seluruh `/dashboard/*` terproteksi `proxy.ts`, **dan** tiap route handler
      admin memanggil `requireAuth()` sendiri
- [x] Auth memakai bcrypt (12 rounds) + JWT `jose` (HS256, 7 hari)
- [x] `JWT_SECRET` wajib — tidak ada fallback hardcoded
- [x] Input API divalidasi `zod`
- [x] Query terparameterisasi lewat Drizzle
- [x] Rate limit per-IP di `/api/chat` (20/menit) — endpoint publik tanpa auth
- [x] **API key provider dienkripsi at rest** (AES-256-GCM) dan tidak pernah
      dikembalikan ke browser; `GET /api/config` hanya mengirim mask
- [x] Tidak ada secret di bundle klien
- [x] Berkas statis dikecualikan dari proxy tanpa melebarkan akses rute
- [x] Id dinamis divalidasi UUID sebelum menyentuh query (dulu 500, kini 404)
- [x] Endpoint publik yang menerima `visitorId` memverifikasi kepemilikan di
      server dan menjawab 404 bila tidak cocok — id tidak bisa dienumerasi
- [ ] **Audit logging** untuk operasi CRUD dashboard — belum dikerjakan
- [ ] **CSRF** — catatan lama menyebut "NextAuth handles this", tapi NextAuth
      tidak dipakai. Mitigasi saat ini hanya `SameSite=Lax` pada cookie sesi,
      yang menahan request lintas situs sederhana tapi bukan pengganti token
      CSRF. Perlu ditinjau sebelum produksi.

### 8.1 Insiden yang tercatat

Dua secret pernah ikut ter-commit dan **wajib dirotasi**, karena menghapusnya
dari berkas tidak menghapusnya dari riwayat git:

| Secret | Lokasi | Status |
|--------|--------|--------|
| Google API key | `.vscode/mcp.json` | Sudah di-gitignore; **rotasi menunggu akses Cloud Console** |
| `ROUTER_API_KEY` | `architecture.md` §7 | Sudah diredaksi; **sudah masuk riwayat git dan masih berlaku — rotasi wajib** |

Aturan yang mengikutinya: **jangan pernah menaruh nilai rahasia di dokumen.**
`.env.example` adalah satu-satunya tempat mencantumkan nama variabel, dan
nilainya selalu kosong.

---

## 9. Testing

Vitest, 47 test di 6 berkas (`npm test`). Setiap suite menjaga bug yang benar-
benar pernah lolos ke kode, bukan sekadar mengejar coverage:

| Berkas | Menjaga |
|--------|---------|
| `tests/retrieval.integration.test.ts` | Urutan retrieval, ambang skor sebelum `LIMIT`, filter `published`. Berjalan terhadap pgvector sungguhan di schema throwaway |
| `tests/sse.test.ts` | Parser frame SSE: nama event terbaca, frame terbelah antar-chunk tersusun ulang |
| `tests/crypto.test.ts` | Plaintext tidak bocor, ciphertext yang diutak-atik ditolak, nilai lama tetap terbaca |
| `tests/embedding.test.ts` | Satu vektor per input, urutan dipulihkan bila provider mengacak |
| `tests/chunking.test.ts` | Batas ukuran chunk, tidak ada isi hilang, sufiks `(Part n/m)` tidak bertumpuk |
| `tests/rate-limit.test.ts` | Sliding window, isolasi antar-pemanggil, `retryAfter` |

Test integrasi melewatkan dirinya sendiri bila `DATABASE_URL` kosong, jadi suite
unit tetap bisa jalan di mana saja.

**Uji mutasi.** Penjaganya diverifikasi dengan menghidupkan kembali bug aslinya:
`ORDER BY` yang terbalik menggagalkan 2 test, parser yang membuang baris
`event:` menggagalkan 4. Test yang tidak pernah gagal tidak menjaga apa pun.

Belum ada suite E2E berbasis browser — lingkungan pengembangan tidak punya
browser headless.
