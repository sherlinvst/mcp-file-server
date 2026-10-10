# DECISIONS (append-only)

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

## D-001 | S1
Decision: Split the package into notes/storage.py (pure logic and file I/O), notes/cli.py (argparse, printing) and notes/__main__.py (entry point only).
Why: Standard library only and tests must run without the agent running code. Pure functions that take an explicit file path are easy to test with pytest tmp_path. S2 can add search and delete as new functions without touching the CLI wiring.
Alternatives rejected:
- Single notes.py file: harder to test the logic apart from argparse and printing.
- Class-based NoteStore: more code than four small commands need.
Consequences: Three small modules instead of one. cli.main(argv) returns an exit code so tests can call it directly.
Revisit if: The app grows beyond the four commands.

## D-002 | S1
Decision: Store notes as a JSON list of objects {"id": int, "text": str} in notes.json. The path defaults to notes.json in the current directory and can be overridden with the NOTES_FILE environment variable. IDs are max existing id + 1 (starting at 1) and are never reused within a run of adds.
Why: The goal names notes.json. IDs are needed by delete ID in S2. An env var override lets tests and CLI tests use a temp file without touching the real one (notes.json is already in .gitignore).
Alternatives rejected:
- ID = list index: IDs would shift after delete, which breaks "delete ID".
- Timestamps in the note: the protocol and constraints do not need them, and they make tests less deterministic.
- A --file CLI option: extra surface not requested in the CLI spec.
Consequences: If the highest-id note is deleted, its ID can be reused by the next add. A missing or empty notes.json is treated as an empty list; invalid JSON raises a clear error.
Revisit if: Stable, never-reused IDs become a requirement (then store a next_id counter).

## D-003 | S2
Decision: search is a case-insensitive substring match on the note text. Results keep the order the notes were added. An empty or whitespace-only query is an error. No matches is not an error: print "No matching notes." and exit 0.
Why: PROJECT_STATE.md asks for search "word" using only the standard library. Substring matching is the simplest behaviour that satisfies it, and casefold() handles case without extra code.
Alternatives rejected:
- Whole-word matching: more code, and surprising for partial words like "mil" for "milk".
- Regex search: user input would need escaping, and it is not requested.
- Treating no matches as exit code 1: an empty result is a normal outcome, not a failure.
Consequences: Searching "a" matches many notes. The query is stripped before matching.
Revisit if: Users need whole-word, multi-word or ranked search.

## D-004 | S2
Decision: delete ID removes the note with that id and prints "Deleted note N". An unknown id or an id that is not a whole number is an error (message on stderr, exit code 1). The id argument is parsed in main() rather than by argparse type=int.
Why: PROJECT_STATE.md requires a clear error for unknown or non-integer IDs. With type=int, argparse exits with code 2 and its own usage text, which is inconsistent with the other commands' "Error: ..." and exit 1 behaviour.
Alternatives rejected:
- argparse type=int: different error style and exit code 2.
- Silently ignoring an unknown id: the user would not know nothing was deleted.
Consequences: Remaining notes keep their ids, so ids can have gaps. This keeps D-002: if the highest id is deleted, the next add can reuse it.
Revisit if: Stable, never-reused ids become a requirement (see D-002).

