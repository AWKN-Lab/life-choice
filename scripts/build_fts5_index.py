#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FTS5 索引构建脚本（Phase 1：方案 Z1 纯关键词检索）

输入：knowledge/processed/classics_index.jsonl（357,359 行）
输出：knowledge/processed/passages_fts.db（SQLite + FTS5 索引）

用途：
- 与 LanceDB 对标评估（详见 LanceDB对比-20260705.md 方案 Z）
- 验证 SQLite FTS5 在 357k passages 上的召回率
- 不修改生产代码，独立评估

中文分词策略（v1 快速基线）：
- 不用 jieba（357k passages jieba 分词需要 5-12 分钟，太慢）
- 直接用 FTS5 unicode61 分词器（对中文按字分词）
- 每个中文字符作为一个 token，BM25 排序偏向多字匹配
- 若召回率不足，后续再加 jieba 分词优化（见 v2 改进）
"""
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
DB_FILE = ROOT / "knowledge" / "processed" / "passages_fts.db"


def clean_text(text: str) -> str:
    """清理文本：去除 NULL 字符、多余空白"""
    if not text:
        return ""
    # 去除 NULL 字符
    text = text.replace("\u0000", "")
    # 去除控制字符
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # 压缩空白
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_fts5_index():
    """构建 FTS5 索引（unicode61 基线，不用 jieba）"""
    if not INDEX_FILE.exists():
        print(f"[ERROR] 索引文件不存在: {INDEX_FILE}")
        sys.exit(1)

    print(f"[FTS5] 开始构建索引（unicode61 基线）", flush=True)
    print(f"  输入: {INDEX_FILE}", flush=True)
    print(f"  输出: {DB_FILE}", flush=True)

    # 删除旧数据库
    if DB_FILE.exists():
        DB_FILE.unlink()
        print(f"  已删除旧数据库", flush=True)

    # 连接 SQLite
    conn = sqlite3.connect(str(DB_FILE))
    cur = conn.cursor()

    # 创建 FTS5 虚拟表
    # unicode61: 对中文按字分词（每个字一个 token）
    # 这样 "日主身弱" 会被分成 "日" "主" "身" "弱"
    cur.execute("""
        CREATE VIRTUAL TABLE passages_fts USING fts5(
            passage_id,
            text,
            system_type,
            book,
            chapter,
            tokenize='unicode61'
        )
    """)
    print(f"  已创建 FTS5 表（unicode61）", flush=True)

    # 批量导入
    t0 = time.time()
    count = 0
    batch = []
    BATCH_SIZE = 10000

    with open(INDEX_FILE, encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                it = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  [WARN] 第 {line_no} 行 JSON 解析失败: {e}", flush=True)
                continue

            text_clean = clean_text(it.get("text", ""))

            batch.append((
                it.get("passage_id", f"p{line_no:06d}"),
                text_clean,
                it.get("system_type", "other"),
                it.get("book", ""),
                it.get("chapter", ""),
            ))

            if len(batch) >= BATCH_SIZE:
                cur.executemany(
                    "INSERT INTO passages_fts VALUES (?, ?, ?, ?, ?)",
                    batch
                )
                count += len(batch)
                batch = []
                elapsed = time.time() - t0
                rate = count / max(elapsed, 0.01)
                print(f"  [{count}] {rate:.0f} passages/s, elapsed={elapsed:.1f}s", flush=True)

    # 写入剩余
    if batch:
        cur.executemany(
            "INSERT INTO passages_fts VALUES (?, ?, ?, ?, ?)",
            batch
        )
        count += len(batch)

    conn.commit()
    elapsed = time.time() - t0
    print(f"\n[FTS5] 导入完成: {count} passages, 耗时 {elapsed:.1f}s ({count/elapsed:.0f} passages/s)", flush=True)

    # 创建元数据统计表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS passages_stats (
            system_type TEXT PRIMARY KEY,
            count INTEGER
        )
    """)
    cur.execute("DELETE FROM passages_stats")
    cur.execute("""
        INSERT INTO passages_stats
        SELECT system_type, COUNT(*) FROM passages_fts
        GROUP BY system_type
    """)
    conn.commit()

    # 打印统计
    print(f"\n[统计] system_type 分布:", flush=True)
    cur.execute("SELECT system_type, count FROM passages_stats ORDER BY count DESC")
    for sys_type, cnt in cur.fetchall():
        print(f"  {sys_type:15s} {cnt:>7d}", flush=True)

    # 索引大小
    db_size = DB_FILE.stat().st_size
    print(f"\n[FTS5] 索引大小: {db_size/1024/1024:.1f}MB", flush=True)

    # 验证查询
    print(f"\n[验证] 测试查询: '日主 身弱 用神'", flush=True)
    cur.execute("""
        SELECT passage_id, book, system_type, bm25(passages_fts) AS score
        FROM passages_fts
        WHERE passages_fts MATCH '日主 身弱 用神'
        ORDER BY score
        LIMIT 5
    """)
    results = cur.fetchall()
    print(f"  返回 {len(results)} 条结果:", flush=True)
    for pid, book, sys_type, score in results:
        print(f"    score={score:.3f} | {sys_type:10s} | {book[:30]} | {pid[:40]}", flush=True)

    conn.close()
    print(f"\n[DONE] FTS5 索引构建完成: {DB_FILE}", flush=True)


if __name__ == "__main__":
    build_fts5_index()
