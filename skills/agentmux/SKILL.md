---
name: agentmux
description: AgentMux multi-agent terminal commands for cross-agent messaging, spawning/killing agents, and status monitoring. Use when working with other agents in the tmux environment, sending messages between agents, managing agent lifecycle, or checking system status.
---

# AgentMux Commands

Multi-agent terminal multiplexer using tmux with 3 core agents (nui, sam, wit).

## Your Identity

Check your identity at any time:
```bash
agentmux whoami
# Output: nui (opencode) @ /path/to/project
```

Or check environment variable:
```bash
echo $AGENTMUX_AGENT
# Output: nui, sam, wit, or status
```

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

## Commit Tracking

Track your work with commits (3-5 word descriptions):

### Log a commit
```bash
agentmux commit <github-hash> "@agent: description"
# Example: agentmux commit abc123 "@nui: implemented auth"
# Shows as: ○ abc123 @nui: implemented auth
```

### Review a commit
```bash
agentmux review <hash>
# Example: agentmux review abc123
# Changes: ○ → ● and adds reviewer name
```

### View all commits
```bash
agentmux commits
# or: agentmux log
```

### Clear commit history
```bash
agentmux clear-commits
```

## Workflows

Install and use agent coordination workflows:

### List available workflows
```bash
agentmux workflow
```

### Install a workflow
```bash
agentmux workflow detailed-commits --install
```

### View workflow documentation
```bash
agentmux workflow detailed-commits
```

**Available workflows:**
- **detailed-commits** - Standard workflow for well-documented commits with full context (what, why, assumptions) and review coordination

## Quick Workflow

1. `agentmux list` - Check who's online
2. Work on task
3. `agentmux commit abc123 "@nui: fixed bug"` - Log your work
4. `agentmux send <agent> "message"` - Communicate
5. `agentmux review def456` - Review others' work
6. `agentmux commits` - Check recent work
7. `agentmux spawn opencode helper` - Add helpers if needed
