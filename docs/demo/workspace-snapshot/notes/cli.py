"""Command-line interface. main() returns an exit code so tests can call it directly."""

import argparse
import sys

from notes import storage


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="notes", description="A simple notes app.")
    sub = parser.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="add a note")
    add.add_argument("text", help="the note text")

    sub.add_parser("list", help="list all notes")

    search = sub.add_parser("search", help="find notes containing a word")
    search.add_argument("query", help="text to look for (case-insensitive)")

    delete = sub.add_parser("delete", help="delete a note by id")
    delete.add_argument("id", help="the id of the note to delete")
    return parser


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    path = storage.notes_path()
    try:
        if args.command == "add":
            note = storage.add_note(path, args.text)
            print(f"Added note {note['id']}")
        elif args.command == "list":
            notes = storage.list_notes(path)
            if not notes:
                print("No notes yet.")
            for note in notes:
                print(f"{note['id']}: {note['text']}")
        elif args.command == "search":
            matches = storage.search_notes(path, args.query)
            if not matches:
                print("No matching notes.")
            for note in matches:
                print(f"{note['id']}: {note['text']}")
        elif args.command == "delete":
            try:
                note_id = int(args.id)
            except ValueError:
                raise ValueError(f"ID must be a whole number, got {args.id!r}.")
            storage.delete_note(path, note_id)
            print(f"Deleted note {note_id}")
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0
