#!/usr/bin/env python3
"""Verify every JSONL part and the reconstructed dataset hash."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def verify(parts_dir: Path) -> dict:
    parts_dir = parts_dir.resolve()
    manifest = json.loads((parts_dir / "manifest.json").read_text(encoding="utf-8"))
    dataset_hash = hashlib.sha256()
    total_rows = 0
    for expected in manifest["parts"]:
        path = parts_dir / expected["file"]
        part_hash = hashlib.sha256()
        part_rows = 0
        part_bytes = 0
        with path.open("rb") as handle:
            for raw_line in handle:
                json.loads(raw_line)
                dataset_hash.update(raw_line)
                part_hash.update(raw_line)
                part_rows += 1
                part_bytes += len(raw_line)
        actual = {
            "rows": part_rows,
            "bytes": part_bytes,
            "sha256": part_hash.hexdigest(),
        }
        for key, value in actual.items():
            if value != expected[key]:
                raise ValueError(f"{path.name} {key}: {value} != {expected[key]}")
        total_rows += part_rows

    if total_rows != manifest["rows"]:
        raise ValueError(f"rows: {total_rows} != {manifest['rows']}")
    if dataset_hash.hexdigest() != manifest["dataset_sha256"]:
        raise ValueError("reconstructed dataset SHA-256 does not match manifest")
    return {
        "part_count": manifest["part_count"],
        "rows": total_rows,
        "dataset_sha256": dataset_hash.hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("parts_dir", type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.parts_dir), ensure_ascii=False))


if __name__ == "__main__":
    main()
