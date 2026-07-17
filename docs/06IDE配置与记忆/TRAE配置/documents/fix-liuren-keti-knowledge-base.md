# 修复 [LiurenAgent] 加载课体知识库失败

## Summary

修复生产环境启动时的 WARN 日志 `[LiurenAgent] 加载课体知识库失败`。根因是 `liuren-agent.service.ts:127` 的文件路径多了一级 `../`，导致 dist 运行时读取到不存在的 `api-server/knowledge-base/`（应为 `dist/knowledge-base/`）。

## Current State Analysis

### 现象
- 服务器 PM2 启动时日志：`WARN [LiurenAgentService] [LiurenAgent] 加载课体知识库失败`
- 非阻断（catch 兜底），LiurenAgent 仍可用，但 systemPrompt 缺少课体知识库增强

### 根因（已通过服务器验证确认）

**代码路径**（[liuren-agent.service.ts:127](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/liuren-agent/liuren-agent.service.ts#L127)）：
```ts
const keTiKnowledge = readFileSync(
  join(__dirname, '../../knowledge-base/liuren/ke-ti.json'), 'utf-8'
);
```

**运行时路径解析**（bootstrap-production.js 用 `node dist/main.js` 运行）：
- `__dirname` = `dist/liuren-agent/`
- `../../knowledge-base/liuren/ke-ti.json` = `api-server/knowledge-base/liuren/ke-ti.json` ❌ 不存在

**ensureAssets 实际复制位置**（[bootstrap-production.js:80-111](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/scripts/bootstrap-production.js#L80)）：
- ASSETS_DIRS 含 `'knowledge-base/liuren'`
- 复制到 `dist/knowledge-base/liuren/ke-ti.json` ✅ 存在

**路径不匹配**：代码读 `api-server/knowledge-base/`（dist 外），文件在 `dist/knowledge-base/`（dist 内）。

### 服务器验证证据
| 路径 | 存在? |
|------|-------|
| `src/knowledge-base/liuren/ke-ti.json` | ✅ 源文件 |
| `dist/knowledge-base/liuren/ke-ti.json` | ✅ ensureAssets 复制（Jun 21 01:39） |
| `api-server/knowledge-base/liuren/ke-ti.json` | ❌ 代码实际读取的路径 |

### 同类路径对比（均正确）
- L123: `join(__dirname, 'prompts', 'liuren-system-prompt.md')` → `dist/liuren-agent/prompts/` ✅
- L736: `join(__dirname, '../liuren-agent/prompts/jinkoujue-prompt.md')` → `dist/liuren-agent/prompts/` ✅
- L127: `join(__dirname, '../../knowledge-base/liuren/ke-ti.json')` → `api-server/knowledge-base/` ❌ **唯一 bug**

### 影响范围
- grep 确认全代码库仅此 1 处用 `../../knowledge-base/`
- 其他 agent（ziping/qimen/quming/liuyao/ziwei）无 knowledge-base 运行时路径引用

## Proposed Changes

### 修改 1：修复路径（1 行）

**文件**：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/liuren-agent/liuren-agent.service.ts`

**L127**：
```ts
// 修改前
join(__dirname, '../../knowledge-base/liuren/ke-ti.json'), 'utf-8'

// 修改后
join(__dirname, '../knowledge-base/liuren/ke-ti.json'), 'utf-8'
```

**为什么是 `../` 而不是 `../../`**：
- dist 运行时：`dist/liuren-agent/` + `../knowledge-base/` = `dist/knowledge-base/` ✅（ensureAssets 复制目标）
- src 运行时（tsx）：`src/liuren-agent/` + `../knowledge-base/` = `src/knowledge-base/` ✅（源文件位置）
- 两种运行方式都正确

### 部署步骤

1. 本地修改 L127
2. 本地 typecheck 验证（`npx tsc --noEmit` in api-server）
3. scp 修改后的 `liuren-agent.service.ts` 到服务器
   - 本地路径：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/liuren-agent/liuren-agent.service.ts`
   - 服务器路径：`/opt/awkn-life/awkn-life-backend/apps/api-server/src/liuren-agent/liuren-agent.service.ts`
4. 服务器执行 `nest build`（重新编译 dist，让 dist/liuren-agent/liuren-agent.service.js 更新）
   - 命令：`cd /opt/awkn-life/awkn-life-backend/apps/api-server && npx nest build`
   - 或者：直接用 tsx 运行 src（但当前是 dist 运行模式，需保持一致）
5. pm2 reload awkn-life-backend
6. 验证日志无 WARN

**注意**：步骤 4 的 `nest build` 是必须的，因为 bootstrap-production.js 运行的是 `dist/main.js`，只更新 src 不更新 dist 不会生效。ensureAssets 只复制 assets（json/yaml/md），不编译 .ts。

## Assumptions & Decisions

1. **假设**：服务器上 `nest build` 可用（@nestjs/cli 已安装）
   - 验证方式：部署时先 `npx nest build`，如果失败则回退到手动复制 src 到 dist
2. **决策**：只改 1 行，不重构其他路径（精准改动原则）
3. **决策**：不修改 bootstrap-production.js 的 ensureAssets 逻辑（它复制到 dist/knowledge-base/ 是正确的，是代码路径错了）
4. **决策**：不修改 nest-cli.json（assets 配置 `**/knowledge-base/**/*.json` 正确，ensureAssets 兜底也正确）

## Verification

### 本地验证
```bash
cd apps/AWKN-LABlife/awkn-life-backend/apps/api-server
npx tsc --noEmit  # typecheck 通过
```

### 服务器验证
```bash
# 1. nest build 成功
cd /opt/awkn-life/awkn-life-backend/apps/api-server && npx nest build

# 2. dist 文件已更新（时间戳为最新）
ls -la dist/liuren-agent/liuren-agent.service.js

# 3. pm2 reload
pm2 reload awkn-life-backend

# 4. 等待 5 秒后检查日志
sleep 5
pm2 logs awkn-life-backend --lines 30 --nostream | grep -i "课体\|LiurenAgent\|error"
# 期望：无 "加载课体知识库失败"，有 "✅ LiurenAgent LLM 已配置"

# 5. 健康检查
curl -s http://localhost:3000/api/v1/health
# 期望：{"code":0,"message":"ok",...}
```

### 回滚
如果 nest build 失败或服务异常：
```bash
# 恢复 src
cp /opt/awkn-life/awkn-life-backend/apps/api-server/src/liuren-agent/liuren-agent.service.ts.bak /opt/awkn-life/awkn-life-backend/apps/api-server/src/liuren-agent/liuren-agent.service.ts

# 恢复 dist（用旧 dist）
# dist 已有备份在 src.bak.20260621_013446（含旧 dist）

pm2 reload awkn-life-backend
```
