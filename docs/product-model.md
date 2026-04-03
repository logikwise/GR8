# GRACE Product Model

## Core Concepts

### Blueprint
A Blueprint is a template that defines an agent's configuration, steps, skills, tools, and behavior. Blueprints are reusable design artifacts that can be shared across an instance.

**Rules:**
- Blueprints cannot be executed directly.
- A Blueprint must first be instantiated into an Instance before any run can occur.
- Blueprints live in the Workflow Library.
- Editing a Blueprint does not affect existing Instances derived from it.

### Instance
An Instance is a detached, executable snapshot derived from a Blueprint. Once created, an Instance is independent of its source Blueprint.

**Rules:**
- Only Instances can be run.
- An Instance carries its own configuration, step definitions, assigned skills, tools, and outputs.
- An Instance can be paused, resumed, or terminated without affecting the Blueprint.
- Instances are the primary unit of work in Studio.

### Run
A Run is a single execution lifecycle of an Instance. Each Run is a discrete event with:
- A start timestamp
- An end timestamp (or ongoing status)
- A transcript/log of agent activity
- Input/output records
- A status: `pending`, `running`, `completed`, `failed`, `cancelled`

Runs are append-only records. They are never mutated after completion.

---

## Workflow Library
The Workflow Library is the central registry of Blueprints within a Workspace. It allows builders to:
- Browse, search, and organize Blueprints
- Create new Blueprints from scratch or from templates
- Instantiate Blueprints into Instances
- Archive or version Blueprints

The Workflow Library does not expose Run controls. Run controls are available only on Instances.

---

## Graph Mode vs Flow Mode

### Flow Mode
Flow Mode shows the logical sequence of steps in an agent's workflow as a linear or branching flow diagram. It is the default editing view in Studio. Use it to add, remove, and connect steps.

### Graph Mode
Graph Mode shows the runtime execution graph of an active or completed Run on an Instance. It renders the actual execution path taken, including branching decisions, tool calls, and skill invocations. Graph Mode is read-only during a run and replay-able after completion.

---

## Workspace Swarm vs Studio Graph

### Studio Graph
Studio operates on a single Instance. The graph in Studio shows only:
- The assigned agent(s) for that Instance
- The steps defined in the Instance
- The skills attached to those steps
- The tools available
- The outputs produced

Studio is scoped to one Instance at a time. It is not a multi-agent orchestration view.

### Workspace Swarm *(future)*
Workspace Swarm is a separate, future feature that shows the full set of active Instances across a Workspace simultaneously. It is a birds-eye operational view, not a design surface. Swarm is not part of Phase 1 and must not be conflated with Studio.

---

## Summary Table

| Concept | Can Execute | Can Edit | Scope |
|---|---|---|---|
| Blueprint | No | Yes | Workflow Library |
| Instance | Yes | Yes (when not running) | Studio / Instances |
| Run | No | No (append-only) | Run history |
| Studio Graph | No (display only) | Yes (when idle) | One Instance |
| Workspace Swarm | N/A | No | All Instances (future) |
