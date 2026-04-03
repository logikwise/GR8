# GRACE Legacy Capability Inventory

> Phase 8 audit of base-system (Paperclip legacy) capabilities.
> Each capability is classified for forward planning.

## Classification Key

| Code | Meaning |
|------|---------|
| **MIGRATE** | Migrate into GRACE shell soon (Phase 9–10) |
| **PRESERVE-MC** | Preserve as future Mission Control / Recursion building block |
| **WRAP-DEFER** | Wrap and defer — accessible but not integrated |
| **RETIRE** | Retire after GRACE replacement is complete |
| **UNCLEAR** | Needs further investigation before classification |

---

## Capability Inventory

### 1. Inbox / Task Routing
**Location**: `server/src/routes/`, `ui/src/pages/inbox*`, `ui/src/components/InboxItem*`  
**Description**: Incoming task items, routed to agents or humans via an inbox queue. Supports assignment, acknowledgement, and forwarding.  
**Classification**: **PRESERVE-MC**  
**Rationale**: Inbox and task routing are the foundational building blocks for Mission Control portfolio management and Recursion's self-scheduling loops. Do not remove or bury. Preserve intact.

---

### 2. Tasks / Issues
**Location**: `ui/src/pages/issues/`, `server/src/routes/issues*`  
**Description**: Issue tracker–style task management. Each issue/task has a status, assignee, comments, and priority.  
**Classification**: **PRESERVE-MC**  
**Rationale**: GRACE uses "runs" as its primary execution primitive, but tasks/issues model remains valuable for human-in-the-loop tracking and Mission Control agent task queues. Preserve as-is.

---

### 3. Comments / Discussions
**Location**: `server/src/routes/comments*`, `ui/src/components/Comment*`  
**Description**: Threaded comments on tasks, issues, and runs.  
**Classification**: **WRAP-DEFER**  
**Rationale**: GRACE chat replaces most inline feedback loops. Legacy comment threads are still useful for structured task context. Wrap and defer migration until GRACE chat is more mature.

---

### 4. Approvals
**Location**: `server/src/routes/approvals*`, `ui/src/components/Approval*`  
**Description**: Human-in-the-loop approval gates. Agents can pause and request approval from a designated approver before proceeding.  
**Classification**: **PRESERVE-MC**  
**Rationale**: Approvals are a core safety primitive for autonomous agent pipelines. GRACE Studio will need approval-gate support. Preserve for Mission Control human-in-the-loop integration.

---

### 5. Heartbeats
**Location**: `ui/src/pages/instance/heartbeats*`, `server/src/routes/heartbeats*`  
**Description**: Periodic health signals from agent adapters. Allows the platform to detect stale or dead adapters.  
**Classification**: **MIGRATE**  
**Rationale**: GRACE already has a Connections/health-probe surface. Heartbeat data should feed into the Connections panel's provider health display. Migrate into GRACE Connections in Phase 9.

---

### 6. Routines / Scheduling
**Location**: `ui/src/pages/routines/`, `server/src/routes/routines*`  
**Description**: Scheduled and recurring workflow execution. Routines define when and how often a Blueprint/Workflow is run.  
**Classification**: **WRAP-DEFER**  
**Rationale**: GRACE Blueprints map directly to Routines conceptually, but scheduling execution is explicitly a non-goal until Phase 10+. Wrap legacy route access and defer full migration.

---

### 7. Agents (Legacy UI)
**Location**: `ui/src/pages/agents/`, `server/src/routes/agents*`  
**Description**: Legacy agent management UI — list, configure, and monitor individual agents in a workspace.  
**Classification**: **MIGRATE**  
**Rationale**: GRACE's Studio, Instances, and Connections panels cover the primary agent management surface. Migrate agent configuration into Connections / Org & Team in Phase 9. Legacy routes remain accessible via Workspace "Legacy" section.

---

