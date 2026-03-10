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
  .command('init <name>')
  .description('Initialize a new AgentMux project')
  .action((name: string) => {
    console.log(chalk.blue(`🌊 Initializing AgentMux project: ${name}`));
    
    const projectDir = path.join(AGENTMUX_DIR, 'projects', name);
    fs.mkdirSync(projectDir, { recursive: true });
    
    // Initialize JJ repo
    if (checkJJ()) {
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
    console.log(chalk.gray(`\nNext steps:`));
    console.log(chalk.gray(`  1. cd ${projectDir}`));
    console.log(chalk.gray(`  2. agentmux tmux-start`));
    console.log(chalk.gray(`  3. agentmux spawn kimi "Your task"`));
  });

program
  .command('tmux-start')
  .description('Start tmux session for AgentMux')
  .action(() => {
    if (!checkTmux()) return;
    
    const session = getSessionName();
    ensureSession();
    
    console.log(chalk.green(`✅ tmux session '${session}' ready`));
    console.log(chalk.gray('\nAttach with: tmux attach -t ' + session));
    console.log(chalk.gray('Or use: agentmux spawn <agent> <task>'));
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
      const provider = options.provider || 'kimi';
      cmd = `opencode run --provider ${provider} --model ${provider === 'kimi' ? 'kimi-k2.5' : 'MiniMax-M2.5'} -c`;
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
    console.log(chalk.gray(`   Switch: tmux select-window -t ${session}:${windowName}`));
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