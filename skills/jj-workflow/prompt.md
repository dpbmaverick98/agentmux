# Jujutsu Workflow for AgentMux

You are working within an AgentMux project that uses **Jujutsu (jj)** for version control and multi-agent collaboration.

## What is Jujutsu?

Jujutsu is a version control system that makes multi-agent collaboration easier:
- **Changes** are lightweight (like branches but better)
- **Automatic rebasing** - your work stays up to date automatically
- **Conflicts** are tracked separately and can be resolved collaboratively

## Your Workspace

You have your own **jj change** for your work:
- Change ID: Will be assigned when you start
- Description: @<your-name> workspace

## Available Commands

### Check Status
```bash
jj status
```

### See All Changes
```bash
jj log
```

### Update Your Change Description
```bash
jj describe -m "What you're working on"
```

### View Changes You Made
```bash
jj diff
```

### Check for Conflicts
```bash
# Look for 'conflict' in status
jj status
```

## Communication Protocol

### Sending Messages to Other Agents

Use `agentmux send` to communicate:

```bash
# Send a message to minimax
agentmux send minimax "Please implement the auth API per plan.md"

# Send a message to claude
agentmux send claude "Ready for review in src/auth.rs"

# Send a message to kimi
agentmux send kimi "Need clarification on step 3 of the plan"
```

The message will:
1. Appear in minimax's terminal (literally typed in)
2. Be logged to mentions.md
3. Show a notification badge

### Receiving Messages

When you receive a message:
1. You'll see it appear in your terminal
2. Read it and respond via agentmux send
3. Or acknowledge with a jj describe update

## Workflow

### 1. Start Working

Check the current state:
```bash
jj status
cat $AGENTMUX_SHARED_DIR/plan.md
cat $AGENTMUX_SHARED_DIR/mentions.md
```

### 2. Make Changes

Work normally. Your changes are automatically tracked in your jj change.

### 3. Share Progress

Update progress.md:
```bash
cat >> $AGENTMUX_SHARED_DIR/progress.md << 'EOF'
## [<Your Name>] - Task Update

**What I did:**
- Implemented X feature
- Fixed Y bug

**Files modified:**
- src/feature.rs

**Next steps:**
- @<other-agent> Please review
EOF
```

### 4. Hand Off Work

When done, notify the next agent:
```bash
agentmux send <next-agent> "Task complete. Check progress.md and src/feature.rs"
jj describe -m "Complete: Implemented X feature"
```

## Conflict Resolution

If you encounter conflicts:

1. **Check conflict status:**
```bash
jj status
```

2. **See conflicting files:**
```bash
jj diff
```

3. **Resolve (if assigned to you):**
```bash
jj resolve <file>
# Edit the file to fix conflicts
jj describe -m "Resolved: merged both approaches"
```

4. **Notify others:**
```bash
agentmux send @all "Resolved conflict in <file>"
```

## Best Practices

1. **Describe your work frequently**
   ```bash
   jj describe -m "WIP: implementing auth API"
   ```

2. **Check mentions.md before starting**
   ```bash
   cat $AGENTMUX_SHARED_DIR/mentions.md
   ```

3. **Use @mentions in shared files**
   - Write `@minimax please review` in progress.md
   - Other agents will see it when they check the file

4. **Keep changes small and focused**
   - One task per change
   - Easier to review and merge

5. **Communicate proactively**
   - Don't wait for others to ask
   - Send updates via agentmux send
   - Update progress.md regularly

## Environment Variables

Available in your terminal:
- `$AGENTMUX_SHARED_DIR` - Path to shared context files
- `$AGENTMUX_AGENT_NAME` - Your agent name (kimi/minimax/claude)
- `$AGENTMUX_PROJECT` - Project name

## Emergency Commands

If something goes wrong:
```bash
# See what you've changed
jj diff

# Undo last change (be careful!)
jj undo

# Check all changes in the system
jj log --all

# Get help
jj --help
```