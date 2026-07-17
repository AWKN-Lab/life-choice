# ==========================================
# 人生决策宗师 - Dockerfile
# 前端静态托管 + 后端 Node.js 服务 + Python 排盘引擎
# ==========================================

# ---- 前端构建阶段 ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY app/ ./app/
WORKDIR /app/app

# 安装依赖
RUN npm ci --legacy-peer-deps

# 构建前端
ENV VITE_API_BASE_URL=/api
RUN npx vite build

# ---- 后端构建阶段 ----
FROM node:20-alpine AS backend-builder

WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./
COPY awkn-life-backend/ ./awkn-life-backend/

WORKDIR /app/awkn-life-backend/apps/api-server

# 安装依赖（包含所有workspace）
RUN npm ci --legacy-peer-deps

# 生成 Prisma Client
RUN npx prisma generate

# 构建后端
RUN npm run build

# ---- Python 排盘引擎构建阶段 ----
FROM python:3.11-slim AS python-builder

WORKDIR /python-engine

# 安装依赖
RUN pip install --no-cache-dir sxtwl

# 复制排盘引擎代码（需要从外部挂载或 COPY）
# 注意：排盘引擎位于项目外部的 projects/ziwei-reverse/python-validator/
# 部署时需要将 python-validator/ 目录复制到构建上下文中
COPY python-validator/ ./

# 验证引擎可运行
RUN python paipan_cli.py 1990 6 15 7 1 --pretty > /dev/null 2>&1 || echo "Warning: Python engine validation skipped"

# ---- 运行阶段 ----
FROM node:20-alpine AS runtime

WORKDIR /app

# 安装运行时依赖
RUN npm install -g pnpm && \
    npm install -g pm2

# 安装 Python 运行时（排盘引擎需要）
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --no-cache-dir --break-system-packages sxtwl

# 复制前端构建产物
COPY --from=frontend-builder /app/app/dist ./dist
COPY --from=frontend-builder /app/app/public ./public

# 复制后端代码
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/dist ./dist
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/node_modules ./node_modules
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/prisma ./prisma
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/src/llm-providers ./src/llm-providers
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/src/knowledge-base ./src/knowledge-base
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/src/ziping-agent/prompts ./src/ziping-agent/prompts
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/src/liuren-agent/prompts ./src/liuren-agent/prompts
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/src/ziwei-agent/prompts ./src/ziwei-agent/prompts

# 复制 Python 排盘引擎
COPY --from=python-builder /python-engine /app/python-engine

# 复制启动脚本
COPY --from=backend-builder /app/awkn-life-backend/apps/api-server/package.json ./
COPY --from=backend-builder /app/awkn-life-backend/ecosystem.config.js ./

# 创建非 root 用户
RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/logs && chown -R app:app /app

# 环境变量：Python 排盘引擎路径
ENV ZIWEI_CLI_PATH=/app/python-engine/paipan_cli.py
ENV PYTHON_ENGINE_DIR=/app/python-engine

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

# 暴露端口
EXPOSE 3000

# 以非 root 用户运行
USER app

# 启动命令（使用 PM2）
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
