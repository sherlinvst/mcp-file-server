"""Note storage: pure functions that take an explicit file path (see D-001, D-002)."""

import json
import os
from pathlib import Path

DEFAULT_FILE = "notes.json"
ENV_VAR = "NOTES_FILE"


def notes_path() -> Path:
    """Return the notes file path: $NOTES_FILE if set, else notes.json in the cwd."""
    return Path(os.environ.get(ENV_VAR) or DEFAULT_FILE)


def load_notes(path) -> list:
    """Return the list of notes. A missing or empty file means no notes."""
    path = Path(path)
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path} is not valid JSON: {exc}") from exc
    if not isinstance(data, list):
        raise ValueError(f"{path} must contain a JSON list of notes")
    return data


def save_notes(path, notes: list) -> None:
    """Write the notes list to the file as JSON."""
    Path(path).write_text(
        json.dumps(notes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def add_note(path, text: str) -> dict:
    """Add a note and return it. The new id is the highest existing id + 1."""
    text = text.strip()
    if not text:
        raise ValueError("Note text must not be empty.")
    notes = load_notes(path)
    new_id = max((note["id"] for note in notes), default=0) + 1
    note = {"id": new_id, "text": text}
    notes.append(note)
    save_notes(path, notes)
    return note


def list_notes(path) -> list:
    """Return all notes in the order they were added."""
    return load_notes(path)


def search_notes(path, query: str) -> list:
    """Return notes whose text contains query, ignoring case (see D-003)."""
    query = query.strip()
    if not query:
        raise ValueError("Search text must not be empty.")
    needle = query.casefold()
    return [n for n in load_notes(path) if needle in n["text"].casefold()]


def delete_note(path, note_id: int) -> dict:
    """Delete the note with the given id and return it (see D-004)."""
    notes = load_notes(path)
    for index, note in enumerate(notes):
        if note["id"] == note_id:
            removed = notes.pop(index)
            save_notes(path, notes)
            return removed
    raise ValueError(f"No note with id {note_id}.")
