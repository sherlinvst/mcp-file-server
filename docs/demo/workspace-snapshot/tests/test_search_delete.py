import json

import pytest

from notes import storage
from notes.cli import main


@pytest.fixture
def path(tmp_path, monkeypatch):
    """A temp notes file, also set as NOTES_FILE for CLI tests."""
    p = tmp_path / "notes.json"
    monkeypatch.setenv(storage.ENV_VAR, str(p))
    return p


def seed(path, *texts):
    for text in texts:
        storage.add_note(path, text)


# ---- storage: search_notes ----

def test_search_matches_substring(path):
    seed(path, "buy milk", "call mom", "milkshake recipe")
    result = storage.search_notes(path, "milk")
    assert [n["id"] for n in result] == [1, 3]


def test_search_is_case_insensitive(path):
    seed(path, "Buy MILK", "call mom")
    assert [n["id"] for n in storage.search_notes(path, "milk")] == [1]
    assert [n["id"] for n in storage.search_notes(path, "CALL")] == [2]


def test_search_no_match_returns_empty_list(path):
    seed(path, "buy milk")
    assert storage.search_notes(path, "zebra") == []


def test_search_missing_file_returns_empty_list(path):
    assert storage.search_notes(path, "anything") == []


def test_search_strips_query_whitespace(path):
    seed(path, "buy milk")
    assert len(storage.search_notes(path, "  milk  ")) == 1


@pytest.mark.parametrize("query", ["", "   "])
def test_search_rejects_empty_query(path, query):
    with pytest.raises(ValueError):
        storage.search_notes(path, query)


# ---- storage: delete_note ----

def test_delete_removes_note_and_returns_it(path):
    seed(path, "one", "two", "three")
    removed = storage.delete_note(path, 2)
    assert removed == {"id": 2, "text": "two"}
    assert storage.list_notes(path) == [
        {"id": 1, "text": "one"},
        {"id": 3, "text": "three"},
    ]


def test_delete_persists_to_file(path):
    seed(path, "one", "two")
    storage.delete_note(path, 1)
    assert json.loads(path.read_text(encoding="utf-8")) == [{"id": 2, "text": "two"}]


def test_delete_unknown_id_raises_and_keeps_notes(path):
    seed(path, "one")
    with pytest.raises(ValueError, match="No note with id 99"):
        storage.delete_note(path, 99)
    assert len(storage.list_notes(path)) == 1


def test_delete_from_missing_file_raises(path):
    with pytest.raises(ValueError):
        storage.delete_note(path, 1)


def test_add_after_delete_does_not_reuse_middle_id(path):
    seed(path, "one", "two", "three")
    storage.delete_note(path, 2)
    assert storage.add_note(path, "four")["id"] == 4


# ---- CLI: search ----

def test_search_command_prints_matches(path, capsys):
    seed(path, "buy milk", "call mom", "Milk run")
    assert main(["search", "milk"]) == 0
    assert capsys.readouterr().out.splitlines() == ["1: buy milk", "3: Milk run"]


def test_search_command_no_match(path, capsys):
    seed(path, "buy milk")
    assert main(["search", "zebra"]) == 0
    assert capsys.readouterr().out.strip() == "No matching notes."


def test_search_command_empty_query_returns_error(path, capsys):
    assert main(["search", "  "]) == 1
    assert "Error" in capsys.readouterr().err


def test_search_command_corrupt_file_returns_error(path, capsys):
    path.write_text("{oops", encoding="utf-8")
    assert main(["search", "x"]) == 1
    assert "Error" in capsys.readouterr().err


# ---- CLI: delete ----

def test_delete_command_removes_note(path, capsys):
    seed(path, "one", "two")
    assert main(["delete", "1"]) == 0
    assert capsys.readouterr().out.strip() == "Deleted note 1"
    assert storage.list_notes(path) == [{"id": 2, "text": "two"}]


def test_delete_command_unknown_id_returns_error(path, capsys):
    seed(path, "one")
    assert main(["delete", "5"]) == 1
    assert "No note with id 5" in capsys.readouterr().err
    assert len(storage.list_notes(path)) == 1


@pytest.mark.parametrize("bad_id", ["abc", "1.5", "one"])
def test_delete_command_non_integer_id_returns_error(path, capsys, bad_id):
    seed(path, "one")
    assert main(["delete", bad_id]) == 1
    assert "whole number" in capsys.readouterr().err
    assert len(storage.list_notes(path)) == 1
