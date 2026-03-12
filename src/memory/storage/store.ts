import { createHash } from "node:crypto";
import {
  appendFile,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import type { ExpertiseRecord, RecordType } from "../schema/types.ts";
import { getExpertisePath } from "./config.ts";

const ENCODING = "utf-8";

export async function findAndUpdateMemoryPlanRef(
  memoryRef: string,
  planRef: string,
): Promise<boolean> {
  const { readConfig } = await import("./config.ts");
  const config = await readConfig();
  
  for (const domain of config.domains) {
    const filePath = getExpertisePath(domain);
    const records = await readExpertiseFile(filePath);
    const record = findRecordById(records, memoryRef);
    
    if (record) {
      if (!record.plan_refs) {
        record.plan_refs = [];
      }
      if (!record.plan_refs.includes(planRef)) {
        record.plan_refs.push(planRef);
        await writeExpertiseFile(filePath, records);
      }
      return true;
    }
  }
  return false;
}

export async function readExpertiseFile(
  filePath: string,
): Promise<ExpertiseRecord[]> {
  let content: string;
  try {
    content = await readFile(filePath, ENCODING);
  } catch {
    return [];
  }

  const records: ExpertiseRecord[] = [];
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    records.push(JSON.parse(line) as ExpertiseRecord);
  }
  return records;
}

export function generateRecordId(record: ExpertiseRecord): string {
  let key: string;
  switch (record.type) {
    case "convention":
      key = `convention:${record.content}`;
      break;
    case "failure":
      key = `failure:${record.description}`;
      break;
    case "decision":
      key = `decision:${record.title}`;
      break;
  }
  return `am-${createHash("sha256").update(key).digest("hex").slice(0, 6)}`;
}

export async function appendRecord(
  filePath: string,
  record: ExpertiseRecord,
): Promise<void> {
  if (!record.id) {
    record.id = generateRecordId(record);
  }
  const line = `${JSON.stringify(record)}\n`;
  await appendFile(filePath, line, ENCODING);
}

export async function createExpertiseFile(filePath: string): Promise<void> {
  await writeFile(filePath, "", ENCODING);
}

export async function getFileModTime(filePath: string): Promise<Date | null> {
  try {
    const stats = await stat(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

export async function writeExpertiseFile(
  filePath: string,
  records: ExpertiseRecord[],
): Promise<void> {
  for (const r of records) {
    if (!r.id) {
      r.id = generateRecordId(r);
    }
  }
  const content =
    records.map((r) => JSON.stringify(r)).join("\n") +
    (records.length > 0 ? "\n" : "");
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await writeFile(tmpPath, content, ENCODING);
  try {
    await rename(tmpPath, filePath);
  } catch (err) {
    try {
      await unlink(tmpPath);
    } catch {
      /* best-effort cleanup */
    }
    throw err;
  }
}

export function filterByType(
  records: ExpertiseRecord[],
  type: string,
): ExpertiseRecord[] {
  return records.filter((r) => r.type === type);
}

export function filterByClassification(
  records: ExpertiseRecord[],
  classification: string,
): ExpertiseRecord[] {
  return records.filter((r) => r.classification === classification);
}

export function findDuplicate(
  existing: ExpertiseRecord[],
  newRecord: ExpertiseRecord,
): { index: number; record: ExpertiseRecord } | null {
  for (let i = 0; i < existing.length; i++) {
    const record = existing[i];
    if (record.type !== newRecord.type) continue;

    switch (record.type) {
      case "convention":
        if (
          newRecord.type === "convention" &&
          record.content === newRecord.content
        ) {
          return { index: i, record };
        }
        break;
      case "failure":
        if (
          newRecord.type === "failure" &&
          record.description === newRecord.description
        ) {
          return { index: i, record };
        }
        break;
      case "decision":
        if (
          newRecord.type === "decision" &&
          record.title === newRecord.title
        ) {
          return { index: i, record };
        }
        break;
    }
  }
  return null;
}

export function countRecords(records: ExpertiseRecord[]): number {
  return records.length;
}

export function findRecordById(
  records: ExpertiseRecord[],
  id: string,
): ExpertiseRecord | null {
  return records.find(r => r.id === id) || null;
}
