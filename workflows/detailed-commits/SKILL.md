---
name: detailed-commits
description: Standard workflow for creating well-documented commits with full context (what, why, assumptions) to enable easy code review. Main agent assigns work, tracks progress, and coordinates reviews.
author: dpbmaverick98
---

# Detailed Commits Workflow

## Overview

This workflow ensures every code change is fully documented with context, making reviews faster and knowledge sharing easier.

## When to Use

- Starting a new feature or task
- Any work that needs review
- Complex changes that need explanation

## Workflow Steps

### Step 1: Create Feature Branch

Before starting work:

```bash
git checkout -b feature/<brief-description>
# Example: git checkout -b feature/add-auth-endpoint
```

Then log the start:
```bash
agentmux commit $(git rev-parse --short HEAD) "@nui: Starting feature/add-auth-endpoint | New authentication system | Assuming JWT tokens"
```

### Step 2: Make Atomic Commits

**Every commit must answer three questions:**

1. **WHAT** - What changed? (1 sentence)
2. **WHY** - Why was it needed? (Business/technical reason)
3. **ASSUMPTIONS** - What did you assume? (Design decisions, constraints)

**Commit Format:**
```bash
agentmux commit <hash> "@agent: what | why | assumptions"
```

**Good Examples:**
```bash
agentmux commit abc123 "@minimax: Add password hashing | Security requirement for user data | Using bcrypt with 12 rounds"
agentmux commit def456 "@minimax: Implement login endpoint | Allow users to authenticate | Assuming email is unique identifier"
agentmux commit ghi789 "@minimax: Add JWT token generation | Maintain session state | Assuming 24h token expiry is acceptable"
```

**Bad Examples (avoid):**
```bash
agentmux commit abc123 "@minimax: work on auth"                    # Missing why and assumptions
agentmux commit def456 "@minimax: fixed stuff"                     # Too vague
agentmux commit ghi789 "@minimax: Add authentication system"       # Too broad, not atomic
```

### Step 3: Main Agent Tracks Progress

As commits pile up, monitor with:

```bash
agentmux commits
# Shows:
# ○ abc123 @minimax: Add password hashing | Security requirement | Using bcrypt
# ○ def456 @minimax: Implement login endpoint | Allow authentication | Email is unique
```

**When to request review:**
- After 3-5 commits
- When a logical unit is complete
- Before switching contexts

### Step 4: Request Review

Main agent assigns review:

```bash
agentmux send wit "Please review commits abc123, def456, ghi789 on feature/add-auth-endpoint branch. Focus on security assumptions."
```

### Step 5: Reviewer Process

**Claude (or reviewer agent) should:**

1. Check out the branch:
   ```bash
   git checkout feature/add-auth-endpoint
   ```

2. Review each commit:
   ```bash
   agentmux commits
   git show abc123
   git show def456
   ```

3. Mark as reviewed:
   ```bash
   agentmux review abc123
   agentmux review def456
   ```

4. Leave feedback:
   ```bash
   agentmux send minimax "Review complete. The bcrypt assumption is good, but consider adding rate limiting. Approving with minor suggestions."
   ```

5. Push review to GitHub (if needed):
   ```bash
   gh pr review --approve --body "LGTM, minor suggestion on rate limiting"
   ```

### Step 6: Completion

When all commits reviewed:

```bash
agentmux commits
# Shows:
# ● abc123 @minimax: Add password hashing | Security requirement | Using bcrypt (wit)
# ● def456 @minimax: Implement login endpoint | Allow authentication | Email is unique (wit)
```

Branch is ready for merge.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `agentmux commit <hash> "@agent: what \| why \| assumptions"` | Log detailed commit |
| `agentmux review <hash>` | Mark commit as reviewed |
| `agentmux commits` | Show all commits |
| `agentmux clear-commits` | Reset commit tracking (use carefully) |

## Tips

- **Atomic commits**: Each commit should do one thing
- **Clear assumptions**: State the obvious - what seems clear to you may not be to reviewers
- **Business context**: Always explain why, not just what
- **Review early**: Don't wait until 20 commits pile up
- **Tag properly**: Always use @agent prefix for accountability

## Example Session

```bash
# Main agent (nui) assigns work
agentmux send minimax "Implement user authentication following detailed-commits workflow. Create feature/auth branch and make atomic commits."

# Minimax works and commits
agentmux commit a1b2c3d "@minimax: Add User model with password field | Store credentials securely | Assuming max 255 char passwords"
agentmux commit b2c3d4e "@minimax: Add bcrypt hashing | Prevent plain text passwords | Using bcrypt 5.0+ with async API"
agentmux commit c3d4e5f "@minimax: Create /login endpoint | Allow user authentication | Returns JWT on success, 401 on failure"

# Main agent sees progress
agentmux commits
# ○ a1b2c3d @minimax: Add User model...
# ○ b2c3d4e @minimax: Add bcrypt hashing...
# ○ c3d4e5f @minimax: Create /login endpoint...

# Main agent assigns review
agentmux send wit "Please review auth commits a1b2c3d, b2c3d4e, c3d4e5f on feature/auth"

# Wit reviews
agentmux review a1b2c3d
agentmux review b2c3d4e
agentmux review c3d4e5f

# Wit provides feedback
agentmux send minimax "Auth implementation looks solid. Consider adding refresh tokens in future. All commits approved."

# Minimax pushes to GitHub
git push origin feature/auth
gh pr create --title "Add user authentication" --body "Implements login with JWT tokens"
```

## Why This Matters

**Without detailed commits:**
- Reviewer: "What does this do?"
- Author: "It handles auth"
- Reviewer: "But why this approach?"
- 10 back-and-forth messages later...

**With detailed commits:**
- Reviewer reads: "Add bcrypt hashing | Security requirement | Using bcrypt 5.0+ with async API"
- Reviewer: "LGTM, assumptions are clear"
- Approved in 1 message

## Troubleshooting

**Forgot to use detailed format?**
Log a new commit explaining the previous ones:
```bash
agentmux commit newhash "@minimax: Summary of commits a1b2c3d-b2c3d4e | User auth feature | See individual commits for details"
```

**Need to amend a commit message?**
```bash
# In git
git commit --amend -m "New message"
# Then log with agentmux
agentmux commit newhash "@minimax: [amended] what | why | assumptions"
```
