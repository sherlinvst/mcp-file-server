import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ROOT } from "./sandbox.js";

const run = promisify(execFile);

export async function git(args: string[]): Promise<string> {
  const { stdout, stderr } = await run("git", args, {
    cwd: ROOT, timeout: 15_000, maxBuffer: 1_000_000,
  });
  return (stdout + stderr).trim();
}

export async function ensureRepo() {
  try {
    await git(["rev-parse", "--git-dir"]);
  } catch {
    await git(["init"]);
    await git(["config", "user.name", "mcp-agent"]);
    await git(["config", "user.email", "agent@localhost"]);
  }
}