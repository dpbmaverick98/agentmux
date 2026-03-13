import chalk from "chalk";
import { listPlans, getPlan } from "../storage/registry.ts";
import { getVersionHistory } from "../storage/manifest.ts";

export function timelinePlan(name?: string): void {
  if (name) {
    showPlanTimeline(name);
  } else {
    showAllPlansTimeline();
  }
}

function showPlanTimeline(name: string): void {
  const plan = getPlan(name);
  if (!plan) {
    console.log(chalk.red(`Plan '${name}' not found`));
    return;
  }

  const history = getVersionHistory(plan.name);
  if (history.length === 0) {
    console.log(chalk.yellow("No versions yet. Commit with: am plan commit <name> -m <message>"));
    return;
  }

  console.log(chalk.bold.cyan(`\n╔══════════════════════════════════════════╗`));
  console.log(chalk.bold.cyan(`║  📅 Timeline: ${plan.name.padEnd(28)}║`));
  console.log(chalk.bold.cyan(`╚══════════════════════════════════════════╝\n`));

  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    const isLatest = i === history.length - 1;
    const connector = i === 0 ? "╰" : "╠";
    const branch = i === 0 ? "╯" : "╣";

    const time = new Date(entry.created_at).toLocaleString();
    const versionBadge = isLatest ? chalk.green("●") : "○";
    
    console.log(chalk.gray(`${connector}── ${versionBadge} ${chalk.bold(entry.version)} ${entry.hash}`));
    console.log(chalk.gray(`   ${entry.message}`));
    console.log(chalk.gray(`   by: @${entry.created_by}`));
    
    if (entry.memory_refs.length > 0) {
      console.log(chalk.cyan(`   ${branch}── 💾 Linked memories:`));
      for (const ref of entry.memory_refs.slice(0, 3)) {
        console.log(chalk.gray(`   ${branch}    • ${ref}`));
      }
      if (entry.memory_refs.length > 3) {
        console.log(chalk.gray(`   ${branch}    + ${entry.memory_refs.length - 3} more`));
      }
    }
    
    if (entry.parent) {
      console.log(chalk.gray(`   ${branch}── ↑ parent: ${entry.parent}`));
    }
    
    console.log();
  }

  console.log(chalk.gray("Legend: ● = current, ○ = historical, ↑ = parent version"));
}

function showAllPlansTimeline(): void {
  const plans = listPlans();
  
  if (plans.length === 0) {
    console.log(chalk.yellow("No plans found. Create one with: am plan init <name>"));
    return;
  }

  console.log(chalk.bold.cyan(`\n╔══════════════════════════════════════════╗`));
  console.log(chalk.bold.cyan(`║  📅 All Plans Timeline               ║`));
  console.log(chalk.bold.cyan(`╚══════════════════════════════════════════╝\n`));

  for (const plan of plans) {
    const history = getVersionHistory(plan.name);
    const versionCount = history.length;
    const latest = history[history.length - 1];
    
    console.log(chalk.cyan(`┌── ${chalk.bold(plan.name)}`));
    console.log(chalk.gray(`│   creator: @${plan.creator}`));
    console.log(chalk.gray(`│   versions: ${versionCount}`));
    
    if (latest) {
      console.log(chalk.gray(`│   latest: ${latest.version} ${latest.hash}`));
      console.log(chalk.gray(`│   ${latest.message}`));
      
      if (latest.memory_refs.length > 0) {
        console.log(chalk.cyan(`│   💾 ${latest.memory_refs.length} linked memories`));
      }
    }
    
    const isLast = plan === plans[plans.length - 1];
    console.log(chalk.gray(isLast ? "└" : "├"));
    console.log();
  }

  console.log(chalk.gray("Use 'am plan timeline <name>' for detailed view of a specific plan"));
}
