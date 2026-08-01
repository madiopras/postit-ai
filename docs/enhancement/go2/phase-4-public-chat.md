# Phase 4 Report — Public Chat Experience

> Status: complete
> Date: 1 August 2026
> Scope: empty state, message timeline, composer, citations, feedback, and scroll behavior

## 1. Objective

Complete the public PostIt AI chat migration to the approved Untitled UI
foundation without changing the chat API, SSE protocol, persistence schema,
retrieval pipeline, or authorization boundary.

The exit target is a responsive chat experience that preserves streaming,
history, Markdown, FAQ/SOP citations, feedback, dark mode, and restricted SOP
protection while replacing the remaining legacy timeline, empty state, and
composer presentation.

## 2. Previous Behaviour

Phase 3 delivered the responsive shell and history, but the central chat area
still used legacy chat components. Suggestions submitted immediately, the
composer did not implement the agreed review-before-send flow, every stream
update forced the viewport to the bottom, citation labels mixed languages, and
the completed answer had no copy action. Error, restricted access, and
feedback states also lacked one consistent hierarchy.

## 3. Architecture Implemented

```text
ChatView
├── ChatShell                         # Phase 3 shell/history
├── scrollable conversation region
│   ├── ChatEmptyState               # four FAQ/SOP suggestions
│   └── ChatTimeline
│       └── ChatMessage
│           ├── safe Markdown/GFM
│           ├── SourceList
│           ├── copy action
│           ├── feedback actions
│           └── restricted SOP notice
├── ScrollToBottom
└── ChatComposer                     # persistent, auto-growing input

useChatController                    # delivery and persistence state
└── useChatScroll                    # near-bottom viewport policy
```

Presentation does not call `fetch` directly. Network requests remain in the
Phase 2 typed client/controller boundary, and this phase adds only the visual
delivery states required to distinguish streaming, complete, error, and
login-required messages.

## 4. Empty State and Suggestions

The neutral heading is `Apa yang ingin Anda cari hari ini?` and the public
surface offers four agreed prompts:

1. `Bagaimana cara reset password?`
2. `Bagaimana prosedur pengajuan cuti?`
3. `Apa prosedur reimbursement?`
4. `Bagaimana menangani komplain pelanggan?`

Selecting a suggestion fills and focuses the textarea without sending a
request. The visitor can review or edit it first. A short lock notice explains
that some SOP information requires login without implying that restricted
content is available publicly.

## 5. Composer Behaviour

- the composer is separate from the scrollable timeline and remains reachable;
- the content width is capped at 768 px inside an 800 px composer boundary;
- the textarea grows to 200 px, then uses internal scrolling;
- `Enter` sends, `Shift+Enter` inserts a newline, and IME composition Enter is
  ignored;
- the send action exposes disabled and loading states;
- focus returns to the textarea after a successful keyboard/composer send;
- bottom padding respects `env(safe-area-inset-bottom)`;
- microphone, attachment, model selector, Retry, and Regenerate controls are
  not rendered because their behavior is outside the approved scope.

## 6. Timeline, Markdown, and Sources

User messages use a bounded literal-text bubble. Assistant messages share a
readable 768 px timeline and render Markdown/GFM without enabling raw HTML.
Lists, headings, blockquotes, inline code, code blocks, and tables are bounded;
tables and preformatted content scroll horizontally inside the message rather
than overflowing the page.

External Markdown links open in a new tab with
`rel="noopener noreferrer"`. Source disclosure is localized as
`Lihat {n} sumber`, exposes `aria-expanded` and `aria-controls`, and renders
only the source type, title, safe excerpt, and normalized relevance score.
Untrusted metadata is not presented.

Restricted SOP responses render one inline lock notice and login action inside
the related answer. Duplicate generic login-required stream content is
suppressed, and restricted source/content is never reconstructed on the
client.

## 7. Answer Actions

Actions appear only after the terminal SSE frame marks an assistant answer
complete:

- `Salin jawaban` writes the complete answer to the Clipboard API;
- success is announced as `Tersalin` and clipboard denial produces a visible
  error;
- thumbs-up/down use `aria-pressed`, disable while persistence is pending, and
  announce pending and success states;
- a failed feedback request restores the previous persisted selection and
  displays a visible rollback message;
- Retry and Regenerate are intentionally absent because their idempotency,
  usage, citation, and message-persistence semantics remain unresolved.

## 8. Streaming and Scroll Policy

The timeline follows streaming only while the reader is within 80 px of the
bottom. Scrolling upward preserves the reading position and reveals a
keyboard-accessible `Ke pesan terbaru` control. Selecting another conversation
or starting a new one resets the viewport deterministically.

