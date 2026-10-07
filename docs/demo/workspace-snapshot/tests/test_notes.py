import pytest

from notes import storage
from notes.cli import main


@pytest.fixture(autouse=True)
def temp_notes_file(tmp_path, monkeypatch):
    monkeypatch.setenv("NOTES_FILE", str(tmp_path / "notes.json"))


def test_add_creates_note_with_id_1():
    note = storage.add_note("buy milk")
    assert note == {"id": 1, "text": "buy milk"}
    assert storage.list_notes() == [note]


def test_add_increments_ids():
    storage.add_note("first")
    second = storage.add_note("second")
    assert second["id"] == 2


def test_list_empty_when_no_file():
    assert storage.list_notes() == []


def test_cli_add_prints_confirmation(capsys):
    assert main(["add", "hello"]) == 0
    assert "Added note 1" in capsys.readouterr().out


def test_cli_list_shows_notes(capsys):
    main(["add", "alpha"])
    main(["add", "beta"])
    capsys.readouterr()
    assert main(["list"]) == 0
    out = capsys.readouterr().out
    assert "1: alpha" in out
    assert "2: beta" in out


def test_cli_list_empty(capsys):
    assert main(["list"]) == 0
    assert "No notes." in capsys.readouterr().out


# --- search ---

def test_search_is_case_insensitive_substring():
    storage.add_note("Buy Milk")
    storage.add_note("call mom")
    result = storage.search_notes("milk")
    assert [n["text"] for n in result] == ["Buy Milk"]


def test_search_no_match_returns_empty_list():
    storage.add_note("hello")
    assert storage.search_notes("zzz") == []


def test_cli_search_prints_matches(capsys):
    main(["add", "apple pie"])
    main(["add", "banana"])
    capsys.readouterr()
    assert main(["search", "APPLE"]) == 0
    out = capsys.readouterr().out
    assert "1: apple pie" in out
    assert "banana" not in out


def test_cli_search_no_matches(capsys):
    main(["add", "apple"])
    capsys.readouterr()
    assert main(["search", "zzz"]) == 0
    assert "No matches." in capsys.readouterr().out


# --- delete ---

def test_delete_removes_note():
    storage.add_note("keep")
    storage.add_note("remove")
    assert storage.delete_note(2) is True
    assert [n["text"] for n in storage.list_notes()] == ["keep"]


def test_delete_unknown_id_returns_false():
    storage.add_note("only")
    assert storage.delete_note(99) is False
    assert len(storage.list_notes()) == 1


def test_delete_does_not_reuse_ids():
    storage.add_note("a")
    storage.add_note("b")
    storage.delete_note(2)
    third = storage.add_note("c")
    assert third["id"] == 3


def test_cli_delete_prints_confirmation(capsys):
    main(["add", "bye"])
    capsys.readouterr()
    assert main(["delete", "1"]) == 0
    assert "Deleted note 1" in capsys.readouterr().out
    assert storage.list_notes() == []


def test_cli_delete_unknown_id_exits_1(capsys):
    assert main(["delete", "5"]) == 1
    assert "No note with ID 5" in capsys.readouterr().err
