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
Commit: NONE. git_commit failed twice (messages "feat: scaffold notes package with add and list, tests (untested)" and "S1 scaffold notes package"). The tool returned only "Command failed" with no detail. git_status shows a clean tree (no untracked files) even though notes/ and tests/ exist, so the cause is unknown.
What works:
- notes/ package with add and list, and tests/test_notes.py with 6 tests: written but NOT run (verified by human: no)
- D-001 and D-002 recorded in DECISIONS.md (verified by human: no)
How to verify:
- From the workspace root run: python -m pytest -v
- Expected output: 6 tests collected, all passing (not yet confirmed)
- Then run: python -m notes add "hello" then python -m notes list
- Expected output: "Added note 1", then "1: hello"
- To diagnose the commit failure run: git status --short, git rev-parse --show-toplevel, git check-ignore -v notes/cli.py
Known issues:
- The S1 files are uncommitted, so this is not yet a real save point.
- git_commit fails with no detail; git_status shows nothing despite new files.
- search and delete are not implemented. README.md is not written.
Resume from: PROJECT_STATE.md Next steps #1

## CP-002 | S2
Commit: "S2: commit S1 scaffold (notes package with add/list, tests, handoff files) - untested" (9b6f041, root commit), then "S2: log commit-blocker resolution in PLAN_LOG" (d87c39e). PROJECT_STATE.md is saved in one more commit after this entry.
What works:
- git_commit now succeeds and the S1 files are saved in history (verified by agent: git_commit output; verified by human: no)
- notes/ package with add and list, and tests/test_notes.py with 6 tests: written but NOT run (verified by human: no)
How to verify:
- From the workspace root run: python -m pytest -v
- Expected output: 6 tests collected, all passing (not yet confirmed)
- Then run: python -m notes add "hello" then python -m notes list
- Expected output: "Added note 1", then "1: hello"
- Afterwards run: git status --short (a notes.json file may appear; delete it if it was only a test)
Known issues:
- Nothing has been run by anyone. Tests and CLI are unverified.
- Cause of the S1 commit failure is unknown. The repo now has a single root commit, whereas S1 saw 9 TypeScript commits, so it was apparently reset or replaced between sessions.
- The commit includes scratch files src ("asdv") and write_test.txt, which are not part of the project. Ask the human whether to delete them.
- notes.json is not in .gitignore (decide whether to add it).
- search and delete are not implemented. README.md is not written.
Resume from: PROJECT_STATE.md Next steps #1

## CP-003 | S3
Commit: "S3: delete scratch files src and write_test.txt, record D-003 (repo identity)" (4387242), then "S3: add search and delete with tests, write README (new code not yet run)" (c9ff5b4). PROJECT_STATE.md is saved in one more commit after this entry.
What works:
- add and list: 6 tests PASSED (verified by human: yes, pasted pytest output "6 passed in 0.14s" at the start of S3). The CLI commands from CP-002 were not reported, so the manual CLI run is (verified by human: no).
- search and delete in notes/storage.py and notes/cli.py: written, NOT run (verified by human: no)
- 9 new tests for search and delete (15 tests total expected): written, NOT run (verified by human: no)
- README.md: written, examples not run (verified by human: no)
- Scratch files src and write_test.txt deleted (verified by agent: delete_file output; the human requested it)
How to verify:
- From the workspace root run: python -m pytest -v
- Expected output: 15 tests collected, all passing (not yet confirmed)
- Then, with a throwaway file: set NOTES_FILE to a temp path and run: python -m notes add "Buy milk", python -m notes list, python -m notes search "MILK", python -m notes delete 1, python -m notes delete 1
- Expected output: "Added note 1", "1: Buy milk", "1: Buy milk", "Deleted note 1", then "No note with ID 1" and exit code 1 on the second delete
Known issues:
- notes.json (from the human's earlier CLI run) was swept into commit 4387242 because git_commit stages everything. It is tracked, and not in .gitignore. Decision pending from the human.
- Commit 5161c4b "test commit" and the root file test_commit were not made by the agent; presumably the human's tool tests. Left untouched.
- The earlier "9 TypeScript commits" question is resolved: see D-003.
Resume from: PROJECT_STATE.md Next steps #1

## CP-004 | S4
Commit: "S4: save CP-003 and S4 log entries (search/delete still unrun)" (d9d1514), then one more commit for PROJECT_STATE.md after this entry.
What works:
- Same as CP-003. add and list: 6 tests PASSED (verified by human: yes). search, delete, their 9 new tests and README.md: written, read back and reviewed by the agent, NOT run (verified by human: no).
- No code changed in S4. This session only closed out S3's unfinished session end (CP-003 was uncommitted and PROJECT_STATE.md still said S2).
How to verify:
- From the workspace root run: python -m pytest -v
- Expected output: 15 tests collected, all passing (not yet confirmed)
- Then with a throwaway file set NOTES_FILE and run: python -m notes add "Buy milk", python -m notes list, python -m notes search "MILK", python -m notes delete 1, python -m notes delete 1
- Expected output: "Added note 1", "1: Buy milk", "1: Buy milk", "Deleted note 1", then "No note with ID 1" and exit code 1 on the second delete
Known issues:
- notes.json is tracked in git and not in .gitignore. Waiting on the human's decision.
- test_commit (root file) and commit 5161c4b "test commit" are unexplained; assumed to be the human's tool tests. Untouched.
- Acceptance check cannot be finished until the 15-test run and CLI run are pasted back.
Resume from: PROJECT_STATE.md Next steps #1
