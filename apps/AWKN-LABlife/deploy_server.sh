#!/bin/bash
# P0-3 Step6 (2026-06-26): 重构部署脚本
# 修复问题：
#   1. 缺 npm run build —— 旧脚本只 prisma generate + pm2 restart，没构建 dist
#   2. 服务器现场重写 nest-cli.json —— 本地已是更完整版本，且 nest build v10 不复制 assets
#      已通过 copy-assets.js + verify-build.js 替代 nest-cli.json 的 assets 配置
#   3. 用 sed 改 5 个 Agent 源码 —— master 代码已修复 @Optional @Inject 装饰器，无需服务器现场改
# 新流程：复制源码 → npm ci → prisma generate → npm run build（含 copy-assets + verify-build）
#         → pm2 restart（bootstrap-production.js 会自动跑 preflight-check.js）
set -e

DEPLOY_DIR="/opt/awkn-life/awkn-life-backend"
API_SERVER_DIR="$DEPLOY_DIR/apps/api-server"

echo "=== 1. 复制文件到正确位置 ==="
cp -rf /tmp/dist/* /opt/awkn-life/app/dist/ 2>/dev/null || echo "  (skip: /tmp/dist not found)"
cp -rf /tmp/app_src/* /opt/awkn-life/app/src/ 2>/dev/null || echo "  (skip: /tmp/app_src not found)"
cp -rf /tmp/backend_src/* "$API_SERVER_DIR/src/"
echo "文件复制完成"

echo "=== 2. 安装依赖 ==="
cd "$DEPLOY_DIR"
npm ci --legacy-peer-deps 2>&1 | tail -3

echo "=== 3. Prisma generate ==="
cd "$API_SERVER_DIR"
npx prisma generate 2>&1 | tail -2

echo "=== 4. 构建（含 copy-assets + verify-build） ==="
# P0-3 Step6: 关键修复 —— 必须重新构建 dist
# npm run build = nest build && node scripts/copy-assets.js && node scripts/verify-build.js
# verify-build.js 会校验 assets-manifest.json 中所有 required 项，缺失即 exit(1)
cd "$API_SERVER_DIR"
rm -rf dist
npm run build 2>&1 | tail -20
if [ ! -f dist/main.js ]; then
  echo "[FATAL] build 失败：dist/main.js 不存在"
  exit 1
fi
echo "build 完成：dist/main.js 已生成"

echo "=== 5. PM2 重启 ==="
# bootstrap-production.js 在 spawn main.js 前会自动跑 preflight-check.js：
#   - 校验 .env.prod 存在
#   - 校验 8 个关键 env 变量
#   - 校验 17 个 asset dirs + 2 个 files
#   - 校验 Python CLI（可选）
#   - 校验 knowledge-service（可选，不可达设 DEGRADED_KNOWLEDGE_SERVICE）
#   - 任一 required 失败 → process.exit(1)，服务拒绝启动
# 紧急跳过：SKIP_PREFLIGHT=1 pm2 start ...（仅紧急情况）
cd "$DEPLOY_DIR"
pm2 delete awkn-life-backend 2>/dev/null || true
pm2 start ecosystem.config.js --env production 2>&1 | tail -3
pm2 save

echo "=== 6. 健康检查（含 preflight 降级状态） ==="
sleep 8
echo "--- /health ---"
curl -s http://localhost:3000/health 2>/dev/null || echo "  (服务启动中...)"
echo ""
echo "--- /health/ready（应返回 200，含 degradations[] 数组） ---"
curl -s http://localhost:3000/health/ready 2>/dev/null || echo "  (服务启动中...)"
echo ""
echo "=== 全部完成 ==="
echo "提示：若 /health/ready 返回 503，查看 pm2 logs awkn-life-backend --lines 50 找 preflight 失败原因"
echo "提示：若 degradations[] 非空，前端应读该数组提示用户部分功能降级（如 pythonCli/knowledgeService）"
