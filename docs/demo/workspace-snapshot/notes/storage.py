"""Reading and writing notes.json."""
import json
import os
from pathlib import Path


def get_path() -> Path:
    """Return the notes file path (NOTES_FILE env var, else ./notes.json)."""
    return Path(os.environ.get("NOTES_FILE", "notes.json"))


def load() -> dict:
    """Load the data file. A missing or empty file means no notes."""
    path = get_path()
    if not path.exists() or not path.read_text(encoding="utf-8").strip():
        return {"next_id": 1, "notes": []}
    return json.loads(path.read_text(encoding="utf-8"))


def save(data: dict) -> None:
    get_path().write_text(json.dumps(data, indent=2), encoding="utf-8")


def add_note(text: str) -> dict:
    """Add a note and return it. IDs are never reused."""
    data = load()
    note = {"id": data["next_id"], "text": text}
    data["notes"].append(note)
    data["next_id"] += 1
    save(data)
    return note


def list_notes() -> list:
    return load()["notes"]


def search_notes(word: str) -> list:
    """Return notes whose text contains word (case-insensitive)."""
    needle = word.lower()
    return [n for n in load()["notes"] if needle in n["text"].lower()]


def delete_note(note_id: int) -> bool:
    """Delete the note with this ID. Return False if there is no such note.

    next_id is left alone, so IDs are never reused.
    """
    data = load()
    remaining = [n for n in data["notes"] if n["id"] != note_id]
    if len(remaining) == len(data["notes"]):
        return False
    data["notes"] = remaining
    save(data)
    return True
