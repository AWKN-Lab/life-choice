"""
紫微排盘引擎 — 常量表完整性校验

对所有常量表做三重校验：
  1. 行数校验
  2. 列数校验（每行）
  3. 值域校验（每个元素）

退出码：
  0 = 全部 PASS
  1 = 有 FAIL
"""

from __future__ import annotations

from ziwei import (
    _HL_ARR,
    _HG_ARR,
    _KY_ARR2,
    _JK_ARR3,
    _FL_ARR,
    _TC_ARR,
    _BOSHI_SHEN,
    _CHANGSHENG_SHEN,
    _SUIQIAN_SHEN,
    _JIANGQIAN_SHEN,
)
from liupan import (
    _AX_XIAOXIAN_ARR,
    _AX_LC_ARR,
    _AX_LIUQU_ARR,
    _AX_ZNDJ_ARR,
)


# ============================================================
# 校验规范表
# ============================================================
# 每项: (表名, 表对象, 预期行数, 预期列数, 值域下限, 值域上限)
# - 对于一维数组（行数=1），"预期列数" 即元素个数
# - 对于二维表（行数>1），逐行校验列数
# ============================================================
SPECS: list[tuple[str, list, int, int, int, int]] = [
    # ziwei.py 常量表
    ("_HL_ARR",            _HL_ARR,            13, 13, 0, 12),
    ("_HG_ARR",            _HG_ARR,            13, 13, 0, 12),
    ("_KY_ARR2",           _KY_ARR2,           11, 13, 0, 12),
    ("_JK_ARR3",           _JK_ARR3,           13, 13, 0, 12),
    ("_FL_ARR",            _FL_ARR,             3, 13, 0, 12),
    ("_TC_ARR",            _TC_ARR,             3, 13, 0, 12),
    ("_BOSHI_SHEN",        _BOSHI_SHEN,         1, 12, 0, 80),
    ("_CHANGSHENG_SHEN",   _CHANGSHENG_SHEN,    1, 12, 0, 0),
    ("_SUIQIAN_SHEN",      _SUIQIAN_SHEN,       1, 13, 0, 80),
    ("_JIANGQIAN_SHEN",    _JIANGQIAN_SHEN,     1, 13, 0, 80),
    # liupan.py 常量表
    ("_AX_XIAOXIAN_ARR",   _AX_XIAOXIAN_ARR,    1, 13, 0, 12),
    ("_AX_LC_ARR",         _AX_LC_ARR,          1, 11, 0, 12),
    ("_AX_LIUQU_ARR",      _AX_LIUQU_ARR,       1, 11, 0, 12),
    ("_AX_ZNDJ_ARR",       _AX_ZNDJ_ARR,       13, 13, 0, 12),
]


def validate_table(
    name: str,
    table: list,
    expected_rows: int,
    expected_cols: int,
    lo: int,
    hi: int,
) -> tuple[bool, str]:
    """
    校验单个表。

    约定：
      - expected_rows == 1 → 一维数组（扁平 list），expected_cols 即元素个数
      - expected_rows  > 1 → 二维表（list of list），逐行校验列数

    返回: (是否通过, 描述字符串)
    - 通过: (True, 形状描述)
    - 失败: (False, "形状 (错误详情1; 错误详情2; ...)")
    """
    errors: list[str] = []

    # ============================================================
    # 分支 A：一维数组（expected_rows == 1）
    # ============================================================
    if expected_rows == 1:
        n = len(table)
        if n != expected_cols:
            errors.append(f"元素数={n}≠{expected_cols}")

        bad_vals: list[str] = []
        for i, v in enumerate(table):
            if isinstance(v, bool) or not isinstance(v, int):
                bad_vals.append(f"[{i}]={v!r}(类型{type(v).__name__})")
                continue
            if not (lo <= v <= hi):
                bad_vals.append(f"[{i}]={v}不在[{lo},{hi}]")
        if bad_vals:
            shown = bad_vals[:5]
            suffix = f", ...（共{len(bad_vals)}处）" if len(bad_vals) > 5 else ""
            errors.append("值域越界: " + ", ".join(shown) + suffix)

        shape = f"{n}元素"
        if errors:
            return False, f"{shape} ({'; '.join(errors)})"
        return True, shape

    # ============================================================
    # 分支 B：二维表（expected_rows > 1）
    # ============================================================
    # ---- 1. 行数校验 ----
    actual_rows = len(table)
    if actual_rows != expected_rows:
        errors.append(f"行数={actual_rows}≠{expected_rows}")

    # ---- 2. 列数校验（逐行）----
    bad_cols: list[str] = []
    for i, row in enumerate(table):
        if not isinstance(row, (list, tuple)):
            errors.append(f"第{i}行非列表类型: {type(row).__name__}")
            continue
        if len(row) != expected_cols:
            bad_cols.append(f"第{i}行列数={len(row)}≠{expected_cols}")
    if bad_cols:
        shown = bad_cols[:5]
        suffix = f", ...（共{len(bad_cols)}处）" if len(bad_cols) > 5 else ""
        errors.append(", ".join(shown) + suffix)

    # ---- 3. 值域校验（逐元素）----
    bad_vals: list[str] = []
    for i, row in enumerate(table):
        if not isinstance(row, (list, tuple)):
            continue
        for j, v in enumerate(row):
            if isinstance(v, bool) or not isinstance(v, int):
                bad_vals.append(f"[{i}][{j}]={v!r}(类型{type(v).__name__})")
                continue
            if not (lo <= v <= hi):
                bad_vals.append(f"[{i}][{j}]={v}不在[{lo},{hi}]")
    if bad_vals:
        shown = bad_vals[:5]
        suffix = f", ...（共{len(bad_vals)}处）" if len(bad_vals) > 5 else ""
        errors.append("值域越界: " + ", ".join(shown) + suffix)

    # ---- 计算实际列数（用于显示）----
    if actual_rows > 0 and isinstance(table[0], (list, tuple)):
        actual_cols = len(table[0])
    else:
        actual_cols = 0

    shape = f"{actual_rows}×{actual_cols}"
    if errors:
        return False, f"{shape} ({'; '.join(errors)})"
    return True, shape


def main() -> int:
    print("=" * 60)
    print("  紫微排盘引擎 — 常量表完整性校验")
    print("=" * 60)

    pass_count = 0
    fail_count = 0

    for name, table, exp_rows, exp_cols, lo, hi in SPECS:
        ok, desc = validate_table(name, table, exp_rows, exp_cols, lo, hi)
        mark = "✓" if ok else "✗"
        print(f"  {name}: {desc} {mark}")
        if ok:
            pass_count += 1
        else:
            fail_count += 1

    print("=" * 60)
    print(f"  结果: {pass_count}/{pass_count + fail_count} PASS, "
          f"{fail_count}/{pass_count + fail_count} FAIL")
    print("=" * 60)

    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
