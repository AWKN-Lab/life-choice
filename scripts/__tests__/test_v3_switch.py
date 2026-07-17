#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v3 切换环境变量测试

验证 P1-F3: KNOWLEDGE_EMBED_VERSION 环境变量切换逻辑

测试策略:
- 不实际加载 BGE 模型（避免 slow 测试）
- 用 monkeypatch.setattr 跳过 _init_chroma 的实际加载
- 静态检查源代码含 v3 分支
"""
import os
import sys
import inspect
from pathlib import Path

import pytest

# 添加 knowledge-service 到 path
# __file__ = 人生决策宗师/scripts/__tests__/test_v3_switch.py
# .parent = __tests__/, .parent.parent = scripts/, .parent.parent.parent = 人生决策宗师/
# SERVICE_DIR = 人生决策宗师/apps/AWKN-LABlife/services/knowledge-service
SERVICE_DIR = Path(__file__).resolve().parent.parent.parent / "apps" / "AWKN-LABlife" / "services" / "knowledge-service"
sys.path.insert(0, str(SERVICE_DIR))


def test_embed_version_default():
    """测试 1: _EMBED_VERSION 是有效值（v2 或 v3）"""
    import main
    assert main._EMBED_VERSION in ("v2", "v3"), f"无效 embed version: {main._EMBED_VERSION}"


def test_embed_file_path_valid():
    """测试 2: EMBED_FILE 路径以 embeddings*.npy 结尾"""
    import main
    assert main.EMBED_FILE.endswith("embeddings.npy") or main.EMBED_FILE.endswith("embeddings_v3.npy"), \
        f"EMBED_FILE 路径异常: {main.EMBED_FILE}"


def test_health_v2_has_embed_version_field(monkeypatch):
    """测试 3: /health-v2 返回包含 embed_version 字段

    用 monkeypatch 跳过 _init_chroma 实际加载，避免加载大文件
    """
    import main
    monkeypatch.setattr(main, '_init_chroma', lambda: False)
    result = main.health_v2()
    assert "embed_version" in result, "health_v2 缺少 embed_version 字段"
    assert result["embed_version"] in ("v2", "v3")


def test_health_v2_embed_version_value(monkeypatch):
    """测试 4: 设置 _EMBED_VERSION='v3' 后 health_v2 返回 embed_version='v3'"""
    import main
    monkeypatch.setattr(main, '_EMBED_VERSION', 'v3')
    monkeypatch.setattr(main, '_init_chroma', lambda: False)
    result = main.health_v2()
    assert result["embed_version"] == "v3", f"期望 v3, 实际 {result['embed_version']}"


def test_vector_search_has_v3_branch():
    """测试 5: 静态检查 _vector_search 源代码含 v3 分支"""
    import main
    source = inspect.getsource(main._vector_search)
    assert 'if _EMBED_VERSION == "v3":' in source, "_vector_search 缺少 v3 分支"
    assert 'normalize_embeddings=True' in source, "v3 分支缺少 normalize_embeddings=True"


def test_use_mmap_includes_v3():
    """测试 6: 静态检查 _vector_search 中 _use_mmap 包含 v3 强制条件"""
    import main
    source = inspect.getsource(main._vector_search)
    assert '_EMBED_VERSION == "v3" or' in source, \
        "_use_mmap 未包含 v3 强制条件（v3 memmap 必须分批计算避免 OOM）"


# inspect 在文件顶部 import（避免在测试函数内 import 影响可读性）


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
