# Untitled UI React — Source Provenance

> Status: final provenance audit complete; eight adopted source files verified  
> Audit date: 1 August 2026

## Approved Boundary

PostIt AI may adopt and modify only source code that can be traced to the
public [`untitleduico/react`](https://github.com/untitleduico/react) repository
and its MIT license.

The following material is explicitly outside the approved boundary:

- React PRO components, page examples, or application templates;
- private repositories, private registries, and authenticated Storybook source;
- Untitled UI Icons PRO;
- paid Figma files, illustrations, avatars, logos, and other PRO assets;
- source whose public MIT provenance cannot be verified.

This inventory is an engineering control, not legal advice. A new source,
asset, or licensing tier requires a separate review before adoption.

## Pinned Upstream Baseline

| Field | Value |
|---|---|
| Repository | `https://github.com/untitleduico/react.git` |
| Branch at audit | `main` |
| Commit | `eaee6a5b9798fa6867b4d896c6cfecf6ce706a73` |
| Commit date | `2026-07-22T11:27:07+02:00` |
| Commit subject | `Update dependencies to latest` |
| Upstream package version | `0.0.0` (private source repository) |
| Requested library generation | Untitled UI React v8 |
| License file | [`LICENSE`](https://github.com/untitleduico/react/blob/eaee6a5b9798fa6867b4d896c6cfecf6ce706a73/LICENSE) |
| License | MIT, copyright 2025 Untitled UI |

No public `v8*` Git tag was available at audit time. The full commit hash is
therefore the immutable source baseline; `main` or `@latest` must not be used as
the provenance identifier for copied files.

The upstream copyright and MIT permission notice is retained in
[`untitled-ui-LICENSE.txt`](./untitled-ui-LICENSE.txt).

## Candidate Component Inventory

All paths below are relative to the upstream repository root at the pinned
commit. The status is **candidate** until the exact files copied in Phase 1 are
recorded in the adoption log.

| Need | Upstream path | Main dependencies observed | Phase 1 decision |
|---|---|---|---|
| Button | `components/base/buttons/button.tsx` | React Aria, `cx`, component-type helper | Port a minimal typed variant; keep Lucide icons |
| Input | `components/base/input/input.tsx` | React Aria, Untitled icons, label/hint/tooltip | Port input and required subparts; replace icons |
| Textarea | `components/base/textarea/textarea.tsx` | React Aria, label, hint | Port for the chat composer |
| Avatar | `components/base/avatar/avatar.tsx` | Untitled icons and avatar subcomponents | Adapt without PRO or bundled avatar assets |
| Badge | `components/base/badges/badges.tsx` | Untitled icons, dot primitive, shared types | Port only variants required by PostIt AI |
| Dropdown | `components/base/dropdown/dropdown.tsx` | Avatar, checkbox, radio, toggle, Untitled icons | Build a small profile menu over approved primitives; do not import the full graph |
| Tooltip | `components/base/tooltip/tooltip.tsx` | React Aria, `cx` | Port minimal accessible primitive |
| Modal | `components/application/modals/modal.tsx` | React Aria, `cx` | Port the variants used by confirmation flows |
| Slideout | `components/application/slideout-menus/slideout-menu.tsx` | React Aria, close button, `cx` | Port for mobile history when needed |
| Empty state | `components/application/empty-state/empty-state.tsx` | File icons, illustrations, patterns, featured icon | Compose a PostIt AI version; do not copy heavy asset dependencies |
| Loader | `components/application/loading-indicator/loading-indicator.tsx` | `cx` | Port minimal loading indicator |

The public repository also contains `styles/theme.css` and
`styles/typography.css`. They are reference inputs, not approved wholesale
imports. PostIt AI uses the scoped token contract in
[`design.md`](../enhancement/go2/design.md) to prevent global style collisions.

## Dependency and Code-Safety Review

- The selected interactive primitives require `react-aria-components`; it is
  not installed during Phase 0.
- `tailwind-merge` is already present and the project already owns a typed
  `cn()` helper in `lib/utils.ts`; a duplicate `cx()` helper is unnecessary.
- The upstream `is-react-component.ts` helper and CLI-generated copy use
  explicit `any`. They must not be copied unchanged because this repository
  prohibits new `any` without justification. Component APIs should instead use
  `ReactNode` or an explicit icon-component type.
- Upstream imports from `@untitledui/icons`, `@untitledui/file-icons`, bundled
  illustrations, or background patterns are not part of the pilot. Lucide
  remains the approved icon source during migration.
- Full upstream dropdown and empty-state components pull a much larger
  dependency graph than PostIt AI needs. Domain compositions are preferred.
- During Phase 0–6, existing shadcn/Base UI/Radix components remained until
  their complete surfaces migrated and regression tests passed. Phase 7
  confirmed zero consumers before removing that legacy graph.

## Isolated CLI Compatibility Test

The CLI was tested only in `/tmp/postit-untitled-cli-test`, not in this working
tree:

```bash
npx -y untitledui@latest add button \
  --path components/untitled \
  --lib-version 8 \
  --yes
```

Observed result:

1. the command completed and generated a v8 Button plus `cx` and
   `is-react-component` helpers;
2. the copied shadcn-style `components.json` hash did not change;
3. the temporary project gained `react-aria-components` and
   `tailwind-merge` dependencies;
4. the CLI did not add the Untitled UI theme CSS;
5. the generated Button therefore was not visually ready without a theme
   bridge;
6. the generated helper contained `any`, so generated files still require a
   code and license review before adoption.

This test supports using an explicit `add` command in a disposable working copy
as an inspection aid. It does not authorize running the CLI directly with
`--overwrite` in the application repository.

## Adoption Log

No Untitled UI source was added during Phase 0. The following source was
adopted and modified during Phase 1, Phase 3, and Phase 4 on 1 August 2026.
Every row uses pinned commit
`eaee6a5b9798fa6867b4d896c6cfecf6ce706a73`.

| Local path | Upstream source | Material modifications | Dependencies | Review |
|---|---|---|---|---|
| `components/untitled/base/buttons/button.tsx` | `components/base/buttons/button.tsx` | Typed ReactNode icons, local tokens, explicit ButtonLink, accessible loading | React Aria | Phase 1 engineering review |
| `components/untitled/base/input/field-parts.tsx` | `components/base/input/label.tsx`, `hint-text.tsx` | Combined typed field anatomy, removed upstream tooltip/icon graph | React Aria | Phase 1 engineering review |
| `components/untitled/base/input/input.tsx` | `components/base/input/input.tsx` | Lucide icons, simplified API/states, local tokens, Indonesian labels | React Aria, Lucide | Phase 1 engineering review |
| `components/untitled/base/textarea/textarea.tsx` | `components/base/textarea/textarea.tsx` | Removed generated resize asset, scoped tokens, 200 px cap | React Aria | Phase 1 engineering review |
| `components/untitled/application/modals/modal.tsx` | `components/application/modals/modal.tsx` | Scoped portal tokens, simplified sizing, title/description exports | React Aria | Phase 1 engineering review |
| `components/untitled/application/loading-indicator/loading-indicator.tsx` | `components/application/loading-indicator/loading-indicator.tsx` | Reduced variants, status semantics, scoped colors | React | Phase 1 engineering review |
| `components/untitled/application/slideout-menus/slideout-menu.tsx` | `components/application/slideout-menus/slideout-menu.tsx` | Controlled mobile-only panel, scoped portal tokens, Lucide/domain close control, left-side motion | React Aria | Phase 3 engineering review |
| `components/untitled/base/tooltip/tooltip.tsx` | `components/base/tooltip/tooltip.tsx` | Minimal typed trigger/content API, scoped portal tokens, and local motion classes | React Aria | Phase 4 engineering review |

Installed upstream interaction dependencies:

- `react-aria-components@1.20.0`, Apache-2.0;
- `tailwindcss-react-aria-components@2.2.0`, Apache-2.0.

When another component is adopted, append its local path, upstream path,
pinned commit, adoption date, local modifications, dependencies, and reviewer.
A commit change requires reviewing the upstream diff and updating this document
before importing newer source.

Phase 5 did not copy another upstream component. Its profile menu is a PostIt AI
domain composition over the already installed React Aria primitives and the
approved local Untitled Button, Input, and token foundation. No PRO source,
asset, icon package, or additional dependency was introduced.

Phase 6 and Phase 7 did not copy additional upstream source. Dashboard
components are PostIt AI domain compositions over the eight adopted primitives,
React Aria, Recharts, and Lucide. The Phase 7 file-system audit confirmed that
all eight local adopted files still exist, all eight are listed above, the
pinned MIT license copy is retained, and no PRO/private source or asset entered
the repository.

Active frontend dependency notices are recorded in
[`frontend-notices.md`](./frontend-notices.md).
