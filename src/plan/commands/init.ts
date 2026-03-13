import chalk from "chalk";
import { createPlan, planExists, listPlans } from "../storage/registry.ts";
import { ensurePlanDir, ensurePlansDir } from "../storage/config.ts";

export async function initPlan(name: string): Promise<void> {
  ensurePlansDir();
  
  if (planExists(name)) {
    console.log(chalk.yellow(`Plan '${name}' already exists`));
    return;
  }
  
  const entry = createPlan(name);
  ensurePlanDir(entry.name);
  
  console.log(chalk.green(`✓ Created plan '${entry.name}'`));
  console.log(chalk.gray(`  Creator: ${entry.creator}`));
  console.log(chalk.gray(`  Created: ${new Date(entry.created_at).toLocaleString()}`));
  console.log(chalk.gray(`  Path: ${entry.path}/`));
  console.log();
  console.log(chalk.cyan("Next steps:"));
  console.log(chalk.gray(`  1. Create your initial plan content`));
  console.log(chalk.gray(`  2. Run: am plan commit ${name} -m "Initial plan"`));
}

export async function listPlanCommand(): Promise<void> {
  const plans = listPlans();
  
  if (plans.length === 0) {
    console.log(chalk.yellow("No plans found. Create one with: am plan init <name>"));
    return;
  }
  
  console.log(chalk.bold("\nPlans:\n"));
  plans.forEach(plan => {
    console.log(chalk.cyan(`  ${plan.name}`));
    console.log(chalk.gray(`    creator: ${plan.creator}`));
    console.log(chalk.gray(`    created: ${new Date(plan.created_at).toLocaleString()}`));
    console.log();
  });
}
