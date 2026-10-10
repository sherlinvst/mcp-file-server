import os
import subprocess
import sys
from pathlib import Path

from notes import storage
from notes.cli import main

ROOT = Path(__file__).resolve().parent.parent


def test_add_command_prints_id_and_saves(monkeypatch, tmp_path, capsys):
    path = tmp_path / "notes.json"
    monkeypatch.setenv(storage.ENV_VAR, str(path))
    assert main(["add", "buy milk"]) == 0
    assert capsys.readouterr().out.strip() == "Added note 1"
    assert storage.list_notes(path) == [{"id": 1, "text": "buy milk"}]


def test_add_empty_text_returns_error(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv(storage.ENV_VAR, str(tmp_path / "notes.json"))
    assert main(["add", "   "]) == 1
    assert "Error" in capsys.readouterr().err


def test_list_command_empty(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv(storage.ENV_VAR, str(tmp_path / "notes.json"))
    assert main(["list"]) == 0
    assert capsys.readouterr().out.strip() == "No notes yet."


def test_list_command_shows_notes(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv(storage.ENV_VAR, str(tmp_path / "notes.json"))
    main(["add", "first"])
    main(["add", "second"])
    capsys.readouterr()
    assert main(["list"]) == 0
    assert capsys.readouterr().out.splitlines() == ["1: first", "2: second"]


def test_list_command_corrupt_file_returns_error(monkeypatch, tmp_path, capsys):
    path = tmp_path / "notes.json"
    path.write_text("{oops", encoding="utf-8")
    monkeypatch.setenv(storage.ENV_VAR, str(path))
    assert main(["list"]) == 1
    assert "Error" in capsys.readouterr().err


def test_python_dash_m_notes_end_to_end(tmp_path):
    env = dict(os.environ, **{storage.ENV_VAR: str(tmp_path / "notes.json")})
    run = lambda *args: subprocess.run(
        [sys.executable, "-m", "notes", *args],
        cwd=ROOT, env=env, capture_output=True, text=True,
    )
    assert run("add", "hello").returncode == 0
    result = run("list")
    assert result.returncode == 0
    assert result.stdout.strip() == "1: hello"
