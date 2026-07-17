---
type: experience
e_number: E232
title: 部署后必做 4 验 + unstable_restarts=0 判稳 → 部署验收门升级
created: 2026-06-27T17:30:00+08:00
tags: [experience, deployment, verification, pm2, acceptance-criteria]
status: active
related_e: [E217, E230]
severity: medium
project: 人生决策宗师 / apps/AWKN-LABlife
related_files:
  - deploy.sh
  - DEPLOY.md
raw_source: ../raw/2026-06-27-p1b-p2b-deployment-evidence.md
---

# E232：部署后必做 4 验 + unstable_restarts=0 判稳 → 部署验收门升级

## 一句话

**部署完成 ≠ 服务可用**。必须通过 4 项客观验证（HTML title / JS 哈希 / 健康检查 / API 路由）+ 1 项稳定判据（PM2 unstable_restarts=0）才能宣告部署成功。

---

## A. 触发场景

### A.1 时间

- 2026-06-27 17:21（E230/E231 恢复后）

### A.2 验证清单（4 + 1）

| # | 验证项 | 命令 | 通过条件 | 本次结果 |
|---|--------|------|----------|----------|
| 1 | HTML title | `curl http://localhost/ \| grep -E '<title>'` | 包含产品名 | ✅ `<title>人生决策宗师</title>` |
| 2 | JS 哈希 | `curl http://localhost/ \| grep -oE 'src="[^"]+\.js"'` | 包含带 hash 的 JS 文件 | ✅ `index-C-T1YmE2.js` |
| 3 | 健康检查 | `curl http://localhost:30000/api/v1/health` | HTTP 200 + `code:0` | ✅ `{"code":0,"message":"ok"}` |
| 4 | API 路由 | `curl http://localhost:30000/api/v1/nonexistent` | HTTP 404（不返回 500） | ✅ HTTP 404 |
| +1 | 稳定判据 | `pm2 describe <name> \| grep unstable_restarts` | `unstable_restarts=0` | ✅ 0 |

### A.3 关键发现

- **HTML title 错误** = 前端 dist 没正确部署（白屏/加载旧版）
- **JS 哈希缺失或不一致** = 构建产物未同步（前端缓存问题）
- **健康检查失败** = 后端未启动或数据库连接失败
- **API 路由返回 500** = 控制器注册失败（模块加载错误）
- **unstable_restarts > 0** = Node.js 启动后崩溃（依赖缺失、配置错误）

---

## B. 反模式 vs 正模式

### 反模式 ❌

1. ❌ **只验证健康检查就宣布部署成功**
   - 示例：`curl /api/v1/health && echo "部署成功"`
   - 问题：健康检查返回 200 但前端白屏（dist 没同步）

2. ❌ **不验证 API 路由**
   - 示例：未测试 404 路径是否返回正确状态码
   - 问题：可能存在全局异常过滤器吞掉 500

3. ❌ **不验证 PM2 unstable_restarts**
   - 示例：只看 status=online
   - 问题：进程可能在崩溃-重启循环（restarts=293 仍在涨）

4. ❌ **不验证 HTML title 和 JS 哈希**
   - 示例：直接看 nginx 日志
   - 问题：Nginx 转发正常但前端 SPA 没构建或路由错误

### 正模式 ✅

