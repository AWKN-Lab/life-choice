# 八字命理知识库 (bazi-knowledge-base)

> 版本: v1.1.0 | 更新日期: 2026-05-05
> 本知识库为"人生决策宗师"智能体提供全部推理所需的静态数据、规则库和辅助资源。

## 目录结构

```
bazi-knowledge-base/
├── 01_basic/                     # 基础数据层（11个JSON文件）
│   ├── tiangandizhi.json         # 天干地支、阴阳五行
│   ├── tiangan_detail.json       # 十天干详细属性（生克合化、经典描述）
│   ├── shishen.json              # 十神关系表
│   ├── nayin.json                # 纳音五行表（60甲子）
│   ├── changsheng.json           # 十二长生表
│   ├── zanggan.json              # 地支藏干表
│   ├── wuhudun.json              # 五虎遁（年干推月干）
│   ├── wushudun.json             # 五鼠遁（日干推时干）
│   ├── dayun.json                # 大运排法规则
│   ├── shensha.json              # 神煞起例表（12种神煞）
│   └── kongwang.json             # 六甲空亡表
│
├── 02_rules/                     # 推理规则库（21个JSON文件）
│   ├── pattern_recognition/      # 格局识别（7个文件）
│   │   ├── priority.json         # 判格优先级
│   │   ├── special/              # 变格识别
│   │   │   ├── cong.json         # 从格（财/官/儿/势）
│   │   │   ├── zhuan_wang.json   # 专旺格（5种）
│   │   │   ├── hua_qi.json       # 化气格（5种）
│   │   │   ├── liang_qi.json     # 两气成象格（7种）
│   │   │   └── yi_xing.json      # 一行得气格（建禄/阳刃）
│   │   └── normal/
│   │       └── ba_ge.json        # 正格八格
│   │
│   ├── normal_logic/             # 正格逻辑（5个文件）
│   │   ├── tiaohou.json          # 调候用神表（穷通宝鉴，120条）
│   │   ├── bingyao.json          # 病药规则（神峰通考）
│   │   ├── tongguan.json         # 通关规则（滴天髓）
│   │   ├── shishen_interact.json # 十神交互规则（10种组合）
│   │   └── liuqin.json           # 六亲宫位规则
│   │
│   ├── special_logic/            # 变格逻辑（4个文件）
│   │   ├── cong.json             # 从格喜忌行运
│   │   ├── zhuan_wang.json       # 专旺格喜忌行运
│   │   ├── hua_qi.json           # 化气格喜忌行运
│   │   └── liang_qi.json         # 两气成象格喜忌行运
│   │
│   └── suiyun/                   # 大运流年（5个文件）
│       ├── relation_types.json   # 干支作用关系定义
│       ├── priority.json         # 关系优先级裁决
│       ├── yearly.json           # 流年规则
│       ├── monthly.json          # 流月规则
│       └── special_periods.json  # 特殊应期
│
├── 03_terminology/               # 术语解释库
│   └── glossary.json             # 术语 → 白话映射（120+条）
│
├── 04_cases/                     # 案例库
│   ├── classic.json              # 经典命例（14条，含滴天髓阐微案例）
│   ├── celebrity.json            # 名人八字（72位，古今中外）
│   └── anonymized.json           # 脱敏用户案例
│
├── 05_assets/                    # 提示词辅助资源
│   ├── output_examples.json      # 输出语气锚点
│   └── routing_examples.json     # 路由识别示例
│
├── 06_classic_wisdom.json        # 经典命理智慧语录（25条）
│
└── 07_bazi_knowledge_summary.md  # 八字命理知识体系总纲
```

## 智能体调用流程

```
输入：命局四柱 + 大运 + 流年 + 用户问题
    ↓
1. 格局识别（按 priority.json 顺序）
   化气格? → 专旺格? → 两气成象格? → 从格? → 正格
    ↓
2. 调用对应逻辑库
   调候(tiaohou) → 病药(bingyao) → 通关(tongguan) → 十神交互 → 六亲
    ↓
3. 大运流年动态计算
   作用关系 → 优先级裁决 → 年运规则 → 月运规则 → 特殊应期
    ↓
4. 术语翻译（glossary.json）
    ↓
5. 按模式输出（overview/focus/decision）
```

## 经典来源

| 经典 | 对应知识库 | 核心贡献 |
|------|-----------|---------|
| 《子平真诠》 | ba_ge.json, shishen_interact.json | 正格八格体系、十神交互理论 |
| 《滴天髓》 | tongguan.json, liang_qi.json | 通关理论、两气成象 |
| 《穷通宝鉴》 | tiaohou.json | 调候用神表（120条） |
| 《神峰通考》 | bingyao.json | 病药理论 |
| 《渊海子平》 | liuqin.json, zhuan_wang.json | 六亲宫位、专旺格 |
| 《三命通会》 | shensha.json, hua_qi.json | 神煞、化气格 |

## 维护说明

- **01_basic/**: 极少更新，发现错误时修正
- **02_rules/**: 按需更新，新规则入库时补充
- **03_terminology/**: 持续更新，新术语添加、翻译优化
- **04_cases/**: 持续积累，新命例入库
- **05_assets/**: 按需更新，提示词优化时调整

版本号格式：v{major}.{minor}.{patch}
