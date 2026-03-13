---
name: code-commit-review-loop
description: Multi-agent code development workflow with coordinator-driven review. Coder makes atomic commits, pings coordinator after each change, reviewer provides critical feedback. Process ends in PR creation (not merge). Use for coordinated development requiring review before user approval.
status: active
triggers:
  - code review workflow
  - commit review loop
  - multi-agent development
  - coordinator review process
---

# Code Commit Review Loop

Coordinator-driven multi-agent development workflow using standard git. Coder implements, coordinator coordinates, reviewer validates. Ends in PR ready for user review.

## Critical Constraints

**Do not commit to main directly.** Always create feature branches.

**Do not merge to main.** Process ends in PR creation. Coordinator must ask user for merge approval.

**Do not proceed without coordinator routing.** All communication goes through coordinator (default: nui).

**Do not make monolithic commits.** Keep commits atomic and focused.

**Do not review without checking all changes first.** Reviewer must examine full context.

**Do not send feedback directly to coder.** Reviewer → Coordinator → Coder only.

## Roles

- **Coordinator** (default: nui): Routes all communication, assigns tasks, verifies changes, aggregates feedback
- **Coder** (sam/wit/spawned): Implements features, creates atomic commits, reports progress
- **Reviewer** (wit/sam/spawned): Provides critical feedback, validates assumptions, checks edge cases

## The Loop

```
User Request → Coordinator assigns → Coder implements
      ↑                                    ↓
User approves PR ← PR created ← Coder addresses feedback
      ↑                                    ↑
Coordinator aggregates ← Reviewer validates ← Coordinator routes
```

## Phase 1: Task Assignment

**Coordinator initiates with full context:**

```bash
agentmux send sam "@nui: Task assignment - Implement user authentication
Branch: feature/auth-endpoint
Requirements:
- POST /login endpoint with email/password
- JWT token generation (24h expiry)
- Password hashing with bcrypt
Context: New auth module, no existing user model
Constraints: Must be thread-safe, validate inputs
Start when ready, ping me after each commit or logical unit."
```

**Do not assign vague tasks.** Requirements must include: scope, constraints, branch name, success criteria.

## Phase 2: Development & Commit Reporting

**Coder creates branch and implements:**

```bash
# 1. Create branch
git checkout -b feature/auth-endpoint

# 2. Make atomic commits with detailed messages
git commit -m "feat(auth): Add User model with password validation

- Implements SQLAlchemy User model
- Adds email uniqueness constraint
- Password field with bcrypt hashing preparation
- Input validation: max 255 chars, required fields

Assumptions: SQLite for MVP, upgrade to PostgreSQL later"
```

**After each commit or 2-3 logical units, ping coordinator:**

```bash
# Single significant commit
agentmux send nui "@sam: Committed a1b2c3d - User model with validation. 
Context: Added SQLAlchemy model, email unique constraint, password field prep.
Next: Implement bcrypt hashing. Continuing?"

# Logical unit complete (2-3 commits)
agentmux send nui "@sam: Completed auth core (3 commits: a1b2c3d..c3d4e5f).
Context: User model, bcrypt hashing, password validation.
Ready for review or continue with JWT implementation?"
```

**Do not send commits without context.** Each ping must include:
- Commit hash(es)
- What changed
- Technical context/assumptions
- Next steps or readiness status

## Phase 3: Coordinator Verification

**Coordinator checks changes before routing:**

```bash
# Verify commits exist and look correct
git log --oneline feature/auth-endpoint | head -10
git show --stat a1b2c3d  # Check specific commit
```

**If changes look correct, assign to reviewer with full context:**

```bash
agentmux send wit "@nui: Review request for feature/auth-endpoint
Commits: a1b2c3d..c3d4e5f (3 commits)
Context: Implementing user auth per requirements: JWT, bcrypt, validation
Specific concerns: Thread safety, input validation edge cases
Coder: @sam
Please review critically and send feedback to me."
```

**Do not skip verification.** Coordinator must examine commits before assigning review.

## Phase 4: Parallel Development

**Coder continues next tasks while review happens:**

```bash
agentmux send nui "@sam: Starting JWT implementation while auth core is reviewed.
Will commit incrementally and ping with updates."
```

