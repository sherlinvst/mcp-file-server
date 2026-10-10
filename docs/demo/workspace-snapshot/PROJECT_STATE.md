# PROJECT_STATE

Overwritten at the end of every session. It holds the current truth only.
History lives in PLAN_LOG.md, CHECKPOINTS.md and DECISIONS.md.

- Goal: Build a Python command-line app called "notes" that stores notes in notes.json, with pytest tests and a README.
- CLI commands wanted:
  - python -m notes add "text"
  - python -m notes list
  - python -m notes search "word"
  - python -m notes delete ID
- Status: in progress (all four commands and README written and reviewed; add and list verified by the human, search, delete and README not yet run; review found robustness bugs, see D-005)
- Last updated by: Reviewer (S4)
- Current session: none active (S4 ended; next is S5 Builder)
- Session plan (roles are defined in HANDOFF_PROTOCOL.md):
  - S1 Builder: DONE. Plan, scaffold notes/ and tests/, implement add and list with tests.
  - S2 Builder: DONE. Confirmed 19 passing tests, implemented search and delete with tests, wrote README.md.
  - S3 Reviewer: NEVER FINISHED. A PLAN entry exists in PLAN_LOG.md with no RESULT; its work was redone in S4.
  - S4 Reviewer: DONE. Read-only review of code, tests and README. Findings in D-005. No code changed.
  - S5 Builder: fix D-005 findings F1-F3 (then F4-F7, U1-U5 as time allows) and add tests T1-T7. Only after the human's pytest result is known.
- Done:
  - Layout and storage decisions (D-001, D-002).
  - notes/ package: __init__.py, storage.py (load/save/add/list/search/delete/notes_path), cli.py (argparse add, list, search, delete), __main__.py.
  - Search and delete behaviour decisions (D-003, D-004).
  - tests/: test_storage.py (13), test_cli.py (6), test_search_delete.py (21 cases).
  - README.md.
  - Human verified: 19 tests (add and list) passed on Python 3.13.5 / pytest 9.1.1.
  - S4 review recorded as D-005 (7 bugs F1-F7, 5 unclear parts U1-U5, 7 missing tests T1-T7). Committed as CP-003 (45a0eac).
- In progress: Waiting for the human to run pytest -v (expect 40 passed) and the manual commands listed in CP-002.
- Next steps:
  1. Human runs `pytest -v` from the workspace root and pastes the output. Expected: 40 passed. If anything fails, a Builder session fixes it first.
  2. Human runs the manual commands from CP-002 to check search, delete and the README instructions.
  3. S5 Builder: fix F1 (validate entries in load_notes), F2 (catch OSError in cli.main), F3 (atomic save with os.replace); add tests T1-T7; update the README for U1-U4. Log each choice as D-006 onward.
  4. Then F4-F7 (leading "-" text, strict ID parsing, BOM, console encoding) as decided by the human, and a final Reviewer pass.
- Blockers / open questions: none. Search, delete and README are untested until the human pastes results. Open question for the human: should IDs stay reusable (D-002) or become stable via a next_id counter?
- Key files: HANDOFF_PROTOCOL.md, PROJECT_STATE.md, PLAN_LOG.md, CHECKPOINTS.md, DECISIONS.md, README.md, notes/storage.py, notes/cli.py, tests/
- Constraints:
  - Python 3.10+, standard library only, pytest for tests.
  - The agent cannot run code. The human runs commands and pastes the output back.
  - Use only the file server MCP tools. All paths are relative to the workspace root.
- Acceptance criteria:
  - All four commands work.
  - Each command has at least one test.
  - README.md explains how to run the app and the tests.
- Latest checkpoint: CP-003
- Latest decision: D-005
