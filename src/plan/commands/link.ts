import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getPlan } from "../storage/registry.ts";
import { addMemoryRef, getLatestVersion, getVersion } from "../storage/manifest.ts";
import { getPlanDir } from "../storage/config.ts";

export async function linkMemory(planName: string, memoryRef: string, version?: string): Promise<void> {
  const plan = getPlan(planName);
  if (!plan) {
    console.log(chalk.red(`Plan '${planName}' not found`));
    return;
  }
  
  let targetVersion = version;
  
  if (!targetVersion) {
    const latest = getLatestVersion(plan.name);
    if (!latest) {
      console.log(chalk.red("No versions in this plan. Commit first with: am plan commit"));
      return;
    }
    targetVersion = latest.version;
  }
  
  const versionEntry = getVersion(plan.name, targetVersion);
  if (!versionEntry) {
    console.log(chalk.red(`Version '${targetVersion}' not found in plan '${planName}'`));
    return;
  }
  
  addMemoryRef(plan.name, targetVersion, memoryRef);
  
  console.log(chalk.green(`✓ Linked ${memoryRef} to ${plan.name}@${targetVersion}`));
}

export async function showPlanWithMemory(name: string): Promise<void> {
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
  
  const versionPath = `${getPlanDir(plan.name)}/v${latest.version}-${latest.hash}.md`;
  
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
    console.log(chalk.cyan(`\nLinked Memories (${latest.memory_refs.length}):`));
    for (const ref of latest.memory_refs) {
      console.log(chalk.gray(`  • ${ref}`));
    }
  }
  console.log(chalk.bold("\n---\n"));
  console.log(content);
  
  if (latest.memory_refs.length > 0) {
    console.log(chalk.bold("\n---\n"));
    console.log(chalk.cyan("Linked Memory Records:"));
    console.log(chalk.gray("(Use 'am memory query --all' to see full records)\n"));
  }
}
