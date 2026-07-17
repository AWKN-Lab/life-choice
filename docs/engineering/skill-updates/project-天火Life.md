# 天火 Life 部署硬规则

> 项目：天火·人生决策宗师
> 最后核验：2026-07-03（修正端口3002→30000、目录awkn-lab→awkn.cn、备份策略更新为Git基线+dist.old）

## 线上入口

| 项 | 值 |
|----|-----|
| 域名 | `https://awkn.cn` |
| Nginx 入口 | `/life/` |
| 前端目录 | `/www/wwwroot/awkn.cn/life/` |
| 后端 PM2 | `awkn-life-backend` |
| 后端端口 | `30000` |
| API 路由 | `/life/api/` → `http://127.0.0.1:30000/api/` |
| API 全局前缀 | `api/v1` |
| 健康检查 | `curl -s https://awkn.cn/life/api/v1/health` |

## 本地源码目录（2026-06-01 新增）

> ⚠️ 本项目存在多个历史目录，部署前必须确认使用正确目录！

| 目录 | 版本 | 状态 |
|------|------|------|
| `人生决策宗师/AWKN-LABlife/app/` | 最新版"人生决策宗师" | ✅ **部署用** |
| `life choice/` | 旧版"人生决策红绿灯" | ❌ 废弃，禁止部署 |
| `人生枢密院/` | 另一个项目（/Pri/） | ❌ 不同项目，禁止混淆 |

**确认命令**：
```bash
# 确认源码目录的 package.json 项目名
grep '"name"' 人生决策宗师/AWKN-LABlife/app/package.json
# 预期："awkn-life-app" 或类似标识

# 确认 vite.config.ts base 配置
grep "base:" 人生决策宗师/AWKN-LABlife/app/vite.config.ts
# 预期：'/life/'
```

## Git 仓库配置（2026-07-03 新增）

| 项 | 值 |
|----|-----|
| 仓库地址 | `https://github.com/AWKN-Lab/Mr.Mont` |
| fetch URL | `ssh://git@ssh.github.com:443/AWKN-Lab/Mr.Mont.git` |
| push URL | `ssh://git@ssh.github.com:443/AWKN-Lab/Mr.Mont.git`（统一SSH） |
| 认证方式 | Deploy Key（SSH公钥，Read/write） |
| Actions Secret | 不需要（当前为本地push+SSH手动部署） |

**验证命令**：
```bash
git remote -v
# fetch 和 push 必须同为 SSH 协议

ssh -T git@ssh.github.com -p 443
# 预期：Hi AWKN-Lab! You've successfully authenticated
# 注意：exit code 1 是正常的
```

## 部署门禁

1. **源码确认**：确认构建目录为 `人生决策宗师/AWKN-LABlife/app/`，而非 `life choice/` 或其他
2. 前端构建 base 必须为 `/life/`。
3. 部署后必须先验 API：`GET /life/api/v1/health`。
4. 再验前端入口：`HEAD /life/` 和 `/life/assets/` 关键资源。
5. 线上实测后端监听 `*:30000`，Nginx 代理 `127.0.0.1:30000`。部署前以 `ss -tlnp | grep 30000` 核准。
6. 上传后必须执行 `chmod -R a+rX /www/wwwroot/awkn.cn/life/`。
7. **身份校验**：`curl -sL https://awkn.cn/life/ | grep -oP '<title>\K[^<]+'` → 预期 `人生决策宗师`

## 备份与回滚（2026-07-03 更新 — E-A24 新策略）

> **策略变更**：回滚基线改为 Git commit，服务器只保留 1 份 dist.old 做即时回滚。
> 不再在服务器累积 .bak-TS 历史备份（用户明确要求"不要在服务器上备份"）。

### 部署前（Git 基线）

```bash
# 本地：确保已 commit + push
git add -A && git commit -m "WIP 备份: $(date +%Y%m%d_%H%M%S)"
git push origin main
```

### 服务器部署时（仅保留 dist.old）

```bash
# 服务器：旧版本自动成为 dist.old
ssh aliyun-awkn "cd /www/wwwroot/awkn.cn && mv life life.old && mkdir life"
# 上传新版本
rsync -avz --delete -e ssh <local-dist>/ aliyun-awkn:/www/wwwroot/awkn.cn/life/
# 权限
ssh aliyun-awkn "chmod -R a+rX /www/wwwroot/awkn.cn/life/"
```

### 即时回滚（秒级，刚部署就发现问题）

```bash
ssh aliyun-awkn "cd /www/wwwroot/awkn.cn && rm -rf life && mv life.old life && nginx -s reload"
```

### 历史回滚（分钟级，回到指定 Git 版本）

```bash
# 本地：git reset 到指定 commit
git reset --hard <commit-hash>
git push --force-with-lease origin main  # ⚠️ 需用户明确授权
# 重新构建 + 重新部署
```

### 禁止

- ❌ 在服务器累积 `.bak-TS` 历史备份（用户明确反对）
- ❌ 把服务器 cp -r 作为唯一回滚手段（Git 才是真相源）
- ❌ 不 commit 就直接部署（违反"先 Git 后服务器"原则）
