#!/usr/bin/env python3
"""Split a JSONL dataset on record boundaries and emit a SHA-256 manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import BinaryIO, Dict, List, Optional


DEFAULT_MAX_BYTES = 24 * 1024 * 1024


def split_jsonl(source: Path, output_dir: Path, prefix: str, max_bytes: int) -> Dict:
    source = source.resolve()
    output_dir = output_dir.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    if max_bytes <= 0:
        raise ValueError("max_bytes must be positive")

    output_dir.mkdir(parents=True, exist_ok=True)
    for stale in output_dir.glob(f"{prefix}.part-*.jsonl"):
        stale.unlink()

    source_hash = hashlib.sha256()
    parts: List[Dict] = []
    handle: Optional[BinaryIO] = None
    part_hash = hashlib.sha256()
    part_bytes = 0
    part_rows = 0
    total_rows = 0

    def close_part() -> None:
        nonlocal handle, part_hash, part_bytes, part_rows
        if handle is None:
            return
        path = Path(handle.name)
        handle.close()
        parts.append({
            "file": path.name,
            "rows": part_rows,
            "bytes": part_bytes,
            "sha256": part_hash.hexdigest(),
        })
        handle = None
        part_hash = hashlib.sha256()
        part_bytes = 0
        part_rows = 0

    with source.open("rb") as reader:
        for raw_line in reader:
            if len(raw_line) > max_bytes:
                raise ValueError(f"single JSONL record exceeds max_bytes: {len(raw_line)}")
            json.loads(raw_line)
            if handle is None or (part_bytes and part_bytes + len(raw_line) > max_bytes):
                close_part()
                part_path = output_dir / f"{prefix}.part-{len(parts) + 1:04d}.jsonl"
                handle = part_path.open("wb")
            handle.write(raw_line)
            source_hash.update(raw_line)
            part_hash.update(raw_line)
            part_bytes += len(raw_line)
            part_rows += 1
            total_rows += 1
    close_part()

    manifest = {
        "format": "awkn-jsonl-parts/v1",
        "source_name": source.name,
        "dataset_sha256": source_hash.hexdigest(),
        "rows": total_rows,
        "max_part_bytes": max_bytes,
        "part_count": len(parts),
        "parts": parts,
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--prefix")
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    args = parser.parse_args()
    prefix = args.prefix or args.source.stem
    manifest = split_jsonl(args.source, args.output_dir, prefix, args.max_bytes)
    print(json.dumps({
        "rows": manifest["rows"],
        "part_count": manifest["part_count"],
        "dataset_sha256": manifest["dataset_sha256"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
