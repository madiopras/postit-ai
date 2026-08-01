# Phase 5 Report — Identity and Authentication Surfaces

> Status: complete
> Date: 1 August 2026
> Scope: current-user state, profile/logout, visitor-history merge, login, and global system states

## 1. Objective

Give visitor, regular-user, admin, and super-admin sessions an explicit and
consistent identity experience on the public PostIt AI chat. Every signed-in
user must have a simple profile and logout action, while dashboard navigation
must remain limited to authorized roles.

The phase also attempts the agreed visitor-history merge after login and
migrates the login plus global error/not-found/loading surfaces to the approved
Untitled UI foundation without weakening server-side authorization.

## 2. Previous Behaviour

The public chat did not probe the current account and exposed no login, profile,
or logout action. A successful login changed server-side chat ownership from
visitor to user, so prior anonymous conversations appeared to disappear even
though they remained stored under the browser visitor id. The login page still
used the legacy visual system, English copy, and the old `SimpleAI` name.

The root error and not-found pages also used legacy components. The not-found
page exposed a dashboard link to every visitor, even though regular users are
not authorized to use that surface.

## 3. Identity Architecture

```text
ChatPage
├── useVisitorId
├── useCurrentUser
│   ├── GET /api/auth/me
│   ├── anonymous / authenticated / error state
│   ├── merge fallback notice
│   └── POST /api/auth/logout
└── useChatController
    └── waits for verified identity before loading owned history

ChatShell
├── visitor: Masuk
├── authenticated: ChatProfileMenu
│   ├── display name + username + role
│   ├── dashboard (admin/super_admin only)
│   └── logout (every signed-in role)
└── visible identity/merge/logout status banner
```

The account endpoint remains database-backed, so role and account status are
revalidated rather than trusted from stale JWT claims. The public identity
probe removes an invalid session cookie on an unauthorized response; this
prevents a stale cookie from making subsequent public chat requests fail as a
blocked pseudo-authenticated session.

The chat controller does not request history or send a message until both the
browser visitor id and account probe are ready. The server remains
authoritative: supplying a visitor id while signed in cannot override the
account owner selected by `resolveChatOwner`.

## 4. Role and Profile Behaviour

Visitor:

- sees `Masuk` without losing FAQ/public-chat access;
- continues to see the neutral empty-state heading;
- remains informed that some SOP content requires login.

Every authenticated role:

- sees a simple profile trigger and keyboard-accessible menu;
- sees bounded display name, username, and a localized role label;
- receives a personalized `Halo, {nama}.` supporting greeting;
- can logout with pending state and visible failure feedback.

Only `admin` and `super_admin` see `Buka dashboard`. A regular `user` does not
receive that menu item; authorization is still enforced by Proxy and API role
guards even if client markup is modified.

Successful logout reloads `/` so identity and conversation ownership are
resolved from a clean server state. A failed logout does not pretend that the
session ended and explicitly states that it remains active.

## 5. Visitor-History Merge

After credentials are accepted, the login client posts the locally stored
visitor UUID to the authenticated endpoint:

```text
POST /api/chat/history/merge
{ visitorId }
```

The route requires a current database-backed account session and validates a
strict UUID body. It performs one atomic database update with both ownership
predicates:

```text
visitor_id = supplied visitor UUID
AND user_id IS NULL
```

Matching rows receive the authenticated `user_id` and clear `visitor_id`.
Messages are not copied or deleted. The single update is atomic and idempotent:
once a chat is owned by an account it cannot match another merge, so retries do
not duplicate conversations or transfer already-owned account history.

If the merge fails, login still succeeds and the anonymous rows remain
untouched. A one-time session warning explains that the old history remains in
this browser. Logging out returns to the same visitor id, so the fallback does
not destroy access to those conversations.

## 6. Login and System States

The login page now uses the scoped Untitled UI Button/Input/theme foundation:

- final product name `PostIt AI` and Indonesian copy;
- centered 400 px auth card with responsive gutters;
- username and current-password autocomplete semantics;
- accessible password visibility control;
- client-scheduled initial focus without SSR hydration mismatch;
- pending label that prevents double submit;
- localized invalid-credential, blocked, inactive, and network states;
- error summary receives focus after failure;
- redirect accepts only same-origin absolute paths and rejects `//host` or
  external URL values;
- light/dark theme action and public-chat return link.

The root error, global error, not-found, and loading surfaces now use PostIt AI
identity and the Untitled visual language where the root layout is available.
The not-found page offers only the universally authorized chat destination.

Dashboard-scoped error/loading components remain with the current dashboard
primitive family. Migrating them before the surrounding dashboard shell would
violate the surface-by-surface boundary; they move with Phase 6.

## 7. Security Decisions

- `/api/chat/history/merge` is protected by both Proxy default policy and
  `requireAuth` inside the route.
- The merge accepts only a UUID and only anonymous rows with the exact browser
  visitor id; it never accepts a target user id from the client.
- A valid account session always wins over a supplied visitor id on every chat
  and feedback endpoint.
- Login input is strictly validated and bounded before database/password work.
- Login redirect cannot navigate to a protocol-relative or external origin.
- Regular-user dashboard visibility is not treated as authorization; server
  role guards remain unchanged.
