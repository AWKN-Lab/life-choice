#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""embed_classics_v3.py 回归测试

验证 P1-F1 bug 修复: line 160 `del embeddings` 后访问 `embeddings.shape` 导致 UnboundLocalError

修复策略: 用临时变量 emb_shape/emb_dtype/emb_size_mb 保存元信息,
         把 `del embeddings` 移到所有引用之后(抽样验证之后)

测试分层:
1. test_syntax_ok (快速): 脚本语法正确
2. test_del_after_all_refs (快速): 静态验证 del embeddings 在所有 embeddings 引用之后
3. test_meta_written_after_encode (slow): 小规模 10 条数据端到端跑通
"""
import ast
import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS_DIR))

EMBED_SCRIPT = SCRIPTS_DIR / "embed_classics_v3.py"


def test_syntax_ok():
    """测试 1: 脚本语法正确(ast.parse 不报错)"""
    source = EMBED_SCRIPT.read_text(encoding="utf-8")
    ast.parse(source)  # 不抛异常即通过


def test_del_after_all_refs():
    """测试 2: 静态验证 `del embeddings` 在所有 embeddings 引用之后

    Bug 场景: del embeddings 后立即访问 embeddings.shape
    修复后: del embeddings 在抽样验证之后(所有 embeddings 引用结束)
    """
    source = EMBED_SCRIPT.read_text(encoding="utf-8")
    lines = source.splitlines()
    # 找 del embeddings 行号
    del_line = None
    del_count = 0
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        # 精确匹配 "del embeddings"(不是 "del embeddings[i]" 等)
        if stripped == "del embeddings" or stripped == "del embeddings  # 关闭 memmap" or stripped.startswith("del embeddings #") or stripped == "del embeddings  # 最终关闭 memmap(所有引用结束后)":
            del_line = i
            del_count += 1
    assert del_count == 1, f"应有且仅有 1 处 `del embeddings`,实际 {del_count}"
    assert del_line is not None, "未找到 `del embeddings`"

    # del 之后的行不应再有 embeddings 引用(除了 del 行本身)
    # 排除注释行
    for i in range(del_line, len(lines)):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        # 不应出现 embeddings.xxx 或 embeddings[ 引用
        # 但允许 "embeddings_v3" 之类的变量名(不含点号或方括号)
        if "embeddings." in line or "embeddings[" in line:
            # 检查是否是 embeddings_v3 之类(含下划线后缀)
            # 精确检查: "embeddings." 或 "embeddings[" 前面不是字母/数字/下划线
            import re
            pattern = r'(?<![a-zA-Z0-9_])embeddings[\.\[]'
            if re.search(pattern, line):
                pytest.fail(f"line {i+1}(del 之后)仍引用 embeddings: {line.strip()}")


@pytest.mark.slow
def test_meta_written_after_encode(tmp_path):
    """测试 3 (slow): 小规模 10 条数据端到端跑通,验证 meta 文件被写入

    此测试需加载 BGE 模型(15-30s),标记为 slow。
    CI 可跳过: pytest -m "not slow"
    """
    # 创建小型测试 index 文件(10 条)
    index_file = tmp_path / "test_index.jsonl"
    items = []
    for i in range(10):
        items.append({
            "passage_id": f"test_book::p{i:05d}",
            "book": "test_book" if i < 5 else "other_book",
            "chapter": "",
            "system_type": "bazi",
            "text": f"测试文本内容 {i}，这是一段用于回归测试的中文文本，确保编码有效。",
            "source": "test_source.md",
            "meta": {"auto_split": True},
        })
    index_file.write_text(
        "\n".join(json.dumps(it, ensure_ascii=False) for it in items) + "\n",
        encoding="utf-8",
    )

    emb_file = tmp_path / "test_emb_v3.npy"
    meta_file = tmp_path / "test_meta_v3.json"
    progress_file = tmp_path / "test_progress_v3.json"

    # 用 monkeypatch 替换模块全局变量
    import embed_classics_v3
    original_values = {}
    for attr in ("INDEX_FILE", "EMB_FILE", "META_FILE", "PROGRESS_FILE"):
        original_values[attr] = getattr(embed_classics_v3, attr)
        setattr(embed_classics_v3, attr, {
            "INDEX_FILE": index_file,
            "EMB_FILE": emb_file,
            "META_FILE": meta_file,
            "PROGRESS_FILE": progress_file,
        }[attr])

    try:
        # 确保不会因已有文件跳过
        if emb_file.exists():
            emb_file.unlink()
        if meta_file.exists():
            meta_file.unlink()
        if progress_file.exists():
            progress_file.unlink()

        # 执行 main()(会加载 BGE 模型,约 15-30s)
        try:
            embed_classics_v3.main()
        except SystemExit:
            pass

        # 验证 meta 文件存在且非空
        assert meta_file.exists(), "meta 文件未生成(bug 未修复:del embeddings 导致崩溃)"
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        assert meta["count"] == 10, f"meta count={meta['count']}, expected 10"
        assert meta["dim"] == 512, f"meta dim={meta['dim']}, expected 512"
        assert meta["model"] == "bge-small-zh-v1.5"

        # 验证 embeddings 文件存在且大小正确
        assert emb_file.exists(), "embeddings 文件未生成"
        expected_size = 10 * 512 * 4  # float32
        actual_size = emb_file.stat().st_size
        assert actual_size == expected_size, f"文件大小 {actual_size} != 预期 {expected_size}"
    finally:
        # 恢复原始值
        for attr, val in original_values.items():
            setattr(embed_classics_v3, attr, val)


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
