---
name: agentmux
description: AgentMux multi-agent terminal commands for cross-agent messaging, spawning/killing agents, and status monitoring. Use when working with other agents in the tmux environment, sending messages between agents, managing agent lifecycle, or checking system status.
---

# AgentMux Commands

Multi-agent terminal multiplexer using tmux with 3 core agents (nui, sam, wit).

## Your Identity

You are: **$AGENTMUX_AGENT** running on **${process.env.AGENTMUX_AGENT === 'wit' ? 'claude' : 'opencode'}**

## The Team

- **nui** (opencode) - Top-right pane
- **sam** (opencode) - Bottom-left pane
- **wit** (claude) - Bottom-right pane
- **status** (monitor) - Top-left pane

## Core Commands

### List all agents and their status
```bash
agentmux list
```

### Send message to another agent
```bash
agentmux send <agent> "message"
# Example: agentmux send sam "Can you review my code?"
```
Recipient sees: `📨 [@nui → @sam]: Can you review my code?`

### Spawn new agent (max 11 total)
```bash
agentmux spawn <harness> <name>
# Examples:
agentmux spawn opencode helper
agentmux spawn claude reviewer
```

### Kill specific agent
```bash
agentmux kill <agent>
# Examples:
agentmux kill helper
agentmux kill nui
```

### Kill all agents
```bash
agentmux stop
```

### View live status
```bash
agentmux status
```

## Environment Variables

- `AGENTMUX_AGENT` - Your agent name
- `AGENTMUX_PROJECT` - Project directory path

## tmux Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+B ↑↓←→ | Move between panes |
| Ctrl+B z | Zoom pane |
| Ctrl+B d | Detach session |
| Click | Switch panes |

## Quick Workflow

1. `agentmux list` - Check who's online
2. Work on task
3. `agentmux send <agent> "message"` - Communicate
4. `jj log` - Check what others committed
5. `agentmux spawn opencode helper` - Add helpers if needed
