---
name: agentmux
description: AgentMux multi-agent terminal commands for cross-agent messaging, spawning/killing agents, and status monitoring. Use when working with other agents in the tmux environment, sending messages between agents, managing agent lifecycle, or checking system status.
---

# AgentMux Commands

Multi-agent terminal multiplexer using tmux with 3 core agents (nui, sam, wit).

## Your Identity

**Before doing anything else**, check who you are:
```bash
agentmux whoami
```

You will see output like: `nui (opencode) @ /path/to/project`

This tells you your agent name (nui, sam, or wit) which you MUST use when signing messages.

## The Team

- **nui** (opencode) - Top-right pane
- **sam** (opencode) - Bottom-left pane  
- **wit** (claude) - Bottom-right pane
- **status** (monitor) - Top-left pane (read-only)

## How to Communicate with Other Agents

### Step 1: Check who is online
```bash
agentmux list
```

### Step 2: Send a message
**ALWAYS use this exact format:**
```bash
agentmux send <agent> "@<your-name>: your message here"
```

**Examples:**
- If you are nui: `agentmux send sam "@nui: Can you review my code?"`
- If you are sam: `agentmux send wit "@sam: I'm ready for testing"`
- If you are wit: `agentmux send nui "@wit: Found a bug in line 42"`

**IMPORTANT RULES:**
1. Always include `@<your-name>:` at the start of your message
2. Always use quotes around your message
3. Check responses before sending follow-up messages
4. Wait for the "✅ Message sent" confirmation

## Core Commands

### Send message to another agent
```bash
agentmux send <agent> "message"
# Example: agentmux send sam "@nui: Can you review my code?"
```
**You will see:** `✅ Message sent to sam`
**Recipient sees:** `📨 [@nui → @sam]: @nui: Can you review my code?`

### List all agents and their status
```bash
agentmux list
```

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

- `AGENTMUX_AGENT` - Your agent name (nui, sam, wit, or status)
- `AGENTMUX_PROJECT` - Project directory path

## Standard Agent Workflow

1. **Start of session:** Run `agentmux whoami` to confirm your identity
2. **Check team:** Run `agentmux list` to see who is online
3. **Coordinate work:** Use `agentmux send <agent> "@<you>: message"` to communicate
4. **Track progress:** Use `agentmux status` to see recent commits and messages
5. **Use git normally:** Make commits with standard git commands

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

## Memory System

Record and query expertise across sessions:

```bash
# Record learnings
am memory record decisions --type decision --title "Use REST" --rationale "Team familiarity"

# Query memory
am memory query --all

# Load at session start
am memory prime
```

## Plan Versioning

Create and manage versioned plans:

```bash
# Create a new plan
am plan init api-design

# Commit current plan as new version
am plan commit api-design -m "v1: REST approach"

# Show plan with linked memory
am plan show api-design --with-memory

# Show version history
am plan timeline api-design
```

## Context Injection (Optional)

Auto-inject relevant memory into messages:

```bash
agentmux send sam "What about auth?" --inject
```
