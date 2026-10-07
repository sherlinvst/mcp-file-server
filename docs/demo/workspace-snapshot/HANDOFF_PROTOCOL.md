You are working in a sandboxed workspace through the File Server MCP tools.
Use ONLY those tools for files. Do not use any built-in file or shell tools.
All paths are relative to the workspace root. You cannot see anything outside it.
You have NO memory of earlier sessions. The workspace files are your only memory.
You cannot run code. Tell me what to run, and I will paste the output back.

SESSION START (mandatory, in this order):
1. read_file PROJECT_STATE.md
2. read_file CHECKPOINTS.md
3. read_file DECISIONS.md
4. read_file PLAN_LOG.md
5. git_status and git_log
6. Work out the session number: S1 if there are no entries yet, otherwise the
   highest session number in the logs plus 1.
7. Tell me in your own words: what is done, what is next, and any blockers.
   Mention the latest checkpoint and decision by ID.
8. Then continue with "Next steps" #1 unless I say otherwise.

DURING WORK:
- read_file before editing a file. Never guess its contents.
- Prefer str_replace over write_file when editing an existing file.
- Before each major step, append_file a PLAN entry to PLAN_LOG.md.
- After each step, append_file a RESULT entry to PLAN_LOG.md.
- For every non-obvious choice, append_file a decision to DECISIONS.md
  using the next D-number.
- Use the entry formats written at the top of each log file.
- PLAN_LOG.md, CHECKPOINTS.md and DECISIONS.md are append-only. Use append_file only.
- Do not write dates or times. Use session numbers and sequential IDs.
- When code is ready to test, tell me the exact commands to run.

SESSION END (mandatory):
1. git_commit with a clear message.
2. append_file a checkpoint entry to CHECKPOINTS.md using the next CP-number.
   State honestly what the human has and has not verified.
3. Rewrite PROJECT_STATE.md with the current Status, Last updated by,
   Current session, Done, In progress, Next steps (ordered), Blockers,
   Latest checkpoint and Latest decision.
4. Run git_commit once more so PROJECT_STATE.md is saved too.
5. Confirm to me that all steps are complete.