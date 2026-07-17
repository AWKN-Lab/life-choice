#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
局部修复 classics_index.jsonl 前 2 条 NULL bytes

不重新生成整个文件,只修复前 2 条 text 字段的 NULL bytes
保持行数和 passage_id 不变,不影响下游 embeddings

流式处理: 只读写前 2 行,用临时文件方式避免 MemoryError

使用方式:
    cd 人生决策宗师
    python scripts/_fix_null_bytes_first2.py
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "knowledge" / "processed" / "classics_index.jsonl"


def main():
    if not INDEX.exists():
        print(f"[ERROR] 文件不存在: {INDEX}")
        sys.exit(1)

    # 1. 逐行读取前 2 行(不一次性加载整个文件)
    first_2_lines = []
    with open(INDEX, "r", encoding="utf-8") as f:
        for _ in range(2):
            line = f.readline()
            if not line:
                break
            first_2_lines.append(line)

    if len(first_2_lines) < 2:
        print(f"[ERROR] 文件不足 2 行")
        sys.exit(1)

    print(f"[Fix] 读取 {INDEX.name} 前 2 行")

    # 2. 修改前 2 行
    fixed = 0
    modified_lines = []
    for i, line in enumerate(first_2_lines):
        line_stripped = line.strip()
        if not line_stripped:
            modified_lines.append(line)
            continue
        try:
            item = json.loads(line_stripped)
        except json.JSONDecodeError as e:
            print(f"  [WARN] line {i+1} JSON 解析失败: {e},跳过")
            modified_lines.append(line)
            continue
        old_text = item.get("text", "")
        if "\x00" in old_text:
            new_text = old_text.replace("\x00", "")
            item["text"] = new_text
            modified_lines.append(json.dumps(item, ensure_ascii=False) + "\n")
            fixed += 1
            print(f"  修复 line {i+1}: passage_id={item.get('passage_id','')}, "
                  f"text 长度 {len(old_text)} -> {len(new_text)}")
        else:
            modified_lines.append(line)
            print(f"  line {i+1} 无 NULL bytes,跳过")

    # 3. 创建临时文件: 修改后的前 2 行 + 流式复制剩余行
    if fixed > 0:
        tmp = INDEX.with_suffix(".jsonl.tmp")
        with open(INDEX, "r", encoding="utf-8") as src, \
             open(tmp, "w", encoding="utf-8") as dst:
            # 写入修改后的前 2 行
            for line in modified_lines:
                dst.write(line)
            # 跳过原文件前 2 行
            src.readline()
            src.readline()
            # 流式复制剩余行(避免 MemoryError)
            shutil.copyfileobj(src, dst, length=1024 * 1024)  # 1MB buffer

        # 4. 替换原文件
        tmp.replace(INDEX)
        print(f"\n[DONE] 共修复 {fixed} 条,文件已写回")
    else:
        print(f"\n[DONE] 无需修复")

    # 5. 验证前 2 行
    with open(INDEX, "r", encoding="utf-8") as f:
        for i in range(2):
            line = f.readline().strip()
            if not line:
                continue
            item = json.loads(line)
            assert "\x00" not in item.get("text", ""), f"line {i+1} 仍有 NULL bytes!"
    print(f"[Verify] 前 2 行 NULL bytes 已清除")


if __name__ == "__main__":
    main()
