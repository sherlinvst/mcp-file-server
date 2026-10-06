import fs from "node:fs";

const dir = process.env.WORKSPACE_ROOT ?? "./workspace";
fs.mkdirSync(dir, { recursive: true });

const files = {
  "PROJECT_STATE.md": `# PROJECT_STATE
- Goal: Build a Python CLI "notes" (add / list / search / delete notes stored in notes.json) with pytest tests and a README.
- Status: not started
- Last updated by: human (seed)
- Done: (nothing yet)
- In progress: (nothing yet)
- Next steps:
  1. Plan the file layout and record it in DECISIONS.md
  2. Scaffold the notes/ package and tests/
  3. Implement add and list, with tests
- Blockers / open questions: none
- Key files: (none yet)
- Constraints: Python 3.10+, standard library only. The agent cannot run code; the human runs pytest and pastes the output back.
`,
  "PLAN_LOG.md": "# PLAN_LOG (append-only: plans and what was done)\n",
  "CHECKPOINTS.md": "# CHECKPOINTS (append-only: commit, what works, how to verify)\n",
  "DECISIONS.md": "# DECISIONS (append-only: Decision / Why / Alternatives rejected)\n",
  ".gitignore": "__pycache__/\n.pytest_cache/\n*.pyc\n",
};

for (const [name, text] of Object.entries(files)) {
  const p = `${dir}/${name}`;
  if (!fs.existsSync(p)) fs.writeFileSync(p, text);
}
console.log("Seeded", dir);