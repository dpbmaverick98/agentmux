import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

let cachedAgentMuxDir: string | null = null;

export function findAgentMuxDir(startDir: string = process.cwd()): string | null {
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

export function getAgentMuxDir(): string {
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

export function findAndSetAgentMuxDir(startDir?: string): string {
  const found = findAgentMuxDir(startDir);
  if (found) {
    cachedAgentMuxDir = found;
    return found;
  }
  throw new Error("No .agentmux/ directory found. Run 'am memory init' first.");
}

export function clearAgentMuxDirCache(): void {
  cachedAgentMuxDir = null;
}
