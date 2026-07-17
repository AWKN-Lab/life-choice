# 六爻预测技能

## 简介

基于《增删卜易》《卜筮正宗》的完整六爻占卜系统，支持多种起卦方式和智能断卦。

## 特点

- ✅ 多种起卦方式（铜钱、数字、时间）
- ✅ 完整装卦系统（世应、六亲、六神）
- ✅ 智能断卦（用神、原神、忌神、仇神）
- ✅ 分类占断（事业、婚姻、财运、健康）
- ✅ 经典卦例库

## 快速开始

```python
from liu_yao import liuyao_qigua, liuyao_duangua

# 铜钱起卦
gua = liuyao_qigua(method='coin', coins=[2, 3, 3, 2, 3, 2])
print(gua)

# 断卦
result = liuyao_duangua(gua, "事业")
print(result)
```

## 模块说明

- `ly_basic.py` - 基础数据（八卦、六亲、六神）
- `ly_qigua.py` - 起卦方法（铜钱、数字、时间）
- `ly_zhuanggua.py` - 装卦（安世应、安六亲、安六神）
- `ly_duangua.py` - 断卦（用神、原神、忌神、仇神）
- `ly_core.py` - 核心引擎
- `ly_api.py` - 统一 API 接口

## 参考

- 《增删卜易》
- 《卜筮正宗》
- 《易隐》

## 版本历史

- v1.0.0 (2026-03-22) - 初始版本
