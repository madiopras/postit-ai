# Phase 3 Report — Chat Shell and Conversation History

> Status: complete  
> Date: 1 August 2026  
> Scope: responsive shell, desktop/mobile history, session discovery, and safe deletion

## 1. Objective

Migrate the production chat shell and conversation history to the approved
Untitled UI foundation while preserving the Phase 2 controller, chat API, SSE,
persistence, timeline, empty state, and composer behavior.

The exit target is a history experience that is usable with mouse, touch, and
keyboard on desktop and mobile.

## 2. Previous Behaviour

The old history used a 256 px shadcn sidebar and a Radix Sheet on mobile. It
listed sessions in one flat group, formatted dates inline, exposed delete only
on hover, silently swallowed list/delete failures, and had no search, skeleton,
retry, confirmation, selected semantics, or visible deletion state.

The Phase 2 controller already isolated transport and stale-response handling,
which allowed this phase to replace presentation without changing endpoints.

## 3. Approach Implemented

```text
ChatView (existing timeline/composer)
└── ChatShell
    ├── desktop ConversationSidebar (300 px)
    ├── conversation header (64/56 px)
    └── mobile SlideoutMenu
        └── the same ConversationSidebar behavior

ConversationSidebar
├── Untitled Button + Input
├── local filter + browser-local date groups
├── loading / empty / filter-empty / error states
├── semantic session rows and persistent delete actions
└── Untitled confirmation Modal
```

The production root now owns `.ui-surface`, so Untitled semantic tokens are
available only inside the migrated chat. Existing dashboard surfaces keep their
current theme and components.

## 4. Files Changed

### Chat compositions

- `components/chat/chat-shell.tsx`
- `components/chat/conversation-sidebar.tsx`
- `components/chat/chat-theme-toggle.tsx`
- `components/chat/chat-view.tsx`

### Untitled primitive and token correction

- `components/untitled/application/slideout-menus/slideout-menu.tsx`
- `components/untitled/foundation-demo.tsx`
- `styles/untitled-theme.css`
- `docs/third-party/untitled-ui.md`

### State and shared behavior

- `hooks/use-chat-controller.ts`
- `lib/theme.ts`
- `components/theme-toggle.tsx`

### Regression coverage and evidence

- `e2e/chat-history.spec.ts`
- `docs/enhancement/go2/phase-3/chat-history-desktop.png`
- `docs/enhancement/go2/phase-3/chat-history-mobile.png`

No dependency, API route, schema, migration, or authentication change was
needed.

## 5. Shell and Responsive Behaviour

- viewport uses `100dvh` with a `100vh` fallback;
- desktop uses a fixed 300 px sidebar from the `md` breakpoint;
- mobile uses a 56 px header with history and new-chat controls;
- desktop uses a 64 px conversation header and exposes the theme action;
- the active session title appears in the conversation header;
- layout has no page-level horizontal overflow at 320, 375, 768, 1024, or
  1440 px;
- mobile slideout closes after selecting a session or starting a new chat;
- slideout supports backdrop dismissal, Escape, focus containment, and focus
  restoration through React Aria.

The profile menu remains G6 scope because authenticated identity/logout UI is
not part of the Phase 3 exit contract.

## 6. History Discovery and States

Search is local, immediate, case-insensitive, and works against the maximum 50
sessions returned by the existing API. A visible clear action is available
whenever a query exists.

Filtered sessions preserve API order and are grouped by browser-local calendar
date:

1. `Hari ini`;
2. `Kemarin`;
3. `7 hari terakhir`;
4. `Lebih lama`.

The sidebar now renders:

- six skeleton rows during initial loading/retry;
- an empty-history explanation;
- `Tidak ada percakapan yang cocok.` for empty search results;
- a localized inline alert and `Coba lagi` action for list failures;
- active styling plus `aria-current="page"`;
- 44 px minimum semantic session controls;
- a permanently reachable 36 px delete action rather than hover-only access.

## 7. Safe Delete Flow

Delete now requires the confirmation:

```text
Hapus percakapan “{title}”?
```

During the request, the target row and destructive action are disabled and the
button shows pending state. On failure, the modal closes, the row remains, and
a visible dismissible alert explains that deletion failed. On success, history
refreshes; deleting the active session returns the main area to a new-chat
state.

The controller owns pending and failure state, while the sidebar only renders
it. No optimistic row removal is used, so a failed request cannot make the UI
claim that persisted data was deleted.

## 8. Untitled UI and Provenance Decisions

The slideout primitive was adapted from the public MIT source at the pinned
commit already approved during Phase 0. Its adoption is appended to the
third-party inventory. It uses the existing React Aria dependency and adds no
package.

Visual review exposed that `.ui-surface` set a concrete background on the token
scope itself, which overrode `bg-bg-overlay` in portal components. The scope now
only declares tokens and foreground color; concrete roots explicitly use
`bg-bg-primary`. This restores the intended dark translucent backdrop for both
slideout and modal while preserving the foundation demo surface.

## 9. Visual Evidence

Screenshots use deterministic mocked session data and exclude the Next.js
development indicator.

| Surface | Evidence |
|---|---|
| Desktop, 1440 × 900 | [`chat-history-desktop.png`](./phase-3/chat-history-desktop.png) |
| Mobile slideout, 390 × 844 | [`chat-history-mobile.png`](./phase-3/chat-history-mobile.png) |

The evidence confirms the 300 px desktop sidebar, full mobile panel, correct
backdrop, persistent delete actions, grouping, search field, and mobile theme
footer.

## 10. Risks and Deferred Work

- The message timeline, main empty state, suggestions, citations, and composer
  intentionally retain the existing component family until Phase 4.
- Auto-follow still tracks every streaming update; near-bottom behavior and the
  scroll-to-bottom control remain Phase 4.
- Copy answer and localized citation/feedback presentation remain Phase 4.
- The legacy `components/ui/chat-sidebar.tsx` is now unused but remains during
  the migration window; broad shadcn cleanup is deferred until consumers are
  fully migrated.
- Profile/logout and authenticated visitor-history merge remain later phases
  because they require identity and backend contracts beyond history UI.

## 11. Testing Strategy and Results

Focused browser coverage uses mocked APIs and verifies:

- skeleton, date groups, search, clear, and zero-result behavior;
- Enter-key session selection and `aria-current`;
- mobile open, Escape, focus restoration, select/new-chat auto-close;
- list error and successful retry without reload;
- confirmation focus, Escape, delete failure rollback, and active-delete
  success;
- no horizontal overflow at all five contract breakpoints;
- dark theme activation.

| Validation | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| Existing grouping unit tests | Passed |
| Full `npm test` | 139 passed, 10 skipped |
| Focused Phase 3 Playwright | 5 passed |
| Full Playwright suite | 14 passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| Light desktop/mobile visual review | Passed |

Playwright uses the repository's official `v1.62.0-noble` Docker browser path
because the host browser runtime does not provide `libnspr4.so`.

## 12. Definition of Done

Phase 3 is complete because:

- the production chat shell is scoped to approved Untitled UI tokens;
- desktop and mobile history share the same data and actions;
- search, grouping, skeleton, empty, error, retry, deleting, and failure states
  are implemented;
- session selection and deletion use semantic keyboard-reachable controls;
- delete is confirmed and failure never removes the row;
- mobile slideout closes after selecting a session or new chat;
- public chat, controller, auth redirect, health, and Phase 1 foundation
  regressions pass;
- visual evidence and third-party provenance are recorded.
