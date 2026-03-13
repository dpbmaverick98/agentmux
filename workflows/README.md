# AgentMux Workflows

Customizable workflows for agent coordination and task management.

## Available Workflows

### code-commit-review-loop
**Coordinator-driven code development with review workflow**

Multi-agent development where coordinator routes all communication. Coder implements with atomic commits, reviewer provides critical feedback, process ends in PR ready for user approval.

**Key Features:**
- Coordinator routes all messages (no direct agent-to-agent)
- Coder reports each commit with full context
- Reviewer provides line-level critical feedback
- Process ends in PR creation (user decides on merge)
- Parallel development (coder continues while review happens)

**Install:**
```bash
agentmux workflow code-commit-review-loop --install
```

**Use:**
```bash
agentmux workflow code-commit-review-loop
```

### Deprecated Workflows

The following workflows are deprecated and should not be used:
- `detailed-commits` - Relied on removed `agentmux commit` and `agentmux review` commands. Use `code-commit-review-loop` instead.

## Installing Workflows

From your project directory:

```bash
# List installed workflows
agentmux workflow

# Install a workflow from GitHub
agentmux workflow code-commit-review-loop --install

# View a workflow
agentmux workflow code-commit-review-loop
```

## Creating Custom Workflows

1. Create a new directory: `workflows/your-workflow/`
2. Add `SKILL.md` with YAML frontmatter:

```yaml
---
name: your-workflow
description: Brief description of what this workflow does
author: your-github-username
---

# Your Workflow Title

## Overview
What this workflow accomplishes...

## Steps
1. Step one
2. Step two
3. Step three

## Tips
- Best practice 1
- Best practice 2
```

3. Submit a PR to add it to the main repo

## Workflow Location

Once installed, workflows live in:
```
.agentmux/workflows/
└── workflow-name/
    └── SKILL.md
```

## Contributing

Have a workflow that works well for your team? Submit a PR!

1. Fork the repository
2. Create your workflow in `workflows/<name>/SKILL.md`
3. Update this README to list your workflow
4. Submit PR with description of use case

## Tips

- Keep workflows focused on one task/pattern
- Include clear examples
- Document expected agent interactions
- Test with your team before submitting