1. ✅ **5 件套验证脚本**：
   ```bash
   #!/bin/bash
   set -e

   echo "===1. HTML title==="
   HTML=$(curl -s -m 5 http://localhost/)
   echo "$HTML" | grep -qE '<title>人生决策宗师</title>' \
     && echo "✅ title OK" || { echo "❌ title FAILED"; exit 1; }

   echo "===2. JS 哈希==="
   echo "$HTML" | grep -oE 'src="[^"]+\.js"' | head -1

   echo "===3. 健康检查==="
   HEALTH=$(curl -s -m 5 http://localhost:30000/api/v1/health)
   echo "$HEALTH" | grep -q '"code":0' \
     && echo "✅ health OK" || { echo "❌ health FAILED: $HEALTH"; exit 1; }

   echo "===4. API 路由==="
   STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:30000/api/v1/nonexistent)
   [ "$STATUS" = "404" ] && echo "✅ API route OK" || { echo "❌ API route FAILED: $STATUS"; exit 1; }

   echo "===5. PM2 稳定==="
   UNSTABLE=$(pm2 describe awkn-life-backend | grep 'unstable restarts' | awk '{print $4}')
   [ "$UNSTABLE" = "0" ] && echo "✅ stable OK" || { echo "❌ unstable_restarts=$UNSTABLE"; exit 1; }
   ```

2. ✅ **验收时机**：
   - pm2 restart 后立即执行（不 sleep，直接 curl）
   - 5 秒内全部通过 = 部署成功
   - 任一失败 = 自动触发 rollback.sh

3. ✅ **部署脚本集成**：
   ```bash
   # deploy.sh 末尾
   if bash scripts/verify-deploy.sh; then
     echo "✅ DEPLOYMENT VERIFIED"
   else
     echo "❌ DEPLOYMENT FAILED, ROLLING BACK"
     bash scripts/rollback.sh
     exit 1
   fi
   ```

---

## C. 5 件套 vs 4 件套 vs 1 件套

| 场景 | 1 件套（仅健康） | 4 件套（HTML+JS+Health+API） | 5 件套（+stable） |
|------|------------------|---------------------------|-----------------|
| 正常部署 | ✅ | ✅ | ✅ |
| 前端 dist 未同步 | ❌（健康通过但白屏） | ✅（HTML/JS 失败） | ✅ |
| 后端路由 500 | ❌（健康通过但 API 500） | ✅（API 路由失败） | ✅ |
| Node.js 启动崩溃 | ❌（健康不可达） | ❌（健康不可达） | ✅（unstable > 0） |
| 部分依赖缺失 | ❌ | ❌ | ✅（unstable > 0） |

**结论**：5 件套覆盖所有已知故障场景。

---

## D. 与既有 E 编号的关联

- **E217**（trae-checker 生产部署复盘）— 提到了 4 件套（首页 + 2 子页 + API + title），本次扩展到 5 件套
- **E230**（npm install 中断）— unstable_restarts=0 是发现此问题的关键信号
- **E-L2-5**（PM2 unstable_restarts 重启排查）— 具体排查步骤

---

## E. 实施建议

### E.1 新增 `scripts/verify-deploy.sh`

```bash
#!/bin/bash
# verify-deploy.sh - 部署后必做 4 + 1 验
set -e

PORT_FRONTEND="${PORT_FRONTEND:-80}"
PORT_BACKEND="${PORT_BACKEND:-30000}"
SERVICE_NAME="${SERVICE_NAME:-awkn-life-backend}"
EXPECTED_TITLE="${EXPECTED_TITLE:-人生决策宗师}"

PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "[1/5] HTML title"
check "title='$EXPECTED_TITLE'" "curl -s -m 5 http://localhost:$PORT_FRONTEND/ | grep -q '<title>$EXPECTED_TITLE</title>'"

echo "[2/5] JS 哈希"
check "JS hash with hash pattern" "curl -s -m 5 http://localhost:$PORT_FRONTEND/ | grep -qE 'src=\"[^\"]+-[A-Za-z0-9_-]{8,}\.js\"'"

echo "[3/5] 健康检查"
check "health endpoint" "curl -s -m 5 http://localhost:$PORT_BACKEND/api/v1/health | grep -q '\"code\":0'"

echo "[4/5] API 路由"
check "404 returns 404" "[ \"\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT_BACKEND/api/v1/__nonexistent__)\" = '404' ]"

echo "[5/5] PM2 稳定"
check "unstable_restarts=0" "pm2 describe $SERVICE_NAME 2>/dev/null | grep -q 'unstable restarts.*0'"

echo ""
echo "结果: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] || exit 1
```