**Do not wait idly.** Coder should have next tasks ready from coordinator.

## Phase 5: Critical Review

**Reviewer examines changes thoroughly:**

```bash
# Check out and review
git fetch
git log --oneline origin/feature/auth-endpoint
git show a1b2c3d  # Examine each commit
git diff a1b2c3d..c3d4e5f  # View full change set
```

**Reviewer sends critical feedback to coordinator only:**

```bash
agentmux send nui "@wit: Review complete for feature/auth-endpoint

Issues found:
1. Race condition in User.create() - not thread-safe (line 42)
2. Missing input sanitization for email field
3. bcrypt rounds hardcoded at 10, should be configurable
4. No tests for password validation edge cases

Suggestions:
- Add @threading.lock decorator
- Use email.normalize() before validation
- Move bcrypt rounds to config
- Add tests for: empty password, unicode chars, max length

Overall: Needs changes before approval. Priority: Fix race condition first."
```

**Do not send vague reviews.** Critical feedback must include:
- Specific issues with line references
- Suggested fixes
- Priority ordering
- Overall assessment

## Phase 6: Feedback Distribution

**Coordinator confirms with reviewer if needed, then routes to coder:**

```bash
agentmux send sam "@nui: Review feedback from @wit for feature/auth-endpoint

Critical Issues (address first):
1. Race condition in User.create() - add threading lock
2. Missing email input sanitization

Improvements:
3. Make bcrypt rounds configurable
4. Add edge case tests

@wit's assessment: Needs changes. Priority order above.

Continue with fixes or questions?"
```

**Do not forward raw feedback.** Coordinator aggregates and prioritizes.

## Phase 7: Resolution Loop

**Coder addresses feedback:**

```bash
# Make fixes
git commit -m "fix(auth): Add thread safety to User.create()

- Adds @threading.lock decorator
- Prevents race condition on concurrent user creation
- Addresses reviewer feedback from @wit"

# Report fixes to coordinator
agentmux send nui "@sam: Fixed race condition (commit d4e5f6g). 
Context: Added threading lock to User.create().
Working on email sanitization next."
```

**Loop continues until reviewer approves:**

```bash
# Reviewer final approval to coordinator
agentmux send nui "@wit: Re-reviewed feature/auth-endpoint after fixes.
All critical issues resolved. Minor: consider adding docstrings.
Overall: APPROVED for PR creation."
```

## Phase 8: Create Pull Request

**Coordinator instructs coder to create PR:**

```bash
agentmux send sam "@nui: @wit approved feature/auth-endpoint.
Please create PR and send link."
```

**Coder creates PR:**

```bash
# Push branch
git push origin feature/auth-endpoint

# Create PR
gh pr create --title "feat(auth): Add user authentication endpoint" \
  --body "Implements POST /login with JWT tokens and bcrypt hashing.

Changes:
- User model with validation
- Password hashing with bcrypt
- JWT generation (24h expiry)
- Thread-safe implementation

Reviewed by: @wit
Closes: #[issue number]"
```

**Coder reports PR to coordinator:**

```bash
agentmux send nui "@sam: PR created: https://github.com/org/repo/pull/123
Branch: feature/auth-endpoint
Ready for user review."
```

## Phase 9: User Notification

**Coordinator notifies user (do not merge):**

```bash
# In status pane or via appropriate channel
"@user: PR ready for review - User authentication endpoint
URL: https://github.com/org/repo/pull/123
Branch: feature/auth-endpoint
Commits: 5 commits implementing JWT auth with bcrypt
Reviewed by: @wit (approved)
Coder: @sam

Please review and merge when ready."
```

**Process ends here.** User decides whether to merge.

## Example Session

**Coordinator assigns:**
```bash
agentmux send sam "@nui: Implement rate limiting middleware. Branch: feature/rate-limit. Requirements: 100 req/min per IP, Redis backend, configurable limits."
```

**Coder implements and reports:**
```bash
# Commits middleware setup
git commit -m "feat(rate-limit): Add Redis connection manager"
agentmux send nui "@sam: Committed a1b2c3d - Redis connection. Context: Using redis-py with connection pooling. Next: Implement limiter logic."

# Commits limiter logic (logical unit)
git commit -m "feat(rate-limit): Implement sliding window limiter"
git commit -m "feat(rate-limit): Add configurable limits via env vars"
agentmux send nui "@sam: Completed limiter core (2 commits: b2c3d4e..c3d4e5f). Context: Sliding window algorithm, env-based config. Ready for review or continue with IP extraction?"
```

