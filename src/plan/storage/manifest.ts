import { existsSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { getManifestPath, ensurePlanDir, getPlanDir, getCurrentSymlinkPath, getAgentName } from "./config.ts";
import { atomicWrite } from "./util.ts";

export interface ManifestEntry {
  version: string;
  hash: string;
  parent: string | null;
  message: string;
  created_at: string;
  created_by: string;
  memory_refs: string[];
}

function readManifest(planName: string): ManifestEntry[] {
  const manifestPath = getManifestPath(planName);
  if (!existsSync(manifestPath)) return [];
  
  const content = readFileSync(manifestPath, "utf-8");
  if (!content.trim()) return [];
  
  const entries: ManifestEntry[] = [];
  const lines = content.trim().split("\n");
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as ManifestEntry);
    } catch {
      // Skip corrupted line, continue reading
    }
  }
  return entries;
}

function writeManifest(planName: string, entries: ManifestEntry[]): void {
  ensurePlanDir(planName);
  const manifestPath = getManifestPath(planName);
  const content = entries.map(e => JSON.stringify(e)).join("\n") + "\n";
  atomicWrite(manifestPath, content);
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
    version: `${versionNum}`,
    hash,
    parent: latest ? latest.version : null,
    message,
    created_at: new Date().toISOString(),
    created_by: getAgentName(),
    memory_refs: [],
  };
  
  history.push(entry);
  writeManifest(planName, history);
  
  return entry;
}

function generateHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
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
  
  if (existsSync(symlinkPath)) {
    unlinkSync(symlinkPath);
  }
  
  symlinkSync(versionFile, symlinkPath);
}
