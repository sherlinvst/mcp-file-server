# PLAN_LOG (append-only)

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

## S1 | Step 1 | PLAN
Goal: Decide file layout and record it in DECISIONS.md.
Will do: Append D-001 (layout: core logic separate from CLI), D-002 (storage format and notes file location).
Expected result: DECISIONS.md has D-001 and D-002.

## S1 | Step 1 | RESULT
Status: done
Did: Read all handoff files, git_status and git_log. Recorded D-001 and D-002.
Not done / issues: none
Evidence: DECISIONS.md append confirmations.
Next: Step 2, scaffold notes/ and tests/.

## S1 | Step 2 | PLAN
Goal: Scaffold the package and test folder and implement add and list.
Will do: Create notes/__init__.py, notes/storage.py, notes/cli.py, notes/__main__.py, tests/__init__.py, tests/test_storage.py, tests/test_cli.py.
Expected result: Files exist (list_files). Human runs pytest and pastes the output.

## S1 | Step 2 | RESULT
Status: done (untested: the agent cannot run code)
Did: Created notes/__init__.py, storage.py, cli.py, __main__.py and tests/__init__.py, test_storage.py (13 tests), test_cli.py (6 tests). Implemented add and list per D-001 and D-002.
Not done / issues: search and delete are intentionally not implemented (S2). Nothing has been run.
Evidence: write confirmations and list_files showing notes/ and tests/.
Next: Human runs pytest. Then S2 starts from PROJECT_STATE.md.

## S2 | Step 1 | PLAN
Goal: Confirm the S1 tests pass and record the human's pytest result.
Will do: Note the human-pasted result (19 passed, Python 3.13.5, pytest 9.1.1) in the RESULT entry. No code changes needed.
Expected result: No failures to fix.

## S2 | Step 1 | RESULT
Status: done
Did: Human pasted pytest -v output: 19 passed in 0.57s. S1 add and list are now verified by the human.
Not done / issues: none
Evidence: human-pasted pytest output (19 passed).
Next: Step 2, implement search and delete.

## S2 | Step 2 | PLAN
Goal: Implement search and delete with tests.
Will do: Append D-003 (search) and D-004 (delete). Add search_notes and delete_note to notes/storage.py. Add search and delete subcommands to notes/cli.py. Add tests/test_search_delete.py (storage and CLI tests).
Expected result: Files exist. Human runs pytest and all tests pass.

## S2 | Step 2 | RESULT
Status: done (untested: the agent cannot run code)
Did: Recorded D-003 and D-004. Added search_notes and delete_note to notes/storage.py. Added search and delete subcommands to notes/cli.py. Created tests/test_search_delete.py with 21 test cases (counting parametrized cases).
Not done / issues: Nothing has been run. Expected total is 40 tests (19 existing + 21 new).
Evidence: str_replace and write_file confirmations.
Next: Step 3, write README.md.

## S2 | Step 3 | PLAN
Goal: Write README.md.
Will do: Create README.md covering requirements, running the four commands, NOTES_FILE override, exit codes, running tests and project layout.
Expected result: README.md exists in the workspace root.

## S2 | Step 3 | RESULT
Status: done
Did: Created README.md (requirements, the four commands, NOTES_FILE override, exit codes, running tests, layout).
Not done / issues: The README commands have not been run by the human.
Evidence: write_file confirmation.
Next: Human runs pytest -v (expect 40 passed) and the manual commands in CP-002. Then S3 Reviewer.

## S3 | Step 1 | PLAN
Goal: Read-only review of code, tests and README for bugs, missing tests and unclear parts.
Will do: list_files, then read notes/*.py, tests/*.py and README.md. Do not edit any code, test or README file. Record findings as a decision entry in DECISIONS.md.
Expected result: A findings entry (D-005) exists; no code, test or README file changed.

## S4 | Step 1 | PLAN
Goal: Reviewer session. Read-only review of code, tests and README (an earlier S3 PLAN entry exists with no RESULT, so this session is S4).
Will do: read notes/*.py, tests/*.py, README.md. Edit no code, test or README file. Record findings as a decision entry (D-005) in DECISIONS.md. Then do the session end.
Expected result: D-005 exists with findings; git_status shows only log and state files changed.

## S4 | Step 1 | RESULT
Status: done (read-only; nothing was run)
Did: Read the handoff files, git_status, git_log, notes/storage.py, notes/cli.py, notes/__main__.py, README.md and all three test files. Recorded findings F1-F7 (bugs), U1-U5 (unclear parts) and T1-T7 (missing tests) in D-005. No code, test or README file was edited.
Not done / issues: An earlier S3 PLAN entry (Reviewer, goal D-005) has no RESULT and no checkpoint, so S3 never finished; this session is therefore numbered S4. Its uncommitted PLAN_LOG.md change is committed with this session. The human's pytest -v run (expect 40 passed) and the CP-002 manual commands are still not done.
Evidence: append confirmations for DECISIONS.md (D-005) and PLAN_LOG.md.
Next: Human runs pytest -v and the CP-002 manual commands. Then a Builder session (S5) fixes F1-F3 first and adds T1-T7.