## D-005 | S4
Decision: Review findings for notes/storage.py, notes/cli.py, tests/ and README.md (read-only review, nothing was edited or run). Recommend a Builder session fixes F1-F5 and adds the missing tests T1-T7. None of the findings contradicts D-001..D-004.
Why: Reviewer role in S4. The agent cannot run code, so every finding comes from reading. The 40-test run (CP-002) is still unverified by the human, so nothing below is confirmed by execution.
Findings, BUGS (most important first):
- F1 (medium) Wrong-shape entries crash with a traceback. load_notes only checks that the top level is a list. A file like [1, 2], [{"id": 1}] or [{"id": "x", "text": "a"}] makes add/list/search/delete raise TypeError or KeyError. cli.main only catches ValueError, so the user sees a stack trace instead of "Error: ...". Fix: validate each entry in load_notes (dict, int id that is not a bool, str text) and raise ValueError naming the entry.
- F2 (medium) OSError is not handled. NOTES_FILE pointing to a directory, a missing parent folder or a read-only file raises PermissionError / FileNotFoundError / IsADirectoryError with a traceback. Fix: in cli.main catch OSError too and print "Error: ..." with exit 1.
- F3 (medium) save_notes is not atomic. It truncates and rewrites the real file with write_text. A crash or Ctrl-C mid-write leaves a half-written file; the next run then reports invalid JSON, and a zero-length file is treated as "no notes", so the next add silently loses all old notes. Fix: write to a temp file in the same folder, then os.replace.
- F4 (low) Text beginning with "-" is read by argparse as an option: python -m notes add "-x" and search "-x" exit 2 with a usage message. Fix: document "--" in the README (python -m notes add -- "-x"), or accept it and add a test.
- F5 (low) int() is too lenient for delete IDs: " 1", "1_0" (becomes 10) and non-ASCII digits are accepted. Fix: require str.strip().isdecimal()/isascii() or a regex, or accept and document it.
- F6 (low) Reading with utf-8 fails on a file saved with a BOM (PowerShell 5.1 can do this). The error is clear (ValueError) but the file is rejected. Consider encoding="utf-8-sig" for reading. Printing non-ASCII text (for example the coffee-cup emoji) to a redirected Windows console with a cp1252 locale can raise UnicodeEncodeError, which is not caught.
- F7 (low) If notes.json contains duplicate ids, delete removes only the first match. Only possible by hand-editing the file; covered by F1 validation if it also rejects duplicates.
Findings, README and unclear parts:
- U1 README says errors exit with code 1. Usage errors (no command, missing argument, unknown command, F4) exit with code 2 from argparse. State both.
- U2 README says search "word", but a multi-word query is matched as one phrase ("buy mi" finds "buy milk"); say so. The empty NOTES_FILE variable falls back to notes.json (storage.notes_path uses "or"); not documented.
- U3 README does not mention python vs python3 on macOS/Linux, nor that the NOTES_FILE example for cmd.exe differs from PowerShell.
- U4 Notes containing newlines print over several lines in list/search, which looks like several notes. Either reject or document.
- U5 Docstring in notes/storage.py add_note says the id is "highest existing id + 1"; the README says the same. Fine, but D-002's first paragraph says IDs are "never reused within a run of adds", which is only true if nothing is deleted between adds; D-004 already corrects this. No code change, just be aware.
Findings, MISSING TESTS:
- T1 Wrong-shape entries (F1): list/add/search/delete on [1], [{"id": 1}], [{"id": "1", "text": "a"}] exit 1 with "Error", no traceback.
- T2 OSError path (F2): NOTES_FILE set to a directory returns 1 and prints "Error".
- T3 Invalid JSON is not overwritten: after add on a corrupt file, the file content is unchanged (README promises this, nothing tests it). Same for delete.
- T4 Documented ID reuse: add 1,2; delete 2; add gives id 2. Pins the D-002/D-004 behaviour so a future change is deliberate.
- T5 CLI usage errors: main([]) and main(["delete"]) raise SystemExit with code 2 (use pytest.raises(SystemExit)).
- T6 delete CLI on a corrupt file returns 1; search CLI strips whitespace in the query; add CLI with unicode text round-trips through list.
- T7 The subprocess end-to-end test only covers add and list. Extend it to search, delete, one error exit code, and check stderr text.
What was checked and looks correct: the counts (13 + 6 + 21 = 40 tests), exit codes for the documented error cases, search order and case folding (casefold), delete keeps other ids, a missing or empty file is "no notes", tests use tmp_path and NOTES_FILE so the real notes.json is never touched, the tests/__init__.py layout lets pytest import notes from the workspace root.
Alternatives rejected:
- Editing the code, tests or README in S4: not allowed for the Reviewer role.
- Writing the findings only in PLAN_LOG.md: they affect later design (F1, F3), so they belong in the decision record.
Consequences: The next Builder session has a ranked fix list. F1-F3 change behaviour on bad input only; none changes the output of the four commands on good input, so README examples stay valid. F3 may need a small test with a monkeypatched os.replace.
Revisit if: The human's pytest run (expect 40 passed) shows failures; those take priority over F1-F7.
