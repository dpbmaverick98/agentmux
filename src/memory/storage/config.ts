import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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

export function findAndSetAgentMuxDir(startDir?: string): string {
  const found = findAgentMuxDir(startDir);
  if (found) {
    cachedAgentMuxDir = found;
    return found;
  }
  throw new Error("No .agentmux/ directory found. Run 'am memory init' first.");
}

const AGENTMUX_DIR = getAgentMuxDir();
const EXPERTISE_DIR = join(AGENTMUX_DIR, "expertise");
const CONFIG_PATH = join(AGENTMUX_DIR, "config.json");

export interface MemoryConfig {
  domains: string[];
  governance: {
    max_entries: number;
    classification_defaults: {
      shelf_life: {
        tactical: number;
        observational: number;
      };
    };
  };
}

const DEFAULT_CONFIG: MemoryConfig = {
  domains: ["project", "tasks", "decisions"],
  governance: {
    max_entries: 100,
    classification_defaults: {
      shelf_life: {
        tactical: 14,
        observational: 30,
      },
    },
  },
};

export function getExpertiseDir(): string {
  return EXPERTISE_DIR;
}

export function getExpertisePath(domain: string): string {
  return join(EXPERTISE_DIR, `${domain}.jsonl`);
}

export function getMulchDir(): string {
  return AGENTMUX_DIR;
}

export async function ensureExpertiseDir(): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  if (!existsSync(EXPERTISE_DIR)) {
    const agentMuxDir = getAgentMuxDir();
    if (!existsSync(agentMuxDir)) {
      await mkdir(agentMuxDir, { recursive: true });
    }
    await mkdir(EXPERTISE_DIR, { recursive: true });
  }
}

export async function readConfig(): Promise<MemoryConfig> {
  await ensureExpertiseDir();
  try {
    const content = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(content) as MemoryConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: MemoryConfig): Promise<void> {
  await ensureExpertiseDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function addDomain(domain: string): Promise<void> {
  const config = await readConfig();
  if (!config.domains.includes(domain)) {
    config.domains.push(domain);
    await writeConfig(config);
  }
  const { mkdir } = await import("node:fs/promises");
  const filePath = getExpertisePath(domain);
  if (!existsSync(filePath)) {
    await createExpertiseFile(filePath);
  }
}

export { createExpertiseFile } from "./store.ts";
