# Runtime Translation Layer

> Phase 8 — April 2026
>
> Documents the boundary between the GRACE runtime bridge layer (GRACE-owned)
> and the preserved adapter compatibility layer (DO NOT MODIFY).

---

## 1. Overview

The GRACE runtime bridge connects the GRACE UI → GRACE server routes → preserved adapter packages.
The adapter packages (`@paperclipai/adapter-openclaw-gateway`, `@paperclipai/adapter-utils`, etc.)
use `PAPERCLIP_*` naming internally. This document maps what is rewritten vs. what is preserved.

---

## 2. Categories of Paperclip-era References Found

| Category | Location | Status |
|---|---|---|
| `PAPERCLIP_*` env vars | `adapter-openclaw-gateway/src/server/execute.ts` | **Preserved — compat** |
| `paperclip:run:<id>` session keys | `adapter-openclaw-gateway/src/server/execute.ts` | **Preserved — compat** |
| "Paperclip wake event…" wake text | `adapter-openclaw-gateway/src/server/execute.ts` | **Preserved — compat** |
| `companyId` field name in agent object | adapter type definition | **Preserved — field name required by adapter type** |
| `@paperclipai/` npm package scope | `server/src/routes/grace.ts` imports | **Preserved — package publisher name** |
| `companyId: "grace"` (value) | `server/src/routes/grace.ts` | **Rewritten → `"workspace"`** |
| `id: "grace-agent-…"` agent id prefix | `server/src/routes/grace.ts` | **Rewritten → `"agent-…"`** |
| `"GRACE run…"` system event messages | `server/src/routes/grace.ts` | **Rewritten → neutral runtime language** |
| `"Run dispatched"` response message | `server/src/routes/grace.ts` | **Rewritten → "Runtime activation dispatched"** |
| `"Execute GRACE workflow"` task default | `server/src/routes/grace.ts` | **Rewritten → `"Execute workflow"`** |
| `"GRACE Instance"` instanceName default | `server/src/routes/grace.ts` | **Rewritten → `"Workflow Instance"`** |
| `"grace-instance"` instanceId fallback | `server/src/routes/grace.ts` | **Rewritten → `"default-instance"`** |
| `taskKey: "grace:${instanceId}"` | `server/src/routes/grace.ts` | **Rewritten → `"run:${instanceId}"`** |
| Phase 5 comment, Phase 6 TODOs | `ui/src/grace/providers/openclawProvider.ts` | **Rewritten → accurate Phase 8 bridge docs** |
| `sendChat()` Phase 6 message | `ui/src/grace/providers/openclawProvider.ts` | **Rewritten → user-friendly capability message** |
| `Paperclip` (icon import from lucide-react) | `ui/src/grace/pages/Studio.tsx`, `InputsPanel.tsx` | **Retained — this is a lucide icon name, not the product** |

---

## 3. What Was Rewritten Into Neutral Runtime Terms

### 3a. System event messages (user-visible in Logs tab)

| Before | After |
|---|---|
| `GRACE run ${runId} dispatched at ${startedAt}` | `Runtime activation dispatched — run ${runId} (${startedAt})` |
| `Instance: ${instanceName} (${instanceId})` | `Workflow instance: ${instanceName} (${instanceId})` |
| `Task: ${task}` | `Execution context: ${task}` |
| `Run ${status} (exit ${code}) at ${time}` | `Execution ${status} — exit code ${code} at ${time}` |
| `Run failed: ${message}` | `Execution failed: ${message}` |

### 3b. Server response message

| Before | After |
|---|---|
| `"Run dispatched. Poll … for updates."` | `"Runtime activation dispatched. Poll … for status updates."` |

### 3c. Agent/runtime object values

| Field | Before | After | Note |
|---|---|---|---|
| `agent.id` | `grace-agent-${instanceId}` | `agent-${instanceId}` | Removes product prefix |
| `agent.companyId` | `"grace"` | `"workspace"` | Field name kept (adapter type requires it); value is now neutral |
| `runtime.taskKey` | `grace:${instanceId}` | `run:${instanceId}` | Removes product prefix |
| `instanceId` fallback | `"grace-instance"` | `"default-instance"` | Neutral |
| `instanceName` fallback | `"GRACE Instance"` | `"Workflow Instance"` | Neutral |
| `task` default | `"Execute GRACE workflow"` | `"Execute workflow"` | Neutral |

### 3d. Neutral context fields added (APP_* naming)

The following fields are now included in the `context` object passed to `execute()`.
The adapter ignores unrecognized fields, so these are forward-compatible additions:

```
APP_RUN_ID       = runId
APP_INSTANCE_ID  = instanceId
APP_WORKSPACE_ID = "default"
APP_TRACE_ID     = runId
APP_PROVIDER     = "openclaw"
```