### E.2 集成到 deploy.sh

```bash
# 在 pm2 restart 之后
echo "[deploy] verification"
bash scripts/verify-deploy.sh || {
  echo "[deploy] ❌ VERIFICATION FAILED, rolling back"
  bash scripts/rollback.sh
  exit 1
}
echo "[deploy] ✅ VERIFIED"
```

### E.3 集成到 preflight-check.js

```javascript
// 现有检查后增加
const verifyCmd = path.join(__dirname, '../../../scripts/verify-deploy.sh');
if (!fs.existsSync(verifyCmd)) {
  console.warn('[preflight] verify-deploy.sh not found');
} else {
  console.log('[preflight] running verify-deploy.sh');
  // 可选：通过 child_process 执行
}
```

---

## F. 验收标准

部署成功判据（必须全部满足）：

1. **V1** HTML `<title>` 包含产品名（防 dist 未同步）
2. **V2** HTML 包含带 hash 的 JS 文件（防构建产物缺失）
3. **V3** `/api/v1/health` 返回 `code:0`
4. **V4** 404 路径返回 HTTP 404（防全局异常吞 500）
5. **V5** PM2 `unstable_restarts=0`（防崩溃-重启循环）

---

## G. 6 维批判性重评

| 维度 | 初版自评 | 批判性重评 | 差值 | 说明 |
|------|---------|----------|------|------|
| 根因深度 | 8 | 7 | -1 | 已挖到 4 类故障模式，但未深挖"为什么只用 1 件套会漏检" |
| 经验具体性 | 9 | 9 | 0 | verify-deploy.sh 完整可执行 |
| 行动可执行 | 10 | 9 | -1 | 脚本完整，缺 staging 环境验证 |
| 批判性 | 7 | 6 | -1 | 没问"如何自动化此验证到 CI/CD" |
| 闭环验证 | 9 | 8 | -1 | 5 件套覆盖全，但未提供"任一失败时如何自动回滚"的详细步骤 |
| 元反思 | 7 | 6 | -1 | 没写"5 件套是否能 100% 防故障"（答：不能，但能防 90%） |

- **初版总分**: 50/60
- **批判性重评**: 45/60
- **差值**: -5
- **真正完成度**: ~80%

---

## H. 与 E230/E231 联动

| 阶段 | E230 完整性校验 | E231 单包恢复 | E232 5 件套验证 |
|------|----------------|---------------|----------------|
| 部署前 | ✅ 校验门禁 | — | — |
| 部署中 | ✅ 阻止坏部署 | — | — |
| 部署后 | — | — | ✅ 5 件套验证 |
| 崩溃时 | — | ✅ 1 min 恢复 | — |
| 恢复后 | — | — | ✅ 重新验证 |

---

## I. 待写回记忆系统的规则

观察以下模式出现 ≥3 次，沉淀：

1. **部署成功 ≠ 服务可用**（必须 5 件套验证）
   - 证据：本会话 + E217 trae-checker + 凌扬健身多次部署
   - 触发词：健康通过但白屏、健康通过但 API 500

2. **PM2 unstable_restarts > 0 = 静默崩溃信号**
   - 证据：本会话（restarts=265 unstable=0 → 修复后稳定）+ E-L2-5
   - 触发词：unstable_restarts、循环重启、依赖缺失

3. **HTML title + JS hash = 前端 dist 同步判据**
   - 证据：本会话 + E217
   - 触发词：dist 未同步、白屏、缓存问题

---

## J. 元反思

- 5 件套验证是部署的"最后一公里"，缺一不可
- 教训：之前 E217 只提了 4 件套，本次发现 unstable_restarts 才是关键
- 如果再部署：deploy.sh 末尾必须调用 verify-deploy.sh，失败自动 rollback