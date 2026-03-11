#!/bin/bash
set -e

# AgentMux One-Liner Installer for macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/agentmux/main/install.sh | bash

echo "🔧 AgentMux Installer"
echo "====================="
echo ""

# Check for macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This installer currently only supports macOS"
    exit 1
fi

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install it first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "Checking dependencies..."

# Function to check if a command exists
check_installed() {
    command -v "$1" &> /dev/null
}

# Install jj (via Homebrew)
if check_installed jj; then
    echo "  ✓ jj already installed"
else
    echo "  → Installing jj..."
    brew install jj
fi

# Install tmux (via Homebrew)
if check_installed tmux; then
    echo "  ✓ tmux already installed"
else
    echo "  → Installing tmux..."
    brew install tmux
fi

# Install bun (via official installer)
if check_installed bun; then
    echo "  ✓ bun already installed"
else
    echo "  → Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    # Source bun for this session
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Install claude (via npm)
if check_installed claude; then
    echo "  ✓ claude already installed"
else
    echo "  → Installing claude..."
    npm install -g @anthropic-ai/claude-cli
fi

# Install opencode (via npm)
if check_installed opencode; then
    echo "  ✓ opencode already installed"
else
    echo "  → Installing opencode..."
    npm install -g opencode
fi

echo ""
echo "📦 Installing AgentMux..."

# Check if we're already in the agentmux repo
if [[ -f "$(pwd)/package.json" ]] && grep -q "agentmux" "$(pwd)/package.json" 2>/dev/null; then
    echo "  → Building from current directory..."
    AGENTMUX_DIR="$(pwd)"
else
    # Clone agentmux repo
    AGENTMUX_DIR="$HOME/.agentmux-repo"
    if [[ -d "$AGENTMUX_DIR" ]]; then
        echo "  → Updating existing AgentMux repo..."
        cd "$AGENTMUX_DIR"
        git pull
    else
        echo "  → Cloning AgentMux repo..."
        git clone https://github.com/dpbmaverick98/agentmux.git "$AGENTMUX_DIR"
        cd "$AGENTMUX_DIR"
    fi
fi

# Build agentmux
echo "  → Building AgentMux..."
bun install
bun run build

# Create symlink in ~/.local/bin
mkdir -p "$HOME/.local/bin"
ln -sf "$AGENTMUX_DIR/dist/index.js" "$HOME/.local/bin/agentmux"
chmod +x "$HOME/.local/bin/agentmux"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  Please add ~/.local/bin to your PATH:"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "   Add this to your ~/.zshrc or ~/.bashrc"
fi

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
"$HOME/.local/bin/agentmux" start
