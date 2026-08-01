# Phase 1 Report — Untitled UI Foundation Spike

> Status: complete  
> Date: 1 August 2026  
> Scope: scoped tokens, minimum dependencies, typed primitives, and smoke tests

## 1. Objective

Prove that selected public MIT Untitled UI React v8 primitives can coexist with
the current PostIt AI frontend without changing the production chat, login, or
dashboard presentation.

## 2. Current Behaviour Preserved

The existing shadcn/Base UI/Radix theme, theme initialization script, tooltip
provider, chat flow, authentication, and dashboard components remain active.
No existing production page was migrated during this phase.

## 3. Proposed Approach Implemented

1. Install only the official interaction dependencies used by the selected
   upstream source.
2. Expose Untitled semantic Tailwind utilities while defining their values only
   inside `.ui-surface`.
3. Port a small, typed subset of the upstream primitives and replace Untitled
   icon imports with Lucide/`ReactNode` composition.
4. Keep the current `cn()` helper and avoid the upstream helper that uses
   `any`.
5. Validate components on an isolated development-only route before any
   production surface adopts them.

## 4. Dependencies

| Package | Installed version | Reason |
|---|---:|---|
| `react-aria-components` | `1.20.0` | Accessible interaction, focus, field, and modal primitives |
| `tailwindcss-react-aria-components` | `2.2.0` | Tailwind variants for React Aria component states |

`tailwind-merge` and Lucide were already installed. `RouteProvider` was not
added because this spike does not use React Aria links for Next.js client-side
routing. It should be reconsidered only when a migrated surface needs that
integration.

## 5. Files Changed

### Foundation

- `styles/untitled-theme.css`
- `app/globals.css`
- `package.json`
- `package-lock.json`

### Ported primitives

- `components/untitled/base/buttons/button.tsx`
- `components/untitled/base/input/field-parts.tsx`
- `components/untitled/base/input/input.tsx`
- `components/untitled/base/textarea/textarea.tsx`
- `components/untitled/application/modals/modal.tsx`
- `components/untitled/application/loading-indicator/loading-indicator.tsx`

### Smoke surface and tests

- `app/dev/ui-foundation/page.tsx`
- `components/untitled/foundation-demo.tsx`
- `e2e/untitled-foundation.spec.ts`
- `next.config.ts`
- `proxy.ts`

The smoke route is public only when `NODE_ENV=development`. In a production
build the page resolves through `notFound()`, while the production proxy also
continues to require authentication for paths outside its normal public list.
The `allowedDevOrigins` addition is restricted to the `127.0.0.1` loopback
origin used by Playwright.

## 6. Token Isolation

`styles/untitled-theme.css` maps Tailwind utilities such as `bg-bg-primary`,
`text-fg-primary`, `border-border-primary`, and `bg-brand-solid` to CSS
variables. Those variables receive values only on `.ui-surface`.

Consequences:

- unmigrated pages do not inherit Untitled palette values;
- light and dark previews can coexist during review;
- global `.dark` still controls migrated production surfaces later;
- modal overlays declare `.ui-surface` themselves because React Aria portals
  are mounted outside the triggering surface;
- reduced-motion rules apply only within the migration boundary.

The existing `THEME_INIT_SCRIPT` and root provider hierarchy were not changed.

## 7. Component Decisions

### Button and link

- variants: primary, secondary, tertiary, link, and destructive;
- sizes: 36, 40, and 44 pixels minimum height;
- loading keeps its label, disables interaction, and exposes `aria-busy`;
- icons are typed `ReactNode`, avoiding the upstream component detector and
  its `any` usage;
- React Aria Link is available as a separate `ButtonLink` export so button and
  navigation semantics are not conflated.

### Input and textarea

- visible label, required marker, hint/error relationship, invalid icon, and
  light/dark focus ring are supported;
- password visibility is keyboard accessible and localized;
- leading icons use Lucide or another caller-owned React node;
- textarea height is capped at 200 pixels before internal scrolling.

### Modal

- React Aria owns focus trap, Escape handling, backdrop dismissal, scroll lock,
  and focus restoration;
- title and description slots establish the accessible dialog name;
- the demo explicitly focuses the safe cancel action on open.

### Loading indicator

- exposes a polite status and accessible default label;
- motion follows the scoped reduced-motion policy.

## 8. Smoke Surface

The development-only route is:

```text
/dev/ui-foundation
```

It renders the same primitive set simultaneously in light and dark scopes.
Visual evidence: [foundation-light-dark.png](./phase-1/foundation-light-dark.png).

## 9. Risks and Edge Cases

- Every migrated surface must include `.ui-surface`; otherwise semantic values
  are intentionally undefined.
- A portal-based primitive must carry or receive the scope at its portal root.
- `ButtonLink` currently performs standard link navigation. A Next.js router
  adapter or React Aria `RouterProvider` needs a separate decision when SPA
  navigation is adopted.
- The smoke route must never be added to the production public allow-list.
- New upstream components may depend on icons, illustrations, or a broader
  component graph and still require individual provenance review.
- Theme utilities are globally generated by Tailwind, but their CSS variable
  values remain scoped; using them outside `.ui-surface` is a review error.

## 10. Testing Strategy and Results

| Validation | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 130 passed, 10 skipped |
| Focused Playwright foundation tests | 3 passed |
| Full `npm run test:e2e` | 6 passed |
| `npm run build` | Passed |
| Production smoke-route artifact | Prerender metadata status `404` |
| `npm audit --omit=dev` | 0 production vulnerabilities |
| Visual light/dark review | Passed; evidence stored with this report |

The full development audit still reports seven findings from pre-existing
tooling dependencies: six moderate and one high. The affected packages were
already present before this phase, and none are in the production dependency
audit. Updating them is a separate dependency-maintenance task because one
suggested fix downgrades `drizzle-kit` across a breaking version boundary.

## 11. Definition of Done

Phase 1 is complete because:

- dependencies and lockfile are reviewed;
- source provenance and the MIT notice are recorded;
- primitive code is typed and contains no new `any`;
- tokens are isolated from existing pages;
- light/dark, loading, invalid, keyboard, modal, and focus restoration states
  are exercised in a real browser;
- lint, typecheck, unit tests, E2E, production build, and runtime dependency
  audit pass;
- no production chat, login, or dashboard component uses the new primitives
  yet.
