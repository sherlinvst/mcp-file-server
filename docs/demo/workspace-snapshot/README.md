# notes

A small command-line notes app. Notes are stored in a JSON file. Python standard library only; pytest is needed only to run the tests.

## Requirements

- Python 3.10 or newer
- pytest (for the tests only): `pip install pytest`

## Usage

Run all commands from the project folder (the one that contains the `notes/` folder).

```
python -m notes add "buy milk"
python -m notes list
python -m notes search "milk"
python -m notes delete 1
```

| Command | What it does | Output |
|---|---|---|
| `add "text"` | Saves a new note. Leading and trailing spaces are removed. Empty text is an error. | `Added note 1` |
| `list` | Shows all notes in the order they were added. | `1: buy milk`, or `No notes yet.` |
| `search "word"` | Shows notes whose text contains the word. Case-insensitive, matches parts of words ("mil" finds "milk"). An empty search is an error. | `1: buy milk`, or `No matching notes.` |
| `delete ID` | Deletes the note with that ID. An unknown ID, or an ID that is not a whole number, is an error. | `Deleted note 1` |

Errors are printed to stderr as `Error: ...` and the exit code is 1. Searching with no matches is not an error (exit code 0).

Note IDs do not change when other notes are deleted, so IDs can have gaps. New notes get the highest existing ID plus 1, so if you delete the newest note, its ID can be used again by the next note.

## Where notes are stored

By default notes are saved in `notes.json` in the folder you run the command from. To use a different file, set the `NOTES_FILE` environment variable.

Windows (PowerShell):

```
$env:NOTES_FILE = "C:\path\to\my-notes.json"
python -m notes list
```

macOS / Linux:

```
NOTES_FILE=/path/to/my-notes.json python -m notes list
```

The file is a JSON list like `[{"id": 1, "text": "buy milk"}]`. A missing or empty file counts as no notes. A file with invalid JSON gives an error and is not overwritten.

## Running the tests

From the project folder:

```
pytest -v
```

The tests use temporary files, so they never touch your real `notes.json`.

## Project layout

```
notes/
  __init__.py
  __main__.py   entry point for python -m notes
  cli.py        argument parsing and printing
  storage.py    reading and writing the notes file
tests/
  test_cli.py
  test_storage.py
  test_search_delete.py
```
