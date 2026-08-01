# Phase 7 Report — Cleanup and Release

> Status: complete  
> Date: 1 August 2026  
> Scope: Phase 0–6 audit, legacy cleanup, single-system consolidation, and final release gates

## 1. Objective

Close the frontend migration with one active Untitled-derived design system,
prove the earlier phases still satisfy their contracts, remove only verified
dead code/dependencies, and record reproducible release evidence.

## 2. Phase 0–6 Conformance Audit

| Phase | Contract rechecked | Evidence | Result |
|---|---|---|---|
| 0 | MIT/PRO boundary, pinned source, baseline, product decisions | provenance inventory, baseline images, final decisions in goals/design | Pass |
| 1 | tokens, Button/Input/Textarea/Modal/Loader, keyboard/focus | foundation report, component provenance, foundation E2E | Pass |
| 2 | typed chat controller, abort/stale guards, stream/error mapping | controller report, focused unit and E2E suites | Pass |
| 3 | responsive history, grouping/search/delete, mobile slideout | history report, desktop/mobile/keyboard E2E | Pass |
| 4 | four suggestions fill textarea, Markdown/citation/feedback/copy, no answer regenerate | public-chat report and chat experience E2E | Pass |
| 5 | profile/logout for every user, role-aware dashboard, safe visitor merge | identity/auth report, API unit tests, identity E2E | Pass |
| 6 | all dashboard modules, forms/tables/chart/navigation, authorization preserved | dashboard report, module/role/failure E2E, visual captures | Pass |

The audit found documentation drift only: Phase 0 and the design/goals headers
still described later inputs as open. Those records now reflect the actual
Phase 4–7 decisions without rewriting the historical phase boundaries.

## 3. Consumer Graph and Cleanup

Searches covered `app`, `components`, `hooks`, `lib`, `styles`, tests,
E2E, package declarations, and relative/aliased imports.

Removed after zero-consumer verification:

- all 29 files under `components/ui/`;
- unused `components/nav-main.tsx`, `nav-secondary.tsx`, and
  `nav-user.tsx`;
- shadcn `components.json` and the `shadcn/tailwind.css` import;
- `@base-ui/react`, three direct Radix packages,
  `class-variance-authority`, and the `shadcn` CLI;
- five unused Next.js starter assets in `public/`.

`npm uninstall` removed 256 packages from the installed graph. A final
`npm ls` query for the six legacy packages returns an empty tree. The active
avatar assets were retained because `lib/avatars.ts` still references them.

`tests/frontend-system.test.ts` now prevents legacy imports/declarations from
returning, asserts the single token/helper boundary, and verifies every adopted
Untitled source file against the provenance inventory.

## 4. Single Design-System Consolidation

- `styles/untitled-theme.css` is the only literal semantic token source.
- Existing semantic Tailwind utility names resolve directly to `--ui-*`
  variables; the duplicate Material/shadcn value layer was removed.
- light/dark values now apply globally, while `.ui-surface` remains the
  explicit product surface and portal boundary.
- `lib/utils.ts::cn()` is the only class merge helper.
- Inter is the only loaded product font; unused Geist and Lexend downloads were
  removed.
- React Aria is the only interactive primitive family in active frontend
  composition. Recharts remains the chart renderer and Lucide the release icon
  system.

The accessibility audit exposed and fixed two real transition/semantic issues:
the profile skeleton now has `role="status"`, and Input/Textarea transitions
are limited to border/focus shadow so an enabled field cannot briefly inherit
low-contrast disabled opacity.

## 5. Accessibility, Responsive, and Visual Review

`@axe-core/playwright@4.12.1` was added as a test-only dependency. Chat,
login, and dashboard pass WCAG A/AA automation; chat and dashboard are also
audited after dark mode stabilizes. Existing E2E additionally covers keyboard
focus/restoration, Escape dismissal, 320/375/768/1024/1440 px chat overflow,
390 px mobile navigation, role restrictions, and failure states.

Final visual evidence and review notes are in
[`phase-7/visual-review.md`](./phase-7/visual-review.md).

## 6. Bundle and Dependency Review

Production build output:

| Measure | Result |
|---|---:|
| `.next/static` files | 48 |
| Total static bytes | 2,479,792 |
| JavaScript raw / gzip | 2,173,836 / 639,769 bytes |
| CSS raw / gzip | 61,137 / 11,387 bytes |

These are whole-build shared/static totals rather than per-route transfer
sizes. No earlier equivalent measurement exists, so this report deliberately
does not claim a percentage improvement. Removing two unused font families and
the 256-package legacy tooling/component graph reduces unnecessary inputs;
`@axe-core/playwright` is dev-only and absent from production bundles.

`npm audit --omit=dev` reports zero production vulnerabilities. The
non-breaking audit fix removed the high-severity `brace-expansion` advisory.
Full audit still reports four moderate findings in the dev-only
`drizzle-kit -> @esbuild-kit -> esbuild` chain. The offered automatic fix
downgrades `drizzle-kit` to 0.18.1, so `--force` was intentionally rejected
as a breaking database-tool change.

## 7. Validation Record

| Gate | Actual result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 158 passed, 10 database-dependent skipped |
| full Playwright E2E in Chromium container | 32 passed |
| targeted final accessibility/visual run | 2 passed |
| `npm run build` | Pass; 31 static pages generated |
| `npm audit --omit=dev` | Pass; 0 production vulnerabilities |
| full `npm audit` | 4 moderate dev-tool findings remain; no non-breaking fix |
| legacy dependency query | Empty |
| visual review | Pass; five final captures |

## 8. Definition of Done

- [x] All eight adapted Untitled files have pinned MIT provenance and retained
      license text.
- [x] No PRO/private source, asset, credential, or icon package was introduced.
- [x] Chat, auth/system states, and every dashboard module use one design
      language and token source.
- [x] Streaming, history, citation, feedback, copy, auth, visitor merge,
      restricted SOP, and dashboard behavior pass regression coverage.
- [x] Desktop/mobile, light/dark, keyboard/focus, WCAG A/AA, responsive
      overflow, failure, and role states are covered.
- [x] Legacy primitives, config, unused dependencies/assets, duplicate tokens,
      fonts, and helpers are removed or guarded.
- [x] Provenance, active dependency notices, goals, design, phase reports,
      validation, bundle measurement, and visual evidence match the code.

Phase 7 and the planned frontend migration are complete. Retry/Regenerate
remains intentionally outside this release because message persistence and
idempotency semantics have not been designed.
