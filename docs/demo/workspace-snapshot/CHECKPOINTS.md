# CHECKPOINTS (append-only)

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

## CP-001 | S1
Commit: S1: scaffold notes package and tests, implement add and list (547f9f8)
What works:
- python -m notes add "text" and python -m notes list are implemented (verified by human: no)
- 19 pytest tests written for storage and CLI (verified by human: no, never run)
How to verify:
- pytest -v   (run from the workspace root)
- python -m notes add "hello" && python -m notes list
- Expected output: all tests pass; "Added note 1" then "1: hello" (this creates a notes.json, which is git-ignored; delete it afterwards)
Known issues:
- Nothing has been executed; the agent cannot run code, so failures are possible.
- search and delete are not implemented yet (planned for S2).
- IDs can be reused if the highest-id note is deleted (see D-002).
Resume from: PROJECT_STATE.md Next steps #1

## CP-002 | S2
Commit: S2: implement search and delete with tests, add README (0083796)
What works:
- add and list: 19 tests passed (verified by human: yes, pytest output pasted at the start of S2: 19 passed in 0.57s on Python 3.13.5)
- search "word" (case-insensitive substring) is implemented in storage.py and cli.py (verified by human: no)
- delete ID (unknown and non-integer IDs give an error, exit 1) is implemented (verified by human: no)
- tests/test_search_delete.py adds 21 test cases for search and delete (verified by human: no, never run)
- README.md written (verified by human: no)
How to verify:
- pytest -v   (run from the workspace root)
- Expected output: 40 passed (19 existing + 21 new)
- Manual check (PowerShell): $env:NOTES_FILE = "$env:TEMP\try.json"; python -m notes add "buy milk"; python -m notes add "call mom"; python -m notes search MILK; python -m notes delete 1; python -m notes list; python -m notes delete abc
- Expected: "Added note 1", "Added note 2", "1: buy milk", "Deleted note 1", "2: call mom", then "Error: ID must be a whole number, got 'abc'." on stderr. Afterwards delete the temp file and clear NOTES_FILE.
Known issues:
- Nothing from S2 has been executed; the agent cannot run code, so failures are possible.
- IDs can be reused if the highest-id note is deleted (see D-002, D-004).
Resume from: PROJECT_STATE.md Next steps #1

## CP-003 | S4
Commit: S4: reviewer findings recorded as D-005 (no code changes) (45a0eac)
What works:
- No code, test or README file changed in S4; the code is exactly as at CP-002 (verified by human: n/a)
- Review of notes/storage.py, notes/cli.py, README.md and all tests is recorded in D-005 (F1-F7 bugs, U1-U5 unclear parts, T1-T7 missing tests). Findings come from reading only; nothing was run (verified by human: no)
- Still unverified by the human: the full 40-test run, search, delete and the README instructions
How to verify:
- pytest -v   (run from the workspace root)
- Expected output: 40 passed (19 existing + 21 new)
- Manual check: the PowerShell commands listed in CP-002
- To confirm a finding, for example F1: put [1] in a temp file, set NOTES_FILE to it and run python -m notes list. Expected today: a traceback (TypeError), not "Error: ..."
Known issues:
- F1-F3 are medium-severity robustness bugs on bad input (see D-005). F4-F7 are low.
- IDs can be reused if the highest-id note is deleted (D-002, D-004).
- An earlier S3 Reviewer PLAN entry has no RESULT; S3 never finished, so this session is S4.
Resume from: PROJECT_STATE.md Next steps #1
