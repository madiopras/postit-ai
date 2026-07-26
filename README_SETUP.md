# PostIt AI — Setup & Development Guide

RAG chatbot over a company's FAQ and SOP knowledge base, with an admin dashboard
to manage it.

- **Chat (`/`)** — public, no login. Streams answers with source citations.
- **Dashboard (`/dashboard/*`)** — admin only. FAQ/SOP CRUD, vector-store
  monitoring, and AI model configuration that applies without a redeploy.

---

## Quick start

```bash
git clone <repo> && cd simpleai
npm install

cp .env.example .env      # then fill in the blank values — see below
docker compose up -d      # Postgres 17 + pgvector

npm run db:migrate        # creates the extension, 7 tables and 9 indexes
npm run seed:admin        # admin / admin123
npm run seed              # 5 FAQ + 5 SOP, embedded and published

npm run dev               # http://localhost:3000
```

`npm run seed` calls the embedding API, so an AI endpoint has to be reachable
first (`ROUTER_BASE_URL`). Everything else works without one.

### Prerequisites

| | |
|---|---|
| Node.js | 20.12+ (uses `process.loadEnvFile`) |
| Docker | for Postgres + pgvector |
| AI endpoint | anything OpenAI-compatible exposing `/embeddings` and `/chat/completions` |

---

## Environment

`.env.example` is the authoritative list — every variable in it is read by the
code. Verify with:

```bash
grep -rho "process\.env\.[A-Z_0-9]*" app lib scripts proxy.ts | sort -u
```

Three values are blank in the template and must be filled in:

| Variable | Why |
|---|---|
| `JWT_SECRET` | Signs the admin session. No fallback — the app throws without it, so a known default can never be used to forge a token. |
| `CONFIG_ENCRYPTION_KEY` | Encrypts the provider API keys stored in `app_config`. Losing it means re-entering those keys. |
| `ROUTER_API_KEY` | Bearer token for the AI endpoint. |

Generate the two secrets with `openssl rand -base64 32`.

**Config resolution order is `app_config` table → environment → built-in
default.** Anything saved at `/dashboard/config` overrides the env values, which
exist mainly to get a working instance before the first login.

> The embedding model must output **1536 dimensions** to match the
> `vector(1536)` column. Switching to a different width needs a schema migration
> and a full re-embed of every document.

---

## Commands

| Command | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build and serve |
| `npm test` | Vitest suite (see below) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate a migration from `lib/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run seed` / `seed:admin` | Sample content / admin user |

**Use `db:generate` + `db:migrate`, not `db:push`.** `push` cannot express
`CREATE EXTENSION vector` or the HNSW index, both of which live in the migration
files.

---

## Architecture

```
app/
  page.tsx                   public chat (SSE client)
  login/                     admin login
  dashboard/                 overview, faq, sop, documents, config
  api/
    chat/                    POST: streaming RAG. sessions/[id]: history
    feedback/[messageId]/    thumbs up/down
    faq/  sop/               CRUD + /[id]/sync
    documents/               vector-store listing + /[id]/resync
    stats/                   dashboard aggregates
    config/                  AI model configuration + /test
    auth/                    login, logout
lib/
  rag.ts                     retrieve → build prompt → stream
  vector-sync.ts             chunk, embed, upsert, similarity search
  embedding.ts  llm.ts       OpenAI-compatible clients
  config.ts                  DB > env resolution, 30s cache
  crypto.ts                  AES-256-GCM for secrets at rest
  auth.ts                    JWT sign/verify, requireAuth()
  sse.ts                     SSE frame parser
  rate-limit.ts              sliding window
  stats.ts  chunking.ts  schema.ts  db.ts  api.ts
proxy.ts                     auth allow-list (Next 16 renamed middleware → proxy)
tests/                       Vitest
```

### Request flow

```
question
  → embed (one call)
  → pgvector cosine search, published only, ordered by distance
  → top 5 injected into the system prompt
  → LLM streamed back as SSE
  → persisted; ids returned in the terminal `done` frame
```

### Auth model

