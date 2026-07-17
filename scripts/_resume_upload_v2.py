#!/usr/bin/env python3
"""断点续传 embeddings.npy 分块上传 v2

改进:每块上传后立即校验大小,不匹配重传。
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMBED = ROOT / "knowledge" / "processed" / "embeddings.npy"
CHUNK_DIR = Path("/tmp/embed_chunks_v2")
CHUNK_SIZE = 50 * 1024 * 1024  # 50MB
EXPECTED_SIZE = EMBED.stat().st_size
TOTAL_CHUNKS = (EXPECTED_SIZE + CHUNK_SIZE - 1) // CHUNK_SIZE

print(f"[info] embeddings.npy size: {EXPECTED_SIZE} bytes = {EXPECTED_SIZE/1024/1024:.2f} MB")
print(f"[info] chunk size: {CHUNK_SIZE/1024/1024} MB, total chunks: {TOTAL_CHUNKS}")

# 1. 本地分块(若未分块)
if not CHUNK_DIR.exists():
    CHUNK_DIR.mkdir()
    print(f"[1] 分块到 {CHUNK_DIR} ...")
    with open(EMBED, "rb") as f_in:
        for idx in range(TOTAL_CHUNKS):
            chunk_path = CHUNK_DIR / f"embed_{idx:03d}.bin"
            data = f_in.read(CHUNK_SIZE)
            with open(chunk_path, "wb") as f_out:
                f_out.write(data)
            if idx % 5 == 0:
                print(f"  分块 {idx:03d}/{TOTAL_CHUNKS} ({len(data)} bytes)")
    print(f"  分块完成,共 {TOTAL_CHUNKS} 块")
else:
    print(f"[1] 分块目录已存在: {CHUNK_DIR}")

# 2. 检查服务器已有块(含大小校验)
print(f"\n[2] 检查服务器已有块 ...")
result = subprocess.run(
    ["ssh", "aliyun-awkn", "ls -la /tmp/embed_chunks_v2/ 2>/dev/null || echo 'empty'"],
    capture_output=True, text=True, timeout=30
)
server_chunks = {}
if result.returncode == 0 and 'empty' not in result.stdout:
    for line in result.stdout.strip().split('\n'):
        if line.startswith('-'):
            parts = line.split()
            size = int(parts[4])
            name = parts[-1]
            try:
                idx = int(name.replace('embed_', '').replace('.bin', ''))
                server_chunks[idx] = size
            except ValueError:
                continue
print(f"  服务器已有 {len(server_chunks)} 块")

# 3. 计算每块期望大小
def expected_chunk_size(idx):
    if idx < TOTAL_CHUNKS - 1:
        return CHUNK_SIZE
    return EXPECTED_SIZE - (TOTAL_CHUNKS - 1) * CHUNK_SIZE

# 4. 找出需要上传的块(缺失或大小不对)
needed_chunks = []
for idx in range(TOTAL_CHUNKS):
    exp_size = expected_chunk_size(idx)
    if idx not in server_chunks or server_chunks[idx] != exp_size:
        needed_chunks.append(idx)
print(f"  需要上传 {len(needed_chunks)} 块: {needed_chunks[:10]}{'...' if len(needed_chunks) > 10 else ''}")

# 5. 逐块上传(单块单连接,失败重试 3 次,上传后校验大小)
success_count = 0
fail_count = 0
for idx in needed_chunks:
    chunk_path = CHUNK_DIR / f"embed_{idx:03d}.bin"
    exp_size = expected_chunk_size(idx)
    success = False
    for retry in range(3):
        print(f"  块 {idx:03d} (尝试 {retry+1}/3) ...", end=" ", flush=True)
        result = subprocess.run(
            ["scp", "-o", "ConnectTimeout=30", "-o", "ServerAliveInterval=10",
             "-o", "ServerAliveCountMax=100", "-o", "TCPKeepAlive=yes",
             str(chunk_path), f"aliyun-awkn:/tmp/embed_chunks_v2/embed_{idx:03d}.bin"],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode != 0:
            print(f"[FAIL] {result.stderr[:80]}")
            continue
        # 校验服务器端文件大小
        verify = subprocess.run(
            ["ssh", "aliyun-awkn", f"stat -c %s /tmp/embed_chunks_v2/embed_{idx:03d}.bin 2>/dev/null || echo 0"],
            capture_output=True, text=True, timeout=30
        )
        try:
            actual_size = int(verify.stdout.strip())
        except ValueError:
            actual_size = 0
        if actual_size == exp_size:
            print(f"[OK] {actual_size} bytes")
            success = True
            success_count += 1
            break
        else:
            print(f"[SIZE MISMATCH] expected={exp_size} actual={actual_size}")
    if not success:
        fail_count += 1
        print(f"  块 {idx:03d} 3 次重试均失败!")

print(f"\n[5] 上传完成: 成功 {success_count}, 失败 {fail_count}")
if fail_count > 0:
    print("[ERROR] 有块上传失败,请重跑脚本")
    sys.exit(1)

# 6. 合并
print(f"\n[6] 服务器端合并 ...")
merge_cmd = f"cd /tmp/embed_chunks_v2 && cat $(ls embed_*.bin | sort) > /tmp/g4_15books_upload/embeddings.npy && stat -c %s /tmp/g4_15books_upload/embeddings.npy"
result = subprocess.run(["ssh", "aliyun-awkn", merge_cmd], capture_output=True, text=True, timeout=120)
print(f"  合并结果: {result.stdout.strip()}")
if result.returncode != 0:
    print(f"  [ERROR] {result.stderr}")
    sys.exit(1)

# 7. 校验最终大小
actual = int(result.stdout.strip())
if actual == EXPECTED_SIZE:
    print(f"  [OK] 大小匹配: {actual} == {EXPECTED_SIZE}")
    print(f"\n[DONE] embeddings.npy 上传完成!")
else:
    print(f"  [ERROR] 大小不匹配: {actual} != {EXPECTED_SIZE}")
    sys.exit(1)
