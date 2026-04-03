# GRACE Architecture Plan

## Package Preservation Strategy

The following packages are **preserved without modification** in Phase 1:

| Package | Purpose | Status |
|---|---|---|
| `packages/adapters/*` | Agent runtime adapters (Claude, Codex, Gemini, etc.) | Preserved |
| `packages/adapter-utils` | Shared adapter plumbing | Preserved |
| `packages/db` | PostgreSQL schema + Drizzle ORM | Preserved |
| `packages/plugins` | Plugin system | Preserved |
| `packages/shared` | Shared types and validators | Preserved |
| `server/src/auth/` | Better Auth authentication layer | Preserved |
| `server/src/services/` | All backend services | Preserved |
| `server/src/routes/` | All API routes | Preserved |

No runtime, adapter, or connection code is removed in Phase 1.

---

## New App Shell Strategy

GRACE is built as an additive shell on top of the existing codebase:

- New directory: `ui/src/grace/`
- New layout: `GraceLayout.tsx` — replaces the visible chrome for GRACE routes
- New sidebar: `GraceSidebar.tsx` — GRACE-branded navigation
- New routes mounted at `/grace/*` inside the existing `CloudAccessGate` (auth-protected)
- Legacy routes remain accessible at their existing paths
- The root `/` eventually redirects to `/grace/home`

Legacy pages are **not deleted**. They are hidden from the primary nav and remain accessible via direct URL for continuity.

---

## Auth Strategy

The existing authentication layer (Better Auth) is retained in full:
- Session-based email/password auth
- Board claim / CLI auth flows preserved
- `CloudAccessGate` wraps all protected routes

GRACE adds a `GraceAuthContext` that surfaces:
- Current user identity
- Current workspace (company) selection
- Role flag: `admin | builder | operator | viewer`

This context is a thin wrapper over the existing session/company APIs — not a replacement.

Future: swap in OAuth or SSO provider by replacing the Better Auth wiring in `server/src/auth/`.

---

## Theme / Template Strategy

GRACE introduces a tokenized design system via CSS custom properties:

- Tokens are defined in `ui/src/grace/grace-tokens.css`
- GRACE accent is violet (`--grace-accent`)
- All GRACE components reference tokens, not hardcoded values
- Light and dark mode both supported via `.dark` class (existing Tailwind convention)
- Theme is controlled globally by the existing `ThemeContext`

Future: per-workspace theme overrides can be applied by injecting a CSS variable override block at the workspace level.

---

## Translation Layer Concept

Some legacy concepts map to GRACE concepts:

| Legacy Term | GRACE Term |
|---|---|
| Company | Workspace |
| Routine | Workflow / Blueprint |
| Issue | Task |
| Agent | Agent (preserved) |
| Run | Run (preserved) |
| Project | Project (preserved, may evolve) |

Translation is applied in the UI only. Backend terminology is unchanged.

---

## Staged Legacy Retirement Plan

| Phase | Action |
|---|---|
| Phase 1 (now) | GRACE shell added, legacy nav hidden, docs created |
| Phase 2 | Studio placeholder wired to real Instance data |
| Phase 3 | Workflow Library wired to Blueprints/Routines |
| Phase 4 | Legacy pages formally deprecated and redirected |
| Phase 5 | Legacy pages removed after redirect coverage confirmed |

No legacy code is deleted before Phase 4.
