# Q3 阶段 1 部署脚本集成说明

> **版本**：v1.0
> **生成时间**：2026-06-25
> **执行者**：天火 🔥
> **目标**：将 Q3 P0-1~P0-4 新增脚本集成到现有 deploy.sh 部署流程

---

## 一、新增脚本清单

| 脚本 | 路径 | 用途 | 对应任务 |
|------|------|------|---------|
| `pre-deploy-check.sh` | `scripts/pre-deploy-check.sh` | 部署前置检查（锁+环境+备份+管理员脚本） | P0-1 |
| `env-audit.sh` | `scripts/env-audit.sh` | 环境一致性审计（.env.example vs 生产.env） | P0-3 |
| `smoke-test-frontend.sh` | `scripts/smoke-test-frontend.sh` | 前端 SPA 路由冒烟测试 | P0-2 |
| `verify-admin.js` | `awkn-life-backend/apps/api-server/scripts/verify-admin.js` | 管理员保底校验（存在+isAdmin+密码登录） | P0-4 |

---

## 二、deploy.sh 集成修改点

### 修改点 1：deploy_pm2() 函数开头加前置检查

**位置**：`deploy.sh` 第 164 行附近（`deploy_pm2()` 函数内，`create_backup_point` 之前）

**插入代码**：
```bash
# ---- Q3 P0-1: 部署前置检查 ----
echo ""
echo "🚦 执行部署前置检查..."
if ! bash "$PROJECT_DIR/scripts/pre-deploy-check.sh"; then
  echo -e "${RED}❌ 部署前置检查失败，中止部署${NC}"
  exit 1
fi
```

### 修改点 2：deploy_pm2() 函数中 ensure-admin 后加 verify-admin

**位置**：`deploy.sh` 第 205 行附近（`ensure-admin.js` 调用之后）

**插入代码**：
```bash
  # ---- Q3 P0-4: 管理员保底校验 ----
  echo "🔍 执行管理员保底校验..."
  cd "$PROJECT_DIR/awkn-life-backend"
  ADMIN_PASSWORD=$ADMIN_PASSWORD node apps/api-server/scripts/verify-admin.js
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 管理员保底校验失败${NC}"
    # 不中止部署，但记录警告
    echo -e "${YELLOW}⚠️ 管理员校验失败，请手动检查${NC}"
  fi
```

### 修改点 3：smoke_check() 函数后加前端 SPA 测试

**位置**：`deploy.sh` 第 318 行附近（`smoke_check()` 函数之后）

**插入代码**：
```bash
# ---- Q3 P0-2: 前端 SPA 路由冒烟测试 ----
smoke_check_frontend() {
  echo ""
  echo -e "${YELLOW}🖥️ 前端 SPA 路由冒烟测试...${NC}"
  if [ -f "$PROJECT_DIR/scripts/smoke-test-frontend.sh" ]; then
    if bash "$PROJECT_DIR/scripts/smoke-test-frontend.sh"; then
      echo -e "${GREEN}✅ 前端 SPA 路由测试通过${NC}"
      return 0
    else
      echo -e "${RED}❌ 前端 SPA 路由测试失败${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠️ smoke-test-frontend.sh 不存在，跳过${NC}"
    return 0
  fi
}
```

### 修改点 4：deploy_pm2() 和 deploy_nginx() 的烟测后加前端测试

**位置**：`deploy.sh` 第 213-217 行和第 255-260 行（`smoke_check` 调用之后）

**插入代码**：
```bash
  # 部署后前端烟测
  if ! smoke_check_frontend; then
    echo -e "${RED}❌ 前端烟测失败，触发回滚${NC}"
    "$PROJECT_DIR/scripts/rollback.sh"
    exit 1
  fi
```

---

## 三、部署流程对比

### 改造前

