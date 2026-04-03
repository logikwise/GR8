# GRACE Studio Specification

## Overview

Studio is the primary interface for working with a single active Instance. It provides a split-panel workspace for building, inspecting, and observing agent runs.

Studio operates **only on Instances**, never on raw Blueprints.

---

## Layout

```
┌────────────────────────────────────────────────────────────┐
│  GRACE Header (instance name, status, controls)            │
├──────────────┬─────────────────────────┬───────────────────┤
│              │                         │                   │
│  Left Panel  │   Center: Graph / Flow  │   Right: Chat     │
│              │                         │                   │
│  - Steps     │   (agent graph or       │   (agent message  │
│  - Skills    │    flow editor)         │    stream /       │
│  - Tools     │                         │    human-in-loop) │
│  - Outputs   │                         │                   │
│              │                         │                   │
├──────────────┴─────────────────────────┴───────────────────┤
│  Bottom: Console (logs, tool calls, outputs, errors)       │
└────────────────────────────────────────────────────────────┘
```

---

## Panels

### Left Panel
Displays the structural elements of the current Instance:
- **Steps** — ordered list of defined workflow steps
- **Skills** — skills attached to each step, with status indicators
- **Tools** — tools available to the instance
- **Outputs** — output definitions and observed values

When no run is active, all elements are editable. When a run is in progress, the panel is read-only.

### Center: Graph / Flow
Two display modes toggled by the user:

**Flow Mode** (default when no run is active):
- Visual flow editor for the Instance's step sequence
- Nodes are draggable, connectable
- Used to define the workflow structure

**Graph Mode** (active during / after a run):
- Shows the actual execution graph for the current or most recent run
- Displays branching, loops, and tool invocations as they occurred
- Read-only

### Right: Chat
- Streams agent messages in real time during a run
- Supports human-in-the-loop: the operator can send messages to the agent
- Displays approval requests inline when the agent requests human confirmation

### Bottom: Console
- Raw log stream from the run
- Shows tool call inputs/outputs
- Displays errors, warnings, and status events
- Filterable by log level

---

## Behavioral Rules

### Blueprint Run Prohibition
Studio **does not expose a run button for Blueprints**. If a user navigates to a Blueprint in Studio, they see:
- A read-only view of the Blueprint definition
- A prominent "Create Instance" CTA
- No run/start controls

### Create Instance Flow
1. User selects a Blueprint from the Workflow Library
2. User clicks "Create Instance"
3. GRACE creates a detached copy of the Blueprint as a new Instance
4. User is taken to Studio with the new Instance active
5. User can edit steps/skills/tools before starting the first run
6. User clicks "Start Run" to begin execution

### Editable When Idle
When an Instance has no active run:
- Steps can be added, removed, reordered
- Skills can be attached or detached
- Tools can be enabled or disabled
- Outputs can be defined

When a run is in progress:
- All editing is suspended
- The center panel switches to Graph Mode automatically
- The right chat panel becomes active

---

## Phase 1 Status

Studio is a **placeholder** in Phase 1. The page renders the layout shell with empty panels and a clear status message. No runtime execution is wired yet.

Items deferred to later phases:
- Real-time run streaming
- Graph rendering engine
- Flow editor (node canvas)
- Human-in-the-loop chat
- Console log streaming
