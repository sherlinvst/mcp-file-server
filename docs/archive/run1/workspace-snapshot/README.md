# notes

A tiny command-line notes app. Notes are stored in a JSON file. Python 3.10+, standard library only (pytest is needed only to run the tests).

## Run the app

Run these from the project root (the folder that contains the `notes/` package):

```
python -m notes add "buy milk"      # Added note 1
python -m notes list                # 1: buy milk
python -m notes search "milk"       # 1: buy milk
python -m notes delete 1            # Deleted note 1
```

### Commands

| Command | What it does |
| --- | --- |
| `add "text"` | Adds a note and prints its ID. |
| `list` | Prints all notes as `ID: text`, or `No notes.` if there are none. |
| `search "word"` | Prints notes whose text contains the word. The match is case-insensitive and matches anywhere in the text. Prints `No matches.` if nothing is found. |
| `delete ID` | Deletes the note with that ID. If there is no such note, it prints an error and exits with code 1. |

IDs are never reused. If you delete note 2 and then add a new note, the new note gets the next unused number (for example 3), not 2.

### Where notes are stored

Notes go in `notes.json` in the current directory. To use a different file, set the `NOTES_FILE` environment variable:

```
# macOS / Linux
NOTES_FILE=/tmp/my_notes.json python -m notes list

# Windows (PowerShell)
$env:NOTES_FILE = "C:\temp\my_notes.json"; python -m notes list
```

The file looks like this:

```
{
  "next_id": 3,
  "notes": [
    {"id": 1, "text": "buy milk"},
    {"id": 2, "text": "call mom"}
  ]
}
```

A missing or empty file is treated as "no notes".

## Run the tests

Install pytest if you do not have it, then run it from the project root:

```
pip install pytest
python -m pytest -v
```

The tests set `NOTES_FILE` to a temporary file, so they never touch your real `notes.json`.

## Project layout

```
notes/
  __init__.py
  __main__.py   # makes `python -m notes` work
  cli.py        # argument parsing and printing
  storage.py    # reading and writing notes.json
tests/
  test_notes.py
```
