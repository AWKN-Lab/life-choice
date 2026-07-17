# embed_classics_v3.py line 160 Bug 修复取证

**日期**: 2026-07-10
**PR**: P1-F1
**Commit**: (待创建)

---

## 1. Bug 描述

### 1.1 现象

`scripts/embed_classics_v3.py` 在 BGE 编码完成后崩溃,`UnboundLocalError: local variable 'embeddings' referenced before assignment`,导致:
- meta 文件(`_embed_meta_v3.json`)从未写入
- 抽样验证(同书/跨书相似度)从未执行

### 1.2 根因

**Bug 位置**: line 158-162(修复前)

```python
# 最终保存(memmap flush + 关闭)
embeddings.flush()
del embeddings  # 关闭 memmap  ← line 160: 删除引用
print(f"  shape={embeddings.shape}, dtype={embeddings.dtype}, "  # ← line 161: UnboundLocalError
      f"size={EMB_FILE.stat().st_size/1024/1024:.1f}MB")
```

`del embeddings` 删除了 Python 对 `embeddings`(memmap 对象)的引用。下一行立即访问 `embeddings.shape`,但此时 `embeddings` 已不存在,Python 抛 `UnboundLocalError`。

### 1.3 影响范围

因崩溃未执行的代码路径:
- line 161-162: 打印 shape/dtype/size(崩溃点)
- line 164-180: meta 写入(`META_FILE.write_text(...)`)
- line 183-198: 抽样验证(line 189-191 仍访问 `embeddings[...]`)

### 1.4 已有数据状态

- `embeddings_v3.npy`: 643.7MB,shape=(329577, 512),数据正确(norm=1.0,零行=0)
- `_embed_meta_v3.json`: 已通过 inline 修复脚本补写(commit `6c523194` 已含)
- `_embed_v3_progress.json`: 显示 329577/329577 完成

**结论**: npy 数据本身正确,bug 只影响 meta 写入和抽样验证。已通过 inline 脚本补写 meta,数据无需重新生成。

---

## 2. 修复方案

### 2.1 修改 1: 用临时变量保存元信息

**修改前**:
```python
embeddings.flush()
del embeddings
print(f"  shape={embeddings.shape}, ...")
```

**修改后**:
```python
embeddings.flush()
emb_shape = embeddings.shape
emb_dtype = str(embeddings.dtype)
emb_size_mb = EMB_FILE.stat().st_size / 1024 / 1024
print(f"  shape={emb_shape}, dtype={emb_dtype}, size={emb_size_mb:.1f}MB")
```

### 2.2 修改 2: del 移到所有引用之后

删除 line 160 的 `del embeddings`,改为在抽样验证(line 198)之后添加:

```python
# 抽样验证(在 del 之前完成所有 embeddings 访问)
# ... 抽样验证逻辑不变 ...

# 最终关闭 memmap(所有引用结束后)
del embeddings
```

### 2.3 不重新生成数据

依据用户决策: `embeddings_v3.npy` 数据已验证正确(shape/norm/零行全过),修复脚本只为防止未来重跑时再次崩溃。

---

## 3. 回归测试

### 3.1 测试文件

`scripts/__tests__/test_embed_classics_v3.py`

### 3.2 测试用例

| 测试 | 类型 | 说明 |
|------|------|------|
| test_syntax_ok | 快速 | ast.parse 验证脚本语法正确 |
| test_del_after_all_refs | 快速 | 静态验证 del embeddings 在所有 embeddings 引用之后 |
| test_meta_written_after_encode | slow | 10 条数据端到端跑通,验证 meta 文件被写入 |

### 3.3 运行

```bash
# 快速测试
cd 人生决策宗师
python -m pytest scripts/__tests__/test_embed_classics_v3.py -v -m "not slow"

# 含 slow 测试(需 15-30s 加载 BGE 模型)
python -m pytest scripts/__tests__/test_embed_classics_v3.py -v
```

---

## 4. 验证结果

(待执行后填写)

---

## 5. 经验教训

1. **del 引用清理顺序**: `del` 后立即访问同名变量是 Python 常见陷阱,应在 del 前保存所有需要的元信息
2. **memmap 关闭时机**: memmap 对象在不再使用时才 del,而非"保存后立即关闭"
3. **meta 写入依赖**: meta 写入不应依赖 embeddings 变量(dim/count 等应从独立来源获取)