The Phase 2 request sequence remains authoritative, so an aborted or stale
stream/session response cannot overwrite a newer conversation.

## 9. Files Changed

### Public chat composition

- `components/chat/chat-empty-state.tsx`
- `components/chat/chat-composer.tsx`
- `components/chat/chat-message.tsx`
- `components/chat/chat-timeline.tsx`
- `components/chat/chat-view.tsx`
- `components/chat/source-list.tsx`
- `components/chat/scroll-to-bottom.tsx`

### State and approved primitive

- `hooks/use-chat-controller.ts`
- `hooks/use-chat-scroll.ts`
- `lib/chat-client.ts`
- `components/untitled/base/tooltip/tooltip.tsx`
- `docs/third-party/untitled-ui.md`

### Regression coverage and evidence

- `e2e/chat-controller.spec.ts`
- `e2e/chat-history.spec.ts`
- `e2e/chat-experience.spec.ts`
- `docs/enhancement/go2/phase-4/chat-empty-mobile.png`
- `docs/enhancement/go2/phase-4/chat-timeline-desktop.png`
- `docs/enhancement/go2/phase-4/chat-timeline-dark-desktop.png`

No package, API route, database schema, migration, RAG, model, or auth change
was required.

## 10. Untitled UI Provenance

The accessible Tooltip was adapted from the public MIT source at the pinned
commit approved in Phase 0. It uses the existing React Aria dependency, Lucide
remains the icon source, and no PRO template, icon, asset, private registry, or
additional runtime dependency was introduced. The exact local path and
modifications are recorded in the third-party adoption log.

## 11. Visual Evidence

Screenshots use deterministic mocked data and exclude the Next.js development
indicator.

| Surface | Evidence |
|---|---|
| Mobile empty state, 390 × 844 | [`chat-empty-mobile.png`](./phase-4/chat-empty-mobile.png) |
| Desktop timeline, 1440 × 900 | [`chat-timeline-desktop.png`](./phase-4/chat-timeline-desktop.png) |
| Desktop dark timeline, 1440 × 900 | [`chat-timeline-dark-desktop.png`](./phase-4/chat-timeline-dark-desktop.png) |

The dark-mode E2E also verifies the composer tokens resolve to background
`rgb(12, 17, 29)` and foreground `rgb(249, 250, 251)` instead of relying only
on screenshot inspection.

## 12. Risks and Deferred Work

- Authenticated greeting, the profile menu, logout, and role-specific
  dashboard link remain Phase 5 identity work.
- Visitor-history merge needs a safe identity and backend ownership contract;
  visitor history remains intact until that contract is implemented.
- Retry/Regenerate remains deferred until persistence and idempotency semantics
  are designed.
- Legacy chat components remain in the repository during the migration window
  but have no production consumer on the public chat surface. Cleanup remains
  Phase 7 work.
- Automated accessibility auditing still depends on a future approved tool;
  keyboard, focus, labels, live regions, expanded/pressed semantics, contrast
  tokens, and responsive overflow are covered by implementation review and E2E.

## 13. Testing Strategy and Results

Phase 4 browser coverage verifies suggestion behavior, newline/IME/send
keyboard handling, focus restoration, streaming-only actions, safe Markdown,
external-link attributes, localized citation disclosure, hidden metadata,
copy success/failure, feedback pending/success/rollback, restricted SOP,
scroll-to-bottom, responsive overflow, and light/dark rendering.

| Validation | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| Full `npm test` | 139 passed, 10 skipped |
| Focused Phase 4 Playwright | 5 passed |
| Full Playwright suite | 19 passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| Mobile/light/dark visual review | Passed |

Playwright uses the repository's official `v1.62.0-noble` Docker browser path
because the host browser runtime does not provide `libnspr4.so`.

## 14. Definition of Done

Phase 4 is complete because:

- the public chat empty state, timeline, and composer use the scoped Untitled
  UI foundation;
- suggestions fill and focus without submitting;
- the composer is responsive, auto-growing, keyboard/IME-safe, and safe-area
  aware;
- completed answers provide safe Markdown, localized sources, copy, and
  persistent feedback states without Retry/Regenerate;
- restricted SOP content remains protected and login guidance is associated
  with the relevant answer;
- streaming follows only near the bottom and older-message reading is
  preserved;
- all unit, browser, lint, type, build, whitespace, and recorded visual gates
  pass;
- provenance and deferred Phase 5 identity work are documented.
