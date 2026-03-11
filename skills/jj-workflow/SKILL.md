---
name: jj-workflow
description: JJ (Jujutsu) version control workflow for multi-agent collaboration with automatic change tracking, mutable history, and agent tagging conventions. Use when creating commits, viewing history, or managing code changes in the AgentMux environment.
---

# JJ Workflow

Git-compatible version control with automatic tracking and mutable history.

## Core Commands

### Create a change
```bash
jj new -m "@$AGENTMUX_AGENT: description"

# Examples:
jj new -m "@nui: Designed auth API"
jj new -m "@sam: Implemented login endpoint"
```

### View changes
```bash
jj status              # Current state
jj diff                # Uncommitted changes
jj log                 # Commit history
```

### Update change description
```bash
jj describe -m "@$AGENTMUX_AGENT: updated - what changed"
```

## Agent Tagging Convention

Always use @agent prefix:
- `@nui:` - nui's work
- `@sam:` - sam's work
- `@wit:` - wit's work
- `@name:` - spawned agents

## Navigation

```bash
jj prev                # Previous change
jj next                # Next change
jj checkout <rev>     # Jump to revision
jj abandon <rev>      # Delete change
```

## JJ vs Git

- **No staging area** - Auto-tracked changes
- **Mutable history** - Edit commits anytime
- **Auto snapshots** - Work is saved as you edit
- **Better conflicts** - Multiple heads allowed

## Tips

- Commit often with descriptive messages
- Use @agent tags for accountability
- Check `jj log` to see team progress
- Status pane refreshes every 3 seconds
