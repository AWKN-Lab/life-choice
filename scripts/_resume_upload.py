"""断点续传 embeddings.npy 分块上传

检查服务器已有块,只上传缺失的块,最后合并
"""
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMBED = ROOT / "knowledge" / "processed" / "embeddings.npy"
CHUNK_DIR = Path("/tmp/embed_chunks")
CHUNK_SIZE = 50 * 1024 * 1024  # 50MB
TOTAL_CHUNKS = 28  # 已知 28 块

local_size = EMBED.stat().st_size
print(f"本地文件: {local_size/1024/1024:.1f} MB, 共 {TOTAL_CHUNKS} 块")

# 1. 检查服务器已有块
print("\n[1] 检查服务器已有块 ...")
result = subprocess.run(["ssh", "aliyun-awkn", "ls /tmp/embed_chunks/ 2>/dev/null || echo 'empty'"],
                       capture_output=True, text=True)
server_chunks = set()
if result.returncode == 0 and result.stdout.strip() != "empty":
    for line in result.stdout.strip().split("\n"):
        line = line.strip()
        if line.startswith("embed_") and line.endswith(".bin"):
            try:
                idx = int(line[6:9])
                server_chunks.add(idx)
            except:
                pass
print(f"  服务器已有: {sorted(server_chunks)} ({len(server_chunks)} 块)")

# 2. 确保本地块存在
print("\n[2] 准备本地块 ...")
CHUNK_DIR.mkdir(exist_ok=True)
needed_chunks = [i for i in range(TOTAL_CHUNKS) if i not in server_chunks]
print(f"  需上传: {needed_chunks} ({len(needed_chunks)} 块)")

if not needed_chunks:
    print("  所有块已上传,跳到合并")
else:
    # 生成所需块
    with open(EMBED, "rb") as f:
        for idx in needed_chunks:
            f.seek(idx * CHUNK_SIZE)
            chunk = f.read(CHUNK_SIZE)
            chunk_path = CHUNK_DIR / f"embed_{idx:03d}.bin"
            chunk_path.write_bytes(chunk)
            print(f"  生成块 {idx}: {len(chunk)/1024/1024:.1f} MB")

    # 3. 逐块上传(单块单连接,失败重试 3 次)
    print("\n[3] 逐块上传 ...")
    for idx in needed_chunks:
        chunk_path = CHUNK_DIR / f"embed_{idx:03d}.bin"
        success = False
        for retry in range(3):
            print(f"  块 {idx:03d} (尝试 {retry+1}/3) ...", end=" ", flush=True)
            result = subprocess.run(
                ["scp", "-o", "ConnectTimeout=30", "-o", "ServerAliveInterval=10",
                 str(chunk_path), f"aliyun-awkn:/tmp/embed_chunks/embed_{idx:03d}.bin"],
                capture_output=True, text=True, timeout=300
            )
            if result.returncode == 0:
                print("[OK]")
                success = True
                break
            else:
                print(f"[FAIL] {result.stderr[:100]}")
        if not success:
            print(f"  块 {idx:03d} 3 次重试均失败,终止")
            break

# 4. 检查所有块是否齐全
print("\n[4] 检查服务器块完整性 ...")
result = subprocess.run(["ssh", "aliyun-awkn", "ls /tmp/embed_chunks/ | wc -l"],
                       capture_output=True, text=True)
server_count = int(result.stdout.strip())
print(f"  服务器块数: {server_count}/{TOTAL_CHUNKS}")

if server_count == TOTAL_CHUNKS:
    # 5. 合并
    print("\n[5] 合并 ...")
    merge_cmd = "cd /tmp/embed_chunks && cat embed_*.bin > /tmp/g4_15books_upload/embeddings.npy && stat -c %s /tmp/g4_15books_upload/embeddings.npy"
    result = subprocess.run(["ssh", "aliyun-awkn", merge_cmd], capture_output=True, text=True)
    remote_size = int(result.stdout.strip())
    print(f"  远程合并后: {remote_size} bytes")
    print(f"  本地: {local_size} bytes")
    if remote_size == local_size:
        print("  [OK] 大小一致")
    else:
        print(f"  [FAIL] 大小不一致,差 {local_size - remote_size} bytes")
else:
    print(f"  [WARN] 块不完整,需重新运行")

# 6. 清理本地块
print("\n[6] 清理本地块 ...")
for old in CHUNK_DIR.glob("embed_*"):
    old.unlink()
print("  本地块已清理")
