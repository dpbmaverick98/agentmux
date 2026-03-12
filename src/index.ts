#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { spawn, execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const program = new Command();

// Configuration constants
const MAX_AGENTS = 11;
const STATUS_REFRESH_INTERVAL_MS = 3000;
const STATUS_REFRESH_INTERVAL_S = STATUS_REFRESH_INTERVAL_MS / 1000;

// Agent configuration
interface AgentConfig {
  name: string;
  pane: number;
  harness: string;
  cmd: string;
}

const AGENTS: AgentConfig[] = [
  { name: 'status', pane: 0, harness: 'monitor', cmd: '' },
  { name: 'nui', pane: 1, harness: 'opencode', cmd: 'opencode' },
  { name: 'sam', pane: 2, harness: 'opencode', cmd: 'opencode' },
  { name: 'wit', pane: 3, harness: 'claude', cmd: 'claude' }
];

// Derive pane map from AGENTS array
const AGENT_PANE_MAP: { [key: string]: number } = Object.fromEntries(
  AGENTS.filter(a => a.name !== 'status').map(a => [a.name, a.pane])
);

// Get local .agentmux directory for current project
function getAgentMuxDir(): string {
  return path.join(process.cwd(), '.agentmux');
}

// Execute command and return output (legacy wrapper for simple commands)
function exec(cmd: string, options: any = {}): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', ...options });
  } catch (e) {
    return '';
  }
}

// Secure command execution using array args (prevents shell injection)
function execSafe(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: 'utf-8' });
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

// Get tmux session name
function getSessionName(): string {
  return process.env.AGENTMUX_SESSION || 'agentmux';
}

program
  .name('agentmux')
  .description('Ultra-lean multi-agent terminal multiplexer')
  .version('3.0.0');

