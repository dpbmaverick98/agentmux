# CLAUDE.md

This file provides guidance to AI coding agents (Claude Code, OpenCode, etc.) when working with code in this repository.

## Build & Run

```bash
# Build (compiles src/index.ts → dist/index.js)
bun build ./src/index.ts --outdir ./dist --target node

# Run in development (without building)
bun run ./src/index.ts

# Run the built CLI
./dist/index.js
```

The CLI is invocable as `agentmux` or `am` when installed globally.

## Architecture

AgentMux is a multi-agent terminal multiplexer — a single-file CLI (`src/index.ts`, ~800 lines) that orchestrates multiple AI coding agents in a tmux session with JJ version control for collaboration.

**Stack**: TypeScript, Bun runtime, Commander.js (CLI), chalk (colors). No test suite.

**Key design choices**:
- Single-file architecture: all logic lives in `src/index.ts`, compiled to `dist/index.js`
- tmux is the infrastructure — no custom TUI, all pane management via `tmux` shell commands
- JJ (Jujutsu) handles version control for multi-agent collaboration (not git)
- Cross-agent messaging uses `tmux send-keys` with printf, logging to `~/.agentmux/shared/messages.txt`
- Enter key (C-m) must be sent separately from command text (bundling breaks execution)

**Default 4-pane layout** (`start` command):
```
┌─────────────┬─────────────┐
│ Pane 0      │ Pane 1      │
│ status      │ nui (opencode)│
├─────────────┼─────────────┤
│ Pane 2      │ Pane 3      │
│ sam (opencode)│ wit (claude)│
└─────────────┴─────────────┘
```

**Environment variables**: `AGENTMUX_SESSION`, `AGENTMUX_AGENT`, `AGENTMUX_PROJECT`

**Project detection**: looks for `.agentmux/` subdirectory. JJ commands run from the parent of `.agentmux/`.

**Skills** (`skills/` directory): Markdown files installed globally to `~/.claude/skills/` — they teach AI agents how to use agentmux commands and JJ workflows.

## CLI Commands

Core: `init`, `start`, `stop`, `status`, `list`, `config`
Messaging: `send <agent> "message"`
Agent management: `spawn <harness> <name>`, `kill <agent-name>` (max 11 agents)
Setup: `install`, `install-deps`

## Session Start

Run `am memory prime` at the beginning of each session to load accumulated expertise context:

```bash
# Load all memory domains
am memory prime

# Or load with full metadata
am memory prime --full

# Or load specific domain
am memory prime decisions
```

This outputs formatted context from the memory system:
- Conventions (project standards)
- Known Failures (problems encountered and solutions)
- Decisions (architectural choices and rationale)

Record new learnings before finishing tasks:
```bash
am memory record project --type convention "Always use X for Y"
am memory record tasks --type failure --description "Problem" --resolution "Solution"
am memory record decisions --type decision --title "Choice" --rationale "Reason"
```

## Plan Versioning

Create and manage versioned plans for multi-agent collaboration:

```bash
# Create a new plan (auto-prefixed with agent name: @nui/plan-name)
am plan init api-design

# Edit draft.md, then commit as a version
am plan commit api-design -m "v1: REST approach"

# View version history
am plan log api-design

# Show current version
am plan show api-design

# List all plans
am plan list
```

### Linking Plans to Memory

Connect decisions in plans to memory records (bidirectional):

```bash
# Link a memory record to current plan version
am plan link api-design --memory am-8f2d

# Show plan with linked memory content
am plan show api-design --with-memory

# Query memory filtered by plan
am memory query --all --plan api-design
```

**Storage structure:**
```
.agentmux/plans/
├── index.jsonl              # Plan registry
└── @nui/api-design/
    ├── manifest.jsonl       # Version history with parent refs
    ├── v1-abc123.md        # Version files
    ├── v2-def456.md
    └── current.md -> v2    # Symlink to latest
```

## Context Injection (Phase 3)

Auto-inject relevant memory into messages when using `--inject` flag:

```bash
# Send message with context injection (opt-in)
agentmux send sam "What about the auth flow?" --inject

# Sam sees:
# 📨 [@nui → @sam]: What about the auth flow?
# 📎 Context: [decisions] Use JWT tokens: Team decided on JWT for stateful sessions
```

**How it works:**
1. Extracts keywords from your message
2. Matches against memory records by relevance
3. Injects top 2 most relevant memories
4. **Default is OFF** - must explicitly use `--inject`

## Timeline Visualization (Phase 4)

View plan evolution and decision history:

```bash
# Show all plans overview
am plan timeline

# Show detailed timeline for specific plan
am plan timeline api-design
```

**Displays:**
- Version history with parent references (DAG view)
- Linked memories per version
- Agent attribution (who created each version)
- ASCII art visualization