### 8. Projects
**Location**: `ui/src/pages/projects/`, `server/src/routes/projects*`  
**Description**: Project-level grouping of tasks, agents, and runs within a workspace.  
**Classification**: **UNCLEAR**  
**Rationale**: GRACE does not yet have a "Project" concept. Need to decide whether Projects map to Workspace sub-groups, Instance collections, or something else before migrating.

---

### 9. Plugin System
**Location**: `packages/plugins/`, `ui/src/pages/instance/settings/plugins*`  
**Description**: Extensible plugin architecture for custom tool integrations and platform extensions.  
**Classification**: **PRESERVE-MC**  
**Rationale**: Plugin system is a core extensibility mechanism. GRACE Tools surface will eventually expose plugin-backed tools. Preserve packages/plugins untouched.

---

### 10. Experimental Settings
**Location**: `ui/src/pages/instance/settings/experimental*`  
**Description**: Feature flags and experimental toggles for the platform instance.  
**Classification**: **WRAP-DEFER**  
**Rationale**: Accessible via GRACE Settings → Experimental (currently redirects to legacy page). Defer migration until GRACE has its own feature-flag surface.

---

### 11. General / Instance Settings
**Location**: `ui/src/pages/instance/settings/general*`  
**Description**: Core platform configuration — instance name, timezone, integrations, etc.  
**Classification**: **MIGRATE**  
**Rationale**: Some settings (appearance, team) already migrate to GRACE Settings / Org & Team. Full migration in Phase 9.

---

### 12. Org / Reporting
**Location**: `ui/src/pages/org*`, `server/src/routes/org*`  
**Description**: Organisational hierarchy, team structure, and reporting dashboards.  
**Classification**: **MIGRATE**  
**Rationale**: GRACE has an Org & Team page as a placeholder. Migrate the reporting concepts into GraceOrg in Phase 9.

---

### 13. Notifications / Queues
**Location**: `server/src/services/notifications*` (if present)  
**Description**: Push notification delivery and event queue plumbing.  
**Classification**: **PRESERVE-MC**  
**Rationale**: Notification delivery is essential for Mission Control alerting on run failures, approvals, and agent health. Preserve without modification.

---

### 14. Onboarding Wizard
**Location**: `ui/src/pages/onboarding*`  
**Description**: First-run workspace setup flow.  
**Classification**: **RETIRE**  
**Rationale**: GRACE will have its own onboarding surface. The legacy wizard is incompatible with the new model. Retire after a GRACE onboarding flow is built.

---

### 15. Board Auth / CLI Auth
**Location**: `server/src/auth/`, `cli/src/commands/`  
**Description**: Device-level auth flows for CLI and board integrations.  
**Classification**: **PRESERVE-MC**  
**Rationale**: Board/CLI auth is the gateway for OpenClaw and other local adapters. Essential plumbing — never remove.

---

## Summary Table

| Capability | Classification |
|---|---|
| Inbox / Task Routing | PRESERVE-MC |
| Tasks / Issues | PRESERVE-MC |
| Comments / Discussions | WRAP-DEFER |
| Approvals | PRESERVE-MC |
| Heartbeats | MIGRATE |
| Routines / Scheduling | WRAP-DEFER |
| Agents (Legacy UI) | MIGRATE |
| Projects | UNCLEAR |
| Plugin System | PRESERVE-MC |
| Experimental Settings | WRAP-DEFER |
| General / Instance Settings | MIGRATE |
| Org / Reporting | MIGRATE |
| Notifications / Queues | PRESERVE-MC |
| Onboarding Wizard | RETIRE |
| Board Auth / CLI Auth | PRESERVE-MC |

---

## Preservation Note: Inbox & Task Routing

> **Inbox and task routing features must be treated as future Mission Control / Recursion building blocks.**
> Do not remove, disable, or bury them casually.
> They represent the scheduling and dispatch substrate for autonomous multi-agent operation.

---

*Last updated: Phase 8 — April 2026*
