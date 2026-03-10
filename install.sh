#!/bin/bash

set -e

echo "🌊 Installing AgentMux..."
echo ""

# Detect OS
OS=$(uname -s)
ARCH=$(uname -m)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Rust
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}❌ Rust not found${NC}"
    echo "Please install Rust first:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo -e "${GREEN}✅ Rust $(rustc --version)${NC}"

# Create AgentMux directory
AGENTMUX_DIR="$HOME/.agentmux"
mkdir -p "$AGENTMUX_DIR"/{shared,skills}

# Clone or download AgentMux
INSTALL_DIR="$AGENTMUX_DIR/app"
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating AgentMux..."
    cd "$INSTALL_DIR"
    git pull 2>/dev/null || echo "Using existing installation"
else
    echo "Downloading AgentMux..."
    git clone https://github.com/dpbmaverick98/agentmux.git "$INSTALL_DIR" 2>/dev/null || {
        echo "Git clone failed. Please clone manually:"
        echo "  git clone https://github.com/dpbmaverick98/agentmux.git $INSTALL_DIR"
        exit 1
    }
fi

cd "$INSTALL_DIR"

# Build release binary
echo "Building AgentMux (this may take a few minutes)..."
cargo build --release

# Create symlink
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/target/release/agentmux" "$BIN_DIR/agentmux"

# Add to PATH if needed
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  Please add $BIN_DIR to your PATH:${NC}"
    echo "  export PATH=\"$BIN_DIR:\$PATH\""
    echo ""
    echo "Add this to your ~/.bashrc or ~/.zshrc:"
    echo "  echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.bashrc"
fi

echo -e "${GREEN}✅ AgentMux built!${NC}"
echo ""

# Check for OpenCode
if ! command -v opencode &> /dev/null; then
    echo -e "${YELLOW}📦 OpenCode not found. Installing...${NC}"
    curl -fsSL https://opencode.ai/install | bash
else
    echo -e "${GREEN}✅ OpenCode $(opencode --version 2>/dev/null || echo 'installed')${NC}"
fi

# Check for Claude Code
if ! command -v claude &> /dev/null; then
    echo -e "${YELLOW}📦 Claude Code not found. Installing...${NC}"
    npm install -g @anthropic-ai/claude-code
else
    echo -e "${GREEN}✅ Claude Code installed${NC}"
fi

echo ""
echo "🔑 Configure your AI providers:"
echo ""

# Prompt for API keys
read -p "Kimi API Key (optional, press Enter to skip): " KIMI_KEY
echo ""
read -p "MiniMax API Key (optional, press Enter to skip): " MINIMAX_KEY
echo ""

# Configure OpenCode providers
mkdir -p "$HOME/.config/opencode/providers"

if [ -n "$KIMI_KEY" ]; then
    cat > "$HOME/.config/opencode/providers/kimi.json" <<EOF
{
  "name": "kimi",
  "base_url": "https://api.kimi.com/v1",
  "api_key": "$KIMI_KEY",
  "model": "kimi-k2.5"
}
EOF
    echo -e "${GREEN}✅ Kimi configured${NC}"
fi

if [ -n "$MINIMAX_KEY" ]; then
    cat > "$HOME/.config/opencode/providers/minimax.json" <<EOF
{
  "name": "minimax",
  "base_url": "https://api.minimax.io/anthropic",
  "api_key": "$MINIMAX_KEY",
  "model": "MiniMax-M2.5"
}
EOF
    echo -e "${GREEN}✅ MiniMax configured${NC}"
fi

# Claude login
if ! claude auth status &> /dev/null; then
    echo ""
    echo "🔐 Please login to Claude Code:"
    claude auth login
fi

# Install skills
echo ""
echo "📦 Installing default skills..."
mkdir -p "$AGENTMUX_DIR/skills/shared-context-writer"
cp "$INSTALL_DIR/skills/shared-context-writer/prompt.md" "$AGENTMUX_DIR/skills/shared-context-writer/"
cp "$INSTALL_DIR/skills/shared-context-writer/skill.toml" "$AGENTMUX_DIR/skills/shared-context-writer/"

echo ""
echo -e "${GREEN}🌊 AgentMux installation complete!${NC}"
echo ""
echo "Get started:"
echo "  1. Create a project: agentmux init myproject"
echo "  2. Start AgentMux: agentmux start"
echo ""
echo "Documentation: https://github.com/dpbmaverick98/agentmux"
echo ""