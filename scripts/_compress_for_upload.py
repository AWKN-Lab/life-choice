"""压缩 classics_index.jsonl 和 embeddings.npy 为 gzip,减少传输大小"""
import gzip
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
EMBED = ROOT / "knowledge" / "processed" / "embeddings.npy"

# 压缩 classics_index.jsonl
print("[1] 压缩 classics_index.jsonl ...")
src_size = INDEX.stat().st_size
dst = Path("/tmp/classics_index.jsonl.gz")
with open(INDEX, "rb") as f_in, gzip.open(dst, "wb", compresslevel=6) as f_out:
    shutil.copyfileobj(f_in, f_out)
dst_size = dst.stat().st_size
print(f"  原 {src_size/1024/1024:.1f} MB → 压缩 {dst_size/1024/1024:.1f} MB (压缩率 {dst_size/src_size:.1%})")

# embeddings.npy 不压缩(float32 二进制,gzip 效果差),直接传
print(f"\n[2] embeddings.npy: {EMBED.stat().st_size/1024/1024:.1f} MB (不压缩)")
print(f"  路径: {EMBED}")