These establish the canonical neutral field names for the runtime bridge.
Future bridge versions should read/write using these names rather than adding new product-branded fields.

---

## 4. What Was Preserved in the Compatibility Wrapper

All of the following are in `packages/adapters/openclaw-gateway/src/server/execute.ts`.
**DO NOT MODIFY these** — they are in the guardrailed adapter boundary.

| Reference | Why Preserved |
|---|---|
| `PAPERCLIP_RUN_ID` | Environment variable name read by the agent binary |
| `PAPERCLIP_AGENT_ID` | Environment variable name read by the agent binary |
| `PAPERCLIP_COMPANY_ID` | Environment variable name read by the agent binary |
| `PAPERCLIP_API_KEY` | Environment variable name read by the agent binary |
| `PAPERCLIP_API_URL` | Environment variable name read by the agent binary |
| `PAPERCLIP_TASK_ID` | Environment variable name read by the agent binary |
| `PAPERCLIP_WAKE_REASON` | Environment variable name read by the agent binary |
| `PAPERCLIP_WAKE_COMMENT_ID` | Environment variable name read by the agent binary |
| `PAPERCLIP_APPROVAL_ID` | Environment variable name read by the agent binary |
| `PAPERCLIP_APPROVAL_STATUS` | Environment variable name read by the agent binary |
| `PAPERCLIP_LINKED_ISSUE_IDS` | Environment variable name read by the agent binary |
| `paperclip:run:<id>` session key format | Required by the OpenClaw gateway protocol |
| `paperclip:issue:<id>` session key format | Required by the OpenClaw gateway protocol |
| `"Paperclip wake event…"` wake text | Sent directly to the agent; changing would break agent context parsing |
| `companyId` field name on agent object | Required by the adapter type definition |
| `@paperclipai/` package scope in imports | Package publisher name — cannot be changed without republishing |

---

## 5. Raw Provider Output vs. Cleaned Runtime Summary

| Surface | What it shows | Paperclip refs acceptable? |
|---|---|---|
| **Logs tab** (system stream) | GRACE bridge events | ❌ No — rewritten to neutral |
| **Logs tab** (stdout/stderr) | Raw adapter/agent output | ✅ Yes — raw provider trace |
| **Trace tab** (future) | Full provider diagnostics | ✅ Yes — explicitly raw |
| **Runtime tab** | Status summaries | ❌ No — neutral language only |
| **Chat panel** | Agent/user messages | ❌ No — neutral summaries |
| **Header / status banners** | Run status | ❌ No — neutral |

---

## 6. Preferred Neutral Runtime Field Names

Use these consistently in new GRACE bridge code:

| Concept | Preferred Field Name |
|---|---|
| Run identifier | `APP_RUN_ID` |
| Instance identifier | `APP_INSTANCE_ID` |
| Workspace identifier | `APP_WORKSPACE_ID` |
| Org identifier | `APP_ORG_ID` |
| Agent identifier | `APP_AGENT_ID` |
| Provider type | `APP_PROVIDER` |
| Session identifier | `APP_SESSION_ID` |
| Trace identifier | `APP_TRACE_ID` |
| Input asset IDs | `APP_INPUT_ASSET_IDS` |
| Output target | `APP_OUTPUT_TARGET` |

---

## 7. Remaining Paperclip References After This Pass

The following references still exist but are either acceptable or explicitly deferred:

| Reference | Location | Acceptable? | Why |
|---|---|---|---|
| `@paperclipai/adapter-*` imports | `server/src/routes/grace.ts` | ✅ | npm scope of package publisher |
| All `PAPERCLIP_*` env vars | adapter internals | ✅ | Required by agent binary |
| Wake text content | adapter internals | ✅ | Required by agent binary |
| `Paperclip` icon import | Studio.tsx, InputsPanel.tsx | ✅ | Lucide React icon name |
| `paperclipai` in adapter package name | adapter source | ✅ | Package namespace |
| Legacy base-system routes/pages | `server/src/`, `ui/src/pages/` | ⚠️ Deferred | Inventoried in legacy-capability-inventory.md |

---

## 8. Deferred Cleanup (Next Pass)

- Replace `companyId` field name in the bridge layer once adapter type allows a neutral alias
- Add `APP_INPUT_ASSET_IDS` to context when InputsPanel assets are available at run dispatch time
- Add `APP_OUTPUT_TARGET` when Library output recording is wired
- Full legacy base-system UI terminology cleanup (tracked in legacy-capability-inventory.md)
- Consider `workspaceId` field alias once the adapter type can be extended

---

*Last updated: Phase 8 — April 2026*
