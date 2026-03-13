import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getAgentMuxDir, findAndSetAgentMuxDir } from "../../lib/paths.ts";

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

export { findAndSetAgentMuxDir };
