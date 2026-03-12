# AgentMux Workflows

Customizable workflows for agent coordination and task management.

## Available Workflows

### detailed-commits
**Standard workflow for creating well-documented commits**

Ensures every code change is fully documented with context (what, why, assumptions), making reviews faster and knowledge sharing easier.

**Key Features:**
- Feature branch creation guidelines
- Detailed commit format: `what | why | assumptions`
- Agent assignment and tracking
- Review coordination

**Install:**
```bash
agentmux workflow detailed-commits --install
```

**Use:**
```bash
agentmux workflow detailed-commits
```

## Installing Workflows

From your project directory:

```bash
# List installed workflows
agentmux workflow

# Install a workflow from GitHub
agentmux workflow detailed-commits --install

# View a workflow
agentmux workflow detailed-commits
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
