# Shared Context Writer Skill

You have access to a shared context directory that all agents can read and write to.

## Location

The shared context is at:
- Environment variable: `$AGENTMUX_SHARED_DIR`
- Default: `~/.agentmux/shared/{project}/`

## How to Share Your Work

When you complete significant work, write a summary to the shared context:

### Option 1: Write to progress.md

Create or append to `progress.md`:

```markdown
## [Your Name] - Task Completed

**What I did:**
- Implemented user authentication API
- Added JWT token validation

**Key decisions:**
- Used bcrypt for password hashing
- Token expiry set to 24 hours

**Files modified:**
- src/auth.ts
- src/middleware/jwt.ts

**Next steps:**
- @minimax-coder Please implement the frontend login form
- @opus-reviewer Please review the auth implementation
```

### Option 2: Update plan.md

If you're the planner, update the plan:

```markdown
# Project Plan

## Phase 1: API Design ✅
Completed by @kimi-planner

## Phase 2: Implementation 🔄
In progress by @minimax-coder

## Phase 3: Review ⏳
Waiting for @opus-reviewer
```

## @Mention Convention

Use @mentions to notify other agents:

- `@kimi-planner` - The planning agent
- `@minimax-coder` - The coding agent  
- `@opus-reviewer` - The review agent

Example:
```
@minimax-coder I've updated the API spec in plan.md. Ready for implementation!
```

## Reading Context

Always check shared context before starting work:

```bash
# Read the current plan
cat $AGENTMUX_SHARED_DIR/plan.md

# Read recent progress
cat $AGENTMUX_SHARED_DIR/progress.md

# Read mentions
cat $AGENTMUX_SHARED_DIR/mentions.md
```

## Best Practices

1. **Write frequently** - Don't wait until the end
2. **Be specific** - Include file names and line numbers
3. **Use @mentions** - Notify the next agent in the chain
4. **Keep it concise** - Other agents need to scan quickly
5. **Update status** - Use emojis ✅ 🔄 ⏳ to show progress
