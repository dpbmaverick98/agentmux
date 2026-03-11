#!/bin/bash
set -e

# AgentMux One-Liner Installer for macOS and Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/install.sh | bash

echo "🔧 AgentMux Installer"
echo "====================="
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    echo "Detected: macOS"
elif [[ "$OSTYPE" == "linux"* ]]; then
    OS="linux"
    echo "Detected: Linux"
else
    echo "❌ Unsupported OS: $OSTYPE"
    echo "This installer supports macOS and Linux only."
    exit 1
fi

# Check for package manager
if [[ "$OS" == "macos" ]]; then
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install it first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
elif [[ "$OS" == "linux" ]]; then
    # Check for apt (Debian/Ubuntu) or yum/dnf (RHEL/Fedora)
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt"
        echo "Using: apt (Debian/Ubuntu)"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        echo "Using: dnf (Fedora/RHEL 8+)"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        echo "Using: yum (RHEL/CentOS)"
    else
        echo "❌ No supported package manager found (apt, dnf, or yum)"
        exit 1
    fi
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
    if [[ "$OS" == "macos" ]]; then
        brew install jj
    elif [[ "$OS" == "linux" ]]; then
        # Try to install via package manager first
        if [[ "$PKG_MANAGER" == "apt" ]]; then
            # jj is in Debian/Ubuntu repos as jujutsu
            sudo apt-get update && sudo apt-get install -y jujutsu || {
                echo "    Package manager install failed, trying cargo..."
                if ! check_installed cargo; then
                    echo "    Installing Rust first..."
                    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
                    source "$HOME/.cargo/env"
                fi
                cargo install jj-cli
            }
        elif [[ "$PKG_MANAGER" == "dnf" ]]; then
            sudo dnf install -y jj || {
                echo "    Package manager install failed, trying cargo..."
                if ! check_installed cargo; then
                    echo "    Installing Rust first..."
                    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
                    source "$HOME/.cargo/env"
                fi
                cargo install jj-cli
            }
        elif [[ "$PKG_MANAGER" == "yum" ]]; then
            # yum usually doesn't have jj, use cargo
            if ! check_installed cargo; then
                echo "    Installing Rust first..."
                curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
                source "$HOME/.cargo/env"
            fi
            cargo install jj-cli
        fi
    fi
fi

# Install tmux
if check_installed tmux; then
    echo "  ✓ tmux already installed"
else
    echo "  → Installing tmux..."
    if [[ "$OS" == "macos" ]]; then
        brew install tmux
    elif [[ "$OS" == "linux" ]]; then
        if [[ "$PKG_MANAGER" == "apt" ]]; then
            sudo apt-get update && sudo apt-get install -y tmux
        elif [[ "$PKG_MANAGER" == "dnf" ]]; then
            sudo dnf install -y tmux
        elif [[ "$PKG_MANAGER" == "yum" ]]; then
            sudo yum install -y tmux
        fi
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

