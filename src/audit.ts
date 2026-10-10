import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Where the tool-call log lives.
//   default : <project root>/logs/tool-calls.jsonl   (src/ and dist/ both sit one level below the root)
//   override: AUDIT_LOG=/some/path.jsonl
//   disable : AUDIT_LOG=off
// The log is OUTSIDE the workspace, so the agent can never read or edit it.
const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOG = path.resolve(here, "..", "logs", "tool-calls.jsonl");

// Resolved at call time (not import time) so tests and scripts can set the env first.
export const auditFile = (): string | null =>
  process.env.AUDIT_LOG === "off" ? null : path.resolve(process.env.AUDIT_LOG ?? DEFAULT_LOG);

const ARG_MAX = 300; // longest string kept for any single argument value
export const resultMax = () => Number(process.env.AUDIT_RESULT_CHARS ?? 500);

export function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}… [+${s.length - max} chars]`;
}

/** Copy tool arguments, shortening long strings (for example a whole file's content). */
export function clipArgs(v: unknown): unknown {
  if (typeof v === "string") return clip(v, ARG_MAX);
  if (Array.isArray(v)) return v.map(clipArgs);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, clipArgs(x)]));
  }
  return v;
}

/** Append one JSON line. Logging must never break a tool call, so errors are swallowed. */
export function audit(entry: Record<string, unknown>): void {
  const file = auditFile();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf8");
  } catch (e) {
    console.error("audit write failed:", e instanceof Error ? e.message : e);
  }
}
