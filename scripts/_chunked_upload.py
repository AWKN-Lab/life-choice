"""分块上传 embeddings.npy 到服务器(避免 SSH 连接重置)

策略:
1. 本地 split embeddings.npy 为 200MB 块
2. 逐块 scp 上传
3. 服务器 cat 合并 + 校验大小
"""
import os
import subprocess
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMBED = ROOT / "knowledge" / "processed" / "embeddings.npy"
CHUNK_DIR = Path("/tmp/embed_chunks")
CHUNK_SIZE = 50 * 1024 * 1024  # 50MB(服务器 SSH 限制)

# 1. 计算本地文件 hash 和大小
print("[1] 计算本地文件信息 ...")
local_size = EMBED.stat().st_size
print(f"  大小: {local_size/1024/1024:.1f} MB")

# 2. 分块
print(f"\n[2] 分块到 {CHUNK_DIR} ...")
CHUNK_DIR.mkdir(exist_ok=True)
# 清理旧块
for old in CHUNK_DIR.glob("embed_*"):
    old.unlink()

with open(EMBED, "rb") as f:
    idx = 0
    while True:
        chunk = f.read(CHUNK_SIZE)
        if not chunk:
            break
        chunk_path = CHUNK_DIR / f"embed_{idx:03d}.bin"
        chunk_path.write_bytes(chunk)
        print(f"  块 {idx}: {len(chunk)/1024/1024:.1f} MB → {chunk_path}")
        idx += 1

print(f"\n  共 {idx} 块")

# 3. 逐块上传
print(f"\n[3] 逐块 scp 上传 ...")
# 先在服务器创建目录
subprocess.run(["ssh", "aliyun-awkn", "mkdir -p /tmp/embed_chunks && rm -f /tmp/embed_chunks/embed_*"], check=True)

for i in range(idx):
    chunk_path = CHUNK_DIR / f"embed_{i:03d}.bin"
    print(f"  上传块 {i}/{idx-1}: {chunk_path.name} ({chunk_path.stat().st_size/1024/1024:.1f} MB) ...")
    result = subprocess.run(
        ["scp", str(chunk_path), f"aliyun-awkn:/tmp/embed_chunks/{chunk_path.name}"],
        capture_output=True, text=True, timeout=600
    )
    if result.returncode != 0:
        print(f"    [FAIL] {result.stderr}")
        break
    else:
        print(f"    [OK]")

# 4. 服务器合并
print(f"\n[4] 服务器合并 ...")
merge_cmd = "cd /tmp/embed_chunks && cat embed_*.bin > /tmp/g4_15books_upload/embeddings.npy && ls -la /tmp/g4_15books_upload/embeddings.npy"
result = subprocess.run(["ssh", "aliyun-awkn", merge_cmd], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print(f"stderr: {result.stderr}")

# 5. 校验大小
print(f"\n[5] 校验大小 ...")
result = subprocess.run(["ssh", "aliyun-awkn", "stat -c %s /tmp/g4_15books_upload/embeddings.npy"], capture_output=True, text=True)
remote_size = int(result.stdout.strip())
print(f"  本地: {local_size} bytes")
print(f"  远程: {remote_size} bytes")
if local_size == remote_size:
    print(f"  [OK] 大小一致")
else:
    print(f"  [FAIL] 大小不一致")

# 6. 清理本地块
print(f"\n[6] 清理本地块 ...")
for old in CHUNK_DIR.glob("embed_*"):
    old.unlink()
CHUNK_DIR.rmdir()
print(f"  本地块已清理")
