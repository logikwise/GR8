# GRACE Replit Development Guardrails

These rules apply to all agents and contributors working on GRACE inside the Replit environment.

---

## Do Not Delete Runtime Core

The following directories and packages are **off-limits for deletion or breaking changes**:

- `packages/adapters/` and all sub-adapters
- `packages/adapter-utils/`
- `packages/db/`
- `packages/plugins/`
- `packages/shared/`
- `server/src/services/`
- `server/src/routes/`
- `server/src/auth/`

If you believe something in these directories is unused or should be removed, flag it in a comment and defer removal to an explicit cleanup phase with explicit user approval.

---

## Do Not Delete Adapter / Connection Plumbing

All agent adapter packages are preserved:
- `adapters/claude-local`
- `adapters/codex-local`
- `adapters/cursor-local`
- `adapters/gemini-local`
- `adapters/openclaw-gateway`
- `adapters/opencode-local`
- `adapters/pi-local`

These are the runtime hooks that connect GRACE to AI backends. Removing any of them breaks live agent functionality.

---

## Do Not Break the Startup Path

The startup scripts are:
- `pnpm --filter @paperclipai/server dev` (Start Backend workflow)
- `pnpm --filter @paperclipai/ui dev` (Start application workflow)

Do not modify these commands or their underlying entry points without first verifying the replacement works end-to-end.

---

## Do Not Allow Blueprint Execution

No code path should allow a Blueprint to be run directly. Enforce this at the UI level by:
- Not rendering run/start controls on Blueprint detail views
- Displaying "Create Instance" as the only action available on Blueprints
- Validating on the API layer that run requests reference Instance IDs, not Blueprint IDs

---

## Build New Shell Alongside Old System First

GRACE shell components live in `ui/src/grace/`. Legacy components live in `ui/src/components/` and `ui/src/pages/`.

Do not delete legacy pages until:
1. GRACE replacements are feature-complete
2. All legacy routes are redirected
3. Explicit user sign-off is received

---

## Defer Uncertain Removals

If a file or feature's necessity is unclear:
1. Leave it in place
2. Add a `// GRACE-REVIEW:` comment with your uncertainty
3. List it in the "Deferred" section of the relevant phase summary

Prefer additive refactors. Deletions require certainty.

---

## Environment Notes

- This is a pnpm monorepo — always use `pnpm --filter <package>` for package-scoped commands
- TypeScript strict mode is on — all new GRACE files must type-check cleanly
- The server uses Better Auth for session management — do not bypass or duplicate it
- The UI uses Tailwind CSS with CSS custom property tokens — do not add hardcoded color values
