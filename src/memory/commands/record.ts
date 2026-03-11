import chalk from "chalk";
import { existsSync } from "node:fs";
import { Option } from "commander";
import type { Classification, ExpertiseRecord, RecordType } from "../schema/types.ts";
import {
  addDomain,
  ensureExpertiseDir,
  getExpertisePath,
  readConfig,
} from "../storage/config.ts";
import {
  appendRecord,
  findDuplicate,
  readExpertiseFile,
  writeExpertiseFile,
} from "../storage/store.ts";
import { RECORD_TYPE_REQUIREMENTS } from "../schema/types.ts";

function getAgentName(): string {
  return process.env.AGENTMUX_AGENT || "unknown";
}

export function registerRecordCommand(program: ReturnType<typeof import("commander").Command>): void {
  program
    .command("record")
    .argument("<domain>", "expertise domain")
    .argument("[content]", "record content")
    .description("Record an expertise record")
    .addOption(
      new Option("--type <type>", "record type").choices([
        "convention",
        "failure",
        "decision",
      ]),
    )
    .addOption(
      new Option("--classification <classification>", "classification level")
        .choices(["foundational", "tactical", "observational"])
        .default("tactical"),
    )
    .option("--description <description>", "description of the record")
    .option("--resolution <resolution>", "resolution for failure records")
    .option("--title <title>", "title for decision records")
    .option("--rationale <rationale>", "rationale for decision records")
    .option("--tags <tags>", "comma-separated tags")
    .option("--force", "force recording even if duplicate exists")
    .option("--dry-run", "preview what would be recorded without writing")
    .action(
      async (
        domain: string,
        content: string | undefined,
        options: Record<string, unknown>,
      ) => {
        await ensureExpertiseDir();
        const config = await readConfig();

        if (!config.domains.includes(domain)) {
          await addDomain(domain);
          console.log(chalk.green(`✓ Auto-created domain "${domain}"`));
        }

        if (!options.type) {
          console.error(
            chalk.red(
              "Error: --type is required (convention, failure, decision)",
            ),
          );
          process.exitCode = 1;
          return;
        }

        const recordType = options.type as RecordType;
        const classification = (options.classification as Classification) ?? "tactical";
        const recordedAt = new Date().toISOString();
        const recordedBy = getAgentName();

        const tags =
          typeof options.tags === "string"
            ? options.tags
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean)
            : undefined;

        let record: ExpertiseRecord;

        switch (recordType) {
          case "convention": {
            const conventionContent =
              content ?? (options.description as string | undefined);
            if (!conventionContent) {
              console.error(
                chalk.red(
                  "Error: convention records require content (positional argument or --description).",
                ),
              );
              process.exitCode = 1;
              return;
            }
            record = {
              type: "convention",
              content: conventionContent,
              classification,
              recorded_at: recordedAt,
              recorded_by: recordedBy,
              ...(tags && tags.length > 0 && { tags }),
            };
            break;
          }

          case "failure": {
            const failureDesc = options.description as string | undefined;
            const failureResolution = options.resolution as string | undefined;
            if (!failureDesc || !failureResolution) {
              console.error(
                chalk.red(
                  "Error: failure records require --description and --resolution.",
                ),
              );
              process.exitCode = 1;
              return;
            }
            record = {
              type: "failure",
              description: failureDesc,
              resolution: failureResolution,
              classification,
              recorded_at: recordedAt,
              recorded_by: recordedBy,
              ...(tags && tags.length > 0 && { tags }),
            };
            break;
          }

          case "decision": {
            const decisionTitle = options.title as string | undefined;
            const decisionRationale = options.rationale as string | undefined;
            if (!decisionTitle || !decisionRationale) {
              console.error(
                chalk.red(
                  "Error: decision records require --title and --rationale.",
                ),
              );
              process.exitCode = 1;
              return;
            }
            record = {
              type: "decision",
              title: decisionTitle,
              rationale: decisionRationale,
              classification,
              recorded_at: recordedAt,
              recorded_by: recordedBy,
              ...(tags && tags.length > 0 && { tags }),
            };
            break;
          }
        }

        const filePath = getExpertisePath(domain);
        const dryRun = options.dryRun === true;

        if (dryRun) {
          const existing = await readExpertiseFile(filePath);
          const dup = findDuplicate(existing, record);

          let action = "created";
          if (dup && !options.force) {
            action = "skipped";
          }

          if (action === "created") {
            console.log(
              chalk.green(`✓ Dry-run: Would create ${recordType} in ${domain}`),
            );
          } else {
            console.log(
              chalk.yellow(
                `Dry-run: Duplicate ${recordType} already exists in ${domain}. Would skip.`,
              ),
            );
          }
          console.log(chalk.dim("  Run without --dry-run to apply changes."));
        } else {
          const existing = await readExpertiseFile(filePath);
          const dup = findDuplicate(existing, record);

          if (dup && !options.force) {
            console.log(
              chalk.yellow(
                `Duplicate ${recordType} already exists in ${domain} (record #${dup.index + 1}). Use --force to add anyway.`,
              ),
            );
          } else {
            await appendRecord(filePath, record);
            console.log(
              chalk.green(`✓ Recorded ${recordType} in ${domain}`),
            );
          }
        }
      },
    );
}
