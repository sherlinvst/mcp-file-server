import { z } from "zod";
import fsp from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveSafe, toRel, ROOT } from "./sandbox.js";
import { git } from "./git.js";

const MAX_BYTES = 1_000_000;

const HANDOFF = new Set(
  ["PROJECT_STATE.md", "PLAN_LOG.md", "CHECKPOINTS.md", "DECISIONS.md"].map((n) => n.toLowerCase())
);

const APPEND_ONLY = new Set(
  ["PLAN_LOG.md", "CHECKPOINTS.md", "DECISIONS.md"].map((n) => n.toLowerCase())
);

const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });
const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }],
});


const canon = (abs: string) =>
  toRel(abs)
    .split(path.sep)
    .map((seg) => seg.split(":")[0].replace(/[. ]+$/, "").toLowerCase())
    .join("/");

const inGit = (abs: string) => canon(abs).split("/")[0] === ".git";

const blockGit = (abs: string) => {
  if (inGit(abs)) throw new Error("Access to .git is not allowed");
};

const blockAppendOnly = (abs: string) => {
  if (APPEND_ONLY.has(canon(abs))) {
    throw new Error("Append-only file: use append_file instead");
  }
};

const isHandoff = (abs: string) => HANDOFF.has(canon(abs));

export function registerTools(server: McpServer) {
  // 1. list_files
  server.registerTool("list_files", {
    description: "List files and folders at a path inside the workspace. Folders end with '/'. Paths are relative to the workspace root; use '.' for the root.",
    inputSchema: { path: z.string().default(".").describe("Relative path, e.g. 'notes' or '.'") },
  }, async ({ path: p }) => {
    try {
      const abs = await resolveSafe(p);
      blockGit(abs);
      const entries = await fsp.readdir(abs, { withFileTypes: true });
      const lines = entries
        .filter((e) => e.name.toLowerCase() !== ".git")
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
      return ok(lines.join("\n") || "(empty)");
    } catch (e) { return fail(e); }
  });

  // 2. read_file
  server.registerTool("read_file", {
    description: "Read a UTF-8 text file inside the workspace. Optional start/end line (1-indexed) to read part of a file. Files over 1 MB are refused.",
    inputSchema: {
      path: z.string(),
      start: z.number().int().min(1).optional(),
      end: z.number().int().min(1).optional(),
    },
  }, async ({ path: p, start, end }) => {
    try {
      const abs = await resolveSafe(p);
      blockGit(abs);
      const st = await fsp.stat(abs);
      if (st.size > MAX_BYTES) throw new Error(`File too large (${st.size} bytes)`);
      let text = await fsp.readFile(abs, "utf8");
      if (start || end) {
        const lines = text.split("\n");
        text = lines.slice((start ?? 1) - 1, end ?? lines.length).join("\n");
      }
      return ok(text);
    } catch (e) { return fail(e); }
  });

  // 3. write_file
  server.registerTool("write_file", {
    description: "Create or overwrite a text file (parent folders are created). Prefer str_replace for editing existing files. Cannot be used on PLAN_LOG.md, CHECKPOINTS.md or DECISIONS.md: use append_file for those.",
    inputSchema: { path: z.string(), content: z.string().max(MAX_BYTES) },
  }, async ({ path: p, content }) => {
    try {
      const abs = await resolveSafe(p);
      blockGit(abs);
      blockAppendOnly(abs);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, content, "utf8");
      return ok(`Wrote ${content.length} chars to ${toRel(abs)}`);
    } catch (e) { return fail(e); }
  });

  // 4. str_replace
  server.registerTool("str_replace", {
    description: "Replace exactly one occurrence of old_str with new_str in a file. Fails if old_str is missing or appears more than once (add more surrounding context). Cannot be used on PLAN_LOG.md, CHECKPOINTS.md or DECISIONS.md: use append_file for those.",
    inputSchema: { path: z.string(), old_str: z.string().min(1), new_str: z.string() },
  }, async ({ path: p, old_str, new_str }) => {
    try {
      const abs = await resolveSafe(p);
      blockGit(abs);
      blockAppendOnly(abs);
      const text = await fsp.readFile(abs, "utf8");
      const count = text.split(old_str).length - 1;
      if (count === 0) throw new Error("old_str not found");
      if (count > 1) throw new Error(`old_str appears ${count} times; include more context to make it unique`);
      await fsp.writeFile(abs, text.replace(old_str, () => new_str), "utf8");
      return ok(`Replaced 1 occurrence in ${toRel(abs)}`);
    } catch (e) { return fail(e); }
  });

  // 5. delete_file
  server.registerTool("delete_file", {
    description: "Delete a single file. Cannot delete folders, .git, or the handoff files (PROJECT_STATE, PLAN_LOG, CHECKPOINTS, DECISIONS).",
    inputSchema: { path: z.string() },
  }, async ({ path: p }) => {
    try {
      const abs = await resolveSafe(p);
      if (abs === ROOT) throw new Error("Cannot delete the workspace root");
      blockGit(abs);
      if (isHandoff(abs)) throw new Error("Protected handoff file: cannot delete");
      const st = await fsp.stat(abs);
      if (!st.isFile()) throw new Error("Only files can be deleted");
      await fsp.unlink(abs);
      return ok(`Deleted ${toRel(abs)}`);
    } catch (e) { return fail(e); }
  });

  // 6. append_file
  server.registerTool("append_file", {
    description: "Append text to the end of a file (creates it if missing). Use this for PLAN_LOG.md, CHECKPOINTS.md and DECISIONS.md so earlier entries are never overwritten.",
    inputSchema: { path: z.string(), content: z.string().max(10_000) },
  }, async ({ path: p, content }) => {
    try {
      const abs = await resolveSafe(p);
      blockGit(abs);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.appendFile(abs, content.endsWith("\n") ? content : content + "\n", "utf8");
      return ok(`Appended to ${toRel(abs)}`);
    } catch (e) { return fail(e); }
  });

  // 7. git_status
  server.registerTool("git_status", {
    description: "Show the short git status and current branch of the workspace.",
    inputSchema: {},
  }, async () => {
    try { return ok((await git(["status", "--short", "--branch"])) || "clean"); }
    catch (e) { return fail(e); }
  });

  // 8. git_commit
  server.registerTool("git_commit", {
    description: "Stage ALL changes (including stray or scratch files) and create a commit (a checkpoint). Requires a clear message. Check git_status first and delete files that should not be committed.",
    inputSchema: { message: z.string().min(3).max(200) },
  }, async ({ message }) => {
    try {
      await git(["add", "-A"]);
      return ok(await git(["commit", "-m", message]));
    } catch (e) { return fail(e); }
  });

  // 9. git_log
  server.registerTool("git_log", {
    description: "Show recent commits, one per line (default 10).",
    inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
  }, async ({ limit }) => {
    try { return ok((await git(["log", `-n${limit}`, "--oneline"])) || "no commits yet"); }
    catch (e) { return fail(e); }
  });
}