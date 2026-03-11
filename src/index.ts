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

    // Run jj from the project root (parent of .agentmux/)
    const projectRoot = path.dirname(agentMuxDir);
    const log = execSync('jj log --no-graph 2>/dev/null || echo "no-changes"', {
      cwd: projectRoot,
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
  .command('init')
  .description('Initialize a new AgentMux project in current directory')
  .action(() => {
    const agentMuxDir = getAgentMuxDir();
    const currentDir = process.cwd();
    const name = path.basename(currentDir);

    console.log(chalk.blue(`🌊 Initializing AgentMux project: ${name}`));
    console.log(chalk.gray(`   Location: ${currentDir}/.agentmux/\n`));

    // Check if already initialized
    if (fs.existsSync(agentMuxDir)) {
      console.log(chalk.yellow('⚠️  .agentmux/ already exists in this directory'));
      console.log(chalk.gray('   Use: rm -rf .agentmux && agentmux init to reinitialize\n'));
      return;
    }

    // Create .agentmux directory structure
    fs.mkdirSync(agentMuxDir, { recursive: true });
    fs.mkdirSync(path.join(agentMuxDir, 'shared'), { recursive: true });
    fs.mkdirSync(path.join(agentMuxDir, 'skills'), { recursive: true });

    // Initialize JJ in .agentmux/.jj/
    if (checkJJ()) {
      try {
        execSync('jj git init', { cwd: agentMuxDir });
        console.log(chalk.green('  ✓ JJ initialized in .agentmux/.jj/'));
      } catch (e) {
        console.log(chalk.yellow('  ⚠️  Failed to initialize JJ'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  JJ not installed. Install with: brew install jj'));
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
    console.log(chalk.white('   └── shared/           # Shared context'));
    console.log(chalk.gray(`\nSkills are installed globally in ~/.claude/skills/`));
    console.log(chalk.gray(`Next step: agentmux start`));
  });

program
  .command('start')
  .description('Start full AgentMux environment with 4 panes')
  .option('--nui', 'Enable nui agent', true)
  .option('--sam', 'Enable sam agent', true)
  .option('--wit', 'Enable wit agent', true)
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
      console.log(chalk.white('Run: agentmux init\n'));
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

    // Split horizontally - creates right pane (nui - top right)
    console.log(chalk.gray('Creating nui pane...'));
    execSync(`tmux split-window -h -t ${session}`);

    // Go back to left pane and split vertically - creates bottom left (sam)
    console.log(chalk.gray('Creating sam pane...'));
    execSync(`tmux select-pane -t ${session}:0.0`);
    execSync(`tmux split-window -v -t ${session}`);

    // Go to right pane and split vertically - creates bottom right (wit)
    console.log(chalk.gray('Creating wit pane...'));
    execSync(`tmux select-pane -t ${session}:0.1`);
    execSync(`tmux split-window -v -t ${session}`);

    // Layout:
    // Pane 0 (top-left): Status
    // Pane 1 (top-right): NUI
    // Pane 2 (bottom-left): SAM
    // Pane 3 (bottom-right): WIT

    // Start agents in their panes

    // Pane 0: Status monitor (live updating)
    console.log(chalk.gray('Setting up status pane...'));
    execSync(`tmux select-pane -t ${session}:0.0`);
    execSync(`tmux select-pane -t ${session}:0.0 -T "status"`);
    execSync(`tmux send-keys -t ${session}:0.0 "${process.argv[0]} ${process.argv[1]} status" C-m`);

    // Pane 1: NUI (top-right)
    if (options.nui) {
      console.log(chalk.gray('Starting nui...'));
      execSync(`tmux select-pane -t ${session}:0.1`);
      execSync(`tmux select-pane -t ${session}:0.1 -T "nui (opencode)"`);
      execSync(`tmux send-keys -t ${session}:0.1 "clear" C-m`);
      const nuiCmd = `AGENTMUX_AGENT=nui AGENTMUX_PROJECT=${currentDir} opencode`;
      execSync(`tmux send-keys -t ${session}:0.1 "${nuiCmd}" C-m`);
    }

    // Pane 2: SAM (bottom-left)
    if (options.sam) {
      console.log(chalk.gray('Starting sam...'));
      execSync(`tmux select-pane -t ${session}:0.2`);
      execSync(`tmux select-pane -t ${session}:0.2 -T "sam (opencode)"`);
      execSync(`tmux send-keys -t ${session}:0.2 "clear" C-m`);
      const samCmd = `AGENTMUX_AGENT=sam AGENTMUX_PROJECT=${currentDir} opencode`;
      execSync(`tmux send-keys -t ${session}:0.2 "${samCmd}" C-m`);
    }

    // Pane 3: WIT (bottom-right)
    if (options.wit) {
      console.log(chalk.gray('Starting wit...'));
      execSync(`tmux select-pane -t ${session}:0.3`);
      execSync(`tmux select-pane -t ${session}:0.3 -T "wit (claude)"`);
      execSync(`tmux send-keys -t ${session}:0.3 "clear" C-m`);
      const witCmd = `AGENTMUX_AGENT=wit AGENTMUX_PROJECT=${currentDir} claude`;
      execSync(`tmux send-keys -t ${session}:0.3 "${witCmd}" C-m`);
    }

    // Equalize pane sizes
    execSync(`tmux select-layout -t ${session} tiled`);

    console.log(chalk.green('\n✅ AgentMux environment ready!'));
    console.log(chalk.yellow('\n🖥️  Split Screen Layout:'));
    console.log(chalk.white('   ┌─────────────────────┬─────────────────────┐'));
    console.log(chalk.white('   │       STATUS        │   nui (opencode)    │'));
    console.log(chalk.white('   │     (top-left)      │    (top-right)      │'));
    console.log(chalk.white('   ├─────────────────────┼─────────────────────┤'));
    console.log(chalk.white('   │   sam (opencode)    │    wit (claude)     │'));
    console.log(chalk.white('   │   (bottom-left)     │   (bottom-right)    │'));
    console.log(chalk.white('   └─────────────────────┴─────────────────────┘'));

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
      console.log(chalk.white('Run: agentmux init\n'));
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
            // Run jj from the project root (parent of .agentmux/)
            const projectRoot = path.dirname(agentMuxDir);
            const log = exec('jj log --no-graph --template "change_id.short() ++ \" \" ++ description\\n" 2>/dev/null || echo "  No changes yet"', {
              cwd: projectRoot
            });
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
          const panes = ['Status', 'nui (opencode)', 'sam (opencode)', 'wit (claude)'];
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
              // Parse timestamp from format: [2026-03-11T10:30:00.000Z] message
              const match = line.match(/^\[(.*?)\] (.*)$/);
              if (match) {
                const timestamp = new Date(match[1]);
                const msg = match[2];
                const ago = Math.floor((Date.now() - timestamp.getTime()) / 1000);
                const timeStr = ago < 60 ? `${ago}s ago` : 
                               ago < 3600 ? `${Math.floor(ago/60)}m ago` : 
                               `${Math.floor(ago/3600)}h ago`;
                console.log(`  ${chalk.gray(`[${timeStr}]`)} ${msg}`);
              } else {
                console.log(`  ${line}`);
              }
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

    // Set up polling for JJ changes every 3 seconds
    const pollInterval = setInterval(() => {
      const currentState = getJJStateHash(agentMuxDir);

      if (currentState !== lastState) {
        lastState = currentState;
        lastUpdateTime = Date.now();
      }
      // Always re-render to update the idle counter
      renderStatus();
    }, 3000);

    // Handle exit gracefully
    process.on('SIGINT', () => {
      clearInterval(pollInterval);
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
    const agentMuxDir = getAgentMuxDir();

    // Create the display message
    const displayMsg = `📨 [@${from} → @${to}]: ${msg}`;
    const timestamp = new Date().toISOString();

    try {
      // Map agent names to pane numbers
      const paneMap: {[key: string]: number} = {
        'status': 0,
        'nui': 1,
        'sam': 2,
        'wit': 3
      };
      const paneNum = paneMap[to.toLowerCase()];

      if (paneNum !== undefined) {
        // Send message as literal text into the agent's chat input
        const escaped = displayMsg.replace(/'/g, "'\\''");
        execSync(`tmux send-keys -t ${session}:0.${paneNum} -l '${escaped}'`);
        execSync(`tmux send-keys -t ${session}:0.${paneNum} Enter`);
        console.log(chalk.green(`✅ Message sent to ${to}`));
        
        // Log message to messages.txt with timestamp
        const messagesPath = path.join(agentMuxDir, 'shared', 'messages.txt');
        const logEntry = `[${timestamp}] ${displayMsg}\n`;
        fs.appendFileSync(messagesPath, logEntry);
      } else {
        console.log(chalk.red(`❌ Unknown agent: ${to}. Try: status, nui, sam, wit`));
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

program
  .command('install-deps')
  .description('Install all required dependencies (claude, opencode, jj, tmux, bun)')
  .action(() => {
    console.log(chalk.blue('🔧 Installing AgentMux dependencies...\n'));

    const platform = process.platform;
    if (platform !== 'darwin') {
      console.log(chalk.yellow('⚠️  This installer currently only supports macOS'));
      console.log(chalk.gray('   Please install manually:'));
      console.log(chalk.white('   - claude: npm install -g @anthropic-ai/claude-cli'));
      console.log(chalk.white('   - opencode: npm install -g opencode'));
      console.log(chalk.white('   - jj: brew install jj'));
      console.log(chalk.white('   - tmux: brew install tmux'));
      console.log(chalk.white('   - bun: curl -fsSL https://bun.sh/install | bash'));
      return;
    }

    let installed = [];
    let skipped = [];

    // Check/install claude
    try {
      execSync('which claude');
      skipped.push('claude');
    } catch {
      console.log(chalk.gray('Installing claude...'));
      execSync('npm install -g @anthropic-ai/claude-cli', { stdio: 'inherit' });
      installed.push('claude');
    }

    // Check/install opencode
    try {
      execSync('which opencode');
      skipped.push('opencode');
    } catch {
      console.log(chalk.gray('Installing opencode...'));
      execSync('npm install -g opencode', { stdio: 'inherit' });
      installed.push('opencode');
    }

    // Check/install jj
    try {
      execSync('which jj');
      skipped.push('jj');
    } catch {
      console.log(chalk.gray('Installing jj...'));
      execSync('brew install jj', { stdio: 'inherit' });
      installed.push('jj');
    }

    // Check/install tmux
    try {
      execSync('which tmux');
      skipped.push('tmux');
    } catch {
      console.log(chalk.gray('Installing tmux...'));
      execSync('brew install tmux', { stdio: 'inherit' });
      installed.push('tmux');
    }

    // Check/install bun
    try {
      execSync('which bun');
      skipped.push('bun');
    } catch {
      console.log(chalk.gray('Installing bun...'));
      execSync('curl -fsSL https://bun.sh/install | bash', { stdio: 'inherit' });
      installed.push('bun');
    }

    console.log(chalk.green('\n✅ Dependency check complete!'));
    if (installed.length > 0) {
      console.log(chalk.green(`   Installed: ${installed.join(', ')}`));
    }
    if (skipped.length > 0) {
      console.log(chalk.gray(`   Already present: ${skipped.join(', ')}`));
    }
  });

program
  .command('list')
  .description('List all agents with their status and harness')
  .action(() => {
    console.log(chalk.blue('\n📋 AgentMux Agents\n'));
    
    const session = getSessionName();
    const fixedAgents = [
      { pane: 0, name: 'status', harness: 'monitor', desc: 'Status Monitor' },
      { pane: 1, name: 'nui', harness: 'opencode', desc: 'Agent Nui' },
      { pane: 2, name: 'sam', harness: 'opencode', desc: 'Agent Sam' },
      { pane: 3, name: 'wit', harness: 'claude', desc: 'Agent Wit' }
    ];
    
    try {
      // Get pane info from tmux
      const output = exec(`tmux list-panes -t ${session} -F "#P: #{pane_current_command}" 2>/dev/null`);
      const paneCommands: {[key: string]: string} = {};
      
      if (output) {
        output.trim().split('\n').forEach(line => {
          const [paneNum, ...cmdParts] = line.split(':');
          paneCommands[paneNum.trim()] = cmdParts.join(':').trim();
        });
      }
      
      console.log(chalk.yellow('Fixed Panes:'));
      fixedAgents.forEach(agent => {
        const cmd = paneCommands[agent.pane.toString()] || 'not running';
        const status = cmd !== 'not running' ? chalk.green('● running') : chalk.gray('○ offline');
        
        console.log(`  Pane ${agent.pane}: ${chalk.bold(agent.name)} (${agent.harness}) - ${status}`);
        console.log(`           ${chalk.gray(cmd)}`);
      });
      
      // Get spawned windows
      try {
        const windowsOutput = exec(`tmux list-windows -t ${session} -F "#I: #W" 2>/dev/null`);
        const spawnedWindows: Array<{id: string, name: string, harness: string}> = [];
        
        if (windowsOutput) {
          windowsOutput.trim().split('\n').forEach(line => {
            const [winId, ...nameParts] = line.split(':');
            const windowName = nameParts.join(':').trim();
            // Skip the main window (agentmux) and check if it's a spawned agent
            if (windowName !== 'agentmux' && !fixedAgents.find(a => a.name === windowName)) {
              // Try to determine harness from window name or default to unknown
              spawnedWindows.push({
                id: winId.trim(),
                name: windowName,
                harness: 'unknown'
              });
            }
          });
        }
        
        if (spawnedWindows.length > 0) {
          console.log(chalk.yellow('\nSpawned Windows:'));
          spawnedWindows.forEach(win => {
            console.log(`  Window ${win.id}: ${chalk.bold(win.name)} (${win.harness}) - ${chalk.green('● running')}`);
          });
        }
      } catch {}
      
      const totalAgents = fixedAgents.length + (spawnedWindows?.length || 0);
      console.log(chalk.gray(`\nTotal: ${totalAgents}/11 agents`));
      console.log();
      
      console.log(chalk.gray('Quick commands:'));
      console.log(`  ${chalk.cyan('agentmux send nui "message"')}  - Send to nui`);
      console.log(`  ${chalk.cyan('agentmux spawn opencode max')}  - Spawn new agent`);
      console.log(`  ${chalk.cyan('agentmux kill sam')}            - Kill specific agent`);
      console.log(`  ${chalk.cyan('agentmux stop')}                - Kill all agents`);
      console.log();
    } catch (e) {
      console.log(chalk.red('❌ No active AgentMux session. Run: agentmux start\n'));
    }
  });

program
  .command('stop')
  .description('Stop the AgentMux tmux session')
  .action(() => {
    const session = getSessionName();
    
    try {
      execSync(`tmux kill-session -t ${session} 2>/dev/null`);
      console.log(chalk.green('\n✅ AgentMux session stopped\n'));
    } catch {
      console.log(chalk.yellow('\n⚠️  No active AgentMux session found\n'));
    }
  });

program
  .command('spawn <harness> <agent-name>')
  .description('Spawn a new agent in a new tmux window (max 11 total agents)')
  .action((harness: string, agentName: string) => {
    if (!checkTmux()) return;
    
    // Validate harness
    if (harness !== 'opencode' && harness !== 'claude') {
      console.log(chalk.red('\n❌ Invalid harness. Use: opencode or claude\n'));
      return;
    }
    
    const session = getSessionName();
    const currentDir = process.cwd();
    
    // Check if session exists
    try {
      execSync(`tmux has-session -t ${session} 2>/dev/null`);
    } catch {
      console.log(chalk.red('\n❌ No active AgentMux session. Run: agentmux start\n'));
      return;
    }
    
    // Check agent limit (max 11)
    try {
      const windowCount = execSync(`tmux list-windows -t ${session} | wc -l`, { encoding: 'utf-8' });
      const paneCount = execSync(`tmux list-panes -t ${session} | wc -l`, { encoding: 'utf-8' });
      const totalAgents = parseInt(windowCount.trim()) + parseInt(paneCount.trim()) - 1; // -1 for main window
      
      if (totalAgents >= 11) {
        console.log(chalk.red('\n❌ Agent limit reached (11 max). Kill an agent first.\n'));
        return;
      }
    } catch {}
    
    // Check if agent name already exists
    try {
      execSync(`tmux list-windows -t ${session} | grep -q "${agentName}" 2>/dev/null`);
      console.log(chalk.red(`\n❌ Agent "${agentName}" already exists\n`));
      return;
    } catch {
      // Name is available, continue
    }
    
    console.log(chalk.blue(`\n🌊 Spawning ${agentName} (${harness})...\n`));
    
    try {
      // Create new window with agent name
      execSync(`tmux new-window -t ${session} -n "${agentName}"`);
      
      // Start the harness
      const cmd = `AGENTMUX_AGENT=${agentName} AGENTMUX_PROJECT=${currentDir} ${harness}`;
      execSync(`tmux send-keys -t ${session}:${agentName} "${cmd}" C-m`);
      
      console.log(chalk.green(`✅ Agent "${agentName}" spawned successfully!`));
      console.log(chalk.gray(`   Window: ${agentName}`));
      console.log(chalk.gray(`   Harness: ${harness}`));
      console.log(chalk.gray(`   Switch: Ctrl+B w (then select ${agentName})\n`));
    } catch (e) {
      console.log(chalk.red(`\n❌ Failed to spawn agent: ${e}\n`));
    }
  });

program
  .command('kill <agent-name>')
  .description('Kill a specific agent window')
  .action((agentName: string) => {
    if (!checkTmux()) return;
    
    const session = getSessionName();
    
    // Check if session exists
    try {
      execSync(`tmux has-session -t ${session} 2>/dev/null`);
    } catch {
      console.log(chalk.red('\n❌ No active AgentMux session.\n'));
      return;
    }
    
    console.log(chalk.blue(`\n💀 Killing ${agentName}...`));
    
    try {
      // Check if it's a window
      try {
        execSync(`tmux list-windows -t ${session} | grep -q "${agentName}" 2>/dev/null`);
        // It's a window, kill it
        execSync(`tmux kill-window -t ${session}:${agentName}`);
        console.log(chalk.green(`✅ Agent "${agentName}" killed\n`));
        return;
      } catch {
        // Not a window, check if it's a fixed pane agent
        const paneMap: {[key: string]: number} = {
          'nui': 1,
          'sam': 2,
          'wit': 3
        };
        
        if (paneMap[agentName] !== undefined) {
          // Kill the pane
          execSync(`tmux kill-pane -t ${session}:0.${paneMap[agentName]}`);
          console.log(chalk.green(`✅ Agent "${agentName}" killed\n`));
          return;
        }
        
        // Not found
        console.log(chalk.red(`\n❌ Agent "${agentName}" not found\n`));
      }
    } catch (e) {
      console.log(chalk.red(`\n❌ Failed to kill agent: ${e}\n`));
    }
  });

program.parse();

export {};