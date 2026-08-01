# Phase 0 Report — Frontend Foundation

> Status: complete; later-phase inputs closed during Phase 4–7  
> Date: 1 August 2026  
> Scope: license gate, repository audit, design contract, and visual baseline

## 1. Objective

Establish a safe, reviewable baseline before any Untitled UI dependency,
component, token, or application behavior is changed in PostIt AI.

This phase does not implement the new UI. Its outputs are the source boundary,
immutable upstream baseline, component decisions, design contract, current UI
inventory, and visual references for later regression review.

## 2. Inputs Reviewed

- [`goals-frontend.md`](./goals-frontend.md)
- [`design.md`](./design.md)
- application chat, login, navigation, theme, dependencies, and scripts
- public Untitled UI React source at the pinned commit
- Untitled UI CLI v8 behavior in a disposable project

The durable third-party record is
[`docs/third-party/untitled-ui.md`](../../third-party/untitled-ui.md).

## 3. Current Behaviour

The application already has working chat, history, SSE streaming, citations,
feedback, authentication, role-based dashboard navigation, responsive chat
navigation, and light/dark theme support. The migration must preserve these
behaviors while changing presentation incrementally.

The main frontend risks identified are:

1. `app/page.tsx` combines transport, state, and the full chat presentation;
2. the existing theme and components are based on shadcn/Base UI/Radix, while
   target Untitled primitives use React Aria;
3. a full Untitled theme import could alter existing dashboard surfaces;
4. several upstream components import icons, file icons, illustrations, or
   broad component graphs that are unnecessary for the pilot;
5. authentication and visitor-history merge touch a backend boundary and must
   not be represented as complete through frontend state alone.

## 4. Confirmed Product Contract

- Product name: **PostIt AI**.
- Suggestion selection fills and focuses the textarea; it never auto-submits.
- Every authenticated user gets a simple profile menu and logout.
- Dashboard navigation is available only to authorized admin roles.
- Visitor history should be merged after login when the backend can do so
  safely; failure must preserve the visitor history.
- Copy answer is included in the first migrated chat release.
- Retry/Regenerate is deferred until persistence and idempotency semantics are
  designed.
- Lucide is retained for the migration pilot.
- Chat is migrated before login and dashboard surfaces.

## 5. Branding and Content Inventory

The application metadata and public chat already use `PostIt AI`. Three visible
frontend strings still use the retired `SimpleAI` brand:

| File | Current use | Required migration |
|---|---|---|
| `components/app-sidebar.tsx` | Dashboard sidebar product label | `PostIt AI` |
| `app/login/page.tsx` | Login heading | `PostIt AI` |
| `app/login/page.tsx` | Authorized-access footer | PostIt AI copy in Bahasa Indonesia |

Database names and historical architecture documentation containing `simpleai`
are infrastructure identifiers, not visible product branding. They are not
renamed by the frontend migration.

The release chat contains four suggestion prompts:

- `Bagaimana cara reset password?`
- `Bagaimana prosedur pengajuan cuti?`
- `Apa prosedur reimbursement?`
- `Bagaimana menangani komplain pelanggan?`

Phase 4 adopted these as the first-release copy. They remain ordinary product
content and can be updated when the production knowledge base changes.

## 6. Technical Decisions

1. Use only the public MIT repository and the immutable commit recorded in the
   third-party document; exclude all PRO/private material.
2. Do not run `untitledui init` in this repository.
3. Use CLI generation only in a temporary location for diff inspection. Port
   approved source deliberately into `components/untitled/`.
4. Add `react-aria-components` only in Phase 1 after selecting the exact
   primitive set and checking its lockfile diff.
5. Reuse the existing typed `cn()` utility rather than copying a second merge
   helper.
6. Do not copy the upstream component-type helper with `any`; use explicit
   React types.
7. Implement scoped semantic tokens from `design.md`; do not import the full
   upstream theme globally.
8. Build PostIt AI domain compositions for profile dropdown and empty state to
   avoid unnecessary icons, illustrations, and component dependencies.
9. Preserve existing UI until a complete surface passes regression checks.

## 7. Visual Baseline

Baseline images are stored in [`baseline/`](./baseline/) and represent clean,
independent visitor sessions in light mode. They were captured against the
local Next.js development server with Playwright 1.62.0; the Next.js developer
indicator was hidden because it is not application UI.

| Surface | Desktop (1440 × 900) | Mobile (390 × 844) |
|---|---|---|
| Public chat, empty state | [`chat-desktop.png`](./baseline/chat-desktop.png) | [`chat-mobile.png`](./baseline/chat-mobile.png) |
| Login | [`login-desktop.png`](./baseline/login-desktop.png) | [`login-mobile.png`](./baseline/login-mobile.png) |

The authenticated dashboard is not part of the anonymous baseline because a
test credential must not be invented or committed. It should be captured in
the relevant migration phase using approved test data.

## 8. Risks and Edge Cases

- A library version (`v8`) and source version (Git commit) are different
  identifiers; both must be recorded for generated/copied code.
- CLI success does not mean the component is ready: theme tokens, imported
  dependencies, types, accessibility, and license notices still require review.
- Mixing React Aria and Base UI/Radix inside one widget can create conflicting
  focus, portal, and event behavior.
- Global token aliases can silently restyle unmigrated dashboard pages.
- A frontend-only visitor-history merge could duplicate or lose sessions; the
  server must own reconciliation and authorization.
- Copy answer needs success/error feedback and must be available only after an
  assistant message has completed.
- Brand replacement must target user-facing copy, not database names or other
  operational identifiers.

## 9. Phase 1 Testing Strategy

The foundation spike must validate:

1. lint and TypeScript checks for every ported primitive;
2. focused interaction tests for keyboard, focus-visible, disabled, loading,
   and invalid states;
3. visual smoke checks in light and dark modes;
4. desktop and mobile rendering without changing existing dashboard styles;
5. dependency and bundle diff after adding React Aria;
6. `npm run build` after the primitive smoke surface is in place.

Actual commands must be taken from the repository scripts at implementation
time and their results reported rather than assumed.

## 10. Phase 0 Exit Review

| Criterion | Status | Evidence or next action |
|---|---|---|
| Public MIT/PRO boundary documented | Complete | Third-party provenance record |
| Immutable upstream source pinned | Complete | Commit `eaee6a5b...` |
| Required components audited | Complete | Candidate component inventory |
| CLI tested outside working tree | Complete | Compatibility result in provenance record |
| Visual/token contract established | Complete | `design.md` |
| `SimpleAI` occurrences inventoried | Complete | Three visible frontend strings |
| Desktop/mobile baseline captured | Complete | Four anonymous screenshots in `baseline/` |
| Lucide release identity defined | Complete | `design.md`; final logo remains replaceable |
| Four first-release suggestions defined | Complete | Implemented and regression-tested in Phase 4 |
| Visual acceptance performed | Complete | Phase 4–7 desktop/mobile/light/dark captures and final review |

Phase 1 began after baseline capture. The remaining inputs were subsequently
closed by the product decisions and visual acceptance recorded through Phase 7.

## 11. Definition of Done for Phase 0

Phase 0 is complete when:

- no application dependency or UI behavior was changed;
- provenance, license boundary, source pin, and component decisions are
  reviewable;
- the design contract and current branding inventory are recorded;
- visual baselines are captured where anonymous access permits;
- open product inputs and their blocking phase are explicit;
- the working-tree diff contains documentation and baseline assets only.
