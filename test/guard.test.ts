import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// These tests call the real tool handlers against a throw-away workspace.
type Result = { isError?: boolean; content: { text: string }[] };
const tools: Record<string, (args: any) => Promise<Result>> = {};
let ws: string;
let auditFile: string;

const call = async (tool: string, args: Record<string, unknown> = {}) => {
  const r = await tools[tool](args);
  return { isError: !!r.isError, text: r.content[0].text };
};

beforeAll(async () => {
  ws = fs.mkdtempSync(path.join(os.tmpdir(), "guards-ws-"));
  auditFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "guards-log-")), "calls.jsonl");
  process.env.WORKSPACE_ROOT = ws;   // must be set BEFORE the modules are imported
  process.env.AUDIT_LOG = auditFile;

  fs.mkdirSync(path.join(ws, ".git"));
  fs.writeFileSync(path.join(ws, ".git", "config"), "[core]\n");
  for (const f of ["PROJECT_STATE.md", "PLAN_LOG.md", "CHECKPOINTS.md", "DECISIONS.md"]) {
    fs.writeFileSync(path.join(ws, f), `${f}\n`);
  }

  const { registerTools } = await import("../src/tools.js");
  registerTools(
    { registerTool: (name: string, _cfg: unknown, fn: any) => { tools[name] = fn; } } as any,
    "test"
  );
});

describe("requests that must be refused", () => {
  const refused: [string, string, Record<string, unknown>, string][] = [
    ["reading .git",                    "read_file",   { path: ".git/config" }, "Access to .git"],
    ["reading .GIT (other case)",       "read_file",   { path: ".GIT/config" }, "Access to .git"],
    ["listing .git",                    "list_files",  { path: ".git" }, "Access to .git"],
    ["writing inside .git",             "write_file",  { path: ".git/x", content: "x" }, "Access to .git"],
    ["overwriting DECISIONS.md",        "write_file",  { path: "DECISIONS.md", content: "x" }, "Append-only"],
    ["overwriting decisions.md (case)", "write_file",  { path: "decisions.md", content: "x" }, "Append-only"],
    ["overwriting 'DECISIONS.md.'",     "write_file",  { path: "DECISIONS.md.", content: "x" }, "Append-only"],
    ["overwriting via ':stream'",       "write_file",  { path: "PLAN_LOG.md:s", content: "x" }, "Append-only"],
    ["editing CHECKPOINTS.md",          "str_replace", { path: "CHECKPOINTS.md", old_str: "CHECK", new_str: "X" }, "Append-only"],
    ["deleting PROJECT_STATE.md",       "delete_file", { path: "PROJECT_STATE.md" }, "Protected handoff"],
    ["deleting project_state.md (case)", "delete_file", { path: "project_state.md" }, "Protected handoff"],
    ["path traversal",                  "read_file",   { path: "../../etc/passwd" }, "escapes"],
    ["absolute path outside the root",  "read_file",   { path: "/etc/passwd" }, "escapes"],
    ["str_replace text that is absent", "str_replace", { path: "PROJECT_STATE.md", old_str: "zzz", new_str: "y" }, "not found"],
  ];
  it.each(refused)("%s", async (_label, tool, args, needle) => {
    const r = await call(tool, args);
    expect(r.isError).toBe(true);
    expect(r.text).toContain(needle);
  });
});

describe("requests that must still work", () => {
  it("appends to an append-only log", async () => {
    const r = await call("append_file", { path: "DECISIONS.md", content: "## D-001 test" });
    expect(r.isError).toBe(false);
    expect(fs.readFileSync(path.join(ws, "DECISIONS.md"), "utf8")).toContain("## D-001 test");
  });
  it("rewrites PROJECT_STATE.md", async () => {
    expect((await call("write_file", { path: "PROJECT_STATE.md", content: "new state" })).isError).toBe(false);
    expect((await call("str_replace", { path: "PROJECT_STATE.md", old_str: "new", new_str: "newer" })).isError).toBe(false);
  });
  it("creates, reads, edits and deletes an ordinary file", async () => {
    expect((await call("write_file", { path: "notes/a.py", content: "x = 1\n" })).isError).toBe(false);
    expect((await call("read_file", { path: "notes/a.py" })).text).toContain("x = 1");
    expect((await call("str_replace", { path: "notes/a.py", old_str: "1", new_str: "2" })).isError).toBe(false);
    expect((await call("delete_file", { path: "notes/a.py" })).isError).toBe(false);
  });
  it("lists the workspace without showing .git", async () => {
    const r = await call("list_files", { path: "." });
    expect(r.text).toContain("PROJECT_STATE.md");
    expect(r.text).not.toContain(".git");
  });
});

describe("audit log", () => {
  it("records every call, including refusals, with shortened arguments", async () => {
    await call("write_file", { path: "big.txt", content: "A".repeat(1000) });
    const lines = fs.readFileSync(auditFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));

    // every call so far was logged (14 refused + 3 + 1 + 4 + 1 above, plus the one just made)
    expect(lines.length).toBeGreaterThanOrEqual(20);
    expect(lines.every((l) => l.event === "tool_call" && l.auth === "test")).toBe(true);

    const refusal = lines.find((l) => l.tool === "write_file" && l.args.path === "DECISIONS.md");
    expect(refusal.isError).toBe(true);
    expect(refusal.result).toContain("Append-only");

    const big = lines.find((l) => l.args?.path === "big.txt");
    expect(big.isError).toBe(false);
    expect(big.args.content.length).toBeLessThan(400);   // the 1000-character content was shortened
    expect(big.args.content).toContain("[+");
    expect(typeof big.durationMs).toBe("number");
  });
});