import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getPlan, planExists } from "../storage/registry.ts";
import { addVersion, getLatestVersion, updateCurrentSymlink, getVersionHistory } from "../storage/manifest.ts";
import { getPlanDir, getVersionPath, getAgentName } from "../storage/config.ts";

export async function commitPlan(name: string, message: string): Promise<void> {
  const plan = getPlan(name);
  if (!plan) {
    console.log(chalk.red(`Plan '${name}' not found`));
    console.log(chalk.gray("Create it with: am plan init <name>"));
    return;
  }
  
  const planDir = getPlanDir(plan.name);
  const draftPath = `${planDir}/draft.md`;
  const rootPlanPath = `${process.cwd()}/plan.md`;
  
  let content: string;
  let sourcePath: string;
  
  // Read from draft.md first, then root plan.md
  if (existsSync(draftPath)) {
    sourcePath = draftPath;
    content = readFileSync(draftPath, "utf-8");
  } else if (existsSync(rootPlanPath)) {
    sourcePath = rootPlanPath;
    content = readFileSync(rootPlanPath, "utf-8");
  } else {
    console.log(chalk.red("No plan content found"));
    console.log(chalk.gray("Create draft.md in plan dir or plan.md in project root"));
    return;
  }
  
  const entry = addVersion(plan.name, message, content);
  const versionPath = getVersionPath(plan.name, entry.version, entry.hash);
  
  writeFileSync(versionPath, content, "utf-8");
  
  try {
    updateCurrentSymlink(plan.name, entry.version, entry.hash);
  } catch {
    console.log(chalk.yellow("⚠ Could not create current.md symlink (Windows?)"));
  }
  
  console.log(chalk.green(`✓ Committed ${entry.version}-${entry.hash}`));
  console.log(chalk.gray(`  Message: ${message}`));
  console.log(chalk.gray(`  Source: ${sourcePath}`));
}

export async function logPlan(name: string): Promise<void> {
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
  
  console.log(chalk.bold(`\nPlan: ${plan.name}\n`));
  
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    const time = new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const memoryCount = entry.memory_refs.length > 0 ? ` (${entry.memory_refs.length} memories)` : "";
    console.log(chalk.cyan(`  ${entry.version}-${entry.hash}  ${time}`));
    console.log(chalk.gray(`    ${entry.message}${memoryCount}`));
    if (entry.parent) {
      console.log(chalk.gray(`    parent: ${entry.parent}`));
    }
    console.log(chalk.gray(`    by: @${entry.created_by}`));
    console.log();
  }
}

export async function showPlan(name: string): Promise<void> {
  const plan = getPlan(name);
  if (!plan) {
    console.log(chalk.red(`Plan '${name}' not found`));
    return;
  }
  
  const latest = getLatestVersion(plan.name);
  if (!latest) {
    console.log(chalk.yellow("No versions yet. Commit with: am plan commit <name> -m <message>"));
    return;
  }
  
  const versionPath = getVersionPath(plan.name, latest.version, latest.hash);
  
  if (!existsSync(versionPath)) {
    console.log(chalk.red(`Version file not found: ${versionPath}`));
    return;
  }
  
  const content = readFileSync(versionPath, "utf-8");
  
  console.log(chalk.bold(`\n${plan.name} - ${latest.version}\n`));
  console.log(chalk.gray(`Hash: ${latest.hash}`));
  console.log(chalk.gray(`Message: ${latest.message}`));
  console.log(chalk.gray(`Created: ${new Date(latest.created_at).toLocaleString()}`));
  if (latest.memory_refs.length > 0) {
    console.log(chalk.gray(`Memory refs: ${latest.memory_refs.join(", ")}`));
  }
  console.log(chalk.bold("\n---\n"));
  console.log(content);
}
