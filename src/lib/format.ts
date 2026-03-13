import type { ExpertiseRecord } from "../memory/schema/types.ts";

export type FormatStyle = "compact" | "full" | "injection";

export function formatRecord(record: ExpertiseRecord, style: FormatStyle = "compact"): string {
  switch (style) {
    case "compact":
      return formatCompact(record);
    case "full":
      return formatFull(record);
    case "injection":
      return formatForInjection(record);
    default:
      return formatCompact(record);
  }
}

function formatCompact(record: ExpertiseRecord): string {
  switch (record.type) {
    case "convention":
      return `- ${record.content}`;
    case "failure":
      return `- ${record.description}\n  → ${record.resolution}`;
    case "decision":
      return `- **${record.title}**: ${record.rationale}`;
  }
}

function formatFull(record: ExpertiseRecord): string {
  const base = `[${record.type}] ${record.classification}`;
  switch (record.type) {
    case "convention":
      return `${base}: ${record.content}`;
    case "failure":
      return `${base}: ${record.description} → ${record.resolution}`;
    case "decision":
      return `${base}: ${record.title}: ${record.rationale}`;
  }
}

function formatForInjection(record: ExpertiseRecord): string {
  switch (record.type) {
    case "convention":
      return `[context] ${record.content}`;
    case "failure":
      return `[context] ${record.description} → ${record.resolution}`;
    case "decision":
      return `[context] ${record.title}: ${record.rationale}`;
  }
}

export function getRecordText(record: ExpertiseRecord): string {
  switch (record.type) {
    case "convention":
      return record.content;
    case "failure":
      return `${record.description} ${record.resolution}`;
    case "decision":
      return `${record.title} ${record.rationale}`;
  }
}
