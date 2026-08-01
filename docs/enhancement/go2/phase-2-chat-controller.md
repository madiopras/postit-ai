# Phase 2 Report — Chat Controller and Transport Boundary

> Status: complete  
> Date: 1 August 2026  
> Scope: typed chat transport, controller state, request safety, and pure session utilities

## 1. Objective

Separate chat networking and state from presentation so the production chat can
adopt Untitled UI in later phases without rewriting the API, SSE, session,
feedback, or persistence contract.

Phase 2 is an architectural refactor. It deliberately preserves the existing
chat markup, CSS classes, copy, responsive layout, and visible behavior.

## 2. Current Behaviour Preserved

The following flows remain available through the same endpoints and payloads:

- anonymous visitor identity from `postit_visitor_id`;
- session list, session detail, and delete;
- POST-based SSE chat with status, content, `login_required`, error, and `done`
  frames;
- persisted chat and message identifiers from the terminal frame;
- citations and restricted-SOP login state;
- optimistic feedback with rollback on request failure;
- new chat, session switching, typing indicator, error banner, and history
  refresh after a completed answer.

No API route, database schema, migration, authentication rule, retrieval logic,
or model configuration changed.

## 3. Approach Implemented

```text
app/page.tsx
    └── useChatController() ── state and user actions
            ├── chat-client.ts ── fetch, validation, SSE events
            └── RequestSequence ── abort and latest-response guard
    └── ChatView ── existing production presentation
            └── ChatMessage / ChatSidebar / ChatInput
```

Responsibilities are now explicit:

1. `app/page.tsx` is only the composition boundary.
2. `useChatController` owns conversation/session state and coordinates actions.
3. `chat-client` is the only chat-domain browser network boundary.
4. `ChatView` and existing UI components render props and invoke callbacks.
5. `chat-session-groups` provides local, deterministic search and time grouping
   for the Phase 3 history UI.

## 4. Files Changed

### Composition and presentation

- `app/page.tsx`
- `components/chat/chat-view.tsx`
- `components/ui/chat-message.tsx`
- `components/ui/chat-sidebar.tsx`

### State and transport

- `hooks/use-chat-controller.ts`
- `lib/chat-client.ts`
- `lib/request-sequence.ts`
- `lib/chat-session-groups.ts`

### Regression coverage

- `tests/chat-client.test.ts`
- `tests/chat-session-groups.test.ts`
- `tests/request-sequence.test.ts`
- `e2e/chat-controller.spec.ts`

No dependency or lockfile change was required by Phase 2.

## 5. Typed Network Boundary

`lib/chat-client.ts` now owns:

- request and response types for messages, citations, feedback, and sessions;
- session list/detail/delete calls;
- feedback persistence;
- POST SSE transport and conversion from raw frames into a discriminated event
  union;
- defensive validation of JSON records before values enter React state;
- consistent API error extraction while retaining the existing Indonesian
  fallback messages;
- abort error detection without treating cancellation as a visible failure.

Presentational chat files contain no direct `fetch` call and do not parse SSE.
The raw parser remains in `lib/sse.ts`; the new client composes it instead of
duplicating frame buffering.

## 6. Request Safety

Two independent latest-wins lanes are used:

- conversation lane: send, load session, new chat, and unmount;
- session-list lane: initial list and later refreshes.

Starting a newer request aborts the older request. Every state update, including
`catch` and `finally`, also checks its sequence token. The sequence comparison
is necessary because cancellation alone cannot guarantee that every custom
transport stops before resolving.

Consequences:

- a slow session response cannot replace a newer selected session;
- an old stream cannot append content after new chat or session switching;
- an old `finally` cannot clear the loading state owned by a newer operation;
- unmount cancels both active request lanes.

## 7. Session Utilities

`filterChatSessions` performs a local, case-insensitive title search over the
maximum 50 sessions returned by the API. A `null` title uses the visible
fallback `Chat baru`.

`groupChatSessions` uses browser-local calendar dates and returns non-empty
groups in the design-contract order:

1. `Hari ini`;
2. `Kemarin`;
3. `7 hari terakhir`;
4. `Lebih lama`.

Calendar-day arithmetic uses local year/month/day values rather than elapsed
milliseconds, avoiding incorrect grouping across daylight-saving boundaries.
The visual grouped history and search controls remain Phase 3 scope.

## 8. Risks and Deferred Work

- The existing UI still follows every message update when scrolling. The
  near-bottom policy and scroll-to-bottom control remain Phase 4 scope.
- History loading/error/delete presentation is intentionally unchanged. Phase 3
  will add skeleton, retry, confirmation, and visible delete failure states.
- Feedback transport is separated, but pending/success announcements and copy
  answer belong to Phase 4.
- `Retry/Regenerate` remains excluded because persistence and idempotency are
  not yet designed.
- Visitor-to-account history merge remains an authenticated backend contract,
  not a Phase 2 frontend assumption.

## 9. Testing Strategy and Results

Focused tests cover valid and malformed transport data, SSE event mapping, HTTP
errors, active abort, stale request rejection, feedback routing, title search,
`null` titles, and all date boundaries.

Playwright intercepts the network so controller behavior is verified without a
real LLM or database. It covers streaming through `done`, API failure cleanup,
and a delayed session response arriving after a newer selection.

| Validation | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| Focused Phase 2 unit tests | 9 passed |
| Full `npm test` | 139 passed, 10 skipped |
| Focused Phase 2 Playwright | 3 passed |
| Full Playwright suite | 9 passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |

The host Playwright binary could not start because the environment lacks
`libnspr4.so`. Browser validation therefore used the repository's official
Playwright `v1.62.0-noble` Docker path against the local Next.js server, matching
the Phase 1 validation method.

## 10. Definition of Done

Phase 2 is complete because:

- `app/page.tsx` no longer owns networking or chat state implementation;
- chat/session/feedback calls and SSE conversion share one typed client;
- untrusted response data is checked before entering state;
- cancellation and stale responses are guarded explicitly;
- search and time grouping are pure, focused, and tested;
- the production presentation contains no direct chat-domain network call;
- existing UI and API contracts are preserved;
- lint, typecheck, unit tests, full E2E, build, and diff checks pass.
