import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getPlansDir, ensurePlansDir, getAgentName } from "./config.ts";

export interface PlanRegistryEntry {
  name: string;
  creator: string;
  created_at: string;
  path: string;
}

function getIndexPath(): string {
  return `${getPlansDir()}/index.jsonl`;
}

function ensureIndex(): void {
  ensurePlansDir();
  const indexPath = getIndexPath();
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, "", "utf-8");
  }
}

function readIndex(): PlanRegistryEntry[] {
  ensureIndex();
  const indexPath = getIndexPath();
  const content = readFileSync(indexPath, "utf-8");
  if (!content.trim()) return [];
  return content.trim().split("\n").map(line => JSON.parse(line) as PlanRegistryEntry);
}

function writeIndex(entries: PlanRegistryEntry[]): void {
  const indexPath = getIndexPath();
  const content = entries.map(e => JSON.stringify(e)).join("\n");
  writeFileSync(indexPath, content + "\n", "utf-8");
}

export function listPlans(): PlanRegistryEntry[] {
  return readIndex();
}

export function getPlan(name: string): PlanRegistryEntry | undefined {
  const entries = readIndex();
  
  const exact = entries.find(e => e.name === name);
  if (exact) return exact;
  
  const parts = name.split('/');
  const shortName = parts[parts.length - 1];
  
  return entries.find(e => {
    const eParts = e.name.split('/');
    const eShortName = eParts[eParts.length - 1];
    return eShortName === shortName || e.name.endsWith(name);
  });
}

export function planExists(name: string): boolean {
  return getPlan(name) !== undefined;
}

export function createPlan(name: string): PlanRegistryEntry {
  const entries = readIndex();
  
  const existing = entries.find(e => e.name === name);
  if (existing) {
    throw new Error(`Plan '${name}' already exists`);
  }
  
  const agentName = getAgentName();
  const fullName = name.startsWith("@") ? name : `@${agentName}/${name}`;
  
  const entry: PlanRegistryEntry = {
    name: fullName,
    creator: agentName,
    created_at: new Date().toISOString(),
    path: `plans/${fullName}`,
  };
  
  entries.push(entry);
  writeIndex(entries);
  
  return entry;
}