`proxy.ts` runs an explicit **allow-list**: `/`, `/login`, `/api/auth/*`,
`/api/chat`, `/api/chat/sessions*`, `/api/feedback/*`. Everything else needs a
valid JWT. Admin route handlers additionally call `requireAuth()` — Next.js
documents Proxy as unsuitable for authorization on its own.

Public endpoints that take a `visitorId` verify ownership server-side and answer
`404` on a mismatch, so conversation ids cannot be enumerated.

---

## Testing

```bash
npm test
```

47 tests across 6 files. Every suite guards a bug that actually shipped:

| File | Guards |
|---|---|
| `tests/retrieval.integration.test.ts` | Retrieval ordering. The query sorted by *similarity ascending*, returning the least relevant documents first; the score filter then ran after `LIMIT`. Runs against real pgvector in a throwaway schema. |
| `tests/sse.test.ts` | The chat client split network chunks on newlines with no buffering and discarded `event:` lines, so the `done` frame carrying citations was never seen. |
| `tests/crypto.test.ts` | API keys must not be readable in the database, and a tampered ciphertext must fail rather than be sent as a bearer token. |
| `tests/embedding.test.ts` | `embed()` returned only the first vector for an array input; providers may also return a batch out of order. |
| `tests/chunking.test.ts` | Chunk size, no lost content, and exactly one `(Part n/m)` suffix per title. |
| `tests/rate-limit.test.ts` | The sliding window protecting the public, unauthenticated `/api/chat`. |

The retrieval suite skips itself when `DATABASE_URL` is unset, so the unit tests
run anywhere. To include it:

```bash
set -a; . ./.env; set +a && npm test
```

There is no browser-based E2E suite yet — see Status below.

---

## Deployment notes

- **Single instance assumed.** The config cache and the rate limiter both live
  in process memory. With N replicas the effective rate limit is N× the
  configured value, and a config change takes up to 30s to reach every worker.
  Move both to Redis before scaling out.
- **Rotate `CONFIG_ENCRYPTION_KEY` deliberately.** Stored API keys become
  unreadable and fall back to the env values; re-enter them at
  `/dashboard/config`.
- **Change the seeded admin password.** `seed:admin` accepts `ADMIN_USERNAME`
  and `ADMIN_PASSWORD` to avoid the `admin123` default.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `JWT_SECRET is not set` at startup | Fill it in — there is deliberately no fallback. |
| Saving config returns `CONFIG_ENCRYPTION_KEY is not set` | Same; needed to encrypt the API keys. |
| Chat answers `Embedding base URL not configured` | No `ROUTER_BASE_URL` in env and nothing saved at `/dashboard/config`. |
| Content saved but never cited | Its status is `error` — the embed call failed. Check `/dashboard/documents`, then Sync. |
| `cannot cast type record to vector` | An embedding was interpolated into a raw `sql` template without going through `toVector()`. |

---

## Status

Implemented and verified end to end: public chat with citations, multi-
conversation history, feedback, FAQ/SOP CRUD with vector sync, documents
monitoring with resync, dashboard statistics, dynamic AI configuration with
encrypted keys, dark mode.

Known gaps:

- **No browser E2E suite.** The environment this was built in had no headless
  browser, so the UI has been verified through compiled CSS, HTTP responses and
  contrast maths — not visually. Adding Playwright is the obvious next step.
- **No audit logging** for dashboard mutations (`rules.md` §8 lists it as open).
- **`accuracy` on `faqs` is never written** — the dashboard shows a column
  nothing populates.
- **Retrieval quality is untuned.** No reranking, hybrid search or query
  rewriting; plain top-5 cosine over `published` documents.

> Earlier revisions of this file claimed every phase was complete. They were
> not — among other things the retrieval query was inverted and could not
> execute at all, and the dashboard was still the unmodified shadcn demo. The
> list above is meant to be checkable against the code.

---

## Further reading

`docs/enhancement/go1/` — `prd.md`, `architecture.md`, `schema.md`, `design.md`,
`rules.md`, `phase-plan.md`. `design.md` has been updated to match the code;
the others still describe the original intent and differ in places from what was
built.
