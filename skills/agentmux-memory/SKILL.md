---
name: agentmux-memory
description: AgentMux memory system and plan versioning for persisting expertise and managing multi-agent plans. Use for recording learnings, querying institutional knowledge, and creating versioned plans with memory linking.
triggers:
  - am memory
  - am plan
  - memory record
  - plan versioning
  - context injection
  - agentmux memory
---

# AgentMux Memory & Plans

Record expertise, query institutional knowledge, and manage versioned plans across sessions.

## Critical Constraints

**Do not proceed without loading context first.** Always run `am memory prime` at session start.

**Do not create plans without clear purpose.** Plans should solve specific coordination problems.

**Do not record vague memories.** Every record needs clear context, rationale, and actionable information.

## Session Start (Mandatory)

**Do not skip this step.** Load accumulated expertise at the beginning of every session:

```bash
am memory prime
```

This outputs:
- Conventions (project standards)
- Known Failures (problems encountered and solutions)
- Decisions (architectural choices and rationale)

## Memory System

### Record learnings
```bash
am memory record <category> --type <type> --title <title> --rationale <rationale>
```

**Do not record without all required fields.**

**Categories:**
- `decisions` - Architectural choices
- `conventions` - Coding standards
- `failures` - Problems and solutions

**Examples:**
```bash
am memory record decisions --type decision --title "Use REST" --rationale "Team familiarity"
am memory record conventions --type pattern --title "Async/Await" --rationale "Avoid callback hell"
am memory record failures --type bug --title "Race condition in auth" --rationale "Missing await on token validation"
```

### Query memory
```bash
am memory query --all
am memory query --all --plan <plan-name>
```

**Do not guess at institutional knowledge.** Query before making decisions.

## Plan Versioning

Create and manage versioned plans for multi-agent collaboration.

### Create a new plan
```bash
am plan init <name>
```

**Do not create vague plan names.** Use descriptive names like `api-design` or `auth-refactor`.

**Auto-prefixed with agent name:** `@nui/api-design`

### Commit plan version
```bash
am plan commit <name> -m "version note"
```

**Examples:**
```bash
am plan commit api-design -m "v1: REST approach"
am plan commit api-design -m "v2: Added GraphQL consideration"
```

### Link memory to plan
```bash
am plan link <name> --memory <memory-id>
```

**Connect decisions to supporting evidence.** Link relevant memory records to plan versions.

### View plan
```bash
am plan show <name>
am plan show <name> --with-memory
```

### View timeline
```bash
am plan timeline          # All plans
am plan timeline <name>   # Specific plan
```

## Context Injection (Optional)

**Use sparingly.** Only when message needs additional context.

```bash
agentmux send <agent> "message" --inject
```

**How it works:**
1. Extracts keywords from your message
2. Matches against memory records
3. Injects top 2 most relevant memories
4. **Default is OFF** - must explicitly use `--inject`

## Standard Workflow

**STEP 1: Prime memory at session start**
```bash
am memory prime
```

**STEP 2: Record learnings as you work**
```bash
am memory record <category> --type <type> --title <title> --rationale <rationale>
```

**STEP 3: Create plans for multi-agent work**
```bash
am plan init <name>
# Edit draft.md, then commit
am plan commit <name> -m "v1: description"
```

**STEP 4: Link supporting memories**
```bash
am plan link <name> --memory <id>
```

## Storage Structure

```
.agentmux/
├── plans/
│   ├── index.jsonl              # Plan registry
│   └── @nui/api-design/
│       ├── manifest.jsonl       # Version history
│       ├── v1-abc123.md        # Version files
│       └── current.md -> v1    # Symlink to latest
└── memory/
    └── [category]/
        └── [memory-records]
```

## Forbidden Operations (Do Not)

- **Do not skip `am memory prime`** at session start
- **Do not record memories without clear rationale**
- **Do not create plans without editing the draft**
- **Do not modify storage files directly** (use CLI commands)
- **Do not link memories that aren't relevant**
- **Do not overuse `--inject`** (adds noise)
- **Do not assume memory is comprehensive** (query to verify)

## Troubleshooting

**Memory prime shows nothing:**
- Normal for new projects
- Start recording learnings as you work

**Plan commit fails:**
- Ensure you've edited `draft.md`
- Check plan name spelling
- Verify plan exists: `am plan show <name>`

**Context injection not working:**
- Ensure memory records exist
- Check that keywords match
- Try more specific message
