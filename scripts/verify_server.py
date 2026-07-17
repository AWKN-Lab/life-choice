#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""服务器路径适配验证脚本（mmap + IDF 缓存模式）"""
import os
import sys
import time

# 设置环境变量（服务器部署用）
os.environ["KNOWLEDGE_DATA_DIR"] = "/opt/awkn-life/knowledge/processed"
os.environ["KNOWLEDGE_USE_MMAP"] = "1"  # 启用 mmap 低内存模式

# 切换到 knowledge-service 目录
os.chdir("/opt/awkn-life/services/knowledge-service")
sys.path.insert(0, "/opt/awkn-life/services/knowledge-service")

print("=== 环境变量 ===")
print("KNOWLEDGE_DATA_DIR:", os.environ.get("KNOWLEDGE_DATA_DIR"))
print("KNOWLEDGE_USE_MMAP:", os.environ.get("KNOWLEDGE_USE_MMAP"))

import main

print("\n=== 路径验证 ===")
print("EMBED_FILE:", main.EMBED_FILE)
print("INDEX_FILE:", main.INDEX_FILE)
print("IDF_CACHE_FILE:", main.IDF_CACHE_FILE)
print("EMBED_FILE exists:", os.path.exists(main.EMBED_FILE))
print("INDEX_FILE exists:", os.path.exists(main.INDEX_FILE))
print("IDF_CACHE_FILE exists:", os.path.exists(main.IDF_CACHE_FILE))

print("\n=== 初始化向量库（计时）===")
t0 = time.time()
ok = main._init_chroma()
elapsed = time.time() - t0
print(f"init_ok: {ok}")
print(f"init_time: {elapsed:.1f}s")
if main._chroma_init_error:
    print("init_error:", main._chroma_init_error)
if main._loaded_embeddings is not None:
    print("vector_count:", main._loaded_embeddings.shape[0])
    print("embeddings_shape:", main._loaded_embeddings.shape)
    print("items_count:", len(main._loaded_items))

print("\n=== 测试向量检索 ===")
results = main._vector_search("日主旺衰", "bazi", 3)
print(f"返回 {len(results)} 条结果")
for idx, sim, it in results[:2]:
    print(f"  [score={sim:.3f}] {it.get('book', '')[:30]}: {it.get('text', '')[:80]}")

print("\n=== 测试健康检查 ===")
health = main.health_v2()
print("status:", health.get("status"))
print("v2_initialized:", health.get("v2_initialized"))
print("vector_count:", health.get("vector_count"))
print("vector_mode:", health.get("vector_mode"))

print("\n=== 内存使用 ===")
import resource
mem_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
print(f"max_rss: {mem_kb / 1024:.1f} MB")

print("\n[DONE] 服务器验证完成")
