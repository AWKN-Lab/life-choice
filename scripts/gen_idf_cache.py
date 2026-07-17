#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""本地生成 IDF 缓存（服务器部署用）"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.embed_classics import TfidfCharBigramEmbedder

# 加载 classics_index.jsonl
index_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "knowledge", "processed", "classics_index.jsonl")
print(f"Loading {index_file} ...")
items = [json.loads(l) for l in open(index_file, encoding="utf-8")]
print(f"Loaded {len(items)} items")

# fit
embedder = TfidfCharBigramEmbedder(dim=1024)
embedder.fit([it["text"] for it in items])

# save
output = os.path.join(os.path.dirname(index_file), "idf_cache.pkl")
embedder.save_idf(output)
print(f"File size: {os.path.getsize(output)} bytes")
print("DONE")
