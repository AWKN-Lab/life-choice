# 人生决策宗师｜术数知识库资产第一轮扫描报告

> 日期：2026-06-22  
> 范围：Git 当前跟踪文件 + Git 删除历史  
> 原则：本轮只扫描，不恢复、不覆盖、不删除。  

---

## 1. 结论

这次不是单纯“八字知识库没了”，而是术数知识库资产经历过目录重构、历史删除、软链替代和工程接入漂移。

第一轮扫描确认：

1. 当前 Git 里仍有不少知识资产，八字、六壬、奇门、紫微最多。
2. Git 删除历史里明确命中的知识库删除，主要集中在八字/子平。
3. 六爻当前有 Agent、Prompt、规则 JSON、案例 DB，但数量偏少，不像完整典籍知识库。
4. 梅花易数当前只有零散资产。
5. 太乙神数当前无 tracked 路径命中。
6. 周易/易经原典当前无明显 tracked 路径命中。
7. 9.1GB Git pack 仍可能包含历史知识库，但需要继续做大 blob 映射。

---

## 2. 当前 Git 跟踪资产数量

| 体系 | 当前 tracked 命中数 | 初步判断 |
|---|---:|---|
| 八字 / 子平 | 117 | 仍有大量资产，但存在历史删除和软链风险 |
| 大六壬 | 45 | 结构较完整，含 Agent、规则、知识 JSON |
| 六爻 | 8 | 有 Agent 与基础规则，典籍/案例库不足 |
| 梅花易数 | 2 | 资产很弱，疑似未真正接入 |
| 太乙神数 | 0 | 当前无明显资产 |
| 奇门遁甲 | 337 | 资产很多，但混有外部项目和依赖，需清洗 |
| 紫微斗数 | 71 | 资产较完整，含 engine、data、agent、case DB |
| 小六壬 | 1 | 只有弱资产 |
| 周易 / 易经 | 0 | 当前无明显原典资产命中 |

---

## 3. Git 删除历史命中数

| 体系 | 删除历史命中数 | 初步判断 |
|---|---:|---|
| 八字 / 子平 | 24 | 已确认被删过 |
| 大六壬 | 0 | 未发现按关键词删除 |
| 六爻 | 0 | 未发现按关键词删除 |
| 梅花易数 | 0 | 未发现按关键词删除 |
| 太乙神数 | 0 | 未发现按关键词删除 |
| 奇门遁甲 | 0 | 未发现按关键词删除 |
| 紫微斗数 | 0 | 未发现按关键词删除 |
| 小六壬 | 0 | 未发现按关键词删除 |
| 周易 / 易经 | 0 | 未发现按关键词删除 |

---

## 4. 已确认的八字删除路径

主要两组：

1. `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/knowledge-base/legacy-bazi-json/*.json`
2. `knowledge/eastern-metaphysics/八字命理/bazi-knowledge-base/01_basic/*.json`

关联 commit：

```text
47f1efdb 2026-06-17 fix: security hardening + route bugs + docker safety + CI pipeline
```

---

## 5. 分体系判断

### 八字 / 子平

当前仍有 `bazi-knowledge-base`，包括：

- `01_basic`
- `02_rules`
- `03_terminology`
- `04_cases`
- `05_assets`
- `06_classic_wisdom`
- `README.md`

但 `api-server/src/knowledge-base/bazi` 是 symlink，部署和服务读取有风险。下一步应先恢复删除版本到 `_recovered_knowledge/`，再做当前版本与历史版本对比。

### 六爻

当前有：

- `liuyao-agent`
- `liuyao-system-prompt.md`
- `liuyao-duangua.json`
- `liuyao-yongshen.json`
- `liuyao_cases.db`
- 建库脚本

缺口：完整卦例、纳甲表、六十四卦、世应定位、断卦典籍数据未明显成库。

### 梅花易数

当前只有：

- 历史策略评估文档
- `knowledge/qimen-suite/qimen-go/world/meihua.go`

代码里曾出现“梅花 Agent 未实现，MVP 阶段用六爻替代”的判断，说明梅花易数没有形成完整接入。

### 太乙神数

当前无 tracked 路径命中。之前命中的“太乙”主要是大六壬月将名，不是太乙神数知识库。

### 奇门遁甲

当前命中 337，资产很多，但含外部项目、依赖、build_check 等。需要区分：

- 可用奇门算法/规则
- 外部工具项目
- 无关 NLP/依赖文件
- 可迁移知识资产

### 紫微斗数

当前命中 71，资产较完整：

- python-validator
- data JSON
- ziwei-agent
- atom-tools
- ziwei_cases.db
- ziwei-doushu 子项目

下一步重点是接入路径和知识资产归口。

---

## 6. 下一步建议

P0：恢复八字被删文件到隔离区：

```text
_recovered_knowledge/bazi/from-47f1efdb-parent/
```

P0：做八字当前版本 vs 历史版本对比。

P1：给六爻补完整资产目录，至少包括：纳甲、世应、六亲、六神、六十四卦、用神映射、断卦规则、经典卦例。

P1：继续深查梅花易数、太乙神数是否存在于大 pack、旧分支、外部目录或旧压缩包中。

P1：清洗奇门 337 个命中文件，剔除依赖和无关外部项目。

P2：建立统一知识库目录：

```text
knowledge-assets/
├── bazi/
├── liuren/
├── liuyao/
├── meihua/
├── taiyi/
├── qimen/
├── ziwei/
├── xiaoliuren/
└── yijing/
```

---

## 7. 安全规则

- 不直接删除 `.git/objects`。
- 不直接覆盖现有 `knowledge/`。
- 不直接覆盖 `api-server/src/knowledge-base/`。
- 所有历史恢复先进入 `_recovered_knowledge/`。
- 恢复后必须做 diff 和 schema 检查。

---

## 8. 2026-06-22 恢复执行结果

用户已执行：

```bash
git restore -- knowledge
```

执行后检查结果：

```text
deleted knowledge after restore: 0
total deleted after restore: 0
```

说明：`knowledge/` 下 1597 个 tracked 删除文件已恢复回工作区。

关键目录恢复后文件数：

| 目录 | 文件数 |
|---|---:|
| `knowledge/eastern-metaphysics/八字命理` | 157 |
| `knowledge/eastern-metaphysics/六壬` | 97 |
| `knowledge/eastern-metaphysics/奇门` | 86 |
| `knowledge/eastern-metaphysics/周易` | 74 |
| `knowledge/knowledge-base` | 260 |
| `knowledge/qimen-suite` | 318 |

八字 `01_basic` 13 个 JSON 已回到工作区，并在 Git 索引中呈现 staged add 状态：

```text
A knowledge/eastern-metaphysics/八字命理/bazi-knowledge-base/01_basic/*.json
```

这些文件合计：

```text
13 files changed, 706 insertions(+)
```

`knowledge-service` loader 当前验证：

```text
bazi 41
liuren 11
```

判断：八字运行期知识库已可被 loader 读取。`legacy-bazi-json` 旧目录当前仍不存在，属于旧版兼容资产，后续可按需恢复到 `_recovered_knowledge/legacy-bazi-json/`，不建议直接回填到运行目录。
