# 🌊 AgentMux

Minimal terminal multiplexer for AI agent collaboration - built in Rust.

## Why AgentMux?

You use multiple AI agents:
- **Kimi for planning** → Writes to `plan.md`
- **MiniMax for coding** → Reads `plan.md`, writes code
- **Claude Opus for review** → Reads everything, suggests improvements

**The problem:** Copy-pasting between terminal windows.

**The solution:** AgentMux - one window, multiple agents, shared context.

## Features

- 🖥️ **Vertical tabs** - See all agents at a glance
- 📝 **Shared context** - Agents read/write to common files
- 🔔 **Notifications** - Know when agents update shared files
- ⌨️ **Keyboard shortcuts** - Fast switching between agents
- ⚡ **Native performance** - Built in Rust, no Electron

## Quick Start

### One-Line Install

```bash
curl -fsSL https://agentmux.ai/install.sh | bash
```

### Create a Project

```bash
agentmux init myproject
cd myproject
```

### Start AgentMux

```bash
agentmux start
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | Next agent |
| `p` | Previous agent |
| `r` | Refresh shared context |
| `q` | Quit |

## Architecture

```
┌─────────────────────────────────────────┐
│           AgentMux (Rust)               │
├──────────┬──────────────────┬───────────┤
│  Sidebar │    Terminal      │  Shared   │
│  (Tabs)  │    (PTY)         │  Context  │
├──────────┼──────────────────┼───────────┤
│ 🟢 Kimi  │ $ opencode       │ 📄 plan   │
│ ⚪ Mini  │ > Working...     │ 📄 code   │
│ ⚪ Opus  │                  │ 💬 chat   │
└──────────┴──────────────────┴───────────┘
```

## Development

```bash
git clone https://github.com/dpbmaverick98/agentmux.git
cd agentmux
cargo build --release
./target/release/agentmux init test
./target/release/agentmux start
```

## License

MIT