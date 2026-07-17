# /life 子站当前部署基线

> 日期：2026-06-24
> 适用范围：`https://awkn.cn/life/`
> 目的：统一当前线上可执行口径，避免继续使用旧的 `3000` / `/api` / `/usr/share/nginx/html` 方案

## 1. 当前真值

以以下两份为准：

1. `C:\Users\10919\.claude\skills\awkn-部署\references\project-deploy-standards.md`
2. `C:\Users\10919\.claude\skills\awkn-部署\references\project-天火Life.md`

本项目本地代码侧已确认：

- 前端 Vite `base`：`/life/`
- 前端生产 API 默认值：`/life/api/v1`
- 后端全局前缀：`api/v1`
- 后端监听端口：`30000`（PM2 进程 `awkn-life-backend`）
- 数据库类型：SQLite（生产环境 `file:./dev.db`）
- Nginx 代理：`/life/api/` → `http://127.0.0.1:30000/api/`
- Nginx WebSocket：`/life/socket.io/` → `http://127.0.0.1:30000/socket.io/`
- 线上静态目录：`/www/wwwroot/awkn-lab/life/`
- 线上 PM2 进程：`awkn-life-backend`
- 线上健康检查：`https://awkn.cn/life/api/v1/health`
- 线上代码目录：`/opt/awkn-life/awkn-life-backend`

## 2. 禁止继续使用的旧口径

以下内容视为过期，不再作为部署依据：

- 把前端发布到 `/usr/share/nginx/html/`
- 构建时使用 `VITE_API_BASE_URL=http://8.148.245.29:3000/api`
- 默认认为后端固定监听 `3000`
- 使用 `/api/v1/health` 作为公网入口，而不是 `/life/api/v1/health`
- 修改或重定向 `awkn.cn/` 根站点到 `/life/`

## 3. 正确部署目标

### 前端

- 本地源码目录：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app`
- 构建产物目录：`dist/`
- 远端静态目录：`/www/wwwroot/awkn-lab/life/`

### 后端

- 本地源码目录：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend`
- 远端代码目录：`/opt/awkn-life/awkn-life-backend`
- PM2 进程名：`awkn-life-backend`

### 路由

- 前端入口：`/life/`
- API 路由：`/life/api/` 代理到后端 `/api/`
- 业务接口前缀：`/life/api/v1/...`

## 4. 最小安全部署步骤

### 4.1 部署前确认

```bash
ssh aliyun-awkn "nginx -T 2>/dev/null | grep -n '/life/'"
ssh aliyun-awkn "ss -tlnp | grep ':30000' || true"
ssh aliyun-awkn "pm2 show awkn-life-backend >/dev/null && echo PM2_OK"
```

### 4.2 备份

```bash
ssh aliyun-awkn "cp -r /www/wwwroot/awkn-lab/life /www/wwwroot/awkn-lab/life.bak-$(date +%Y%m%d%H%M%S)"
ssh aliyun-awkn "cp -r /opt/awkn-life /opt/awkn-life.bak-$(date +%Y%m%d%H%M%S)"
```

### 4.3 构建

```bash
cd apps/AWKN-LABlife/app
npm run build

cd ../awkn-life-backend/apps/api-server
npm run build
```

### 4.4 发布

- 只替换 `/life` 静态资源目录
- 后端如有变更，重启 `awkn-life-backend`
- 不改 `awkn.cn/` 根站首页目录与根路由

### 4.5 权限修复

```bash
ssh aliyun-awkn "chmod -R a+rX /www/wwwroot/awkn-lab/life/"
```

### 4.6 验收

```bash
curl -sI https://awkn.cn/ | head -1
curl -sI https://awkn.cn/life/ | head -1
curl -s https://awkn.cn/life/api/v1/health
curl -sL https://awkn.cn/life/ | grep -oP '<title>\K[^<]+'
```

## 5. 回滚

### 静态资源回滚

```bash
ssh aliyun-awkn "rm -rf /www/wwwroot/awkn-lab/life && cp -r /www/wwwroot/awkn-lab/life.bak-<TS> /www/wwwroot/awkn-lab/life"
ssh aliyun-awkn "chmod -R a+rX /www/wwwroot/awkn-lab/life/"
```

### 后端回滚

```bash
ssh aliyun-awkn "rm -rf /opt/awkn-life && cp -r /opt/awkn-life.bak-<TS> /opt/awkn-life"
ssh aliyun-awkn "cd /opt/awkn-life/awkn-life-backend && pm2 restart awkn-life-backend"
```

## 6. 现有脚本使用结论

当前可继续使用：

- `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\scripts\deploy\deploy-awkn-life.ps1`

但必须满足：

- 仅发布 `/life`
- 健康检查按 `/life/api/v1/health`
- 上传后执行 `chmod -R a+rX`
- 不再把 `3000` 视为唯一正确端口

## 7. 2026-06-24 本地核验结果

已完成本地关键构建验证：

- 前端：`apps/AWKN-LABlife/app` 执行 `npm run build` 成功
- 后端：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server` 执行 `npm run build` 成功
- 前端已进一步验证一版分包收口：去掉 `echarts -> vendor-echarts` 强制拆包后，构建仍成功

当前已知非阻塞风险：

- 前端 Vite 构建仍存在大 chunk 告警，但 `ResultPage` 已从约 549 kB 拆到约 190 kB
- 新增独立 chunk：`ResultChat`、`ReportDashboard`、`ResultAdvancedTools`、`DialogueChat`、`PosterModal`、`PaywallModal`、`ConclusionPreview`、`MultiEndingDisplay`
- `KlinePage` 已从约 107 kB 继续拆到约 14 kB，`GroupGauge` 已从约 451 kB 误聚合块收敛到约 4.9 kB
- `KlineChart` 现已与 ECharts 运行时合并到同一懒加载块，构建产物约 528.8 kB；代价是单块偏大，收益是进入 K 线页前不会额外请求独立 `vendor-echarts`
- Vite 分包规则已进一步收口：`recharts` 保持显式 `vendor-recharts`，`echarts` 不再单独拆公共 vendor，而是跟随 `KlineChart` 页面级懒加载
- 原先的匿名 `installCanvasRenderer` 大块与后续 `vendor-echarts` 均已消失，说明 ECharts 共享代码已不再以额外公共包形式暴露
- 当前主要剩余大包集中在：`KlineChart`（约 528.8 kB，按需懒加载）、`vendor-recharts`（约 421.7 kB）、主 `index` 包（约 261.4 kB）
- `TidePage` 已通过面板级懒加载从约 24.5 kB 下降到约 16.8 kB，`StateRadar` 与 `PhaseSpace` 已独立成小 chunk
- `Tide` 两个面板已进一步从 ECharts 改为 Recharts：`StateRadar` 约 4.2 kB、`PhaseSpace` 约 4.0 kB
- 当前 `app/src` 内剩余 ECharts 运行时引用已收敛到 `components/kline/KlineChart.tsx`，说明 ECharts 成本现阶段就是人生 K 线能力成本，而不是 Tide 页面残留
- 这不阻止发布，但下一步若继续压缩，应优先评估：1）是否值得继续重写 `KlineChart`；2）若不重写，则接受当前 K 线懒加载块体积，优先保证 K 线体验与结果质量
