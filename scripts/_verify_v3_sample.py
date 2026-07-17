#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v3 嵌入质量抽样验证(inline 修复脚本, 不入 git)"""
import numpy as np
import json
from pathlib import Path

EMB = Path('knowledge/processed/embeddings_v3.npy')
INDEX = Path('knowledge/processed/classics_index.jsonl')

emb = np.memmap(EMB, dtype=np.float32, mode='r', shape=(329577, 512))

items = []
with open(INDEX, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            items.append(json.loads(line))

# 检查前 5 条文本, 排查跨书=1.0 异常
print('=== 前 5 条 text 前 60 字符 ===')
for i in range(5):
    book = items[i].get('book', '')[:30]
    text = items[i].get('text', '')[:60]
    print(f'  [{i}] book={book!r} text={text!r}')

# 抽样 5 个不同 book, 各取最多 3 条 passage
books_set = {}
for i, it in enumerate(items):
    b = it.get('book', '')
    if b not in books_set:
        books_set[b] = []
    if len(books_set[b]) < 3:
        books_set[b].append(i)

sample_books = [b for b in books_set if len(books_set[b]) >= 2][:5]
print(f'\n=== 抽样 5 本书 ===')
for b in sample_books:
    print(f'  {b[:40]!r} idx={books_set[b]}')

# 跨书基向量相似度矩阵
base_idx = [books_set[b][0] for b in sample_books]
print(f'\n=== 跨书基向量相似度矩阵 ===')
for i, idx_i in enumerate(base_idx):
    sims = []
    for j, idx_j in enumerate(base_idx):
        sim = float(np.dot(emb[idx_i], emb[idx_j]))
        sims.append(round(sim, 3))
    short = sample_books[i][:20]
    print(f'  book[{i}] ({short!r}): {sims}')

# 同书内相似度
print(f'\n=== 同书内相似度 ===')
for b in sample_books:
    idxs = books_set[b]
    if len(idxs) >= 2:
        sim = float(np.dot(emb[idxs[0]], emb[idxs[1]]))
        print(f'  {b[:30]!r}: {sim:.3f}')

# norm 验证
print(f'\n=== norm 验证 ===')
for i in base_idx:
    n = float(np.linalg.norm(emb[i]))
    print(f'  idx={i} norm={n:.6f}')
