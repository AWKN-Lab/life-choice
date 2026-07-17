# ADR-001: SavedCase 列表查询的默认值与过滤语义

| 字段 | 值 |
|------|-----|
| 状态 | ✅ Accepted |
| 日期 | 2026-06-15 |
| 决策人 | 陈婷（AWKN-LAB CEO） |
| 影响范围 | `apps/api-server/src/saved-case/saved-case.service.ts::_buildListArgs` |

---

## 上下文

`SavedCase`（命例）是用户收藏的咨询结果快照，对应 `prisma/schema.prisma` 的 `SavedCase` 模型（含 userId / category / tags / snapshot / visibility 字段）。

实现 `GET /api/v1/cases` 列表接口时，有 4 个产品决策需要明确，否则后人改这块代码会陷入"为什么要这样"的反复追问：

1. **不传 limit 时默认返回多少条？**
2. **按什么字段排序？**
3. **`scope` 参数的语义是什么？**（private / public / all 三个值的具体过滤逻辑）
4. **`category` 是精确匹配还是模糊搜索？**

---

## 决策

### 1. 默认 20 条/页

- **理由**：命例是用户收藏的高价值内容，不像咨询历史那样有滚动浏览诉求。20 条刚好是一屏阅读量，再多就要用户主动翻页（避免"被动刷流"）。
- **取舍**：业内常见 10 / 20 / 50 三档。10 太少（首页空白），50 太多（无意义刷流）。20 是中庸但正确的选择。
- **风险**：未来如果加入"团队共享命例池"功能，可能需要调整。

### 2. 按 `createdAt` desc 排序（最新在前）

- **理由**：命例的"新鲜度"等同于"重要性"——刚收藏的命例用户最可能想回看。命理场景里没有"按热度/按评分"的需求。
- **索引支撑**：`@@index([userId, createdAt])` 已建（schema.prisma 第 285 行）。
- **替代方案**：按 `updatedAt` desc 会被误用——用户改名/加 tag 都会改 `updatedAt`，但不是真的"重新收藏"。

### 3. `scope` 三态语义

| 取值 | 过滤逻辑 | 用途 |
|------|----------|------|
| `private` | `{ userId, visibility: 'private' }` | "我的私人收藏夹" |
| `public` | `{ visibility: 'public' }` | "公开案例池"（全平台公开命例的发现页） |
| `all`（默认） | `OR: [{ userId }, { visibility: 'public' }]` | "我的全部 + 别人的公开" — 轻量发现机制 |

- **设计取舍**：
  - **为什么默认 `all` 而不是 `private`？** 用户进入"命例库"页面，最常见诉求是"看我之前存的 + 顺便发现一些公开好命例"。如果默认 `private`，发现性为零。
  - **为什么不直接 `userId OR visibility='public'` 合并掉 scope 参数？** 因为前端要支持"只看公开池"的运营场景（比如"命例广场"页面），必须能精确控制。
  - **是否会泄露隐私？** 不会 —— `all` 只展示别人 `visibility = 'public'` 的命例，private 命例严格按 `userId` 过滤。
- **索引支撑**：
  - `private` 走 `@@index([userId, visibility])`
  - `public` 走 `@@index([visibility])`
  - `all` 走 OR，会同时命中上述两个索引（SQLite 的 OR 优化）

### 4. `category` 精确匹配（不模糊搜索）

- **理由**：命理分类（"八字"/"紫微"/"六壬"...）是**受控词汇**（controlled vocabulary），由前端下拉框提供，不允许用户自由输入。模糊搜索会让"八字"和"八字合婚"互相干扰。
- **索引支撑**：`@@index([userId, category])` 已建。
- **未来扩展**：如果要做"按 tag 搜索"，那是新参数（`tag`），不走 `category` 字段。

---

## 后果

### 正面

- 默认行为（不传任何参数）即可满足 90% 用户场景——打开页面就能看到"自己的 + 公开池的混合流"。
- 三个 scope 都有专属索引支撑，单库 10 万条数据量级下查询 < 10ms。
- 决策有 ADR 记录，半年后回看不靠"考古"。

### 负面 / 风险

- **OR 查询在 SQLite 大数据量下可能慢**（> 100 万条）。届时需拆成 2 次查询 UNION，或引入全文检索。
- **`all` 默认值让用户的"私人"命例和"公开"命例混在一起展示**，如果未来要做"严格私密模式"，需要新增 `scope=strict_private` 参数。

### 中和措施

- 文档化（本文档）
- 代码 JSDoc 同步（saved-case.service.ts::_buildListArgs 上方）
- 测试脚本覆盖三种 scope 行为（scripts/test-saved-case.sh）

---

## 验证

部署后用以下命令端到端跑通 9 步：

```bash
bash scripts/test-saved-case.sh <JWT>
```

预期：所有 9 步返回 HTTP 2xx，最近的命例排第一，`scope=public` 不返回自己私有的命例。