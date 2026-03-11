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

## Creating Pull Requests

JJ and git maintain separate commit histories. To avoid "no common history" errors when creating PRs, always create a git branch first:

### The Complete Workflow

```bash
# 1. Create git branch first (ensures proper ancestry with main)
git checkout -b feature-name

# 2. Make your changes...

# 3. Create JJ change
jj new -m "@$AGENTMUX_AGENT: description"

# 4. Create JJ bookmark
jj bookmark create feature-name

# 5. Push to remote
jj git push

# 6. Create PR
gh pr create --title "..." --body "..."
```

### Why This Works

Creating the git branch first ensures:
- Branch shares ancestry with `main`
- GitHub recognizes common history
- No "entirely different commit history" errors
- Clean PR creation with `gh pr create`

### What NOT To Do

❌ DON'T: Create JJ bookmark without git branch first
```bash
jj new -m "@nui: feature"
jj bookmark create feature  # History diverges from main!
jj git push                 # Pushes with no common ancestor
gh pr create                # Fails: no common history
```

## Tips

- Commit often with descriptive messages
- Use @agent tags for accountability
- Check `jj log` to see team progress
- Status pane refreshes every 3 seconds