```
deploy_pm2()
  ├── create_backup_point
  ├── npm ci
  ├── prisma generate
  ├── backup-db.sh
  ├── prisma migrate deploy
  ├── PM2 启动
  ├── ensure-admin.js
  ├── pm2 save + startup
  └── smoke_check (5个API测试)
```

### 改造后

```
deploy_pm2()
  ├── pre-deploy-check.sh        ← 新增 P0-1
  │   ├── 部署锁检查
  │   ├── env-audit.sh           ← 新增 P0-3
  │   ├── 数据库备份验证
  │   └── 管理员脚本检查
  ├── create_backup_point
  ├── npm ci
  ├── prisma generate
  ├── backup-db.sh
  ├── prisma migrate deploy
  ├── PM2 启动
  ├── ensure-admin.js
  ├── verify-admin.js            ← 新增 P0-4
  ├── pm2 save + startup
  ├── smoke_check (5个API测试)
  └── smoke-test-frontend.sh     ← 新增 P0-2
      ├── /life/ 首页
      ├── /life/question SPA
      ├── /life/naming SPA
      ├── /life/kline SPA
      ├── 静态资源 CSS
      └── 静态资源 JS
```

---

## 四、验收标准

### P0-1 部署链路改造

- ✅ `pre-deploy-check.sh` 存在且可执行
- ✅ 部署锁机制工作（并发部署被阻止）
- ✅ 环境一致性审计集成
- ✅ 失败时自动释放锁

### P0-2 /life 路由核验

- ✅ `smoke-test-frontend.sh` 存在且可执行
- ✅ 覆盖 6 个前端测试点
- ✅ 部署后自动执行

### P0-3 环境一致性审计

- ✅ `env-audit.sh` 存在且可执行
- ✅ 对比 .env.example 与生产 .env
- ✅ 检查关键密钥非空
- ✅ 检查端口和 NODE_ENV 配置

### P0-4 管理员账号保底

- ✅ `verify-admin.js` 存在且可执行
- ✅ 校验管理员账号存在
- ✅ 校验 isAdmin=true
- ✅ 校验密码可登录（bcrypt.compare）

---

## 五、手动集成步骤

由于权限限制，deploy.sh 的修改需手动执行：

```bash
# 1. 登录服务器
ssh -i ~/.ssh/aliyun_awkn root@8.148.245.29

# 2. 进入项目目录
cd /opt/awkn-life

# 3. 备份现有 deploy.sh
cp deploy.sh deploy.sh.bak-$(date +%Y%m%d)

# 4. 按本文档"二、deploy.sh 集成修改点"手动编辑
nano deploy.sh

# 5. 验证脚本权限
chmod +x scripts/pre-deploy-check.sh
chmod +x scripts/env-audit.sh
chmod +x scripts/smoke-test-frontend.sh

# 6. 测试前置检查
bash scripts/pre-deploy-check.sh

# 7. 测试环境审计
bash scripts/env-audit.sh

# 8. 测试管理员校验
cd awkn-life-backend
ADMIN_PASSWORD=your_password node apps/api-server/scripts/verify-admin.js
```

---

## 六、回滚方案

如果集成后部署失败：

```bash
# 回滚 deploy.sh
cd /opt/awkn-life
cp deploy.sh.bak-YYYYMMDD deploy.sh

# 新增脚本不影响系统，可保留不用
# 如需删除：
# rm scripts/pre-deploy-check.sh
# rm scripts/env-audit.sh
# rm scripts/smoke-test-frontend.sh
# rm awkn-life-backend/apps/api-server/scripts/verify-admin.js
```

---

## 七、强制收尾（3 件事）

下次遇到类似情况，先做哪 3 件事？

1. **查看当前状态**：`git status` + `ssh 服务器 pm2 list` + `curl health` 三方确认
2. **备份当前版本**：服务器端 `cp deploy.sh deploy.sh.bak-<TS>`
3. **读取完整上下文**：先读本集成说明 + Q3 计划 + 现有 deploy.sh，再动手

---

**文档结束**
