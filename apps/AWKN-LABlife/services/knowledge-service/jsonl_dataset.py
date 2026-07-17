"""Resolve a JSONL dataset stored as one file or deterministic Git-sized parts."""

from __future__ import annotations

import glob
import os
from typing import Iterator, List, Tuple


def parts_dir_for(dataset_file: str) -> str:
    stem, _ = os.path.splitext(dataset_file)
    return f"{stem}.parts"


def resolve_jsonl_paths(dataset_file: str) -> List[str]:
    """Prefer a deployed monolith, then fall back to ordered Git parts."""
    if os.path.isfile(dataset_file):
        return [dataset_file]

    stem = os.path.splitext(os.path.basename(dataset_file))[0]
    pattern = os.path.join(parts_dir_for(dataset_file), f"{stem}.part-*.jsonl")
    return sorted(path for path in glob.glob(pattern) if os.path.isfile(path))


def iter_jsonl_lines(dataset_file: str) -> Iterator[Tuple[str, int, str]]:
    for path in resolve_jsonl_paths(dataset_file):
        with open(path, "r", encoding="utf-8") as handle:
            for line_no, line in enumerate(handle, 1):
                yield path, line_no, line


def count_jsonl_rows(dataset_file: str) -> int:
    return sum(1 for _path, _line_no, _line in iter_jsonl_lines(dataset_file))
