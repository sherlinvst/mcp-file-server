"""Command-line interface for notes."""
import argparse
import sys

from . import storage


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="notes", description="A tiny notes app.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_add = sub.add_parser("add", help="add a note")
    p_add.add_argument("text", help="the note text")

    sub.add_parser("list", help="list all notes")

    p_search = sub.add_parser("search", help="find notes containing a word")
    p_search.add_argument("word", help="text to look for (case-insensitive)")

    p_delete = sub.add_parser("delete", help="delete a note by ID")
    p_delete.add_argument("id", type=int, help="the note ID")
    return parser


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)

    if args.command == "add":
        note = storage.add_note(args.text)
        print(f"Added note {note['id']}")
        return 0

    if args.command == "list":
        notes = storage.list_notes()
        if not notes:
            print("No notes.")
        for note in notes:
            print(f"{note['id']}: {note['text']}")
        return 0

    if args.command == "search":
        matches = storage.search_notes(args.word)
        if not matches:
            print("No matches.")
        for note in matches:
            print(f"{note['id']}: {note['text']}")
        return 0

    if args.command == "delete":
        if storage.delete_note(args.id):
            print(f"Deleted note {args.id}")
            return 0
        print(f"No note with ID {args.id}", file=sys.stderr)
        return 1

    return 1


if __name__ == "__main__":
    sys.exit(main())
