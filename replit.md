# Paperclip - AI Agent Orchestration Platform

## Overview

Paperclip is an open-source AI agent orchestration platform designed to run and manage "zero-human companies." It provides organizational structure for AI agents including org charts, mission-driven goals, budgets, governance, and persistent task management.

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
/packages
  /db         - Database schema, migrations, Drizzle client
  /shared     - Shared TypeScript types and validators
  /adapters   - Agent adapters (claude, codex, cursor, gemini, etc.)
  /adapter-utils - Shared adapter utilities
  /plugins    - Plugin SDK and examples
/scripts      - Build and dev automation scripts
/docs         - Documentation (Mintlify)
```

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

## Notes

- The `packageManager` field was updated from `pnpm@9.15.4` to `pnpm@10.26.1` to match the installed Replit pnpm version
- Native packages (`@embedded-postgres/linux-x64`, `es5-ext`, `esbuild`, `sharp`) are configured to build via `pnpm.onlyBuiltDependencies`
- The hostname guard middleware requires allowed hostnames to be configured for external access