- Identity, merge, and logout errors use safe product copy rather than database,
  provider, or stack details.

## 8. Files Changed

### Identity and merge boundary

- `lib/auth-client.ts`
- `hooks/use-current-user.ts`
- `hooks/use-visitor-id.ts`
- `hooks/use-chat-controller.ts`
- `app/api/chat/history/merge/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/login/route.ts`
- `proxy.ts`

### Chat and authentication presentation

- `app/page.tsx`
- `components/chat/chat-view.tsx`
- `components/chat/chat-shell.tsx`
- `components/chat/chat-profile-menu.tsx`
- `components/chat/chat-empty-state.tsx`
- `components/chat/chat-composer.tsx`
- `app/login/page.tsx`
- `app/error.tsx`
- `app/global-error.tsx`
- `app/not-found.tsx`
- `app/loading.tsx`

### Tests and evidence

- `tests/auth.test.ts`
- `tests/auth-client.test.ts`
- `e2e/identity-and-auth.spec.ts`
- `e2e/public-and-auth.spec.ts`
- `docs/enhancement/go2/phase-5/login-desktop.png`
- `docs/enhancement/go2/phase-5/login-dark-desktop.png`
- `docs/enhancement/go2/phase-5/chat-profile-desktop.png`
- `docs/enhancement/go2/phase-5/chat-profile-mobile.png`

No schema migration, package, PRO source, new icon system, RAG, model, or
retrieval change was required.

## 9. Untitled UI Provenance

Phase 5 copies no new Untitled UI upstream source. The profile menu is a small
PostIt AI domain composition using React Aria already installed in Phase 1 and
the approved local Untitled Button/token foundation. Login and global system
states reuse the existing approved Button and Input.

No template, illustration, avatar asset, private source, PRO component, or new
runtime dependency was introduced. The third-party inventory records this
explicitly.

## 10. Visual Evidence

Screenshots use deterministic mocked identity data and exclude the Next.js
development indicator.

| Surface | Evidence |
|---|---|
| Login light, 1440 × 900 | [`login-desktop.png`](./phase-5/login-desktop.png) |
| Login dark, 1440 × 900 | [`login-dark-desktop.png`](./phase-5/login-dark-desktop.png) |
| Admin profile, 1440 × 900 | [`chat-profile-desktop.png`](./phase-5/chat-profile-desktop.png) |
| Regular-user profile, 390 × 844 | [`chat-profile-mobile.png`](./phase-5/chat-profile-mobile.png) |

The dark login test also waits for the input container to resolve to
`rgb(12, 17, 29)`, preventing screenshots from being taken midway through the
theme transition.

## 11. Testing Strategy and Results

Unit coverage verifies redirect normalization, typed identity parsing,
anonymous 401 handling, merge request shape/failure, required authentication,
UUID validation, authenticated ownership assignment, and idempotent zero-row
retry.

Phase 5 browser coverage verifies visitor login access, personalized user
identity, regular-user dashboard exclusion, logout failure/success, admin
dashboard inclusion, keyboard open/Escape/focus restoration, password
visibility, external redirect rejection, merge-failure preservation notice,
localized login failure, alert focus, dark tokens, and hydration console output.

| Validation | Result |
|---|---|
| `npm run lint` | Passed, no warnings |
| `npm run typecheck` | Passed |
| Full `npm test` | 154 passed, 10 skipped |
| Focused Phase 5 Playwright | 5 passed |
| Full Playwright suite | 24 passed |
| Suggestion/send focus stress | 5 passed across parallel repeats |
| Login hydration stress | 3 passed across parallel repeats |
| `npm run build` | Passed |
| Mobile/light/dark visual review | Passed |

The final full Playwright run uses the repository's Docker browser against a
clean host development server. A stale `.next/dev` cache left after switching
from production build to container-managed development was removed before the
final passing run.

## 12. Risks and Deferred Work

- Visitor identity remains the existing opaque browser UUID capability. A
  signed server-issued visitor credential would be a broader identity-model
  change and is not introduced in this frontend migration.
- If storage is unavailable, chat continues with the existing in-memory visitor
  behavior, but cross-reload merge cannot be guaranteed.
- The profile uses initials rather than a user-uploaded avatar because no final
  avatar asset or upload contract is approved.
- Dashboard shell and dashboard-scoped loading/error states remain Phase 6.
- Broad removal of legacy components and dependencies remains Phase 7.

## 13. Definition of Done

Phase 5 is complete because:

- visitor, user, admin, and super-admin identity states are explicit;
- every authenticated role has profile and logout, while only authorized roles
  see the dashboard action;
- chat history waits for verified identity and server ownership remains
  authoritative;
- visitor history merge is authenticated, validated, atomic, idempotent, and
  non-destructive on failure;
- login and global system states use PostIt AI/Untitled UI with safe redirect,
  focus, loading, error, responsive, and dark-mode behavior;
- unit, full browser, lint, type, build, hydration, focus-stress, and visual
  gates pass;
- source provenance and deferred Phase 6 work are documented.
