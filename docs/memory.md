# AgentMux Memory System

Lightweight memory system for AgentMux - structured expertise management for multi-agent workflows.

## Status: ✅ Production Ready

## Quick Start

```bash
# Initialize (one-time per project)
am memory init

# At session start - load context
am memory prime

# Record learnings before finishing
am memory record project --type convention "Use Bun runtime"

# Query anytime
am memory query --all
```

## Commands

| Command | Description |
|---------|-------------|
| `am memory init` | Initialize storage with default domains |
| `am memory add <domain>` | Add new expertise domain |
| `am memory record <domain> [content]` | Record expertise entry |
| `am memory query [domain]` | Query expertise records |
| `am memory prime [domains...]` | Generate agent context |
| `am memory status` | Show record counts |

## Record Types

| Type | Required Fields | Example |
|------|-----------------|---------|
| `convention` | content | "Use Bun runtime for TypeScript" |
| `failure` | description, resolution | merge conflict → Check agentmux commits first |
| `decision` | title, rationale | JSONL storage: Git-friendly |

## Options

### record
- `--type <type>` - convention, failure, decision (default: convention)
- `--classification <level>` - foundational, tactical, observational (default: tactical)
- `--description <text>` - description for failure
- `--resolution <text>` - resolution for failure
- `--title <text>` - title for decision
- `--rationale <text>` - rationale for decision
- `--tags <tags>` - comma-separated tags
- `--dry-run` - preview without writing
- `--force` - force record even if duplicate

### query
- `--type <type>` - filter by record type
- `--classification <level>` - filter by classification
- `--all` - show all domains

### prime
- `--compact` - condensed output (default)
- `--full` - include metadata
- `--exclude <domains...>` - domains to exclude
- `[domains...]` - specific domains to include

## Storage

```
.agentmux/
├── expertise/
│   ├── project.jsonl
│   ├── tasks.jsonl
│   └── decisions.jsonl
└── config.json
```

## Record Schema

```json
{
  "type": "convention",
  "content": "Use Bun runtime for TypeScript",
  "classification": "tactical",
  "recorded_at": "2026-03-11T14:58:27.630Z",
  "recorded_by": "sam",
  "id": "am-741fd0"
}
```

## Agent Integration

Add to agent startup (CLAUDE.md):
```bash
# At session start
am memory prime
```

## Design Decisions

- **JSONL storage**: Git-friendly, no merge conflicts
- **Atomic writes**: temp→rename for crash safety
- **Custom am- ID prefix**: Distinguishes from mulch (mx-)
- **recorded_by field**: Captures AGENTMUX_AGENT env var
