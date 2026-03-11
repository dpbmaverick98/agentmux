# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
