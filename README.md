# AgentMux 

Ultra-lean multi-agent terminal multiplexer using tmux with lightweight commit tracking.

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
│   (commit log)      │    Agent #1         │
├─────────────────────┼─────────────────────┤
│  🤖 sam (opencode)  │  🤖 wit (claude)    │
│    Agent #2         │    Agent #3         │
└─────────────────────┴─────────────────────┘
```

- **4-pane split screen** using tmux
- **Live status** shows commits and messages every 3 seconds
- **Cross-agent messaging** via `agentmux send`
- **Commit tracking** in `.agentmux/shared/commits.txt`
- **Workflows** for agent coordination patterns

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `agentmux init` | Initialize .agentmux/ directory |
| `agentmux start` | Launch 4-pane tmux session with all agents |
| `agentmux stop` | Kill the tmux session |
| `agentmux list` | Show all agents with status and harness |
| `agentmux status` | Show live-updating status (commits, agents, messages) |

### Messaging Commands

| Command | Description |
|---------|-------------|
| `agentmux send nui "message"` | Send message to nui (appears in their terminal) |
| `agentmux send sam "message"` | Send message to sam |
| `agentmux send wit "message"` | Send message to wit |

### Commit Tracking Commands

| Command | Description |
|---------|-------------|
| `agentmux commit <hash> "@agent: message"` | Log a commit (○ = pending) |
| `agentmux review <hash>` | Mark commit as reviewed (● = done) |
| `agentmux commits` or `agentmux log` | Show recent commits |
| `agentmux clear-commits` | Clear commit history |

**Commit Examples:**
```bash
# Log your work
agentmux commit abc123 "@nui: implemented auth API"
# Shows in status: ○ abc123 @nui: implemented auth API

# Review others' work
agentmux review abc123
# Changes to: ● abc123 @nui: implemented auth API (sam)
```

### Workflow Commands

| Command | Description |
|---------|-------------|
| `agentmux workflow` | List installed workflows |
| `agentmux workflow <name>` | View workflow documentation |
| `agentmux workflow <name> --install` | Install workflow from GitHub |

**Workflow Examples:**
```bash
# List workflows
agentmux workflow

# Install detailed-commits workflow
agentmux workflow detailed-commits --install

# View workflow
agentmux workflow detailed-commits
```

### Agent Management Commands

| Command | Description |
|---------|-------------|
| `agentmux spawn opencode <name>` | Spawn new agent with opencode (max 11 total) |
| `agentmux spawn claude <name>` | Spawn new agent with claude |
| `agentmux kill <agent-name>` | Kill a specific agent |
| `agentmux stop` | Kill entire tmux session |

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
- Can log commits with `agentmux commit`
- Can view workflows with `agentmux workflow`
- Can see the live status in the top-left pane

## Cross-Agent Communication

### From Agent Terminal

```bash
# Request help
agentmux send sam "I need help with the database schema"

# Share progress
agentmux send wit "Auth module is complete, ready for review"

# Log your work
agentmux commit abc123 "@nui: implemented auth API"

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
│   │   ├── messages.txt            # Message log
│   │   └── commits.txt             # Commit tracking
│   └── workflows/                  # Installed workflows
│       └── detailed-commits/
│           └── SKILL.md
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
- Commit tracking workflow
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
- **Simple commit tracking** - Lightweight logging, not full version control
- **Visible communication** - tmux send-keys shows messages in real-time
- **Workflows over automation** - Agents follow documented patterns
- **Simple** - ~400 lines of TypeScript, minimal magic

## Troubleshooting

### "not a terminal" error
The installer detects non-interactive mode and skips auto-attach. Run `agentmux start` manually after install.

### Messages not appearing
Make sure the tmux session is running: `tmux attach -t agentmux`

### Commits not showing in status
The status pane refreshes every 3 seconds. Make sure you're logging commits with `agentmux commit`.

### Agent not responding
Check if the agent is running: `agentmux list`

## License

MIT
