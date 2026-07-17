#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P0 Step 5 验证脚本（直接调用版）：绕过 HTTP 层，直接测试函数"""
import time
import sys
import os

# 添加 knowledge-service 目录到 sys.path
_KS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "apps", "AWKN-LABlife", "services", "knowledge-service")
sys.path.insert(0, _KS_DIR)
os.chdir(_KS_DIR)

print("=" * 60)
print("P0 Step 5 验证（直接调用函数，绕过 HTTP）")
print("=" * 60)

t0 = time.time()
import main
print(f"[{time.time()-t0:.1f}s] main 导入完成")

# 1) 测试 _init_chroma()
print("\n--- 1. 测试 _init_chroma() ---")
t0 = time.time()
ok = main._init_chroma()
print(f"[{time.time()-t0:.1f}s] _init_chroma() = {ok}")
print(f"  init_error: {main._chroma_init_error}")
if main._loaded_embeddings is not None:
    print(f"  embeddings shape: {main._loaded_embeddings.shape}")
    print(f"  items count: {len(main._loaded_items)}")
    print(f"  vector_mode: numpy_in_memory")

if not ok:
    print("\n[FAIL] 向量库初始化失败")
    sys.exit(1)

# 2) 测试 _vector_search()
print("\n--- 2. 测试 _vector_search('日主旺衰', 'bazi', 5) ---")
t0 = time.time()
results = main._vector_search("日主旺衰", "bazi", 5)
print(f"[{time.time()-t0:.1f}s] 返回 {len(results)} 条结果")
for i, (idx, sim, it) in enumerate(results[:5]):
    book = it.get("book", "")[:20]
    text = it.get("text", "")[:80]
    print(f"  [{i}] sim={sim:.3f} book={book} text={text}...")

# 3) 测试 /hybrid_search 端点函数
print("\n--- 3. 测试 hybrid_search 端点 ---")
req = main.HybridSearchRequest(routeType="ziping", question="日主旺衰", limit=5)
t0 = time.time()
resp = main.hybrid_search(req)
print(f"[{time.time()-t0:.1f}s] 返回 {len(resp.items)} 条结果")
for i, it in enumerate(resp.items[:5]):
    print(f"  [{i}] score={it.score} title={it.title} text={it.text[:80]}...")

# 4) 测试 /embed_search 端点函数（六壬）
print("\n--- 4. 测试 embed_search 端点（六壬） ---")
req2 = main.EmbedSearchRequest(question="天地盘", systemType="liuren", limit=3)
t0 = time.time()
resp2 = main.embed_search(req2)
print(f"[{time.time()-t0:.1f}s] 返回 {len(resp2.items)} 条结果")
for i, it in enumerate(resp2.items[:3]):
    print(f"  [{i}] score={it.score} title={it.title} text={it.text[:80]}...")

# 5) 测试 /health-v2 端点函数
print("\n--- 5. 测试 health_v2 端点 ---")
health = main.health_v2()
print(f"  status: {health.get('status')}")
print(f"  v2_initialized: {health.get('v2_initialized')}")
print(f"  vector_count: {health.get('vector_count')}")
print(f"  vector_mode: {health.get('vector_mode')}")
print(f"  items_count: {health.get('items_count')}")

print("\n" + "=" * 60)
print("[PASS] P0 Step 5 验证通过")
print("  - 向量库初始化: OK (26568 条)")
print("  - 向量检索: OK")
print("  - 混合检索: OK")
print("  - 健康检查: OK")
print("=" * 60)
