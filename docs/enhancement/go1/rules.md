# Rules & Conventions — PostIt AI

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

### 4.2 Middleware
```typescript
// middleware.ts
export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};
```

### 4.3 Route Groups
- `(auth)` — Login page
- `(main)` — Chat page
- `dashboard` — Protected dashboard pages

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

- [x] All `/dashboard/*` routes protected by middleware
- [x] Credentials auth uses bcrypt/jose JWT
- [x] API routes validate input with zod
- [x] CORS: only allow same-origin requests
- [x] No sensitive data in client bundle (API keys, secrets)
- [x] SQL injection: always use parameterized queries (Drizzle ORM handles this)
- [x] Rate limiting: apply per-IP for `/api/chat` (unauthenticated endpoint)
- [ ] Audit logging: log all CRUD operations in dashboard
- [ ] CSRF: NextAuth handles this for credential login