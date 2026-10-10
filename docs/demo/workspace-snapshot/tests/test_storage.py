import json

import pytest

from notes import storage


def test_load_missing_file_returns_empty(tmp_path):
    assert storage.load_notes(tmp_path / "notes.json") == []


def test_load_empty_file_returns_empty(tmp_path):
    path = tmp_path / "notes.json"
    path.write_text("", encoding="utf-8")
    assert storage.load_notes(path) == []


def test_load_invalid_json_raises(tmp_path):
    path = tmp_path / "notes.json"
    path.write_text("{not json", encoding="utf-8")
    with pytest.raises(ValueError):
        storage.load_notes(path)


def test_load_non_list_raises(tmp_path):
    path = tmp_path / "notes.json"
    path.write_text('{"id": 1}', encoding="utf-8")
    with pytest.raises(ValueError):
        storage.load_notes(path)


def test_add_note_creates_file_with_id_1(tmp_path):
    path = tmp_path / "notes.json"
    note = storage.add_note(path, "buy milk")
    assert note == {"id": 1, "text": "buy milk"}
    assert json.loads(path.read_text(encoding="utf-8")) == [
        {"id": 1, "text": "buy milk"}
    ]


def test_add_note_increments_id(tmp_path):
    path = tmp_path / "notes.json"
    storage.add_note(path, "first")
    second = storage.add_note(path, "second")
    assert second["id"] == 2


def test_add_note_strips_whitespace(tmp_path):
    path = tmp_path / "notes.json"
    assert storage.add_note(path, "  hello  ")["text"] == "hello"


def test_add_note_rejects_empty_text(tmp_path):
    path = tmp_path / "notes.json"
    with pytest.raises(ValueError):
        storage.add_note(path, "   ")
    assert not path.exists()


def test_add_note_keeps_unicode(tmp_path):
    path = tmp_path / "notes.json"
    storage.add_note(path, "café ☕")
    assert storage.list_notes(path)[0]["text"] == "café ☕"


def test_list_notes_empty(tmp_path):
    assert storage.list_notes(tmp_path / "notes.json") == []


def test_list_notes_returns_in_added_order(tmp_path):
    path = tmp_path / "notes.json"
    storage.add_note(path, "a")
    storage.add_note(path, "b")
    assert [n["text"] for n in storage.list_notes(path)] == ["a", "b"]


def test_notes_path_default(monkeypatch):
    monkeypatch.delenv(storage.ENV_VAR, raising=False)
    assert str(storage.notes_path()) == "notes.json"


def test_notes_path_env_override(monkeypatch, tmp_path):
    target = tmp_path / "custom.json"
    monkeypatch.setenv(storage.ENV_VAR, str(target))
    assert storage.notes_path() == target
