import { existsSync } from "node:fs";
import chalk from "chalk";
import { ensureExpertiseDir, readConfig, writeConfig, getExpertisePath } from "../storage/config.ts";
import { createExpertiseFile } from "../storage/store.ts";

export function registerInitCommand(program: ReturnType<typeof import("commander").Command>): void {
  program
    .command("init")
    .description("Initialize agentmux memory storage")
    .action(
      async () => {
        await ensureExpertiseDir();

        const config = await readConfig();

        for (const domain of config.domains) {
          const filePath = getExpertisePath(domain);
          if (!existsSync(filePath)) {
            await createExpertiseFile(filePath);
          }
        }

        console.log(chalk.green("✓ Initialized agentmux memory storage"));
        console.log(chalk.dim(`  Domains: ${config.domains.join(", ")}`));
        console.log(chalk.dim(`  Storage: .agentmux/expertise/`));
      },
    );
}

export function registerAddCommand(program: ReturnType<typeof import("commander").Command>): void {
  program
    .command("add")
    .argument("<domain>", "domain to add")
    .description("Add a new expertise domain")
    .action(
      async (domain: string) => {
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
      },
    );
}
