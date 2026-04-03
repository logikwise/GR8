# GRACE — AI Agent Orchestration Platform

## Overview

GRACE is an AI agent orchestration and workflow platform. It provides a shell for building, managing, and observing agent Instances derived from Blueprint templates. The backend runtime, adapter plumbing, and connection infrastructure are preserved from the original Paperclip codebase.

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS 4.0 + TanStack Query + Radix UI
- **Backend:** Node.js + Express 5 + TypeScript
- **Database:** PostgreSQL (embedded via `embedded-postgres`, or external via `DATABASE_URL`)
- **ORM:** Drizzle ORM
- **Auth:** Better Auth
- **Realtime:** WebSockets
- **Package Manager:** pnpm (monorepo workspace)

## Project Structure

```
/cli          - CLI tool (paperclipai command)
/server       - Backend API server (Express + TypeScript)
/ui           - React frontend dashboard
  /src/grace  - GRACE app shell (new — Phase 1)
    /pages    - GRACE route pages (Home, Workspace, Studio, etc.)
    GraceLayout.tsx   - GRACE shell layout
    GraceSidebar.tsx  - GRACE navigation sidebar
/packages
  /db         - Database schema, migrations, Drizzle client
  /shared     - Shared TypeScript types and validators
  /adapters   - Agent adapters (claude, codex, cursor, gemini, etc.)
  /adapter-utils - Shared adapter utilities
  /plugins    - Plugin SDK and examples
/scripts      - Build and dev automation scripts
/docs         - Product and architecture documentation (see below)
```

## GRACE Documentation

| File | Purpose |
|---|---|
| `docs/product-model.md` | Blueprint, Instance, Run definitions; graph vs flow; swarm vs studio |
| `docs/architecture-plan.md` | Package preservation, auth strategy, theme strategy, legacy retirement plan |
| `docs/studio-spec.md` | Studio layout, panels, behavioral rules, Phase 1 status |
| `docs/replit-guardrails.md` | Development guardrails — what not to delete or break |

## GRACE Route Structure

All GRACE routes are protected by `CloudAccessGate` (auth-required).

| Route | Page |
|---|---|
| `/grace/home` | Home — quick links dashboard |
| `/grace/workspace` | Workspace — links to agents/tasks/routines |
| `/grace/library` | Workflow Library — Blueprint management |
| `/grace/studio` | Studio — Instance build/observe panel |
| `/grace/instances` | Instances — list and manage Instances |
| `/grace/skills` | Skills — workspace skill management |
| `/grace/tools` | Tools — tool registry |
| `/grace/outputs` | Outputs — run output review |
| `/grace/settings` | Settings — links to instance settings |
| `/grace/admin` | Admin — user/role/audit management |

The root `/` redirects to `/grace/home`.

Legacy routes (`/:companyPrefix/*`) remain accessible via direct URL.

## Design Tokens (GRACE)

GRACE uses CSS custom properties defined in `ui/src/index.css`:

| Token | Purpose |
|---|---|
| `--grace-accent` | Primary violet accent (`#7c3aed` light / `#a78bfa` dark) |
| `--grace-accent-muted` | Accent background tint |
| `--grace-accent-foreground` | Text on accent backgrounds |
| `--grace-radius` | Default border radius (6px) |
| `--grace-shadow-sm/md` | Shadow scale |

## Development Setup

### Running Locally

Two workflows are configured:
1. **Start application** (port 5000) - Vite UI dev server with proxy to backend
2. **Start Backend** (port 8080) - Express API server

The UI proxies `/api` requests to the backend at `localhost:8080`.

### Environment Variables (Development)

- `PORT=8080` - Backend server port
- `HOST=127.0.0.1` - Backend bind host
- `SERVE_UI=false` - Backend serves UI files (false in dev, true in production)
- `PAPERCLIP_MIGRATION_AUTO_APPLY=true` - Auto-apply database migrations
- `PAPERCLIP_ALLOWED_HOSTNAMES` - Comma-separated list of allowed hostnames for the backend

### Key Configuration Files

- `ui/vite.config.ts` - Vite config (port 5000, host 0.0.0.0, allowedHosts: true)
- `server/src/config.ts` - Server configuration loader
- `.replit` - Replit workflow and deployment settings

## Deployment

The app is configured for VM deployment:
- **Build:** `pnpm --filter @paperclipai/ui build && bash scripts/prepare-server-ui-dist.sh && pnpm --filter @paperclipai/server build`
- **Run:** `PORT=5000 HOST=0.0.0.0 SERVE_UI=true PAPERCLIP_MIGRATION_AUTO_APPLY=true node server/dist/index.js`

In production, the server serves the built UI files (`SERVE_UI=true`).

## Phase Status

| Phase | Status | Summary |
|---|---|---|
| Phase 1 | Complete | GRACE shell, docs, auth wrap, theme tokens, placeholder pages, legacy nav hidden |
| Phase 2 | Deferred | Studio wired to real Instance data |
| Phase 3 | Deferred | Workflow Library wired to Blueprints/Routines |
| Phase 4 | Deferred | Legacy pages deprecated and redirected |
| Phase 5 | Deferred | Legacy pages removed |

## Notes

- The `packageManager` field was updated from `pnpm@9.15.4` to `pnpm@10.26.1` to match the installed Replit pnpm version
- Native packages (`@embedded-postgres/linux-x64`, `es5-ext`, `esbuild`, `sharp`) are configured to build via `pnpm.onlyBuiltDependencies`
- The hostname guard middleware requires allowed hostnames to be configured for external access
- AI feedback data sharing was removed in a prior refactor; thumbs up/down voting is preserved
