---
name: agentmux-workflow
description: AgentMux workflow management for installing and viewing coordination workflows. Use when agents need to install reusable coordination patterns or learn about available workflows.
triggers:
  - agentmux workflow
  - am workflow
  - install workflow
  - coordination workflow
---

# AgentMux Workflow

Install and manage reusable coordination patterns for multi-agent teams.

## Critical Constraints

**Do not assume workflows are installed.** Check availability first before referencing specific workflows.

**Do not install workflows blindly.** Read documentation first to understand if it fits your use case.

**Do not use deprecated workflows.** If a workflow is marked deprecated, find an alternative approach.

## When to Use Workflows

**Use workflows when:**
- Team needs consistent coordination patterns
- Repeated tasks need standardized approaches
- New agents need guidance on team processes

**Do not use workflows when:**
- Simple ad-hoc messaging is sufficient
- The task is one-time only
- Team prefers informal coordination

## Workflow Commands

### List available workflows
```bash
agentmux workflow
```

**Do not skip this step.** Always check what workflows are available before installing.

### Install a workflow
```bash
agentmux workflow <name> --install
```

**Examples:**
```bash
agentmux workflow detailed-commits --install
```

### View workflow documentation
```bash
agentmux workflow <name>
```

**Do not install without reading first.** View documentation to understand:
- What problem it solves
- What constraints it imposes
- Whether it fits your team

## Standard Workflow

**STEP 1: Discover available workflows**
```bash
agentmux workflow
```

**STEP 2: Read documentation before installing**
```bash
agentmux workflow <name>
```

**STEP 3: Install if appropriate**
```bash
agentmux workflow <name> --install
```

**STEP 4: Follow workflow guidelines**
- Once installed, follow the workflow's specific coordination patterns
- Share workflow knowledge with team members

## Workflow Status Indicators

- **Active**: Currently maintained and supported
- **Deprecated**: No longer maintained, avoid using
- **Experimental**: New, may change, use with caution

## Deprecated Workflows

**Do not use deprecated workflows.** These relied on removed commands:
- `detailed-commits` - Relied on `agentmux commit` and `agentmux review` (removed)

Use standard git commands instead.

## Forbidden Operations (Do Not)

- **Do not install workflows without reading docs first**
- **Do not force workflows on unwilling teams**
- **Do not modify installed workflow files directly**
- **Do not assume all agents have same workflows installed**
- **Do not skip the list step** before installing

## Troubleshooting

**Workflow not found:**
- Run `agentmux workflow` to see available options
- Check spelling of workflow name

**Installation fails:**
- Verify internet connectivity
- Check if workflow is already installed
- Look for error messages in output

**Workflow conflicts:**
- Some workflows may conflict with each other
- Read documentation for compatibility notes
- Uninstall conflicting workflows if needed
