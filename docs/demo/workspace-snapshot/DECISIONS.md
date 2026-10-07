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
Decision: Layout is a notes/ package (__init__.py, __main__.py, cli.py, storage.py) plus tests/test_notes.py. Storage logic lives in storage.py, argparse and printing in cli.py.
Why: python -m notes requires a package with __main__.py. Splitting storage from CLI lets tests exercise each without running subprocesses. Stdlib only, per Constraints.
Alternatives rejected:
- Single notes.py module: python -m notes would not work without a package.
- Click or Typer: violates the standard-library-only constraint.
Consequences: a few more small files than a single module.
Revisit if: the app grows beyond four commands or needs several storage backends.

## D-002 | S1
Decision: notes.json holds {"next_id": <int>, "notes": [{"id": <int>, "text": <str>}]}. The path defaults to notes.json in the current directory and can be overridden with the NOTES_FILE environment variable.
Why: a stored next_id means IDs are never reused after delete, so an old ID cannot silently point at a different note. NOTES_FILE lets tests use a temp file without touching the real one.
Alternatives rejected:
- Bare list with id = max + 1: reuses the highest ID after it is deleted.
- Fixed path only: tests would have to patch the working directory.
Consequences: file format is slightly less minimal; a missing or empty file is treated as no notes.
Revisit if: notes need timestamps, tags, or a different ID format.

## D-003 | S3
Decision: The workspace's own git repo (root commit 9b6f041 onward) is the intended repo for this project. The 9 TypeScript commits seen in S1 belonged to the human's parent project and are not part of this project's history.
Why: The human confirmed that a bug in their MCP server made git operate on the parent project's repo during S1. They have fixed it. This answers the open question about the repo change between S1 and S2 (see CP-001, CP-002).
Alternatives rejected:
- Treat the TypeScript history as lost project history: it was never this project's history.
Consequences: S1's "clean tree" git_status and the git_commit failure were most likely caused by the wrong-repo bug, not by anything in the workspace. No action is needed on the old commits.
Revisit if: git_log or git_status ever shows unrelated history again.

## D-004 | S3
Decision: search is a case-insensitive substring match on note text, printing matches as "ID: text" or "No matches." when none are found (exit code 0). delete takes an integer ID; an unknown ID prints an error to stderr and exits with code 1; a non-integer ID is rejected by argparse (exit code 2).
Why: The goal gives only `search "word"` and `delete ID`. Case-insensitive substring is the least surprising behaviour for a tiny notes app. "No matches" is a normal result, not an error. A missing ID on delete is a user error and should be visible to scripts via a non-zero exit code. Stdlib only, per Constraints.
Alternatives rejected:
- Whole-word or regex search: more surprising and more code for no stated need.
- Silent success when deleting an unknown ID: hides typos.
- Renumbering notes after delete: breaks D-002 (IDs are never reused).
Consequences: deleting does not change next_id, so IDs have gaps after deletes. That is intended.
Revisit if: users need regex or multi-word search, or a different exit code convention.
