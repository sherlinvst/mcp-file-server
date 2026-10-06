import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";

const configured = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");
fs.mkdirSync(configured, { recursive: true });
export const ROOT = fs.realpathSync.native(configured);

const inside = (p: string) => p === ROOT || p.startsWith(ROOT + path.sep);

export async function resolveSafe(rel: string): Promise<string> {
  if (rel.includes("\0")) throw new Error("Invalid path");
  const abs = path.resolve(ROOT, rel);
  if (!inside(abs)) throw new Error(`Path escapes workspace: ${rel}`);

  let probe = abs;
  for (;;) {
    try {
      const real = await fsp.realpath(probe);
      if (!inside(real)) throw new Error(`Symlink escapes workspace: ${rel}`);
      break;
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  return abs;
}

export const toRel = (abs: string) => path.relative(ROOT, abs) || ".";