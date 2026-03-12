import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getManifestPath, ensurePlanDir, getPlanDir, getCurrentSymlinkPath } from "./config.ts";

export interface ManifestEntry {
  version: string;
  hash: string;
  parent: string | null;
  message: string;
  created_at: string;
  memory_refs: string[];
}

function readManifest(planName: string): ManifestEntry[] {
  const manifestPath = getManifestPath(planName);
  if (!existsSync(manifestPath)) return [];
  
  const content = readFileSync(manifestPath, "utf-8");
  if (!content.trim()) return [];
  return content.trim().split("\n").map(line => JSON.parse(line) as ManifestEntry);
}

function writeManifest(planName: string, entries: ManifestEntry[]): void {
  ensurePlanDir(planName);
  const manifestPath = getManifestPath(planName);
  const content = entries.map(e => JSON.stringify(e)).join("\n");
  writeFileSync(manifestPath, content + "\n", "utf-8");
}

export function getVersionHistory(planName: string): ManifestEntry[] {
  return readManifest(planName);
}

export function getLatestVersion(planName: string): ManifestEntry | null {
  const history = readManifest(planName);
  if (history.length === 0) return null;
  return history[history.length - 1];
}

export function getVersion(planName: string, version: string): ManifestEntry | null {
  const history = readManifest(planName);
  return history.find(e => e.version === version) || null;
}

export function addVersion(
  planName: string,
  message: string,
  content: string
): ManifestEntry {
  const history = readManifest(planName);
  const latest = history.length > 0 ? history[history.length - 1] : null;
  
  const versionNum = history.length + 1;
  const hash = generateHash(content);
  
  const entry: ManifestEntry = {
    version: `v${versionNum}`,
    hash,
    parent: latest ? latest.version : null,
    message,
    created_at: new Date().toISOString(),
    memory_refs: [],
  };
  
  history.push(entry);
  writeManifest(planName, history);
  
  return entry;
}

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 6);
}

export function addMemoryRef(planName: string, version: string, memoryRef: string): void {
  const history = readManifest(planName);
  const entry = history.find(e => e.version === version);
  if (!entry) {
    throw new Error(`Version ${version} not found in plan ${planName}`);
  }
  if (!entry.memory_refs.includes(memoryRef)) {
    entry.memory_refs.push(memoryRef);
    writeManifest(planName, history);
  }
}

export function updateCurrentSymlink(planName: string, version: string, hash: string): void {
  const planDir = getPlanDir(planName);
  const versionFile = `v${version}-${hash}.md`;
  const symlinkPath = getCurrentSymlinkPath(planName);
  
  const { symlinkSync, existsSync, unlinkSync } = require("node:fs");
  
  if (existsSync(symlinkPath)) {
    unlinkSync(symlinkPath);
  }
  
  symlinkSync(versionFile, symlinkPath);
}
