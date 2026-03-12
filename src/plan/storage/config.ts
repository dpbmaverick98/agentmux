import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

let cachedAgentMuxDir: string | null = null;

function findAgentMuxDir(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;
  const root = "/";
  
  while (currentDir !== root) {
    const candidate = join(currentDir, ".agentmux");
    if (existsSync(candidate)) {
      return candidate;
    }
    currentDir = dirname(currentDir);
  }
  
  return null;
}

function getAgentMuxDir(): string {
  if (cachedAgentMuxDir) {
    return cachedAgentMuxDir;
  }
  
  const found = findAgentMuxDir();
  if (found) {
    cachedAgentMuxDir = found;
    return found;
  }
  
  const cwd = process.cwd();
  const defaultDir = join(cwd, ".agentmux");
  cachedAgentMuxDir = defaultDir;
  return defaultDir;
}

export function findAndSetPlanDir(startDir?: string): string {
  const found = findAgentMuxDir(startDir);
  if (found) {
    cachedAgentMuxDir = found;
    return found;
  }
  throw new Error("No .agentmux/ directory found. Run 'am memory init' first.");
}

const AGENTMUX_DIR = getAgentMuxDir();
const PLANS_DIR = join(AGENTMUX_DIR, "plans");

export function getPlansDir(): string {
  return PLANS_DIR;
}

export function getPlanDir(name: string): string {
  return join(PLANS_DIR, name);
}

export function getManifestPath(planName: string): string {
  return join(PLANS_DIR, planName, "manifest.jsonl");
}

export function getVersionPath(planName: string, version: string, hash: string): string {
  return join(PLANS_DIR, planName, `v${version}-${hash}.md`);
}

export function getCurrentSymlinkPath(planName: string): string {
  return join(PLANS_DIR, planName, "current.md");
}

export function ensurePlansDir(): void {
  if (!existsSync(PLANS_DIR)) {
    mkdirSync(PLANS_DIR, { recursive: true });
  }
}

export function ensurePlanDir(name: string): void {
  const planDir = getPlanDir(name);
  if (!existsSync(planDir)) {
    mkdirSync(planDir, { recursive: true });
  }
}

export function getAgentName(): string {
  return process.env.AGENTMUX_AGENT || "unknown";
}
