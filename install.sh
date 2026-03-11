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

# Install jj
if check_installed jj; then
    echo "  ✓ jj already installed"
else
    echo "  → Installing jj..."
    if [[ "$PKG_MANAGER" == "brew" ]]; then
        brew install jj
    else
        # Download pre-compiled binary from GitHub releases
        echo "    Downloading pre-compiled binary..."
        JJ_VERSION="0.39.0"
        JJ_ARCH="$(uname -m)"
        
        # Map architecture names (jj uses musl for Linux)
        case "$JJ_ARCH" in
            x86_64)
                JJ_ARCH="x86_64-unknown-linux-musl"
                ;;
            aarch64|arm64)
                JJ_ARCH="aarch64-unknown-linux-musl"
                ;;
            *)
                echo "❌ Unsupported architecture: $JJ_ARCH"
                echo "   Please install jj manually: https://github.com/jj-vcs/jj"
                exit 1
                ;;
        esac
        
        JJ_URL="https://github.com/jj-vcs/jj/releases/download/v${JJ_VERSION}/jj-v${JJ_VERSION}-${JJ_ARCH}.tar.gz"
        
        # Download and extract
        curl -fsSL "$JJ_URL" | tar -xz -C /tmp
        sudo mv "/tmp/jj" /usr/local/bin/jj
        sudo chmod +x /usr/local/bin/jj
        echo "    ✓ jj installed to /usr/local/bin/jj"
    fi
fi

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
    echo "   Add this to your ~/.bashrc or ~/.zshrc"
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
