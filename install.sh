#!/bin/bash
set -e

# AgentMux One-Liner Installer
# Supports: macOS, Linux (apt, dnf, yum)
# Usage: curl -fsSL https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/install.sh | bash

echo "🔧 AgentMux Installer"
echo "====================="
echo ""

# Detect available package manager
PKG_MANAGER=""
if command -v brew &> /dev/null; then
    PKG_MANAGER="brew"
    echo "Using: Homebrew"
elif command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
    echo "Using: apt (Debian/Ubuntu)"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    echo "Using: dnf (Fedora/RHEL 8+)"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    echo "Using: yum (RHEL/CentOS)"
else
    echo "⚠️  No package manager found (brew, apt, dnf, or yum)"
    echo "   Will try to install via direct methods..."
fi

echo ""
echo "Checking dependencies..."

# Function to check if a command exists
check_installed() {
    command -v "$1" &> /dev/null
}

# Install tmux
if check_installed tmux; then
    echo "  ✓ tmux already installed"
else
    echo "  → Installing tmux..."
    if [[ "$PKG_MANAGER" == "brew" ]]; then
        brew install tmux
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        sudo apt-get update && sudo apt-get install -y tmux
    elif [[ "$PKG_MANAGER" == "dnf" ]]; then
        sudo dnf install -y tmux
    elif [[ "$PKG_MANAGER" == "yum" ]]; then
        sudo yum install -y tmux
    else
        echo "❌ tmux is required but no package manager available"
        echo "   Please install tmux manually:"
        echo "   - Debian/Ubuntu: sudo apt-get install tmux"
        echo "   - RHEL/CentOS: sudo yum install tmux"
        exit 1
    fi
fi

# Install bun
if check_installed bun; then
    echo "  ✓ bun already installed"
else
    echo "  → Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    # Source bun for this session
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Install claude
if check_installed claude; then
    echo "  ✓ claude already installed"
else
    echo "  → Installing claude..."
    npm install -g @anthropic-ai/claude-cli
fi

# Install opencode
if check_installed opencode; then
    echo "  ✓ opencode already installed"
else
    echo "  → Installing opencode..."
    bun add -g opencode-ai
fi

echo ""
echo "📦 Installing AgentMux..."

# Download pre-built AgentMux directly from GitHub
echo "  → Downloading AgentMux..."
mkdir -p "$HOME/.local/bin"
curl -fsSL "https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/dist/index.js" \
  -o "$HOME/.local/bin/agentmux"
chmod +x "$HOME/.local/bin/agentmux"
echo "  ✓ AgentMux downloaded to ~/.local/bin/agentmux"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  Please add ~/.local/bin to your PATH:"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "   Add this to your ~/.bashrc or ~/.zshrc"
fi

echo ""
echo "📚 Installing AgentMux skills to ~/.claude/skills/..."
echo ""

# Install skills globally for Claude
mkdir -p "$HOME/.claude/skills/agentmux-core"
mkdir -p "$HOME/.claude/skills/agentmux-workflow"
mkdir -p "$HOME/.claude/skills/agentmux-memory"

# Download skill files from GitHub
echo "  → Downloading agentmux-core skill..."
curl -fsSL "https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/skills/agentmux-core/SKILL.md" \
  > "$HOME/.claude/skills/agentmux-core/SKILL.md"
echo "  ✓ agentmux-core skill installed"

echo "  → Downloading agentmux-workflow skill..."
curl -fsSL "https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/skills/agentmux-workflow/SKILL.md" \
  > "$HOME/.claude/skills/agentmux-workflow/SKILL.md"
echo "  ✓ agentmux-workflow skill installed"

echo "  → Downloading agentmux-memory skill..."
curl -fsSL "https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/skills/agentmux-memory/SKILL.md" \
  > "$HOME/.claude/skills/agentmux-memory/SKILL.md"
echo "  ✓ agentmux-memory skill installed"

echo ""
echo "✅ AgentMux installed successfully!"
echo ""

# Initialize in current directory if not already
cd "$OLDPWD" || exit
if [[ ! -d ".agentmux" ]]; then
    echo "🌊 Initializing AgentMux in current directory..."
    "$HOME/.local/bin/agentmux" init
fi

# Start AgentMux
echo ""
echo "🚀 Starting AgentMux..."
echo ""

# Check if we're in an interactive terminal
if [ -t 0 ] && [ -t 1 ]; then
    # Interactive terminal - attach normally
    "$HOME/.local/bin/agentmux" start
else
    # Non-interactive (piped from curl, container, etc.)
    # Don't auto-start, just print instructions
    echo "Non-interactive mode detected."
    echo ""
    echo "✅ AgentMux is installed and ready!"
    echo ""
    echo "To start the 4-pane environment, run:"
    echo "  agentmux start"
    echo ""
    echo "This will create a tmux session with 4 panes:"
    echo "  - Status (top-left)"
    echo "  - Kimi (top-right)"
    echo "  - Minimax (bottom-left)"
    echo "  - Claude (bottom-right)"
fi
