import { renameSync, unlinkSync, writeFileSync } from "node:fs";

export function atomicWrite(path: string, content: string): void {
  const tmpPath = `${path}.tmp.${Date.now()}`;
  writeFileSync(tmpPath, content, "utf-8");
  try {
    renameSync(tmpPath, path);
  } catch (err) {
    try {
      unlinkSync(tmpPath);
    } catch {}
    throw err;
  }
}
