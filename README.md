# AgentMux 

Ultra-lean multi-agent terminal multiplexer using tmux with git-based commit tracking.

## One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/install.sh | bash
```

This installs: claude, opencode, tmux, bun, and agentmux itself.

## Quick Start

```bash
# 1. Initialize project (creates .agentmux/ directory)
agentmux init

# 2. Start the 4-pane environment
agentmux start

# 3. Done! You now have 3 AI agents running:
#    - nui (opencode) - top-right
#    - sam (opencode) - bottom-left
#    - wit (claude) - bottom-right
#    - status monitor - top-left
```

## Architecture

```
┌─────────────────────┬─────────────────────┐
│    📊 STATUS        │  🤖 nui (opencode)  │
│   (git log)         │    Agent #1         │
├─────────────────────┼─────────────────────┤
│  🤖 sam (opencode)  │  🤖 wit (claude)    │
│    Agent #2         │    Agent #3         │
└─────────────────────┴─────────────────────┘
```

- **4-pane split screen** using tmux
- **Live status** shows git log and messages every 3 seconds
- **Cross-agent messaging** via `agentmux send`
- **Git-based commits** - Use standard git commands
- **Workflows** for agent coordination patterns

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `agentmux init` | Initialize .agentmux/ directory |
| `agentmux start` | Launch 4-pane tmux session with all agents |
| `agentmux stop` | Kill the tmux session |
| `agentmux list` | Show all agents with status and harness |
| `agentmux status` | Show live-updating status (git log, agents, messages) |

### Messaging Commands

| Command | Description |
|---------|-------------|
| `agentmux send nui "message"` | Send message to nui (appears in their terminal) |
| `agentmux send sam "message"` | Send message to sam |
| `agentmux send wit "message"` | Send message to wit |

### Messaging Commands

| Command | Description |
|---------|-------------|
| `agentmux workflow` | List installed workflows |
| `agentmux workflow <name>` | View workflow documentation |
| `agentmux workflow <name> --install` | Install workflow from GitHub |

**Workflow Examples:**
```bash
# List workflows
agentmux workflow
```

### Agent Management Commands

| Command | Description |
|---------|-------------|
| `agentmux spawn opencode <name>` | Spawn new agent with opencode (max 11 total) |
| `agentmux spawn claude <name>` | Spawn new agent with claude |
| `agentmux kill <agent-name>` | Kill a specific agent |
| `agentmux stop` | Kill entire tmux session |

### Memory Commands

| Command | Description |
|---------|-------------|
| `am memory init` | Initialize memory storage with default domains |
| `am memory add <domain>` | Add new expertise domain |
| `am memory record <domain>` | Record convention, failure, or decision |
| `am memory query [domain]` | Query records with filters |
| `am memory prime` | Load context for session start |

**Examples:**
```bash
# Record a decision
am memory record decisions --type decision --title "Use REST" --rationale "Team familiarity"

# Query with filters
am memory query --all --type decision
am memory query decisions --plan api-design
```

### Plan Versioning Commands

| Command | Description |
|---------|-------------|
| `am plan init <name>` | Create a new versioned plan |
| `am plan commit <name> -m "msg"` | Commit current plan as new version |
| `am plan log <name>` | Show version history |
| `am plan show <name>` | Show current version |
| `am plan list` | List all plans |
| `am plan link <name> --memory <ref>` | Link memory to plan |
| `am plan timeline [name]` | Show ASCII timeline of plan evolution |

**Example Workflow:**
```bash
# Create plan
am plan init api-design

# Edit .agentmux/plans/@nui/api-design/draft.md
am plan commit api-design -m "v1: REST approach"

# Link a decision
am plan link api-design --memory am-8f2d

# View with linked memories
am plan show api-design --with-memory

# View timeline
am plan timeline api-design
```

### Context Injection (Phase 3)

Auto-inject relevant memory when messaging other agents:

```bash
# Send message with context injection
agentmux send sam "What about auth?" --inject

# Sam sees:
# 📨 [@nui → @sam]: What about auth?
# 📎 Context: [decisions] Use JWT tokens: Team familiarity with JWT
```

**Spawn Examples:**
```bash
agentmux spawn opencode max     # Create "max" agent with opencode
agentmux spawn claude alex      # Create "alex" agent with claude
```

**Kill Examples:**
```bash
agentmux kill max       # Kill the "max" agent
agentmux kill nui       # Kill nui (can respawn later)
agentmux stop           # Kill everything
```

**Example:**
```bash
# From any agent terminal:
agentmux send sam "Can you review my changes?"

# Sam sees in their terminal:
# 📨 [@nui → @sam]: Can you review my changes?
```

## The Three Agents

| Agent | Harness | Position | Role |
|-------|---------|----------|------|
| **nui** | opencode | Top-right | Agent #1 |
| **sam** | opencode | Bottom-left | Agent #2 |
| **wit** | claude | Bottom-right | Agent #3 |

Each agent:
- Has their own environment variables (`AGENTMUX_AGENT=nui`)
- Can message other agents via `agentmux send`
- Uses standard git commands for commits
- Can view workflows with `agentmux workflow`
- Can see the live status in the top-left pane

## Cross-Agent Communication

### From Agent Terminal

```bash
# Request help
agentmux send sam "I need help with the database schema"

# Share progress
agentmux send wit "Auth module is complete, ready for review"

# Broadcast to team
agentmux send nui "Team sync in 5 minutes"
```

### What Recipients See

Messages appear directly in the agent's terminal:
```
📨 [@nui → @sam]: Can you review my changes?
```

## Project Structure

```
project/
├── .agentmux/
│   ├── shared/                     # Shared context
│   │   ├── plan.md                 # Project plan
│   │   └── messages.txt            # Message log
│   └── workflows/                  # Installed workflows
│       └── [workflows]
└── [your project files]
```

## Agent Skills (Global)

Skills are installed globally in `~/.claude/skills/` and accessible to all agents:

### `/agentmux:` - AgentMux Commands
Access via: `/agentmux: <command>`

Provides:
- Available commands (`agentmux list`, `agentmux send`, `agentmux spawn`, etc.)
- How to message other agents
- Spawning and killing agents
- Workflow management
- Environment variables
- Keyboard shortcuts

## Keyboard Shortcuts

When in the tmux session:

| Shortcut | Action |
|----------|--------|
| `Ctrl+B ↑↓←→` | Move between panes |
| `Ctrl+B z` | Zoom current pane (toggle) |
| `Ctrl+B d` | Detach (session keeps running) |
| `Ctrl+B [` | Scroll mode (press `q` to exit) |
| `Click` | Mouse also works to switch panes |

## Requirements

- **macOS or Linux**
- **tmux** - Terminal multiplexer
- **bun** - JavaScript runtime
- **claude** - Anthropic's CLI
- **opencode** - Opencode CLI

All installed automatically by the one-liner installer.

## Philosophy

- **tmux IS the infrastructure** - No custom TUI needed
- **Git-based commits** - Use standard git commands
- **Visible communication** - tmux send-keys shows messages in real-time
- **Workflows over automation** - Agents follow documented patterns
- **Simple** - ~400 lines of TypeScript, minimal magic

## Troubleshooting

### "not a terminal" error
The installer detects non-interactive mode and skips auto-attach. Run `agentmux start` manually after install.

### Messages not appearing
Make sure the tmux session is running: `tmux attach -t agentmux`

### Commits not showing in status
The status pane shows git log output. Make sure commits are pushed to the repository.

### Agent not responding
Check if the agent is running: `agentmux list`

## License

MIT
