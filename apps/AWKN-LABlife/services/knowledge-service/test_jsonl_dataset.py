import json
import sys
from pathlib import Path


SERVICE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE_DIR))

from jsonl_dataset import count_jsonl_rows, iter_jsonl_lines, resolve_jsonl_paths
import loader


def test_prefers_monolith_then_falls_back_to_ordered_parts(tmp_path):
    dataset = tmp_path / "classics_index.jsonl"
    parts_dir = tmp_path / "classics_index.parts"
    parts_dir.mkdir()
    (parts_dir / "classics_index.part-0002.jsonl").write_text(
        json.dumps({"passage_id": "b"}) + "\n", encoding="utf-8"
    )
    (parts_dir / "classics_index.part-0001.jsonl").write_text(
        json.dumps({"passage_id": "a"}) + "\n", encoding="utf-8"
    )

    assert [Path(path).name for path in resolve_jsonl_paths(str(dataset))] == [
        "classics_index.part-0001.jsonl",
        "classics_index.part-0002.jsonl",
    ]
    assert count_jsonl_rows(str(dataset)) == 2
    assert [json.loads(line)["passage_id"] for _path, _line_no, line in iter_jsonl_lines(str(dataset))] == ["a", "b"]

    dataset.write_text(json.dumps({"passage_id": "deployed"}) + "\n", encoding="utf-8")
    assert resolve_jsonl_paths(str(dataset)) == [str(dataset)]
    assert count_jsonl_rows(str(dataset)) == 1


def test_loader_reads_parts_without_monolith(tmp_path, monkeypatch):
    dataset = tmp_path / "classics_index.jsonl"
    parts_dir = tmp_path / "classics_index.parts"
    parts_dir.mkdir()
    records = [
        {"passage_id": "a", "system_type": "bazi", "book": "A", "text": "first"},
        {"passage_id": "b", "system_type": "liuren", "book": "B", "text": "second"},
    ]
    for index, record in enumerate(records, 1):
        (parts_dir / f"classics_index.part-{index:04d}.jsonl").write_text(
            json.dumps(record) + "\n", encoding="utf-8"
        )
    manifest = tmp_path / "_manifest.json"
    manifest.write_text(json.dumps({"count": 2, "books": 2}), encoding="utf-8")
    monkeypatch.setattr(loader, "INDEX_FILE", str(dataset))
    monkeypatch.setattr(loader, "MANIFEST_FILE", str(manifest))

    loaded = loader.load_all()

    assert [item["passage_id"] for item in loaded["items"]] == ["a", "b"]
    assert len(loaded["bazi"]) == 1
    assert len(loaded["liuren"]) == 1
    assert loaded["sources"] == {"total": 2, "books": 2}
