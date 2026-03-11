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

## Critical: Use JJ, Not Git

**⚠️ ALWAYS use JJ commands. Never use `git commit` directly.**

JJ is colocated with git. Using `git commit` creates git commits that JJ doesn't track, causing your changes to disappear from the status pane where other agents can see them.

### The AgentMux Workflow

**For simple commits (no PR needed):**
```bash
# 1. Make changes
# 2. Create JJ change
jj new -m "@$AGENTMUX_AGENT: what you did"

# 3. Push to GitHub
jj git push
```

**For pull requests (create git branch first):**
```bash
# 1. Create git branch first (ensures proper ancestry with main)
git checkout -b feature-name

# 2. Make changes
# 3. Create JJ change
jj new -m "@$AGENTMUX_AGENT: description"

# 4. Create JJ bookmark
jj bookmark create feature-name

# 5. Push to remote
jj git push

# 6. Create PR
gh pr create --title "..." --body "..."
```

### Why Create Git Branch First for PRs?

JJ and git maintain separate commit histories. Creating a git branch first ensures:
- Branch shares ancestry with `main`
- GitHub recognizes common history
- No "entirely different commit history" errors
- Clean PR creation with `gh pr create`

### Common Mistakes to Avoid

❌ **DON'T use git commit:** `git add . && git commit -m "message"`  
✅ **DO use JJ:** `jj new -m "@nui: message"`

❌ **DON'T create JJ bookmark without git branch first:**
```bash
jj new -m "@nui: feature"
jj bookmark create feature  # History diverges from main!
jj git push                 # Pushes with no common ancestor
gh pr create                # Fails: no common history
```

The status pane shows JJ working copy changes (refreshes every 3 seconds). If you use git directly, other agents won't see your work in progress.

## Tips

- Create JJ changes often with descriptive messages
- Use @agent tags for accountability
- Check `jj log` to see team progress
- Status pane refreshes every 3 seconds
- If you accidentally use git, run `jj new` to capture the state in JJ
