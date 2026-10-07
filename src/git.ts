import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./sandbox.js";

const run = promisify(execFile);

export async function git(args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await run("git", args, {
      cwd: ROOT,
      timeout: 15_000,
      maxBuffer: 1_000_000,
      env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(ROOT) },
    });
    return (stdout + stderr).trim();
  } catch (e: any) {
    const detail = [e.stdout, e.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`git ${args[0]} failed: ${detail || e.message}`);
  }
}

export async function ensureRepo() {
  if (fs.existsSync(path.join(ROOT, ".git"))) return;
  await git(["init"]);
  await git(["config", "user.name", "mcp-agent"]);
  await git(["config", "user.email", "agent@localhost"]);
  await git(["add", "-A"]);
  await git(["commit", "-m", "Initial workspace", "--allow-empty"]);
}