**Coordinator routes to reviewer:**
```bash
agentmux send wit "@nui: Review feature/rate-limit commits b2c3d4e..c3d4e5f. Context: Redis-based rate limiting, 100 req/min target. Check: thread safety, Redis error handling."
```

**Reviewer provides feedback:**
```bash
agentmux send nui "@wit: Issues: 1) No Redis connection retry logic, 2) IP extraction vulnerable to spoofing. Suggestions: Add backoff retry, use X-Forwarded-For with validation."
```

**Coordinator routes to coder:**
```bash
agentmux send sam "@nui: @wit feedback: Add Redis retry logic and fix IP extraction. Priority: IP spoofing vulnerability first."
```

**Coder fixes and completes:**
```bash
# Fixes issues
git commit -m "fix(rate-limit): Add Redis retry with exponential backoff"
git commit -m "fix(rate-limit): Validate X-Forwarded-For header"
agentmux send nui "@sam: Fixed both issues (commits d4e5f6g..e5f6g7h). Context: Retry logic with backoff, IP validation against spoofing."
```

**Reviewer approves:**
```bash
agentmux send nui "@wit: Fixes verified. APPROVED for PR."
```

**Coder creates PR:**
```bash
git push origin feature/rate-limit
gh pr create --title "feat: Add Redis-based rate limiting"
agentmux send nui "@sam: PR #124 created."
```

**Coordinator notifies user:**
```bash
"@user: PR #124 ready - Rate limiting middleware. Reviewed and approved by @wit."
```

## Quick Reference

| Step | Who | Action | Message Format |
|------|-----|--------|----------------|
| Assign | Coordinator | Send task to coder | `@nui: Task - [description]. Branch: [name]. Requirements: [list]. Context: [details].` |
| Commit | Coder | Git commit + ping coordinator | `@coder: Committed [hash] - [what]. Context: [details]. Next: [plan]?` |
| Verify | Coordinator | Check commits | `git log`, `git show`, `git diff` |
| Route | Coordinator | Send to reviewer | `@nui: Review [branch] commits [range]. Context: [background]. Concerns: [list].` |
| Review | Reviewer | Examine + critical feedback | `@reviewer: Issues: [list]. Suggestions: [list]. Overall: [assessment].` |
| Distribute | Coordinator | Aggregate to coder | `@nui: Feedback from @reviewer: [summary]. Priority: [ordered list].` |
| Fix | Coder | Address + report | `@coder: Fixed [issue] (commit [hash]). Context: [how].` |
| Approve | Reviewer | Final approval | `@reviewer: APPROVED for PR.` |
| PR | Coder | Create PR + report | `@coder: PR #[num] created: [url]` |
| Notify | Coordinator | User notification | `@user: PR #[num] ready - [summary]. Reviewed by @reviewer.` |

## Forbidden Operations

- **Do not commit to main** - Always use feature branches
- **Do not merge to main** - Process ends in PR, user decides
- **Do not skip coordinator** - All routing through coordinator
- **Do not review without full context** - Check all commits first
- **Do not send direct feedback** - Reviewer → Coordinator → Coder only
- **Do not make large commits** - Keep atomic and focused
- **Do not report without context** - Every message needs technical details
- **Do not work without requirements** - Coordinator must provide clear scope

## Success Indicators

✅ Coder reports each commit with hash and context
✅ Coordinator verifies before routing to reviewer
✅ Reviewer provides specific line-level feedback
✅ Feedback prioritized by coordinator
✅ Coder addresses issues systematically
✅ Process ends in PR, not merge
✅ User receives clear PR summary

## Failure Patterns (Avoid)

❌ Coder makes 10 commits, reports only at end
❌ Coordinator routes without checking changes
❌ Reviewer says "LGTM" without specifics
❌ Coder and reviewer talk directly
❌ Large monolithic commits with mixed concerns
❌ Missing context in commit messages
❌ Coordinator merges without user approval
