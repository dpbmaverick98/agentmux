---
name: agentmux-core
description: Core AgentMux commands for tmux-based agent coordination. Use ONLY for identity verification, cross-agent messaging, and agent lifecycle management. Do not use for external communications or non-tmux terminals.
triggers:
  - agentmux
  - am
  - cross-agent coordination
  - tmux messaging
---

# AgentMux Core

Multi-agent coordination in tmux. 3 core agents: **nui** (top-right), **sam** (bottom-left), **wit** (bottom-right), plus **status** (read-only monitor).

## Critical Constraints

**Do not communicate with other agents via natural language narration alone.**

When you need to send a message to another agent, you MUST execute the proper bash command. Do not say "I will tell sam..." or "Let me ask wit..." without immediately following with the executable command.

**Do not proceed with any AgentMux operation until:**
1. Identity is verified (`agentmux whoami`)
2. Recipients exist (`agentmux list`)

## Identity Verification (Mandatory First Step)

**Do not skip this step.** Before any coordination:

```bash
agentmux whoami
# Output: nui (opencode) @ /path/to/project
```

This tells you which agent you are. Use this name when signing messages.

## Messaging Protocol (Mandatory Execution)

When the user or context requires communicating with another agent:

**STEP 1: Verify recipient exists**
```bash
agentmux list
```

**STEP 2: Execute the send command immediately**
```bash
agentmux send <agent> "Your actual message here with context"
```

**Do not separate narration from execution.** Do not write prose explaining what you will say before saying it. Execute the command first, then describe what was sent if necessary.

### WRONG:
```
"I'll ask sam to review the code. Hey sam, can you check line 42?"
```

### CORRECT:
```bash
agentmux send sam "Need code review on auth.py line 42 - JWT validation looks off"
```
```
Sent request to sam for code review.
```

## Required Message Format

**Do not send vague or context-free messages.** Every `agentmux send` must include:
- **Context**: What file/feature you're working on
- **Specific ask**: Exact action needed
- **Blocking status**: Is this urgent/blocking?

## Core Commands

### Messaging (Always execute, never narrate)
```bash
agentmux send <agent> "message with context and specific request"
```

### Status checks (Execute before sending)
```bash
agentmux whoami      # Who am I (mandatory first)
agentmux list        # Who is online
agentmux status      # Recent activity
```

### Lifecycle management
```bash
# Spawn in new pane (default) - splits last pane, auto-rebalances layout
agentmux spawn <harness> <name>
agentmux spawn opencode helper
agentmux spawn claude reviewer

# Spawn in new window/tab instead
agentmux spawn <harness> <name> --tab

agentmux kill <agent>              # Remove specific agent
agentmux stop                      # Kill all (confirm first)
```

## Standard Coordination Workflow

**Do not skip steps or change order:**

1. `agentmux whoami` → Know your identity
2. `agentmux list` → Verify recipient is online
3. `agentmux send <agent> "[Context] Specific request"` → Execute immediately
4. Wait for response or check `agentmux status`

## Environment Variables

- `AGENTMUX_AGENT` - Your agent name (nui, sam, wit)
- `AGENTMUX_PROJECT` - Project directory path
- `AGENTMUX_SESSION` - Tmux session name

## Forbidden Operations (Do Not)

- **Do not send messages to status agent** (read-only monitor)
- **Do not narrate messages in prose** without executing `agentmux send`
- **Do not use `agentmux stop` unless user explicitly confirms**
- **Do not send empty or context-free messages** like "help" or "check this"
- **Do not use removed commands**: commit, review, commits, clear-commits

## Quick Reference

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `agentmux whoami` | Verify identity | Every session start |
| `agentmux list` | Check online agents | Before messaging |
| `agentmux send` | Send message | Execute immediately |
| `agentmux status` | View activity | Check progress |
| `agentmux spawn` | Add helper | When needed |
| `agentmux kill` | Remove agent | When done |
| `agentmux stop` | End session | Confirm first |
