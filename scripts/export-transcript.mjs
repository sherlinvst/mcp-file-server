import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const logFile = path.resolve(opt("--log", process.env.AUDIT_LOG ?? path.join(root, "logs", "tool-calls.jsonl")));
const outDir = path.resolve(opt("--out", path.join(root, "docs", "demo", "transcripts")));

if (!fs.existsSync(logFile)) {
  console.error(`No log found at ${logFile}\nRun some tool calls first (and check AUDIT_LOG is not "off").`);
  process.exit(1);
}

const READ_TOOLS = new Set(["list_files", "read_file", "git_status", "git_log"]);
const WRITE_TOOLS = new Set(["write_file", "str_replace", "delete_file", "append_file", "git_commit"]);
// role check
const EDIT_TOOLS = new Set(["write_file", "str_replace", "delete_file"]);
const NOTEBOOK = new Set(["project_state.md", "plan_log.md", "checkpoints.md", "decisions.md"]);
const normPath = (p) => String(p ?? "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();

// split log into sessions
const sessions = [];                         
const unassigned = { label: "unassigned", calls: [] };
let current = null;
let bad = 0;
const rejected = {};                   
const reject = (reason) => { rejected[reason] = (rejected[reason] ?? 0) + 1; };

for (const line of fs.readFileSync(logFile, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let e;
  try { e = JSON.parse(line); } catch { bad++; continue; }
  if (e.event === "marker") { current = { label: e.label, startedAt: e.ts, calls: [] }; sessions.push(current); }
  else if (e.event === "end") { current = null; }
  else if (e.event === "tool_call") {
    if (e.auth === "test") { reject('auth "test" (written by a test harness, not by the live server)'); continue; }
    if (typeof e.ts !== "string" || Number.isNaN(Date.parse(e.ts))) { reject("missing or invalid timestamp"); continue; }
    if (typeof e.resultChars !== "number") { reject("missing resultChars"); continue; }
    (current ?? unassigned).calls.push(e);
  }
}
if (unassigned.calls.length) sessions.push(unassigned);
const rejectedTotal = Object.values(rejected).reduce((a, b) => a + b, 0);
if (rejectedTotal) {
  console.warn(`\nWARNING: ${rejectedTotal} log line(s) were REFUSED because they were not written by the live server:`);
  for (const [r, n] of Object.entries(rejected)) console.warn(`  - ${n} x ${r}`);
  console.warn("They are not included in the transcripts. Do not present them as a record of a real session.\n");
  process.exitCode = 2;
}
if (!sessions.length) { console.error("The log has no valid tool calls."); process.exit(2); }

// stats
const key = (c) => `${c.tool}|${JSON.stringify(c.args)}`;

function stats(calls) {
  const byTool = {};
  const byAuth = {};
  let errors = 0, writes = 0, chars = 0, redundantReads = 0, retriedErrors = 0, bursts = 0;
  const fileEdits = [];                    
  const seenReads = new Set();               
  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];
    byTool[c.tool] = (byTool[c.tool] ?? 0) + 1;
    byAuth[c.auth ?? "?"] = (byAuth[c.auth ?? "?"] ?? 0) + 1;
    chars += c.resultChars ?? 0;
    if (c.isError) errors++;
    if (WRITE_TOOLS.has(c.tool) && !c.isError) { writes++; seenReads.clear(); }
    if (EDIT_TOOLS.has(c.tool) && !c.isError && !NOTEBOOK.has(normPath(c.args?.path))) {
      fileEdits.push(`${c.tool} ${c.args?.path ?? "?"}`);
    }
    if (READ_TOOLS.has(c.tool)) { if (seenReads.has(key(c))) redundantReads++; else seenReads.add(key(c)); }
    const prev = calls[i - 1];
    if (prev) {
      if (prev.isError && key(prev) === key(c)) retriedErrors++;
      if (new Date(c.ts) - new Date(prev.ts) <= 1000) bursts++;
    }
  }
  const secs = calls.length > 1 ? Math.round((new Date(calls.at(-1).ts) - new Date(calls[0].ts)) / 1000) : 0;
  return { total: calls.length, errors, writes, fileEdits, chars, redundantReads, retriedErrors, bursts, secs, byTool, byAuth };
}

