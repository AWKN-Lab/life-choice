#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""knowledge_ingest.py NULL bytes 清洗回归测试

验证 P1-F2 修复: sanitize_text() 去除 NULL bytes 和控制字符
"""
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS_DIR))

from knowledge_ingest import sanitize_text, split_md_content


def test_sanitize_removes_null_bytes():
    """测试 1: NULL bytes 被去除"""
    text = "\x00\x00\x00Hello\x00World"
    result = sanitize_text(text)
    assert "\x00" not in result
    assert "Hello" in result
    assert "World" in result


def test_sanitize_preserves_normal_text():
    """测试 2: 正常文本不受影响"""
    text = "癸亥日壬戌时，春生，伤官见官。\n夏财旺。"
    result = sanitize_text(text)
    assert result == text


def test_sanitize_preserves_newlines():
    """测试 3: 换行符/制表符保留"""
    text = "line1\nline2\ttabbed\r\nwindows"
    result = sanitize_text(text)
    assert "\n" in result
    assert "\t" in result
    assert "\r" in result


def test_sanitize_removes_control_chars():
    """测试 4: 控制字符(0x01-0x1F 除 \t\n\r)被去除"""
    text = "a\x01b\x02c\x07d\x1fe"
    result = sanitize_text(text)
    assert "\x01" not in result
    assert "\x02" not in result
    assert "\x07" not in result
    assert "\x1f" not in result
    assert result == "abcde"


def test_split_md_content_filters_null_bytes():
    """测试 5: 切片函数过滤 NULL bytes(端到端)"""
    content = "# 标题\n\n\x00\x00\x00NULL 开头段落这段文本足够长用于通过最小长度检查需要超过30个字符。\n\n正常段落这段文本也足够长用于通过最小长度检查需要超过30个字符。"
    items = split_md_content(content, "test_book", "test.md", "bazi")
    # 所有 items 的 text 不应包含 NULL bytes
    assert len(items) > 0, "应至少有 1 个 passage"
    for item in items:
        assert "\x00" not in item["text"], f"passage {item['passage_id']} 仍含 NULL bytes"


def test_split_md_content_empty_after_sanitize():
    """测试 6: 清洗后为空的段落被跳过"""
    content = "# 标题\n\n\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\n\n正常段落这段文本足够长用于通过最小长度检查需要超过30个字符。"
    items = split_md_content(content, "test_book", "test.md", "bazi")
    # NULL bytes 段落被清洗后为空,跳过;只剩正常段落
    assert len(items) >= 1
    for item in items:
        assert item["text"].strip() != ""
        assert "\x00" not in item["text"]


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
