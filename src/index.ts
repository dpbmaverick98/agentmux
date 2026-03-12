#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { spawn, execFileSync } from 'child_process';
import { execSync } from 'child_process';
import fs, { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const program = new Command();

// Configuration constants
const MAX_AGENTS = 11;
const STATUS_REFRESH_INTERVAL_MS = 3000;
const STATUS_REFRESH_INTERVAL_S = 3;

// Agent configuration
interface AgentConfig {
  name: string;
  pane: number;
  harness: string;
  cmd: string;
  enabled: boolean;
}

const AGENTS: AgentConfig[] = [
  { name: 'status', pane: 0, harness: 'monitor', cmd: '', enabled: true },
  { name: 'nui', pane: 1, harness: 'opencode', cmd: 'opencode', enabled: true },
  { name: 'sam', pane: 2, harness: 'opencode', cmd: 'opencode', enabled: true },
  { name: 'wit', pane: 3, harness: 'claude', cmd: 'claude', enabled: true }
];

const AGENT_PANE_MAP: { [key: string]: number } = {
  'status': 0,
  'nui': 1,
  'sam': 2,
  'wit': 3
};

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
    fs.accessSync(jjDir, fs.constants.F_OK);

    // Run jj from the project root (parent of .agentmux/)
    const projectRoot = path.dirname(agentMuxDir);
    const log = execSync('jj log --no-graph 2>/dev/null || echo "no-changes"', {
      cwd: projectRoot,
      encoding: 'utf-8'
    });
    return crypto.createHash('md5').update(log).digest('hex');
  } catch {
    return 'no-repo';
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
    try {
      fs.accessSync(agentMuxDir, fs.constants.F_OK);
      console.log(chalk.yellow('⚠️  .agentmux/ already exists in this directory'));
      console.log(chalk.gray('   Use: rm -rf .agentmux && agentmux init to reinitialize\n'));
      return;
    } catch {
      // Directory doesn't exist, continue with initialization
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

    // Create shared files
    fs.writeFileSync(path.join(agentMuxDir, 'shared', 'plan.md'), `# Plan for ${name}

Add your multi-agent plan here.
Use @agent tags to assign tasks.

## @nui
Design the architecture and plan implementation

## @sam
Implement the core functionality

## @wit
Review and test the implementation
`);
    fs.writeFileSync(path.join(agentMuxDir, 'shared', 'messages.txt'), `# Messages for ${name}

`);

    console.log(chalk.green('\n✅ Project initialized!'));
    console.log(chalk.gray(`\nDirectory structure:`));
    console.log(chalk.white('   .agentmux/'));
    console.log(chalk.white('   ├── .jj/              # JJ version control'));
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
    try {
      fs.accessSync(agentMuxDir, fs.constants.F_OK);
    } catch {
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

    // Start agents in their panes using configuration
    AGENTS.filter(a => a.name !== 'status').forEach(agent => {
      const optionKey = agent.name as keyof typeof options;
      if (options[optionKey]) {
        console.log(chalk.gray(`Starting ${agent.name}...`));
        execSync(`tmux select-pane -t ${session}:0.${agent.pane}`);
        execSync(`tmux select-pane -t ${session}:0.${agent.pane} -T "${agent.name} (${agent.harness})"`);
        execSync(`tmux send-keys -t ${session}:0.${agent.pane} "clear" C-m`);
        const agentCmd = `AGENTMUX_AGENT=${agent.name} AGENTMUX_PROJECT=${currentDir} ${agent.cmd}`;
        execSync(`tmux send-keys -t ${session}:0.${agent.pane} "${agentCmd}" C-m`);
      }
    });

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

    try {
      fs.accessSync(agentMuxDir, fs.constants.F_OK);
    } catch {
      console.log(chalk.red('\n❌ No .agentmux/ directory found!'));
      console.log(chalk.white('Run: agentmux init\n'));
      return;
    }

    const hasJJ = checkJJ();
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
      if (hasJJ) {
        try {
          const jjDir = path.join(agentMuxDir, '.jj');
          try {
            fs.accessSync(jjDir, fs.constants.F_OK);
            // Run jj from the project root (parent of .agentmux/)
            const projectRoot = path.dirname(agentMuxDir);
            
            // Get last 10 commits with author info
            const logOutput = exec('jj log --no-graph -r "ancestors(@) | heads(all())" --limit 10 2>/dev/null || echo ""', {
              cwd: projectRoot
            });
            
            // Get bookmarks to check push status
            const bookmarksOutput = exec('jj bookmark list --all 2>/dev/null || echo ""', {
              cwd: projectRoot
            });
            
            // Parse bookmarks to find which commits are on remote
            const pushedCommitIds = new Set<string>();
            if (bookmarksOutput) {
              bookmarksOutput.split('\n').forEach(line => {
                // Parse lines like: "fix-jj-symlink: fed4b02d [origin (ahead by 2)]"
                const match = line.match(/^\s*(\S+):\s+([a-f0-9]+)/);
                if (match) {
                  pushedCommitIds.add(match[2].substring(0, 12));
                }
              });
            }
            
            if (logOutput && logOutput.trim()) {
              const lines = logOutput.split('\n').filter(l => l.trim());
              if (lines.length > 0) {
                lines.forEach(line => {
                  // Parse JJ log format
                  // Example: @  vqvsryko nui@agentmux.ai 2026-03-11 12:53:40 fix-jj-symlink* ae0c5d4f
                  //          │  description
                  const symbolMatch = line.match(/^([○●@◆])	/);
                  const commitMatch = line.match(/([a-f0-9]{12})/);
                  const descMatch = line.match(/│	(.*)$/);
                  
                  if (symbolMatch && descMatch) {
                    const commitId = commitMatch ? commitMatch[1] : '';
                    const isPushed = pushedCommitIds.has(commitId);
                    const symbol = isPushed ? '●' : '○';
                    const description = descMatch[1].trim();
                    const agentColor = description.includes('@nui') ? chalk.cyan :
                                      description.includes('@sam') ? chalk.green :
                                      description.includes('@wit') ? chalk.magenta : chalk.white;
                    
                    console.log(`  ${symbol} ${agentColor(description)}`);
                  } else if (line.includes('@') || line.includes('○') || line.includes('●')) {
                    // Handle commit line with symbol
                    const commitMatch = line.match(/([a-f0-9]{12})/);
                    const commitId = commitMatch ? commitMatch[1] : '';
                    const isPushed = pushedCommitIds.has(commitId);
                    const symbol = isPushed ? '●' : '○';
                    
                    // Extract author tag
                    const authorMatch = line.match(/@(\w+)/);
                    const author = authorMatch ? authorMatch[1] : 'unknown';
                    
                    // Extract description if available
                    let displayLine = line;
                    const descMatch = line.match(/│	(.*)$/);
                    if (descMatch) {
                      displayLine = descMatch[1].trim();
                    }
                    
                    const agentColor = author === 'nui' ? chalk.cyan :
                                      author === 'sam' ? chalk.green :
                                      author === 'wit' ? chalk.magenta : chalk.white;
                    
                    console.log(`  ${symbol} ${agentColor(displayLine)}`);
                  }
                });
              } else {
                console.log(chalk.gray('  No commits yet'));
              }
            } else {
              console.log(chalk.gray('  No commits yet'));
            }
          } catch {
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
          const lines = output.trim().split('\n');
          lines.forEach((line, idx) => {
            const agent = AGENTS[idx];
            const paneName = agent ? `${agent.name} (${agent.harness})` : `Pane ${idx}`;
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
        try {
          fs.accessSync(messagesPath, fs.constants.F_OK);
          // Use exec to tail the last 5 lines instead of reading entire file
          const tailOutput = exec(`tail -n 5 "${messagesPath}" 2>/dev/null`);
          if (tailOutput) {
            const lines = tailOutput.trim().split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
            if (lines.length > 0) {
              lines.forEach((line: string) => {
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
      } catch {
        console.log(chalk.gray('  No messages'));
      }

      console.log(chalk.gray(`\n  [Auto-refreshes every ${STATUS_REFRESH_INTERVAL_S}s... Press Ctrl+C to exit]\n`));
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
    }, STATUS_REFRESH_INTERVAL_MS);

    // Handle exit gracefully
    process.on('SIGINT', () => {
      clearInterval(pollInterval);
      console.log(chalk.gray('\n\n👋 Status monitor stopped\n'));
      process.exit(0);
    });
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
      const paneNum = AGENT_PANE_MAP[to.toLowerCase()];

      if (paneNum !== undefined) {
        // Send message as literal text into the agent's chat input
        // Use execFileSync with array args to prevent shell injection and ensure ordering
        execFileSync('tmux', ['send-keys', '-t', `${session}:0.${paneNum}`, '-l', displayMsg]);
        execFileSync('tmux', ['send-keys', '-t', `${session}:0.${paneNum}`, 'Enter']);
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
  .command('whoami')
  .description('Show current agent identity')
  .action(() => {
    const agent = process.env.AGENTMUX_AGENT || 'unknown';
    const project = process.env.AGENTMUX_PROJECT || 'unknown';
    
    // Look up harness from AGENTS config
    const agentConfig = AGENTS.find(a => a.name === agent);
    const harness = agentConfig?.harness || 'unknown';
    
    console.log(`${agent} (${harness}) @ ${project}`);
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

    const dependencies = [
      { name: 'claude', installCmd: 'npm install -g @anthropic-ai/claude-cli' },
      { name: 'opencode', installCmd: 'npm install -g opencode' },
      { name: 'jj', installCmd: 'brew install jj' },
      { name: 'tmux', installCmd: 'brew install tmux' },
      { name: 'bun', installCmd: 'curl -fsSL https://bun.sh/install | bash' }
    ];

    let installed: string[] = [];
    let skipped: string[] = [];

    for (const dep of dependencies) {
      try {
        execSync(`which ${dep.name}`);
        skipped.push(dep.name);
      } catch {
        console.log(chalk.gray(`Installing ${dep.name}...`));
        execSync(dep.installCmd, { stdio: 'inherit' });
        installed.push(dep.name);
      }
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
    const spawnedWindows: Array<{id: string, name: string, harness: string}> = [];
    
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
      AGENTS.forEach(agent => {
        const cmd = paneCommands[agent.pane.toString()] || 'not running';
        const status = cmd !== 'not running' ? chalk.green('● running') : chalk.gray('○ offline');
        
        console.log(`  Pane ${agent.pane}: ${chalk.bold(agent.name)} (${agent.harness}) - ${status}`);
        console.log(`           ${chalk.gray(cmd)}`);
      });
      
      // Get spawned windows
      try {
        const windowsOutput = exec(`tmux list-windows -t ${session} -F "#I: #W" 2>/dev/null`);
        
        if (windowsOutput) {
          windowsOutput.trim().split('\n').forEach(line => {
            const [winId, ...nameParts] = line.split(':');
            const windowName = nameParts.join(':').trim();
            // Skip the main window (agentmux) and check if it's a spawned agent
            if (windowName !== 'agentmux' && !AGENTS.find(a => a.name === windowName)) {
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
      
      const totalAgents = AGENTS.length + spawnedWindows.length;
      console.log(chalk.gray(`\nTotal: ${totalAgents}/${MAX_AGENTS} agents`));
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
  .description(`Spawn a new agent in a new tmux window (max ${MAX_AGENTS} total agents)`)
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
      
      if (totalAgents >= MAX_AGENTS) {
        console.log(chalk.red(`\n❌ Agent limit reached (${MAX_AGENTS} max). Kill an agent first.\n`));
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
        if (AGENT_PANE_MAP[agentName] !== undefined) {
          // Kill the pane
          execSync(`tmux kill-pane -t ${session}:0.${AGENT_PANE_MAP[agentName]}`);
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

// Memory subcommand
const memoryProgram = new Command();
memoryProgram
  .name('memory')
  .description('Structured expertise management for agents')
  .version('1.0.0');

memoryProgram
  .command('init')
  .description('Initialize agentmux memory storage')
  .action(async () => {
    const { existsSync } = await import('node:fs');
    const { ensureExpertiseDir, readConfig, writeConfig, getExpertisePath } = await import('./memory/storage/config.ts');
    const { createExpertiseFile } = await import('./memory/storage/store.ts');

    await ensureExpertiseDir();
    const config = await readConfig();

    for (const domain of config.domains) {
      const filePath = getExpertisePath(domain);
      if (!existsSync(filePath)) {
        await createExpertiseFile(filePath);
      }
    }

    console.log(chalk.green('✓ Initialized agentmux memory storage'));
    console.log(chalk.dim(`  Domains: ${config.domains.join(', ')}`));
    console.log(chalk.dim(`  Storage: .agentmux/expertise/`));
  });

memoryProgram
  .command('add')
  .argument('<domain>', 'domain to add')
  .description('Add a new expertise domain')
  .action(async (domain: string) => {
    const { ensureExpertiseDir, readConfig, writeConfig, getExpertisePath } = await import('./memory/storage/config.ts');
    const { createExpertiseFile } = await import('./memory/storage/store.ts');
    
    await ensureExpertiseDir();
    const config = await readConfig();
    
    if (config.domains.includes(domain)) {
      console.log(chalk.yellow(`Domain "${domain}" already exists.`));
      return;
    }

    config.domains.push(domain);
    await writeConfig(config);

    const filePath = getExpertisePath(domain);
    await createExpertiseFile(filePath);

    console.log(chalk.green(`✓ Added domain "${domain}"`));
  });

memoryProgram
  .command('record')
  .argument('<domain>', 'expertise domain')
  .argument('[content]', 'record content')
  .option('--type <type>', 'record type', 'convention')
  .option('--classification <classification>', 'classification level', 'tactical')
  .option('--description <description>', 'description of the record')
  .option('--resolution <resolution>', 'resolution for failure records')
  .option('--title <title>', 'title for decision records')
  .option('--rationale <rationale>', 'rationale for decision records')
  .option('--tags <tags>', 'comma-separated tags')
  .option('--force', 'force recording even if duplicate exists')
  .option('--dry-run', 'preview what would be recorded without writing')
  .description('Record an expertise record')
  .action(async (domain: string, content: string | undefined, options: any) => {
    const { ensureExpertiseDir, getExpertisePath, readConfig, addDomain } = await import('./memory/storage/config.ts');
    const { appendRecord, findDuplicate, readExpertiseFile } = await import('./memory/storage/store.ts');
    const { ExpertiseRecord, RecordType, Classification } = await import('./memory/schema/types.ts');
    
    await ensureExpertiseDir();
    const config = await readConfig();

    if (!config.domains.includes(domain)) {
      await addDomain(domain);
      console.log(chalk.green(`✓ Auto-created domain "${domain}"`));
    }

    const recordedBy = process.env.AGENTMUX_AGENT || 'unknown';
    const recordedAt = new Date().toISOString();

    const tags = typeof options.tags === 'string'
      ? options.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : undefined;

    let record: ExpertiseRecord;

    const recordType = options.type as RecordType;
    const classification = (options.classification || 'tactical') as Classification;

    switch (recordType) {
      case 'convention': {
        const conventionContent = content || options.description;
        if (!conventionContent) {
          console.error(chalk.red('Error: convention records require content or --description'));
          process.exitCode = 1;
          return;
        }
        record = {
          type: 'convention',
          content: conventionContent,
          classification,
          recorded_at: recordedAt,
          recorded_by: recordedBy,
          ...(tags && tags.length > 0 && { tags }),
        };
        break;
      }
      case 'failure': {
        const failureDesc = options.description;
        const failureResolution = options.resolution;
        if (!failureDesc || !failureResolution) {
          console.error(chalk.red('Error: failure records require --description and --resolution'));
          process.exitCode = 1;
          return;
        }
        record = {
          type: 'failure',
          description: failureDesc,
          resolution: failureResolution,
          classification,
          recorded_at: recordedAt,
          recorded_by: recordedBy,
          ...(tags && tags.length > 0 && { tags }),
        };
        break;
      }
      case 'decision': {
        const decisionTitle = options.title;
        const decisionRationale = options.rationale;
        if (!decisionTitle || !decisionRationale) {
          console.error(chalk.red('Error: decision records require --title and --rationale'));
          process.exitCode = 1;
          return;
        }
        record = {
          type: 'decision',
          title: decisionTitle,
          rationale: decisionRationale,
          classification,
          recorded_at: recordedAt,
          recorded_by: recordedBy,
          ...(tags && tags.length > 0 && { tags }),
        };
        break;
      }
      default:
        console.error(chalk.red(`Error: Unknown record type "${recordType}"`));
        process.exitCode = 1;
        return;
    }

    const filePath = getExpertisePath(domain);
    const dryRun = options.dryRun === true;

    if (dryRun) {
      const existing = await readExpertiseFile(filePath);
      const dup = findDuplicate(existing, record);

      if (dup && !options.force) {
        console.log(chalk.yellow(`Dry-run: Duplicate ${recordType} already exists in ${domain}. Would skip.`));
      } else {
        console.log(chalk.green(`✓ Dry-run: Would create ${recordType} in ${domain}`));
      }
      console.log(chalk.dim('  Run without --dry-run to apply changes.'));
    } else {
      const existing = await readExpertiseFile(filePath);
      const dup = findDuplicate(existing, record);

      if (dup && !options.force) {
        console.log(chalk.yellow(`Duplicate ${recordType} already exists in ${domain}. Use --force to add anyway.`));
      } else {
        await appendRecord(filePath, record);
        console.log(chalk.green(`✓ Recorded ${recordType} in ${domain}`));
      }
    }
  });

memoryProgram
  .command('query')
  .argument('[domain]', 'expertise domain to query (or --all for all)')
  .option('--type <type>', 'filter by record type')
  .option('--classification <classification>', 'filter by classification')
  .option('--all', 'show all domains')
  .description('Query expertise records (use --all to see all domains)')
  .action(async (domain: string | undefined, options: any) => {
    const { readConfig, getExpertisePath } = await import('./memory/storage/config.ts');
    const { readExpertiseFile, getFileModTime, filterByType, filterByClassification } = await import('./memory/storage/store.ts');

    const config = await readConfig();
    const domainsToQuery: string[] = [];

    if (options.all) {
      domainsToQuery.push(...config.domains);
      if (domainsToQuery.length === 0) {
        console.log('No domains configured. Run `am memory init` first.');
        return;
      }
    } else if (domain) {
      if (!config.domains.includes(domain)) {
        console.error(chalk.red(`Error: Domain "${domain}" not found.`));
        console.error(`Hint: Run \`am memory add ${domain}\` to create.`);
        process.exitCode = 1;
        return;
      }
      domainsToQuery.push(domain);
    } else {
      console.error(chalk.red('Error: Please specify a domain or use --all'));
      process.exitCode = 1;
      return;
    }

    function formatRecord(r: ExpertiseRecord): string {
      switch (r.type) {
        case 'convention':
          return `- ${r.content}`;
        case 'failure':
          return `- ${r.description}\n  → ${r.resolution}`;
        case 'decision':
          return `- **${r.title}**: ${r.rationale}`;
      }
    }

    for (const d of domainsToQuery) {
      const filePath = getExpertisePath(d);
      let records = await readExpertiseFile(filePath);
      const lastUpdated = await getFileModTime(filePath);

      if (options.type) {
        records = filterByType(records, options.type);
      }
      if (options.classification) {
        records = filterByClassification(records, options.classification);
      }

      if (records.length > 0) {
        console.log(`\n## ${d}`);
        if (lastUpdated) {
          const ago = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60));
          console.log(`(${records.length} entries, updated ${ago}h ago)`);
        }
        
        const byType = { convention: [] as ExpertiseRecord[], failure: [] as ExpertiseRecord[], decision: [] as ExpertiseRecord[] };
        for (const r of records) {
          byType[r.type].push(r);
        }

        if (byType.convention.length > 0) {
          console.log('\n### Conventions');
          for (const r of byType.convention) console.log(formatRecord(r));
        }
        if (byType.failure.length > 0) {
          console.log('\n### Known Failures');
          for (const r of byType.failure) console.log(formatRecord(r));
        }
        if (byType.decision.length > 0) {
          console.log('\n### Decisions');
          for (const r of byType.decision) console.log(formatRecord(r));
        }
      }
    }
  });

memoryProgram
  .command('prime')
  .argument('[domains...]', 'domain(s) to include')
  .option('--compact', 'condensed output (default)')
  .option('--full', 'include full details')
  .option('--exclude <domains...>', 'domains to exclude')
  .description('Generate agent-optimized context for injection')
  .action(async (domainsArg: string[] | undefined, options: any) => {
    const { readConfig, getExpertisePath } = await import('./memory/storage/config.ts');
    const { readExpertiseFile, getFileModTime } = await import('./memory/storage/store.ts');

    const config = await readConfig();
    const excluded = options.exclude || [];
    
    let targetDomains = domainsArg && domainsArg.length > 0 
      ? domainsArg.filter((d: string) => !excluded.includes(d))
      : config.domains.filter((d: string) => !excluded.includes(d));

    if (targetDomains.length === 0) {
      console.log('No domains to prime.');
      return;
    }

    const sections: string[] = [];

    for (const domain of targetDomains) {
      const filePath = getExpertisePath(domain);
      const records = await readExpertiseFile(filePath);
      const lastUpdated = await getFileModTime(filePath);

      if (records.length === 0) continue;

      const lines: string[] = [];
      lines.push(`## ${domain}`);

      const byType: Record<string, ExpertiseRecord[]> = {
        convention: [],
        failure: [],
        decision: [],
      };
      for (const r of records) {
        byType[r.type].push(r);
      }

      const formatCompact = (r: ExpertiseRecord): string => {
        switch (r.type) {
          case 'convention':
            return `[convention] ${r.content}`;
          case 'failure':
            return `[failure] ${r.description} → ${r.resolution}`;
          case 'decision':
            return `[decision] ${r.title}: ${r.rationale}`;
        }
      };

      const formatFull = (r: ExpertiseRecord): string => {
        const meta = options.full 
          ? ` (${r.classification}, ${r.recorded_by}, ${new Date(r.recorded_at).toLocaleDateString()})`
          : '';
        switch (r.type) {
          case 'convention':
            return `- ${r.content}${meta}`;
          case 'failure':
            return `- ${r.description}${meta}\n  → ${r.resolution}`;
          case 'decision':
            return `- **${r.title}**: ${r.rationale}${meta}`;
        }
      };

      const formatter = options.full ? formatFull : formatCompact;

      if (byType.convention.length > 0) {
        lines.push('\n### Conventions');
        for (const r of byType.convention) lines.push(formatter(r));
      }
      if (byType.failure.length > 0) {
        lines.push('\n### Known Failures');
        for (const r of byType.failure) lines.push(formatter(r));
      }
      if (byType.decision.length > 0) {
        lines.push('\n### Decisions');
        for (const r of byType.decision) lines.push(formatter(r));
      }

      sections.push(lines.join('\n'));
    }

    if (sections.length > 0) {
      console.log('# AgentMux Memory Context\n');
      console.log(sections.join('\n\n'));
      console.log('\n---\n*Run `am memory query --all` to see full records. Record learnings with `am memory record`*');
    } else {
      console.log('No records found in specified domains.');
    }
  });

memoryProgram
  .command('status')
  .description('Show memory status - record counts and last updated')
  .action(async () => {
    const { readConfig, getExpertisePath, getExpertiseDir } = await import('./memory/storage/config.ts');
    const { readExpertiseFile, getFileModTime } = await import('./memory/storage/store.ts');

    const config = await readConfig();
    const expertiseDir = getExpertiseDir();

    if (!existsSync(expertiseDir)) {
      console.log(chalk.yellow('No .agentmux/expertise/ found. Run `am memory init` first.'));
      return;
    }

    console.log(chalk.bold('\n# AgentMux Memory Status\n'));

    let totalRecords = 0;

    for (const domain of config.domains) {
      const filePath = getExpertisePath(domain);
      const records = await readExpertiseFile(filePath);
      const lastUpdated = await getFileModTime(filePath);

      totalRecords += records.length;

      const countStr = chalk.white(`${records.length} records`);
      let timeStr = chalk.gray('(no data)');
      
      if (lastUpdated) {
        const ago = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60));
        if (ago < 1) {
          const mins = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60));
          timeStr = chalk.gray(`(${mins}m ago)`);
        } else if (ago < 24) {
          timeStr = chalk.gray(`(${ago}h ago)`);
        } else {
          const days = Math.floor(ago / 24);
          timeStr = chalk.gray(`(${days}d ago)`);
        }
      }

      console.log(`  ${chalk.cyan(domain.padEnd(15))} ${countStr} ${timeStr}`);
    }

    console.log(chalk.dim(`\n  Total: ${totalRecords} records across ${config.domains.length} domains`));
    console.log(chalk.dim(`  Storage: ${expertiseDir}\n`));
  });

program.addCommand(memoryProgram);

// Plan subcommand
const planProgram = new Command();
planProgram
  .name('plan')
  .description('Versioned plan management for multi-agent collaboration')
  .version('1.0.0');

planProgram
  .command('init')
  .argument('<name>', 'plan name')
  .description('Create a new plan')
  .action(async (name: string) => {
    const { initPlan } = await import('./plan/commands/init.ts');
    await initPlan(name);
  });

planProgram
  .command('list')
  .description('List all plans')
  .action(async () => {
    const { listPlanCommand } = await import('./plan/commands/init.ts');
    await listPlanCommand();
  });

planProgram
  .command('commit')
  .argument('<name>', 'plan name')
  .option('-m, --message <message>', 'commit message')
  .description('Commit current plan.md as new version')
  .action(async (name: string, options: any) => {
    const { commitPlan } = await import('./plan/commands/commit.ts');
    const message = options.message || `Update ${name}`;
    await commitPlan(name, message);
  });

planProgram
  .command('log')
  .argument('<name>', 'plan name')
  .description('Show version history')
  .action(async (name: string) => {
    const { logPlan } = await import('./plan/commands/commit.ts');
    await logPlan(name);
  });

planProgram
  .command('show')
  .argument('<name>', 'plan name')
  .option('--with-memory', 'show linked memory records')
  .description('Show current plan version')
  .action(async (name: string, options: any) => {
    if (options.withMemory) {
      const { showPlanWithMemory } = await import('./plan/commands/link.ts');
      await showPlanWithMemory(name);
    } else {
      const { showPlan } = await import('./plan/commands/commit.ts');
      await showPlan(name);
    }
  });

planProgram
  .command('link')
  .argument('<plan>', 'plan name')
  .option('--memory <ref>', 'memory reference ID (e.g., am-8f2d)')
  .option('--version <version>', 'specific version (default: current)')
  .description('Link memory record to plan version')
  .action(async (plan: string, options: any) => {
    if (!options.memory) {
      console.log(chalk.red("Error: --memory <ref> is required"));
      console.log(chalk.gray("Example: am plan link api-design --memory am-8f2d"));
      return;
    }
    const { linkMemory } = await import('./plan/commands/link.ts');
    await linkMemory(plan, options.memory, options.version);
  });

program.addCommand(planProgram);

program.parse();