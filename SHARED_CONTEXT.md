---
type: shared-context
title: 人生决策宗师 项目共享上下文
created: 2026-06-17T22:00:00+08:00
updated: 2026-06-21T00:00:00+08:00
tags: [shared-context, product, life-decision]
status: active
---

# 人生决策宗师（AWKN-LABlife）项目共享上下文

> 子项目 SHARED_CONTEXT，详细记录本产品的技术、运营、规划。
> 总索引见 ../SHARED_CONTEXT.md

## 1. 产品定位

- **产品名**：人生决策宗师 / AWKN-LABlife
- **形态**：命理 + 心理学 AI 决策辅助 Web App
- **核心场景**：用户面临重大人生决策（职业/感情/投资/方向）时，输入问题获得多维度分析
- **目标用户**：25-45 岁、面对重大决策焦虑的城市白领

## 2. 技术架构

```
人生决策宗师/
├── apps/
│   └── AWKN-LABlife/                    # 主前端 + 后端一体化
│       ├── app/                         # React 19 + Vite 7 前端
│       │   ├── src/pages/              # 25 个页面文件 / 27 条路由
│       │   ├── src/components/         # 通用组件库（shadcn/ui 50+）
│       │   ├── src/api/                # API 客户端（12 模块）
│       │   └── src/store/              # Zustand 状态管理（11 store）
│       └── awkn-life-backend/          # NestJS 后端（monorepo）
│           └── apps/api-server/        # NestJS 入口（apps/api-server）
│               └── src/consult/        # 决策咨询核心模块
│                   └── orchestrator/   # mini-state-machine.service.ts
└── docs/                                # 工程文档（6 大类）
    ├── 01产品定位与PRD/                 # 产品定位、需求文档
    └── 02开发PRD与工程文档/             # 工程交接、接口、数据库、部署
```

## 3. 当前规划阶段

- **P1-1 心理学审计**：✅ 已完成（2026-06-14）
- **命运K线·牛市生命周期重构**：✅ 已完成（2026-05-30）
- **主题系统**：✅ 已完成（默认 light/Apple 风，6 种 UI 风格可切换）
- **P1-2 仪式动画**：🟡 进行中（ProfilePage 接入准备就绪，方案 A 已选）
- **P1-3 ~ P1-5**：未启动

## 4. 关键文档

- 产品需求：`docs/01产品定位与PRD/需求文档/`
- 工程文档：`docs/02开发PRD与工程文档/`
  - 工程交接：`docs/02开发PRD与工程文档/工程交接/`
  - 部署说明：`apps/AWKN-LABlife/DEPLOY.md`（权威）
  - 子模块索引：`apps/AWKN-LABlife/SUB-MODULES.md`
- 项目宪法：`constitution.md`
- 文档总索引：`docs/文档索引.md`

## 5. 部署

- 域名：awkn.cn/life
- 服务器：阿里云 ECS 8.148.245.29
- 进程管理：PM2（fork 模式单实例，进程名 awkn-life-backend，受 SQLite 单实例约束）
- 反代：Nginx（前端 /life/ 子路径，API /api/ 反代 :3000，WebSocket /socket.io/）
- 数据库：SQLite（dev/prod），PostgreSQL 迁移计划 Week 16-20
- 监控：unstable_restarts 快速指标 + Sentry

## 6. 上次会话遗留（2026-06-21）

- 全站主题统一为白天/苹果风（light）已完成
- B1：摸清 ProfilePage.tsx 现状 → ✅ 已完成
- 后续：可启动 P1-2 仪式动画接入