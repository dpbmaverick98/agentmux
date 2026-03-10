#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const program = new Command();

// Get local .agentmux directory for current project
function getAgentMuxDir(): string {
  return path.join(process.cwd(), '.agentmux');
}

// Utility to execute shell commands
function exec(cmd: string, options: any = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', ...options });
  } catch (e) {
    return '';
  }
}

// Check if tmux is installed
function checkTmux(): boolean {
  try {
    execSync('which tmux');
    return true;
  } catch {
    console.log(chalk.red('❌ tmux not found. Install with: brew install tmux'));
    return false;
  }
}

// Check if jj is installed
function checkJJ(): boolean {
  try {
    execSync('which jj');
    return true;
  } catch {
    console.log(chalk.yellow('⚠️  jj not found. Install with: cargo install jj-cli'));
    return false;
  }
}

// Get tmux session name
function getSessionName(): string {
  return process.env.AGENTMUX_SESSION || 'agentmux';
}

// Get JJ state hash for change detection
function getJJStateHash(agentMuxDir: string): string {
  try {
    const jjDir = path.join(agentMuxDir, '.jj');
    if (!fs.existsSync(jjDir)) return 'no-repo';

    const log = execSync('jj log --no-graph 2>/dev/null || echo "no-changes"', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    return crypto.createHash('md5').update(log).digest('hex');
  } catch {
    return 'error';
  }
}

program
  .name('agentmux')
  .description('Ultra-lean multi-agent terminal multiplexer')
  .version('3.0.0');

program
  .command('install')
  .description('Install required dependencies (jj, tmux)')
  .action(() => {
    console.log(chalk.blue('🔧 Installing AgentMux dependencies...\n'));

    const platform = process.platform;
    let installCmd = '';

    if (platform === 'darwin') {
      console.log(chalk.gray('Detected macOS'));
      installCmd = 'brew install jj tmux';
    } else if (platform === 'linux') {
      console.log(chalk.gray('Detected Linux'));
      installCmd = 'cargo install jj-cli && sudo apt-get install -y tmux';
    } else {
      console.log(chalk.yellow('⚠️  Unsupported platform. Please install manually:'));
      console.log(chalk.white('   JJ: cargo install jj-cli'));
      console.log(chalk.white('   tmux: https://github.com/tmux/tmux/wiki/Installing'));
      return;
    }

    console.log(chalk.cyan(`Running: ${installCmd}\n`));

    try {
      execSync(installCmd, { stdio: 'inherit' });
      console.log(chalk.green('\n✅ Dependencies installed!'));
      console.log(chalk.gray('\nYou can now run:'));
      console.log(chalk.white('   agentmux init <project>'));
      console.log(chalk.white('   agentmux start'));
    } catch (e) {
      console.log(chalk.red('\n❌ Installation failed'));
      console.log(chalk.gray('Try installing manually:'));
      console.log(chalk.white('   JJ: cargo install jj-cli'));
      console.log(chalk.white('   tmux: brew install tmux (macOS) or apt-get install tmux (Linux)'));
    }
  });

program
  .command('init <name>')
  .description('Initialize a new AgentMux project in current directory')
  .action((name: string) => {
    const agentMuxDir = getAgentMuxDir();
    const currentDir = process.cwd();

    console.log(chalk.blue(`🌊 Initializing AgentMux project: ${name}`));
    console.log(chalk.gray(`   Location: ${currentDir}/.agentmux/\n`));

    // Check if already initialized
    if (fs.existsSync(agentMuxDir)) {
      console.log(chalk.yellow('⚠️  .agentmux/ already exists in this directory'));
      console.log(chalk.gray('   Use: rm -rf .agentmux && agentmux init <name> to reinitialize\n'));
      return;
    }

    // Create .agentmux directory structure
    fs.mkdirSync(agentMuxDir, { recursive: true });
    fs.mkdirSync(path.join(agentMuxDir, '.jj'), { recursive: true });
    fs.mkdirSync(path.join(agentMuxDir, 'shared'), { recursive: true });
    fs.mkdirSync(path.join(agentMuxDir, 'skills'), { recursive: true });

    // Check if we're in a git repo
    const isGitRepo = fs.existsSync(path.join(currentDir, '.git'));

    // Initialize JJ
    if (checkJJ()) {
      try {
        if (isGitRepo) {
          execSync('jj git init', { cwd: currentDir });
          console.log(chalk.green('  ✓ JJ initialized (backed by existing git repo)'));
        } else {
          execSync('jj init', { cwd: currentDir });
          console.log(chalk.green('  ✓ JJ initialized'));
        }
      } catch (e) {
        console.log(chalk.yellow('  ⚠️  Failed to initialize JJ'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  JJ not installed. Install with: cargo install jj-cli'));
    }

    // Create config.toml
    const config = `# AgentMux Project Config
[project]
name = "${name}"
created_at = "${new Date().toISOString()}"

[agents]
kimi = { enabled = true }
minimax = { enabled = true }
claude = { enabled = true }

[settings]
auto_refresh_interval = 3
show_idle_indicator = true
`;
    fs.writeFileSync(path.join(agentMuxDir, 'config.toml'), config);

    // Create skill file
    const skillContent = generateSkill(name);
    fs.writeFileSync(path.join(agentMuxDir, 'skills', 'agentmux.md'), skillContent);

    // Create shared files
    fs.writeFileSync(path.join(agentMuxDir, 'shared', 'plan.md'), `# Plan for ${name}

Add your multi-agent plan here.
Use @agent tags to assign tasks.

## @kimi
Design the architecture

## @minimax
Implement the code

## @claude
Review and test
`);
    fs.writeFileSync(path.join(agentMuxDir, 'shared', 'messages.txt'), `# Messages for ${name}

`);

    console.log(chalk.green('\n✅ Project initialized!'));
    console.log(chalk.gray(`\nDirectory structure:`));
    console.log(chalk.white('   .agentmux/'));
    console.log(chalk.white('   ├── .jj/              # JJ version control'));
    console.log(chalk.white('   ├── config.toml       # Project config'));
    console.log(chalk.white('   ├── skills/           # Agent skills'));
    console.log(chalk.white('   └── shared/           # Shared context'));
    console.log(chalk.gray(`\nNext step: agentmux start`));
  });

program
  .command('start')
  .description('Start full AgentMux environment with 4 panes')
  .option('--kimi', 'Enable kimi agent', true)
  .option('--minimax', 'Enable minimax agent', true)
  .option('--claude', 'Enable claude agent', true)
  .action((options: any) => {
    // Check all dependencies first
    const hasTmux = checkTmux();
    const hasJJ = checkJJ();

    if (!hasTmux || !hasJJ) {
      console.log(chalk.red('\n❌ Missing dependencies!'));
      console.log(chalk.white('Run: agentmux install\n'));
      return;
    }

    // Check if initialized
    const agentMuxDir = getAgentMuxDir();
    if (!fs.existsSync(agentMuxDir)) {
      console.log(chalk.red('\n❌ No .agentmux/ directory found!'));
      console.log(chalk.white('Run: agentmux init <project-name>\n'));
      return;
    }

    const session = getSessionName();
    const currentDir = process.cwd();

    console.log(chalk.blue('🌊 Starting AgentMux environment...\n'));

    // Kill existing session if present
    try {
      execSync(`tmux kill-session -t ${session} 2>/dev/null`);
    } catch {}

    // Create 4-pane split screen layout
    console.log(chalk.gray('Creating 4-pane split screen...'));

    // Create session with first pane (status - top left) and enable mouse
    execSync(`tmux new-session -d -s ${session} -n agentmux`);
    execSync(`tmux set -t ${session} mouse on`);

    // Split horizontally - creates right pane (kimi - top right)
    console.log(chalk.gray('Creating kimi pane...'));
    execSync(`tmux split-window -h -t ${session}`);

    // Go back to left pane and split vertically - creates bottom left (minimax)
    console.log(chalk.gray('Creating minimax pane...'));
    execSync(`tmux select-pane -t ${session}:0.0`);
    execSync(`tmux split-window -v -t ${session}`);

    // Go to right pane and split vertically - creates bottom right (claude)
    console.log(chalk.gray('Creating claude pane...'));
    execSync(`tmux select-pane -t ${session}:0.1`);
    execSync(`tmux split-window -v -t ${session}`);

    // Layout:
    // Pane 0 (top-left): Status
    // Pane 1 (top-right): KIMI
    // Pane 2 (bottom-left): MINIMAX
    // Pane 3 (bottom-right): CLAUDE

    // Start agents in their panes

    // Pane 0: Status monitor (live updating)
    console.log(chalk.gray('Setting up status pane...'));
    execSync(`tmux select-pane -t ${session}:0.0`);
    execSync(`tmux send-keys -t ${session}:0.0 "${process.argv[0]} ${process.argv[1]} status" C-m`);

    // Pane 1: KIMI (top-right)
    if (options.kimi) {
      console.log(chalk.gray('Starting kimi...'));
      execSync(`tmux select-pane -t ${session}:0.1`);
      execSync(`tmux send-keys -t ${session}:0.1 "clear" C-m`);
      const kimiCmd = `AGENTMUX_AGENT=kimi AGENTMUX_PROJECT=${currentDir} opencode`;
      execSync(`tmux send-keys -t ${session}:0.1 "${kimiCmd}" C-m`);
    }

    // Pane 2: MINIMAX (bottom-left)
    if (options.minimax) {
      console.log(chalk.gray('Starting minimax...'));
      execSync(`tmux select-pane -t ${session}:0.2`);
      execSync(`tmux send-keys -t ${session}:0.2 "clear" C-m`);
      const minimaxCmd = `AGENTMUX_AGENT=minimax AGENTMUX_PROJECT=${currentDir} opencode`;
      execSync(`tmux send-keys -t ${session}:0.2 "${minimaxCmd}" C-m`);
    }

    // Pane 3: CLAUDE (bottom-right)
    if (options.claude) {
      console.log(chalk.gray('Starting claude...'));
      execSync(`tmux select-pane -t ${session}:0.3`);
      execSync(`tmux send-keys -t ${session}:0.3 "clear" C-m`);
      const claudeCmd = `AGENTMUX_AGENT=claude AGENTMUX_PROJECT=${currentDir} claude`;
      execSync(`tmux send-keys -t ${session}:0.3 "${claudeCmd}" C-m`);
    }

    // Equalize pane sizes
    execSync(`tmux select-layout -t ${session} tiled`);

    console.log(chalk.green('\n✅ AgentMux environment ready!'));
    console.log(chalk.yellow('\n🖥️  Split Screen Layout:'));
    console.log(chalk.white('   ┌───────────────┬───────────────┐'));
    console.log(chalk.white('   │    STATUS     │     KIMI      │'));
    console.log(chalk.white('   │   (top-left)  │  (top-right)  │'));
    console.log(chalk.white('   ├───────────────┼───────────────┤'));
    console.log(chalk.white('   │    MINIMAX    │    CLAUDE     │'));
    console.log(chalk.white('   │ (bottom-left) │ (bottom-right)│'));
    console.log(chalk.white('   └───────────────┴───────────────┘'));

    console.log(chalk.blue('\n🔗 Attaching now...'));
    console.log(chalk.yellow('   🖱️  MOUSE ENABLED: Click to switch panes!'));
    console.log(chalk.gray('   Ctrl+B + arrow: Move between panes'));
    console.log(chalk.gray('   Ctrl+B + z: Zoom current pane'));
    console.log(chalk.gray('   Ctrl+B + d: Detach (keep running)\n'));

    // Auto-attach
    spawn('tmux', ['attach', '-t', session], { stdio: 'inherit' });
  });

program
  .command('status')
  .description('Show live status with auto-refresh (runs until Ctrl+C)')
  .action(() => {
    const agentMuxDir = getAgentMuxDir();

    if (!fs.existsSync(agentMuxDir)) {
      console.log(chalk.red('\n❌ No .agentmux/ directory found!'));
      console.log(chalk.white('Run: agentmux init <project-name>\n'));
      return;
    }

    let lastState = '';
    let lastUpdateTime = Date.now();

    function renderStatus() {
      // Clear screen and move cursor to top
      console.clear();

      console.log(chalk.blue.bold('\n📊 AgentMux Status\n'));

      // Calculate idle time
      const secondsSinceUpdate = Math.floor((Date.now() - lastUpdateTime) / 1000);
      process.stdout.write(`${chalk.gray(`⏱️  Last update: ${secondsSinceUpdate}s ago`)}\n\n`);

      // Show JJ changes
      console.log(chalk.yellow('JJ Changes:'));
      if (checkJJ()) {
        try {
          const jjDir = path.join(agentMuxDir, '.jj');
          if (fs.existsSync(jjDir)) {
            const log = exec('jj log --no-graph --template "change_id.short() ++ \\" \\" ++ description\\n" 2>/dev/null || echo "  No changes yet"');
            if (log && log.trim()) {
              console.log(log);
            } else {
              console.log(chalk.gray('  No changes yet'));
            }
          } else {
            console.log(chalk.gray('  JJ repo initializing...'));
          }
        } catch (e) {
          console.log(chalk.gray('  No changes yet'));
        }
      } else {
        console.log(chalk.gray('  JJ not installed'));
      }

      // Show tmux session info
      console.log(chalk.yellow('\nActive Agents:'));
      try {
        const session = getSessionName();
        const output = exec(`tmux list-panes -t ${session} -F "#P: #{pane_current_command}" 2>/dev/null`);
        if (output) {
          const panes = ['Status', 'Kimi', 'Minimax', 'Claude'];
          output.trim().split('\n').forEach((line, idx) => {
            const paneName = panes[idx] || `Pane ${idx}`;
            const cmd = line.split(':')[1]?.trim() || 'idle';
            console.log(`  • ${paneName}: ${cmd}`);
          });
        } else {
          console.log(chalk.gray('  No active session'));
        }
      } catch {
        console.log(chalk.gray('  No active session'));
      }

      // Show recent messages
      console.log(chalk.yellow('\nRecent Messages:'));
      try {
        const messagesPath = path.join(agentMuxDir, 'shared', 'messages.txt');
        if (fs.existsSync(messagesPath)) {
          const messages = fs.readFileSync(messagesPath, 'utf-8');
          const lines = messages.split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
          if (lines.length > 0) {
            lines.slice(-5).forEach((line: string) => {
              console.log(`  ${line}`);
            });
          } else {
            console.log(chalk.gray('  No messages yet'));
          }
        } else {
          console.log(chalk.gray('  No messages'));
        }
      } catch {
        console.log(chalk.gray('  No messages'));
      }

      console.log(chalk.gray('\n  [Auto-refreshes every 3s... Press Ctrl+C to exit]\n'));
    }

    // Initial render
    renderStatus();

    // Set up polling for JJ changes
    const pollInterval = setInterval(() => {
      const currentState = getJJStateHash(agentMuxDir);

      if (currentState !== lastState) {
        lastState = currentState;
        lastUpdateTime = Date.now();
        renderStatus();
      }
    }, 3000);

    // Update idle indicator every second
    const idleInterval = setInterval(() => {
      // Only update the idle line to avoid full re-render flicker
      process.stdout.write(`\x1b[2A\r${chalk.gray(`⏱️  Last update: ${Math.floor((Date.now() - lastUpdateTime) / 1000)}s ago`)}\x1b[2B`);
    }, 1000);

    // Handle exit gracefully
    process.on('SIGINT', () => {
      clearInterval(pollInterval);
      clearInterval(idleInterval);
      console.log(chalk.gray('\n\n👋 Status monitor stopped\n'));
      process.exit(0);
    });

    // Keep process alive
    setInterval(() => {}, 1000);
  });

program
  .command('send <to> <message...>')
  .description('Send a message to another agent (uses tmux send-keys)')
  .action((to: string, message: string[]) => {
    if (!checkTmux()) return;

    const session = getSessionName();
    const msg = message.join(' ');
    const from = process.env.AGENTMUX_AGENT || 'user';

    const fullMsg = `echo "📨 [@${from} → @${to}]: ${msg}"`;

    try {
      // Map agent names to pane numbers
      const paneMap: {[key: string]: number} = {
        'status': 0,
        'kimi': 1,
        'minimax': 2,
        'claude': 3
      };
      const paneNum = paneMap[to.toLowerCase()];

      if (paneNum !== undefined) {
        execSync(`tmux send-keys -t ${session}:0.${paneNum} "${fullMsg}" C-m`);
        console.log(chalk.green(`✅ Message sent to ${to}`));
      } else {
        console.log(chalk.red(`❌ Unknown agent: ${to}. Try: status, kimi, minimax, claude`));
      }
    } catch (e) {
      console.log(chalk.red(`❌ Failed to send to ${to}. Is the session running?`));
    }
  });

program
  .command('config')
  .description('Show current project configuration')
  .action(() => {
    const agentMuxDir = getAgentMuxDir();
    const configPath = path.join(agentMuxDir, 'config.toml');

    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('\n❌ No config found. Run: agentmux init <project>\n'));
      return;
    }

    console.log(chalk.blue('\n⚙️  AgentMux Configuration\n'));
    const config = fs.readFileSync(configPath, 'utf-8');
    console.log(config);
  });

// Helper to generate skill content
function generateSkill(projectName: string): string {
  return `# AgentMux Skill for ${projectName}

You're working in an AgentMux multi-agent environment with JJ version control.

## Quick Commands

### Check Status
Look at the top-left pane or run:
\`\`\`bash
agentmux status
\`\`\`

### Message Another Agent
\`\`\`bash
agentmux send <agent-name> "Your message"
# Example: agentmux send minimax "Check my auth.py"
\`\`\`

### JJ Workflow

Create a change for your work:
\`\`\`bash
jj new -m "@$AGENTMUX_AGENT what you're doing"
\`\`

See your changes:
\`\`\`bash
jj diff
jj log
\`\`

Update your progress:
\`\`\`bash
jj describe -m "@$AGENTMUX_AGENT updated: what changed"
\`\`

## Multi-Agent Collaboration

1. Work on your assigned task
2. Commit with descriptive message using jj
3. Message other agents when you need something:
   \`agentmux send <agent> "Please review X"\`
4. Check other agents' work via jj log

## Project Structure

- JJ Repo: .agentmux/.jj/
- Shared Context: .agentmux/shared/
- Config: .agentmux/config.toml
- This Skill: .agentmux/skills/agentmux.md

## Tips

- Use descriptive commit messages: "@kimi implemented auth API"
- Check the status pane (top-left) for live updates
- Click between panes with mouse or use Ctrl+B + arrow keys
`;
}

program.parse();

export {};