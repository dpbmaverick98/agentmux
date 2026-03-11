import { Command } from "commander";
import { registerRecordCommand } from "./commands/record.ts";
import { registerQueryCommand } from "./commands/query.ts";
import { registerInitCommand } from "./commands/init.ts";
import { readConfig } from "./storage/config.ts";

export function createMemoryCLI() {
  const program = new Command();
  
  program
    .name("am memory")
    .description("AgentMux memory system - structured expertise management")
    .version("1.0.0");

  registerInitCommand(program);
  registerRecordCommand(program);
  registerQueryCommand(program);

  return program;
}

export async function runMemoryCLI(args: string[]) {
  const program = createMemoryCLI();
  
  try {
    await program.parseAsync(args);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
