# PROJECT_STATE

Overwritten at the end of every session. It holds the current truth only.
History lives in PLAN_LOG.md, CHECKPOINTS.md and DECISIONS.md.

- Goal: Build a Python command-line app called "notes" that stores notes in notes.json, with pytest tests and a README.
- CLI commands wanted:
  - python -m notes add "text"
  - python -m notes list
  - python -m notes search "word"
  - python -m notes delete ID
- Status: feature-complete in code; search, delete and README are written but not yet run by the human
- Last updated by: agent, S4
- Current session: S4 (ended)
- Done:
  - Layout and storage format decided (D-001, D-002).
  - Repo identity settled: the workspace's own repo is the intended one (D-003).
  - add and list implemented; their 6 tests PASSED, verified by the human.
  - search and delete implemented in notes/storage.py and notes/cli.py, with 9 new tests (D-004). Written, reviewed by reading, not run.
  - README.md written (how to run the app and the tests). Examples not run.
  - Scratch files src and write_test.txt deleted (commit 4387242).
- In progress: waiting on human verification of the S3 code (nothing new has been run).
- Next steps:
  1. Human runs python -m pytest -v (expect 15 passed) and pastes the output.
  2. Human runs the CLI sequence from CP-004 with NOTES_FILE set to a temp path and pastes the output.
  3. Fix any failures.
  4. Decide about notes.json: it is tracked in git. Options: add it to .gitignore and have the agent delete_file it, then commit.
  5. Final check against the acceptance criteria.
- Blockers / open questions:
  - Need the human's pytest output for the 15-test run before search, delete and README count as verified.
  - Should notes.json be added to .gitignore and removed from the repo?
  - What are test_commit (root file) and commit 5161c4b "test commit"? Assumed to be the human's tool tests; untouched. Delete test_commit?
- Key files: HANDOFF_PROTOCOL.md, PROJECT_STATE.md, PLAN_LOG.md, CHECKPOINTS.md, DECISIONS.md, README.md, notes/, tests/test_notes.py
- Constraints:
  - Python 3.10+, standard library only, pytest for tests.
  - The agent cannot run code. The human runs commands and pastes the output back.
  - Use only the file server MCP tools. All paths are relative to the workspace root.
- Acceptance criteria:
  - All four commands work.
  - Each command has at least one test.
  - README.md explains how to run the app and the tests.
- Latest checkpoint: CP-004 (committed; search, delete and README not verified by the human)
- Latest decision: D-004
