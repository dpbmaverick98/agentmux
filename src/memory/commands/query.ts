import { Option } from "commander";
import chalk from "chalk";
import {
  filterByClassification,
  filterByType,
  getFileModTime,
  readExpertiseFile,
} from "../storage/store.ts";
import { getExpertisePath, readConfig } from "../storage/config.ts";

function formatRecord(record: ReturnType<typeof import("../schema/types.ts").ExpertiseRecord>): string {
  const r = record as import("../schema/types.ts").ExpertiseRecord;
  switch (r.type) {
    case "convention":
      return `- ${r.content}`;
    case "failure":
      return `- ${r.description}\n  → ${r.resolution}`;
    case "decision":
      return `- **${r.title}**: ${r.rationale}`;
  }
}

function formatDomainExpertise(
  domain: string,
  records: ReturnType<typeof import("../schema/types.ts").ExpertiseRecord>[],
  lastUpdated: Date | null,
): string {
  const byType: Record<string, typeof records> = {
    convention: [],
    failure: [],
    decision: [],
  };

  for (const r of records) {
    byType[r.type].push(r);
  }

  const lines: string[] = [];
  lines.push(`## ${domain}`);

  if (lastUpdated) {
    const ago = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60));
    lines.push(`(${records.length} entries, updated ${ago}h ago)`);
  }

  if (byType.convention.length > 0) {
    lines.push("\n### Conventions");
    for (const r of byType.convention) {
      lines.push(formatRecord(r));
    }
  }

  if (byType.failure.length > 0) {
    lines.push("\n### Known Failures");
    for (const r of byType.failure) {
      lines.push(formatRecord(r));
    }
  }

  if (byType.decision.length > 0) {
    lines.push("\n### Decisions");
    for (const r of byType.decision) {
      lines.push(formatRecord(r));
    }
  }

  return lines.join("\n");
}

export function registerQueryCommand(program: ReturnType<typeof import("commander").Command>): void {
  program
    .command("query")
    .argument("[domain]", "expertise domain to query")
    .description("Query expertise records")
    .option("--type <type>", "filter by record type")
    .addOption(
      new Option(
        "--classification <classification>",
        "filter by classification",
      ).choices(["foundational", "tactical", "observational"]),
    )
    .option("--all", "show all domains")
    .action(
      async (domain: string | undefined, options: Record<string, unknown>) => {
        const config = await readConfig();

        const domainsToQuery: string[] = [];

        if (options.all) {
          domainsToQuery.push(...config.domains);
          if (domainsToQuery.length === 0) {
            console.log(
              "No domains configured. Run `am memory init` first, then `am memory record` to add entries.",
            );
            return;
          }
        } else if (domain) {
          if (!config.domains.includes(domain)) {
            console.error(
              chalk.red(`Error: Domain "${domain}" not found in config.`),
            );
            console.error(
              `Hint: Run \`am memory add ${domain}\` to create this domain.`,
            );
            process.exitCode = 1;
            return;
          }
          domainsToQuery.push(domain);
        } else {
          console.error(
            chalk.red("Error: Please specify a domain or use --all to query all domains."),
          );
          process.exitCode = 1;
          return;
        }

        const sections: string[] = [];
        for (const d of domainsToQuery) {
          const filePath = getExpertisePath(d);
          let records = await readExpertiseFile(filePath);
          const lastUpdated = await getFileModTime(filePath);

          if (options.type) {
            records = filterByType(records, options.type as string);
          }
          if (options.classification) {
            records = filterByClassification(
              records,
              options.classification as string,
            );
          }

          if (records.length > 0) {
            sections.push(formatDomainExpertise(d, records, lastUpdated));
          }
        }

        if (sections.length > 0) {
          console.log(sections.join("\n\n"));
        } else {
          console.log(chalk.yellow("No records found."));
        }
      },
    );
}
