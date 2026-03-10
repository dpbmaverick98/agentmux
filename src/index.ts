#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const program = new Command();
const AGENTMUX_DIR = path.join(os.homedir(), '.agentmux');
const SKILLS_DIR = path.join(AGENTMUX_DIR, 'skills');

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

// Ensure tmux session exists
function ensureSession() {
  const session = getSessionName();
  try {
    execSync(`tmux has-session -t ${session} 2>/dev/null`);
  } catch {
    execSync(`tmux new-session -d -s ${session} -n status`);
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
      // macOS
      console.log(chalk.gray('Detected macOS'));
      installCmd = 'brew install jj tmux';
    } else if (platform === 'linux') {
      // Linux
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
  .description('Initialize a new AgentMux project')
  .action((name: string) => {
    console.log(chalk.blue(`🌊 Initializing AgentMux project: ${name}`));
    
    const projectDir = path.join(AGENTMUX_DIR, 'projects', name);
    fs.mkdirSync(projectDir, { recursive: true });
    
    // Check and suggest jj installation
    const hasJJ = checkJJ();
    if (!hasJJ) {
      console.log(chalk.yellow('\n⚠️  IMPORTANT: JJ not found!'));
      console.log(chalk.white('   JJ is required for version control. Install with:'));
      console.log(chalk.cyan('   cargo install jj-cli'));
      console.log(chalk.gray('   or'));
      console.log(chalk.cyan('   brew install jj\n'));
    }
    
    // Initialize JJ repo
    if (hasJJ) {
      try {
        execSync('jj init', { cwd: projectDir });
        console.log(chalk.green('  ✓ JJ repository initialized'));
      } catch {
        console.log(chalk.yellow('  ⚠️  Failed to initialize JJ'));
      }
    }
    
    // Create skill file
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    const skillContent = generateSkill(name);
    fs.writeFileSync(path.join(SKILLS_DIR, 'agentmux.md'), skillContent);
    
    // Create shared directory
    const sharedDir = path.join(AGENTMUX_DIR, 'shared', name);
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(path.join(sharedDir, 'plan.md'), '# Plan\n\nAdd your multi-agent plan here.\n');
    fs.writeFileSync(path.join(sharedDir, 'messages.txt'), '# Messages\n\n');
    
    console.log(chalk.green('✅ Project initialized!'));
    
    if (!hasJJ) {
      console.log(chalk.yellow('\n⚠️  Install JJ before starting:'));
      console.log(chalk.cyan('   cargo install jj-cli'));
    }
    
    console.log(chalk.gray(`\nNext steps:`));
    console.log(chalk.gray(`  1. cd ${projectDir}`));
    console.log(chalk.white(`  2. agentmux start    ${chalk.gray('← One command to start everything')}`));
  });

program
  .command('start')
  .description('Start full AgentMux environment with 4 windows')
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

    const session = getSessionName();
    const projectName = path.basename(process.cwd());

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
    
    // Pane 0: Status monitor
    console.log(chalk.gray('Setting up status pane...'));
    execSync(`tmux select-pane -t ${session}:0.0`);
    execSync(`tmux send-keys -t ${session}:0.0 "clear" C-m`);
    setTimeout(() => {
      execSync(`tmux send-keys -t ${session}:0.0 "${process.argv[0]} ${process.argv[1]} status" C-m`);
    }, 500);
    
    // Pane 1: KIMI (top-right)
    if (options.kimi) {
      console.log(chalk.gray('Starting kimi...'));
      execSync(`tmux select-pane -t ${session}:0.1`);
      execSync(`tmux send-keys -t ${session}:0.1 "clear" C-m`);
      const kimiCmd = `AGENTMUX_AGENT=kimi AGENTMUX_PROJECT=${process.cwd()} opencode`;
      execSync(`tmux send-keys -t ${session}:0.1 "${kimiCmd}" C-m`);
    }
    
    // Pane 2: MINIMAX (bottom-left)
    if (options.minimax) {
      console.log(chalk.gray('Starting minimax...'));
      execSync(`tmux select-pane -t ${session}:0.2`);
      execSync(`tmux send-keys -t ${session}:0.2 "clear" C-m`);
      const minimaxCmd = `AGENTMUX_AGENT=minimax AGENTMUX_PROJECT=${process.cwd()} opencode`;
      execSync(`tmux send-keys -t ${session}:0.2 "${minimaxCmd}" C-m`);
    }
    
    // Pane 3: CLAUDE (bottom-right)
    if (options.claude) {
      console.log(chalk.gray('Starting claude...'));
      execSync(`tmux select-pane -t ${session}:0.3`);
      execSync(`tmux send-keys -t ${session}:0.3 "clear" C-m`);
      const claudeCmd = `AGENTMUX_AGENT=claude AGENTMUX_PROJECT=${process.cwd()} claude`;
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
  .command('tmux-start')
  .description('Start tmux session for AgentMux')
  .option('-a, --attach', 'Auto-attach to tmux after starting')
  .action((options: any) => {
    if (!checkTmux()) return;

    const session = getSessionName();
    ensureSession();

    console.log(chalk.green(`✅ tmux session '${session}' ready`));

    if (options.attach) {
      console.log(chalk.blue('\n🔗 Attaching to tmux...'));
      console.log(chalk.gray('   Press Ctrl+B then c to create new window'));
      console.log(chalk.gray('   Press Ctrl+B then n/p to switch windows'));
      console.log(chalk.gray('   Press Ctrl+B then d to detach\n'));
      spawn('tmux', ['attach', '-t', session], { stdio: 'inherit' });
    } else {
      console.log(chalk.yellow('\n👀 To see your agents, run:'));
      console.log(chalk.white('   tmux attach -t ' + session));
      console.log(chalk.gray('\nOr spawn an agent:'));
      console.log(chalk.gray('   agentmux spawn kimi "Your task"'));
    }
  });

program
  .command('attach')
  .description('Attach to the AgentMux tmux session')
  .action(() => {
    if (!checkTmux()) return;

    const session = getSessionName();
    console.log(chalk.blue(`🔗 Attaching to tmux session: ${session}`));
    console.log(chalk.gray('Press Ctrl+B then d to detach\n'));
    spawn('tmux', ['attach', '-t', session], { stdio: 'inherit' });
  });

program
  .command('windows')
  .description('List all tmux windows')
  .action(() => {
    if (!checkTmux()) return;

    const session = getSessionName();
    try {
      const output = exec(`tmux list-windows -t ${session} -F "#I: #W"`);
      console.log(chalk.blue(`\n📋 Windows in ${session}:\n`));
      console.log(output || chalk.gray('  No windows yet'));
    } catch {
      console.log(chalk.red(`❌ No tmux session. Run: agentmux tmux-start`));
    }
  });

program
  .command('spawn <agent> [task...]')
  .description('Spawn an AI agent in a new tmux window')
  .option('-p, --provider <provider>', 'AI provider (kimi, minimax)', 'kimi')
  .action((agent: string, task: string[], options: any) => {
    if (!checkTmux()) return;
    
    ensureSession();
    const session = getSessionName();
    const taskStr = task.join(' ') || 'Start working';
    
    // Determine command based on agent type
    let cmd: string;
    if (agent === 'claude') {
      cmd = 'claude --dangerously-skip-permissions -c';
    } else {
      // Just run opencode interactively - user will select provider in the UI
      cmd = `opencode`;
    }
    
    // Create new tmux window
    const windowName = agent.toLowerCase();
    try {
      execSync(`tmux new-window -t ${session} -n ${windowName}`);
    } catch {
      // Window might already exist
    }
    
    // Set environment variables for skill injection
    const envVars = [
      `AGENTMUX_AGENT=${agent}`,
      `AGENTMUX_PROJECT=${process.cwd()}`,
      `AGENTMUX_SHARED=${path.join(AGENTMUX_DIR, 'shared', path.basename(process.cwd()))}`,
    ];
    
    // Start the agent
    const fullCmd = `${envVars.join(' ')} ${cmd}`;
    execSync(`tmux send-keys -t ${session}:${windowName} "${fullCmd}" C-m`);
    
    // Send initial message about skill
    setTimeout(() => {
      const skillMsg = `echo "📚 AgentMux skill available! Run: am help"`;
      execSync(`tmux send-keys -t ${session}:${windowName} "${skillMsg}" C-m`);
      
      // Send the task
      const taskCmd = `echo "🎯 Task: ${taskStr}"`;
      execSync(`tmux send-keys -t ${session}:${windowName} "${taskCmd}" C-m`);
    }, 1000);
    
    console.log(chalk.green(`✅ Spawned ${agent} in tmux window`));
    console.log(chalk.gray(`   Task: ${taskStr}`));
    console.log(chalk.yellow(`\n👀 To see it, run: tmux attach -t ${session}`));
    console.log(chalk.gray(`   Then press Ctrl+B, then ${windowName === 'kimi' ? '2' : windowName === 'minimax' ? '3' : windowName === 'claude' ? '4' : 'window number'} to switch to ${agent}`));
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
      execSync(`tmux send-keys -t ${session}:${to.toLowerCase()} "${fullMsg}" C-m`);
      console.log(chalk.green(`✅ Message sent to ${to}`));
    } catch (e) {
      console.log(chalk.red(`❌ Failed to send to ${to}. Is the window open?`));
    }
  });

program
  .command('status')
  .description('Show current status of all agents and JJ changes')
  .action(() => {
    console.log(chalk.blue.bold('\n📊 AgentMux Status\n'));
    
    // Show JJ changes
    console.log(chalk.yellow('JJ Changes:'));
    if (checkJJ()) {
      try {
        const log = exec('jj log --no-graph --template "change_id.short() ++ \\" \\" ++ description\\n"');
        if (log) {
          console.log(log);
        } else {
          console.log(chalk.gray('  No changes yet'));
        }
      } catch {
        console.log(chalk.gray('  No JJ repo found'));
      }
    } else {
      console.log(chalk.gray('  JJ not installed'));
    }
    
    // Show tmux windows
    console.log(chalk.yellow('\nActive Agents:'));
    try {
      const windows = exec(`tmux list-windows -t ${getSessionName()} -F "#W"`);
      if (windows) {
        windows.trim().split('\n').forEach((win: string) => {
          if (win !== 'status') {
            console.log(`  • ${win}`);
          }
        });
      }
    } catch {
      console.log(chalk.gray('  No tmux session. Run: agentmux tmux-start'));
    }
    
    // Show recent messages
    console.log(chalk.yellow('\nRecent Messages:'));
    try {
      const sharedDir = path.join(AGENTMUX_DIR, 'shared', path.basename(process.cwd()));
      const messagesPath = path.join(sharedDir, 'messages.txt');
      if (fs.existsSync(messagesPath)) {
        const messages = fs.readFileSync(messagesPath, 'utf-8');
        const lines = messages.split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
        lines.slice(-5).forEach((line: string) => {
          console.log(`  ${line}`);
        });
      } else {
        console.log(chalk.gray('  No messages'));
      }
    } catch {
      console.log(chalk.gray('  No messages'));
    }
    
    console.log();
  });

program
  .command('run <plan>')
  .description('Execute a plan from markdown file')
  .action((planFile: string) => {
    console.log(chalk.blue(`🚀 Executing plan: ${planFile}\n`));
    
    if (!fs.existsSync(planFile)) {
      console.log(chalk.red(`❌ Plan file not found: ${planFile}`));
      return;
    }
    
    const content = fs.readFileSync(planFile, 'utf-8');
    const sections = parsePlan(content);
    
    sections.forEach((section, index) => {
      console.log(chalk.gray(`[${index + 1}/${sections.length}] Spawning @${section.agent}: ${section.task.substring(0, 50)}...`));
      
      // Spawn with delay to avoid overwhelming tmux
      setTimeout(() => {
        const cmd = `agentmux spawn ${section.agent} "${section.task}"`;
        execSync(cmd);
      }, index * 2000);
    });
    
    console.log(chalk.green(`\n✅ Spawned ${sections.length} agents`));
  });

// Helper function to parse markdown plan
function parsePlan(content: string): Array<{agent: string, task: string}> {
  const sections: Array<{agent: string, task: string}> = [];
  const lines = content.split('\n');
  
  let currentAgent: string | null = null;
  let currentTask: string[] = [];
  
  for (const line of lines) {
    // Check for agent header: ## @agent or ## Agent Name
    const match = line.match(/^##\s+@?(\w+).*$/i);
    if (match) {
      // Save previous section
      if (currentAgent && currentTask.length > 0) {
        sections.push({
          agent: currentAgent,
          task: currentTask.join(' ').trim()
        });
      }
      currentAgent = match[1].toLowerCase();
      currentTask = [];
    } else if (currentAgent && line.trim() && !line.startsWith('#')) {
      currentTask.push(line.trim());
    }
  }
  
  // Don't forget the last section
  if (currentAgent && currentTask.length > 0) {
    sections.push({
      agent: currentAgent,
      task: currentTask.join(' ').trim()
    });
  }
  
  return sections;
}

// Helper to generate skill content
function generateSkill(projectName: string): string {
  return `# AgentMux Skill for ${projectName}

You're working in an AgentMux multi-agent environment with JJ version control.

## Quick Commands

### Check Status
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
\`\`\`

See your changes:
\`\`\`bash
jj diff
jj log
\`\`\`

Update your progress:
\`\`\`bash
jj describe -m "@$AGENTMUX_AGENT updated: what changed"
\`\`\`

## Auto-Commit

When you save files, consider running:
\`\`\`bash
jj describe -m "@$AGENTMUX_AGENT: brief description of changes"
\`\`\`

## Communication

To collaborate with other agents:
1. Do your work
2. Commit with descriptive message
3. Message other agents: \`agentmux send <agent> "Check my changes"\`
4. They can see your work via \`jj log\` and \`jj diff -r <your-change-id>\`

## Environment

- Project: ${projectName}
- Shared: ~/.agentmux/shared/${projectName}/
- Messages: ~/.agentmux/shared/${projectName}/messages.txt
`;
}

program.parse();