# AgentMux v3 - Ultra Lean

Ultra-lean multi-agent terminal multiplexer using tmux and JJ.

## Philosophy

- **tmux IS the infrastructure** - No custom TUI
- **JJ for version control** - Agents commit naturally
- **Visible communication** - tmux send-keys for cross-agent messaging
- **Single install** - One binary, minimal dependencies

## Install

```bash
# Install dependencies first
brew install tmux
cargo install jj-cli

# Install agentmux
bun install  # or npm install
bun run build

# Or use directly
bun run ./src/index.ts
```

## Quick Start

```bash
# 1. Initialize project
agentmux init myproject

# 2. Start tmux session
agentmux tmux-start

# 3. Spawn your first agent
agentmux spawn kimi "Design auth API"

# 4. Spawn another agent
agentmux spawn minimax "Implement auth based on @kimi's design"

# 5. Check status
agentmux status
```

## Commands

### `agentmux init <name>`
Initialize a new AgentMux project with JJ repo and shared context.

### `agentmux tmux-start`
Start the tmux session. Attach with: `tmux attach -t agentmux`

### `agentmux spawn <agent> [task...]`
Spawn an AI agent in a new tmux window.
- `agentmux spawn kimi "Implement auth"`
- `agentmux spawn claude "Review the code"`
- `agentmux spawn minimax "Fix bugs" --provider minimax`

### `agentmux send <to> <message...>`
Send a visible message to another agent's terminal.
```bash
agentmux send minimax "Check my auth.py changes"
# minimax sees: "📨 [@kimi → @minimax]: Check my auth.py changes"
```

### `agentmux status`
Show JJ changes, active agents, and recent messages.

### `agentmux run <plan.md>`
Execute a multi-agent plan from markdown.

## Plan Format

Create `plan.md`:
```markdown
# Auth Implementation

## @kimi
Design the auth API interface
- Create auth.py with clear methods
- Document expected inputs/outputs

## @minimax
Implement the auth logic
- Use @kimi's design
- Add password hashing with bcrypt

## @claude
Review for security
- Check @minimax's implementation
- Look for vulnerabilities
```

Run it:
```bash
agentmux run plan.md
# Spawns all 3 agents with their tasks
```

## Architecture

```
Your Terminal
└── tmux session "agentmux"
    ├── window: opencode (kimi)
    ├── window: opencode (minimax)
    ├── window: claude (opus)
    └── window: [you run commands here]
        
JJ Repo (agents commit naturally via skill)
Shared Context (~/.agentmux/shared/)
```

## Communication

**Cross-agent messaging uses tmux send-keys:**
- Visible in recipient's terminal
- Literally types the message
- No complex IPC needed

**JJ for work tracking:**
- Each agent creates changes
- Descriptive commit messages
- Natural code review workflow

## Skill Auto-Injection

When you spawn an agent, agentmux:
1. Sets environment variables
2. Provides skill via `~/.agentmux/skills/agentmux.md`
3. Agent can run `am help` to see commands
4. Skill teaches: JJ workflow, messaging, status checking

## Why This Design?

- **No custom TUI** - tmux handles everything visual
- **No heavy coordinator** - tmux manages windows
- **Familiar tools** - opencode, claude, jj, tmux
- **Visible communication** - You see messages appear in real-time
- **Flexible** - Agents use JJ however they want
- **Simple** - ~300 lines of TypeScript

## Requirements

- tmux
- jj (optional but recommended)
- opencode or claude (for AI agents)
- Bun or Node.js

## License

MIT