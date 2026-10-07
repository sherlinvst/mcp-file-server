import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const force = process.argv.includes("--force");
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");
fs.mkdirSync(dir, { recursive: true });

const files = {
  "PROJECT_STATE.md": `# PROJECT_STATE

Overwritten at the end of every session. It holds the current truth only.
History lives in PLAN_LOG.md, CHECKPOINTS.md and DECISIONS.md.

- Goal: Build a Python command-line app called "notes" that stores notes in notes.json, with pytest tests and a README.
- CLI commands wanted:
  - python -m notes add "text"
  - python -m notes list
  - python -m notes search "word"
  - python -m notes delete ID
- Status: not started
- Last updated by: human (seed)
- Current session: none yet
- Done: (nothing yet)
- In progress: (nothing yet)
- Next steps:
  1. Read all handoff files and restate the state.
  2. Plan the file layout and record it in DECISIONS.md.
  3. Scaffold the notes/ package and the tests/ folder.
  4. Implement add and list, with tests.
  5. Ask the human to run pytest and paste the output.
  6. Later sessions: implement search and delete, fix test failures, write README.md.
- Blockers / open questions: none
- Key files: HANDOFF_PROTOCOL.md, PROJECT_STATE.md, PLAN_LOG.md, CHECKPOINTS.md, DECISIONS.md
- Constraints:
  - Python 3.10+, standard library only, pytest for tests.
  - The agent cannot run code. The human runs commands and pastes the output back.
  - Use only the file server MCP tools. All paths are relative to the workspace root.
- Acceptance criteria:
  - All four commands work.
  - Each command has at least one test.
  - README.md explains how to run the app and the tests.
- Latest checkpoint: none yet
- Latest decision: none yet
`,

  "PLAN_LOG.md": `# PLAN_LOG (append-only)

Purpose: the working diary. Record what you intend to do and what actually happened.
Rules:
- Add entries only with append_file. Never edit or delete earlier entries.
- Do not write dates or times. Use session numbers and step numbers.
- Write a PLAN entry before each major step and a RESULT entry after it.
- Keep entries short. Do not paste whole files or long logs.

Format of a PLAN entry:
## S<session> | Step <n> | PLAN
Goal: <one line>
Will do: <files and actions>
Expected result: <how we will know it worked>

Format of a RESULT entry:
## S<session> | Step <n> | RESULT
Status: done | partial | blocked
Did: <what was actually done>
Not done / issues: <problems and how they were handled, or "none">
Evidence: <what shows it worked, e.g. a list_files result or a human-pasted test result>
Next: <the next step>

--- ENTRIES BELOW ---
`,

  "CHECKPOINTS.md": `# CHECKPOINTS (append-only)

Purpose: a list of known-good save points. Write one entry after every git_commit,
so a later session knows what works and how to verify it.
Rules:
- Add entries only with append_file. Never edit or delete earlier entries.
- Number entries in order: CP-001, CP-002, ... Read the last entry to find the next number.
- Be honest. Say whether tests were run by the human or are untested.
  Never write "tests pass" unless the human pasted the result.
- Do not write dates or times. Git records the real time.

Format of an entry:
## CP-NNN | S<session>
Commit: <the commit message, and the short hash from git_log if known>
What works:
- <item> (verified by human: yes | no)
How to verify:
- <exact commands the human can run>
- Expected output: <what they should see>
Known issues:
- <issue, or "none">
Resume from: PROJECT_STATE.md Next steps #<n>

--- ENTRIES BELOW ---
`,

  "DECISIONS.md": `# DECISIONS (append-only)

Purpose: the reasoning record. Explain why the project is built the way it is,
so later sessions do not undo a deliberate choice by accident.
Rules:
- Add entries only with append_file. Never edit or delete earlier entries.
- Number entries in order: D-001, D-002, ... Read the last entry to find the next number.
- Log a choice if reversing it later would cost real time. Do not log trivial choices.
- Do not write dates or times.
- To change an earlier decision, add a new entry that says it supersedes D-NNN.

Format of an entry:
## D-NNN | S<session>
Decision: <one line>
Why: <reason, tied to a constraint in PROJECT_STATE.md where possible>
Alternatives rejected:
- <option>: <short reason>
Consequences: <trade-offs>
Revisit if: <condition>

--- ENTRIES BELOW ---
`,

  ".gitignore": "__pycache__/\n.pytest_cache/\n*.pyc\n",
};


const protocolSrc = path.join(here, "..", "docs", "HANDOFF_PROTOCOL.md");
if (fs.existsSync(protocolSrc)) {
  files["HANDOFF_PROTOCOL.md"] = fs.readFileSync(protocolSrc, "utf8");
} else {
  console.warn("Warning: docs/HANDOFF_PROTOCOL.md not found, so HANDOFF_PROTOCOL.md was not seeded.");
}

let written = 0;
for (const [name, text] of Object.entries(files)) {
  const p = path.join(dir, name);
  if (fs.existsSync(p) && !force) {
    console.log(`Skipped (exists): ${name}`);
    continue;
  }
  fs.writeFileSync(p, text);
  console.log(`Wrote: ${name}`);
  written++;
}

if (written > 0 && fs.existsSync(path.join(dir, ".git"))) {
  try {
    execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["commit", "-m", "Seed handoff files"], { cwd: dir, stdio: "pipe" });
    console.log("Committed the seed files in the workspace repo.");
  } catch {
    console.log("Nothing new to commit in the workspace repo.");
  }
}

console.log(`Seeded ${dir} (${written} file(s) written).`);