// ---- 3. Markdown helpers ---------------------------------------------------
const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "session";
const hhmmss = (ts) => ts.slice(11, 19);
const dur = (secs) => `${Math.floor(secs / 60)}m ${secs % 60}s`;
function fence(text, lang = "") {
  const longest = Math.max(0, ...[...String(text).matchAll(/`+/g)].map((m) => m[0].length));
  const f = "`".repeat(Math.max(3, longest + 1));
  return `${f}${lang}\n${text}\n${f}`;
}

function sessionMarkdown(s, st) {
  const out = [];
  out.push(`# Tool-call transcript: ${s.label}`, "");
  if (s.calls.length) {
    out.push(`Times are UTC. First call ${s.calls[0].ts}, last call ${s.calls.at(-1).ts}.`, "");
  }
  out.push("## Summary", "",
    "| Measure | Value |", "|---|---|",
    `| Tool calls | ${st.total} |`,
    `| Login route used (secret = claude.ai connector, bearer = token clients) | ${Object.entries(st.byAuth).map(([k, v]) => `${k}: ${v}`).join(", ")} |`,
    `| Calls that returned an error | ${st.errors} |`,
    `| Successful state-changing calls (write, edit, append, delete, commit) | ${st.writes} |`,
    `| Edits to files outside the four notebook files (a Reviewer should have 0) | ${st.fileEdits.length} |`,
    `| Repeated reads with nothing changed in between | ${st.redundantReads} |`,
    `| Failed calls retried with identical arguments | ${st.retriedErrors} |`,
    `| Calls made within 1 second of the previous one (likely batched) | ${st.bursts} |`,
    `| Characters returned to the agent | ${st.chars} |`,
    `| Time from first to last call | ${dur(st.secs)} |`, "",
    ...(st.fileEdits.length ? ["**Files edited outside the notebook:**", "", ...st.fileEdits.map((x) => `- \`${x}\``), ""] : []),
    "### Calls by tool", "", "| Tool | Calls |", "|---|---|",
    ...Object.entries(st.byTool).sort((a, b) => b[1] - a[1]).map(([t, n]) => `| \`${t}\` | ${n} |`), "",
    "## Calls, in order", "");
  s.calls.forEach((c, i) => {
    const status = c.isError ? "ERROR" : "ok";
    out.push(`### ${i + 1}. \`${c.tool}\` - ${status} - ${c.durationMs ?? "?"} ms - ${hhmmss(c.ts)} - via ${c.auth ?? "?"}`, "");
    const argText = JSON.stringify(c.args ?? {});
    out.push("Arguments:", fence(argText === "{}" ? "(none)" : JSON.stringify(c.args, null, 2), argText === "{}" ? "" : "json"), "");
    out.push(`Result (${c.resultChars ?? 0} characters${(c.resultChars ?? 0) > (c.result ?? "").length ? ", shortened here" : ""}):`,
      fence(c.result ?? "", "text"), "");
  });
  return out.join("\n");
}

// ---- 4. Write the files ----------------------------------------------------
fs.mkdirSync(outDir, { recursive: true });
const summaryRows = [];
sessions.forEach((s, i) => {
  const st = stats(s.calls);
  const name = `${String(i + 1).padStart(2, "0")}-${slug(s.label)}.md`;
  fs.writeFileSync(path.join(outDir, name), sessionMarkdown(s, st), "utf8");
  summaryRows.push({ name, label: s.label, st });
  console.log(`Wrote ${name}  (${st.total} calls, ${st.errors} errors)`);
});

const summary = [
  "# Tool-call summary", "",
  "Generated from the server's audit log by `npm run export`. One row per session.", "",
  "| Session | Calls | Errors | State-changing | Code/test/README edits | Repeated reads | Retried errors | Batched (<=1 s) | Chars returned | Duration | Transcript |",
  "|---|---|---|---|---|---|---|---|---|---|---|",
  ...summaryRows.map(({ name, label, st }) =>
    `| ${label} | ${st.total} | ${st.errors} | ${st.writes} | ${st.fileEdits.length} | ${st.redundantReads} | ${st.retriedErrors} | ${st.bursts} | ${st.chars} | ${dur(st.secs)} | [${name}](${name}) |`), "",
  "**How to read this.** *Errors* include guard rejections that were requested on purpose. ",
  "*State-changing* counts every successful write, edit, append, delete and commit; a session-end commit and log appends are normal for every role. ",
  "*Code/test/README edits* counts successful write, edit and delete calls on any file other than the four notebook files, which is the role check for a Reviewer. ",
  "*Repeated reads* count identical read calls with no write in between (wasted work). ",
  "*Retried errors* count a failed call repeated unchanged. ",
  "*Batched* counts calls that arrived within one second of the previous call, which suggests the agent asked for independent calls together.", "",
  ...(rejectedTotal ? ["", "## Refused log lines", "",
    `${rejectedTotal} line(s) in the log were not written by the live server and were left out:`, "",
    ...Object.entries(rejected).map(([r, n]) => `- ${n} x ${r}`), ""] : []),
].join("\n");
fs.writeFileSync(path.join(outDir, "SUMMARY.md"), summary, "utf8");
console.log(`Wrote SUMMARY.md${bad ? `  (skipped ${bad} unreadable line${bad > 1 ? "s" : ""})` : ""}`);
console.log(`Output folder: ${outDir}`);