program
  .command('install')
  .description('Install required dependencies (tmux)')
  .action(() => {
    console.log(chalk.blue('🔧 Installing AgentMux dependencies...\n'));

    const platform = process.platform;
    let installCmd = '';

    if (platform === 'darwin') {
      console.log(chalk.gray('Detected macOS'));
      installCmd = 'brew install tmux';
    } else if (platform === 'linux') {
      console.log(chalk.gray('Detected Linux'));
      installCmd = 'sudo apt-get install -y tmux';
    } else {
      console.log(chalk.yellow('⚠️  Unsupported platform. Please install manually:'));
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
    fs.mkdirSync(path.join(agentMuxDir, 'workflows'), { recursive: true });

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
    console.log(chalk.white('   ├── shared/           # Shared context'));
    console.log(chalk.white('   └── workflows/        # Agent workflows'));
    console.log(chalk.gray(`\nSkills are installed globally in ~/.claude/skills/`));
    console.log(chalk.gray(`Next step: agentmux start`));
  });

program
  .command('start')
  .description('Start full AgentMux environment with 4 panes')
  .option('--nui', 'Enable nui agent', true)
  .option('--no-nui', 'Disable nui agent')
  .option('--sam', 'Enable sam agent', true)
  .option('--no-sam', 'Disable sam agent')
  .option('--wit', 'Enable wit agent', true)
  .option('--no-wit', 'Disable wit agent')
  .action((options: any) => {
    // Check tmux dependency
    if (!checkTmux()) {
      console.log(chalk.red('\n❌ Missing tmux dependency!'));
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
      execFileSync('tmux', ['kill-session', '-t', session], { stdio: 'ignore' });
    } catch {}

    // Create 4-pane split screen layout
    console.log(chalk.gray('Creating 4-pane split screen...'));

    // Create session with first pane (status - top left) and enable mouse
    execFileSync('tmux', ['new-session', '-d', '-s', session, '-n', 'agentmux']);
    execFileSync('tmux', ['set', '-t', session, 'mouse', 'on']);

    // Split horizontally - creates right pane (nui - top right)
    console.log(chalk.gray('Creating nui pane...'));
    execFileSync('tmux', ['split-window', '-h', '-t', session]);

    // Go back to left pane and split vertically - creates bottom left (sam)
    console.log(chalk.gray('Creating sam pane...'));
    execFileSync('tmux', ['select-pane', '-t', `${session}:0.0`]);
    execFileSync('tmux', ['split-window', '-v', '-t', session]);

    // Go to right pane and split vertically - creates bottom right (wit)
    console.log(chalk.gray('Creating wit pane...'));
    execFileSync('tmux', ['select-pane', '-t', `${session}:0.1`]);
    execFileSync('tmux', ['split-window', '-v', '-t', session]);

    // Layout:
    // Pane 0 (top-left): Status
    // Pane 1 (top-right): NUI
    // Pane 2 (bottom-left): SAM
    // Pane 3 (bottom-right): WIT

    // Start agents in their panes

    // Pane 0: Status monitor (live updating)
    console.log(chalk.gray('Setting up status pane...'));
    execFileSync('tmux', ['select-pane', '-t', `${session}:0.0`]);
    execFileSync('tmux', ['select-pane', '-t', `${session}:0.0`, '-T', 'status']);
    execFileSync('tmux', ['send-keys', '-t', `${session}:0.0`, `${process.argv[0]} ${process.argv[1]} status`, 'C-m']);

    // Start agents in their panes using configuration
    AGENTS.filter(a => a.name !== 'status').forEach(agent => {
      const optionKey = agent.name as keyof typeof options;
      if (options[optionKey]) {
        console.log(chalk.gray(`Starting ${agent.name}...`));
        execFileSync('tmux', ['select-pane', '-t', `${session}:0.${agent.pane}`]);
        execFileSync('tmux', ['select-pane', '-t', `${session}:0.${agent.pane}`, '-T', `${agent.name} (${agent.harness})`]);
        execFileSync('tmux', ['send-keys', '-t', `${session}:0.${agent.pane}`, 'clear', 'C-m']);
        const agentCmd = `AGENTMUX_AGENT=${agent.name} AGENTMUX_PROJECT=${currentDir} ${agent.cmd}`;
        execFileSync('tmux', ['send-keys', '-t', `${session}:0.${agent.pane}`, agentCmd, 'C-m']);
      }
    });

    // Equalize pane sizes
    execFileSync('tmux', ['select-layout', '-t', session, 'tiled']);

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

    let lastCommitCount = 0;
    let lastUpdateTime = Date.now();

    function renderStatus() {
      // Clear screen and move cursor to top
      console.clear();

      console.log(chalk.blue.bold('\n📊 AgentMux Status\n'));

      // Calculate idle time
      const secondsSinceUpdate = Math.floor((Date.now() - lastUpdateTime) / 1000);
      process.stdout.write(`${chalk.gray(`⏱️  Last update: ${secondsSinceUpdate}s ago`)}\n\n`);

      // Show Recent Commits
      console.log(chalk.yellow('Recent Commits:'));
      try {
        const commitsPath = path.join(agentMuxDir, 'shared', 'commits.txt');
        try {
          fs.accessSync(commitsPath, fs.constants.F_OK);
          // Use exec to tail the last 20 lines
          const tailOutput = exec(`tail -n 20 "${commitsPath}" 2>/dev/null`);
          if (tailOutput && tailOutput.trim()) {
            const lines = tailOutput.trim().split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
            if (lines.length > 0) {
              lines.reverse().forEach((line: string) => {
                // Parse format: [timestamp] PENDING/REVIEWED hash @agent: message [| reviewer]
                const match = line.match(/^\[(.*?)\]\s+(\w+)\s+(\S+)\s+(@\w+):\s*(.*?)(?:\s*\|\s*(.*))?$/);
                if (match) {
                  const [, timestamp, status, hash, agent, message, reviewer] = match;
                  const isReviewed = status === 'REVIEWED';
                  const symbol = isReviewed ? '●' : '○';
                  const agentName = agent.replace('@', '');
                  const agentColor = agentName === 'nui' ? chalk.cyan :
                                    agentName === 'sam' ? chalk.green :
                                    agentName === 'wit' ? chalk.magenta : chalk.white;
                  
                  const shortHash = hash.substring(0, 7);
                  let displayLine = `${shortHash} ${agent}: ${message}`;
                  if (reviewer) {
                    displayLine += ` (${reviewer})`;
                  }
                  
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
          console.log(chalk.gray('  No commits yet'));
        }
      } catch (e) {
        console.log(chalk.gray('  No commits yet'));
      }

      // Show tmux session info
      console.log(chalk.yellow('\nActive Agents:'));
      try {
        const session = getSessionName();
        const output = execFileSync('tmux', ['list-panes', '-t', session, '-F', '#P: #{pane_current_command}'], { encoding: 'utf-8' });
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

    // Set up polling for commit changes every 3 seconds
    const pollInterval = setInterval(() => {
      try {
        const commitsPath = path.join(agentMuxDir, 'shared', 'commits.txt');
        const stats = fs.statSync(commitsPath);
        const currentCount = stats.mtime.getTime();
        
        if (currentCount !== lastCommitCount) {
          lastCommitCount = currentCount;
          lastUpdateTime = Date.now();
        }
      } catch {
        // File doesn't exist yet
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
  .command('commit <hash> <message...>')
  .description('Log a commit with hash and message (use @agent tag)')
  .action((hash: string, message: string[]) => {
    const agentMuxDir = getAgentMuxDir();
    const agent = process.env.AGENTMUX_AGENT || 'user';
    const msg = message.join(' ');
    const timestamp = new Date().toISOString();
    
    try {
      const commitsPath = path.join(agentMuxDir, 'shared', 'commits.txt');
      const logEntry = `[${timestamp}] PENDING ${hash} @${agent}: ${msg}\n`;
      fs.appendFileSync(commitsPath, logEntry);
      console.log(chalk.green(`✅ Commit logged: ○ ${hash.substring(0, 7)} @${agent}: ${msg}`));
    } catch (e) {
      console.log(chalk.red('❌ Failed to log commit'));
    }
  });

program
  .command('review <hash>')
  .description('Mark a commit as reviewed')
  .action((hash: string) => {
    const agentMuxDir = getAgentMuxDir();
    const reviewer = process.env.AGENTMUX_AGENT || 'user';
    
    try {
      const commitsPath = path.join(agentMuxDir, 'shared', 'commits.txt');
      
      // Check if file exists
      try {
        fs.accessSync(commitsPath, fs.constants.F_OK);
      } catch {
        console.log(chalk.red(`❌ No commits found. Did you mean to create it first with 'agentmux commit'?`));
        return;
      }
      
      const content = fs.readFileSync(commitsPath, 'utf-8');
      const lines = content.split('\n');
      
      // Find the commit by hash (exact match to avoid substring collisions)
      let found = false;
      const hashPattern = new RegExp(`\\s${hash}\\s`);
      const updatedLines = lines.map(line => {
        if (!found && line.includes(' PENDING ') && hashPattern.test(line)) {
          found = true;
          // Change PENDING to REVIEWED and add reviewer
          return line.replace(' PENDING ', ' REVIEWED ') + ` | ${reviewer}`;
        }
        return line;
      });
      
      if (found) {
        fs.writeFileSync(commitsPath, updatedLines.join('\n'));
        console.log(chalk.green(`✅ Commit ${hash.substring(0, 7)} marked as reviewed by @${reviewer}`));
      } else {
        // Check if already reviewed
        const alreadyReviewed = lines.some(line => line.includes(' REVIEWED ') && hashPattern.test(line));
        if (alreadyReviewed) {
          console.log(chalk.yellow(`⚠️  Commit ${hash.substring(0, 7)} is already reviewed`));
          // Still append this reviewer
          const updatedLines2 = lines.map(line => {
            if (line.includes(' REVIEWED ') && hashPattern.test(line) && !line.includes(`| ${reviewer}`) && !line.includes(`, ${reviewer}`)) {
              return line + `, ${reviewer}`;
            }
            return line;
          });
          fs.writeFileSync(commitsPath, updatedLines2.join('\n'));
        } else {
          console.log(chalk.red(`❌ Commit ${hash.substring(0, 7)} not found`));
        }
      }
    } catch (e) {
      console.log(chalk.red('❌ Failed to review commit'));
    }
  });

program
  .command('commits')
  .alias('log')
  .description('Show recent commits')
  .action(() => {
    const agentMuxDir = getAgentMuxDir();
    
    try {
      const commitsPath = path.join(agentMuxDir, 'shared', 'commits.txt');
      try {
        fs.accessSync(commitsPath, fs.constants.F_OK);
        const content = fs.readFileSync(commitsPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        
        if (lines.length === 0) {
          console.log(chalk.gray('No commits yet'));
          return;
        }
        
        console.log(chalk.blue('\n📋 Recent Commits\n'));
        lines.reverse().slice(0, 20).forEach((line: string) => {
          const match = line.match(/^\[(.*?)\]\s+(\w+)\s+(\S+)\s+(@\w+):\s*(.*?)(?:\s*\|\s*(.*))?$/);
          if (match) {
            const [, timestamp, status, hash, agent, message, reviewer] = match;
            const isReviewed = status === 'REVIEWED';
            const symbol = isReviewed ? '●' : '○';
            const shortHash = hash.substring(0, 7);
            const time = new Date(timestamp);
            const timeStr = time.toLocaleTimeString();
            
            console.log(`  ${symbol} ${shortHash} ${agent}: ${message}`);
            if (reviewer) {
              console.log(`     reviewed by: ${reviewer}`);
            }
          }
        });
        console.log();
      } catch {
        console.log(chalk.gray('No commits yet'));
      }
    } catch (e) {
      console.log(chalk.red('❌ Failed to read commits'));
    }
  });

program
  .command('clear-commits')
  .description('Clear all commit history')
  .action(() => {
    const agentMuxDir = getAgentMuxDir();
    
    try {
      const commitsPath = path.join(agentMuxDir, 'shared', 'commits.txt');
      fs.writeFileSync(commitsPath, '# Commits history cleared\n');
      console.log(chalk.green('✅ Commit history cleared'));
    } catch (e) {
      console.log(chalk.red('❌ Failed to clear commits'));
    }
  });

program
  .command('workflow [name]')
  .description('List, show, or install workflows')
  .option('--install', 'Install workflow from GitHub')
  .action((name: string | undefined, options: any) => {
    const agentMuxDir = getAgentMuxDir();
    const workflowsDir = path.join(agentMuxDir, 'workflows');
    
    // Create workflows directory if it doesn't exist
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }
    
    if (options.install && name) {
      // Validate workflow name (prevent path traversal)
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        console.log(chalk.red(`❌ Invalid workflow name: '${name}'`));
        console.log(chalk.gray('   Workflow names can only contain letters, numbers, hyphens, and underscores'));
        return;
      }
      
      // Install workflow from GitHub
      console.log(chalk.blue(`🔧 Installing workflow: ${name}`));
      const workflowUrl = `https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/workflows/${name}/SKILL.md`;
      const targetDir = path.join(workflowsDir, name);
      const targetPath = path.join(targetDir, 'SKILL.md');
      
      try {
        // Check if already installed
        if (fs.existsSync(targetPath)) {
          console.log(chalk.yellow(`⚠️  Workflow '${name}' is already installed`));
          console.log(chalk.gray(`   Location: ${targetPath}`));
          return;
        }
        
        // Create workflow directory
        fs.mkdirSync(targetDir, { recursive: true });
        
        // Download workflow using curl
        try {
          execSync(`curl -fsSL "${workflowUrl}" -o "${targetPath}"`, { stdio: 'inherit' });
          console.log(chalk.green(`✅ Workflow '${name}' installed successfully`));
          console.log(chalk.gray(`   Location: ${targetPath}`));
          console.log(chalk.gray(`   Usage: agentmux workflow ${name}`));
        } catch {
          // Clean up if download failed
          fs.rmSync(targetDir, { recursive: true, force: true });
          console.log(chalk.red(`❌ Failed to download workflow '${name}'`));
          console.log(chalk.gray(`   URL: ${workflowUrl}`));
          console.log(chalk.gray(`   Make sure the workflow exists in the repository`));
        }
      } catch (e) {
        console.log(chalk.red(`❌ Failed to install workflow: ${e}`));
      }
    } else if (name) {
      // Show specific workflow
      const workflowPath = path.join(workflowsDir, name, 'SKILL.md');
      
      try {
        if (fs.existsSync(workflowPath)) {
          const content = fs.readFileSync(workflowPath, 'utf-8');
          console.log(chalk.blue(`\n📋 Workflow: ${name}\n`));
          console.log(content);
        } else {
          console.log(chalk.red(`❌ Workflow '${name}' not found`));
          console.log(chalk.gray(`   Install with: agentmux workflow ${name} --install`));
          
          // List available workflows
          const installed = fs.readdirSync(workflowsDir).filter(f => {
            const stat = fs.statSync(path.join(workflowsDir, f));
            return stat.isDirectory() && fs.existsSync(path.join(workflowsDir, f, 'SKILL.md'));
          });
          
          if (installed.length > 0) {
            console.log(chalk.gray(`\n   Installed workflows:`));
            installed.forEach(w => console.log(chalk.gray(`     - ${w}`)));
          }
        }
      } catch (e) {
        console.log(chalk.red(`❌ Failed to read workflow: ${e}`));
      }
    } else {
      // List installed workflows
      console.log(chalk.blue('\n📋 Installed Workflows\n'));
      
      try {
        const workflows: string[] = [];
        
        if (fs.existsSync(workflowsDir)) {
          const entries = fs.readdirSync(workflowsDir);
          for (const entry of entries) {
            const workflowPath = path.join(workflowsDir, entry, 'SKILL.md');
            if (fs.existsSync(workflowPath)) {
              workflows.push(entry);
            }
          }
        }
        
        if (workflows.length === 0) {
          console.log(chalk.gray('  No workflows installed'));
          console.log(chalk.gray('\n  Install workflows from GitHub:'));
          console.log(chalk.white('    agentmux workflow <name> --install'));
        } else {
          workflows.forEach(w => {
            console.log(`  ✓ ${chalk.bold(w)}`);
          });
          console.log(chalk.gray(`\n  View workflow: agentmux workflow <name>`));
        }
        
        console.log(chalk.gray('\n  Available workflows on GitHub:'));
        console.log(chalk.gray('    - detailed-commits'));
        
      } catch (e) {
        console.log(chalk.red('❌ Failed to list workflows'));
      }
    }
  });

program
  .command('install-deps')
  .description('Install all required dependencies (claude, opencode, tmux, bun)')
  .action(() => {
    console.log(chalk.blue('🔧 Installing AgentMux dependencies...\n'));

    const platform = process.platform;
    if (platform !== 'darwin') {
      console.log(chalk.yellow('⚠️  This installer currently only supports macOS'));
      console.log(chalk.gray('   Please install manually:'));
      console.log(chalk.white('   - claude: npm install -g @anthropic-ai/claude-cli'));
      console.log(chalk.white('   - opencode: npm install -g opencode'));
      console.log(chalk.white('   - tmux: brew install tmux'));
      console.log(chalk.white('   - bun: curl -fsSL https://bun.sh/install | bash'));
      return;
    }

    const dependencies = [
      { name: 'claude', installCmd: 'npm install -g @anthropic-ai/claude-cli' },
      { name: 'opencode', installCmd: 'npm install -g opencode' },
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
      const output = execFileSync('tmux', ['list-panes', '-t', session, '-F', '#P: #{pane_current_command}'], { encoding: 'utf-8' });
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
        const windowsOutput = execFileSync('tmux', ['list-windows', '-t', session, '-F', '#I: #W'], { encoding: 'utf-8' });
        
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
      execFileSync('tmux', ['kill-session', '-t', session], { stdio: 'ignore' });
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
      execFileSync('tmux', ['has-session', '-t', session], { stdio: 'ignore' });
    } catch {
      console.log(chalk.red('\n❌ No active AgentMux session. Run: agentmux start\n'));
      return;
    }
    
    // Check agent limit (max 11) - count windows only
    try {
      const windowsOutput = execFileSync('tmux', ['list-windows', '-t', session, '-F', '#{window_name}'], { encoding: 'utf-8' });
      const windowCount = windowsOutput.trim().split('\n').filter(w => w !== 'agentmux').length;
      
      if (windowCount >= MAX_AGENTS - AGENTS.length) {
        console.log(chalk.red(`\n❌ Agent limit reached (${MAX_AGENTS} max). Kill an agent first.\n`));
        return;
      }
    } catch {}
    
    // Check if agent name already exists (exact match)
    try {
      const windowsOutput = execFileSync('tmux', ['list-windows', '-t', session, '-F', '#{window_name}'], { encoding: 'utf-8' });
      const windows = windowsOutput.trim().split('\n');
      if (windows.includes(agentName)) {
        console.log(chalk.red(`\n❌ Agent "${agentName}" already exists\n`));
        return;
      }
    } catch {
      // Name is available, continue
    }
    
    console.log(chalk.blue(`\n🌊 Spawning ${agentName} (${harness})...\n`));
    
    try {
      // Create new window with agent name
      execFileSync('tmux', ['new-window', '-t', session, '-n', agentName]);
      
      // Start the harness
      const cmd = `AGENTMUX_AGENT=${agentName} AGENTMUX_PROJECT=${currentDir} ${harness}`;
      execFileSync('tmux', ['send-keys', '-t', `${session}:${agentName}`, cmd, 'C-m']);
      
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
      execFileSync('tmux', ['has-session', '-t', session], { stdio: 'ignore' });
    } catch {
      console.log(chalk.red('\n❌ No active AgentMux session.\n'));
      return;
    }
    
    console.log(chalk.blue(`\n💀 Killing ${agentName}...`));

    try {
      // Check if it's a window (exact match)
      try {
        const windowsOutput = execFileSync('tmux', ['list-windows', '-t', session, '-F', '#{window_name}'], { encoding: 'utf-8' });
        const windows = windowsOutput.trim().split('\n');
        if (windows.includes(agentName)) {
          // It's a window, kill it
          execFileSync('tmux', ['kill-window', '-t', `${session}:${agentName}`]);
          console.log(chalk.green(`✅ Agent "${agentName}" killed\n`));
          return;
        }
      } catch {
        // Not a window, continue to check fixed pane agents
      }

      // Check if it's a fixed pane agent
      if (AGENT_PANE_MAP[agentName] !== undefined) {
        // Kill the pane
        execFileSync('tmux', ['kill-pane', '-t', `${session}:0.${AGENT_PANE_MAP[agentName]}`]);
        console.log(chalk.green(`✅ Agent "${agentName}" killed\n`));
        return;
      }

      // Not found
      console.log(chalk.red(`\n❌ Agent "${agentName}" not found\n`));
    } catch (e) {
      console.log(chalk.red(`\n❌ Failed to kill agent: ${e}\n`));
    }
  });

program.parse();