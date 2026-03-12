import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getAgentMuxDir } from "../../lib/paths.ts";
import { createExpertiseFile } from "./store.ts";

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
    const content = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(content) as MemoryConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: MemoryConfig): Promise<void> {
  await ensureExpertiseDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
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
