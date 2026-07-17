# 回滚 SOP · 标准化操作流程

> **目的**：定义《开发整改计划》14 任务发布后的回滚路径，让运维/产品/开发在事故时"不假思索"地执行
> **关联文档**：[DOD-开发整改计划.md](./DOD-开发整改计划.md) · [feature-flag.ts](../../apps/AWKN-LABlife/app/src/lib/feature-flag.ts) · [feature-flags.config.ts](../../apps/AWKN-LABlife/app/src/config/feature-flags.config.ts) · [批判性分析-开发整改计划.md R6](../../批判性分析-开发整改计划.md)
> **生成日期**：2026-06-13

---

## 一、SLA 总览

| 级别 | 严重度 | 响应 SLA | 修复 SLA | 触发条件示例 |
|------|-------|---------|---------|------------|
| 🔴 **P0** | 业务中断（用户无法咨询） | **30 秒** | **30 分钟** | LLM 100% 报错 / 支付失败 / 数据损坏 |
| 🟠 **P1** | 严重降级（部分用户受影响） | **5 分钟** | **2 小时** | 关键功能报错 >5% / 性能降级 50% |
| 🟡 **P2** | 轻度问题（可降级使用） | **30 分钟** | **24 小时** | UI 显示异常 / 文案错别字 / 非核心功能故障 |

**核心原则**：**降级优先于回滚**。能用 Feature Flag 关闭就别动代码。

---

## 二、三级回滚路径

### 一级回滚：Feature Flag 关闭（30 秒生效） 🟢

**适用**：任何面向用户的改动（14 个任务全部适用）

**前置条件**：
- 改动已通过 Feature Flag 灰度发布（`feature-flag.ts` 已部署）
- 修改处已用 `isEnabled('xxx_enabled', { userId })` 守卫

**操作步骤**：
1. 打开前端 DevTools Console（开发期）或调用运维 API
2. 执行关闭命令：
   ```javascript
   // DevTools 方式（紧急）
   import('/src/lib/feature-flag.ts').then(m =>
     m.setFlagOverride('divination_ritual_enabled', false)
   );

   // 运维 API 方式（生产）
   POST /api/admin/feature-flags/divination_ritual_enabled
   Body: { "enabled": false }
   ```
3. 等待 30 秒（前端 `syncFeatureFlagsFromServer()` 周期）
4. 验证：埋点中 `flag_evaluation` 事件中 `reason=override_disabled` 占比应迅速上升

**回滚影响**：
- ✅ 立即停止放量
- ✅ 不需要重新部署
- ✅ 不影响已有用户（仅关闭新功能入口）
- ❌ 已经在使用新功能的用户会回退到旧版 UI（可能有视觉跳变）

**验证 checklist**：
- [ ] 埋点 `divination_ritual_enabled:false` 占比 > 95%
- [ ] 错误率回落到基线水平
- [ ] 用户投诉下降

---

### 二级回滚：代码回退到上一个 release（5 分钟生效） 🟡

**适用**：
- Feature Flag 关闭无效（用户仍报错）
- 数据库 schema 不兼容（需要回退代码 + 数据）
- LLM 调用逻辑有 bug（不仅是开关能解决）

**前置条件**：
- 已确认上一个 release tag（`git tag --sort=-v:refname | head -5`）
- 知道上一个版本的 docker image tag

**操作步骤**：
1. **Nginx 切流**（最常用）：
   ```bash
   # 1. 备份当前 upstream
   cp /etc/nginx/conf.d/upstream.conf /etc/nginx/conf.d/upstream.conf.bak

   # 2. 修改 upstream 到上一个版本
   sed -i 's/api-v2/api-v1/g' /etc/nginx/conf.d/upstream.conf

   # 3. 热加载
   nginx -s reload

   # 4. 验证
   curl -I http://localhost/api/v1/health
   ```

2. **Docker 镜像回退**（备选）：
   ```bash
   # 1. 拉上一个版本
   docker pull awkn/api-server:2026-06-12

   # 2. 滚动重启
   docker service update --image awkn/api-server:2026-06-12 api-server

   # 3. 等待健康检查
   docker service ps api-server
   ```

3. **前端 CDN 回退**（前端 bug 时）：
   ```bash
   # 通过 CDN API 把 index.html 回退到上一版本
   curl -X POST https://cdn-api.awkn.com/rollback \
     -d '{"service": "web", "to": "2026-06-12-1500"}'
   ```

**回滚影响**：
- ✅ 5 分钟内全量恢复
- ✅ 数据无丢失（代码回退，DB 保留）
- ❌ 期间所有用户受影响（切流瞬间）
- ❌ 如果新版本有 schema 变更，可能需要"二级半"——只回退前端/后端之一

**验证 checklist**：
- [ ] 健康检查 `/api/v1/health` 返回 200
- [ ] 错误率恢复基线
- [ ] 关键路径 E2E 测试通过

---

### 三级回滚：数据库迁移 down + 代码回退（30 分钟生效） 🔴

**适用**：
- 数据库 schema 变更造成数据损坏
- 数据迁移脚本有 bug
- 无法用代码兼容解决的 schema 冲突

**前置条件**：
- Prisma migration 已有 `down` 脚本（**强制要求**）
- DBA 在场（不可单人执行）

**操作步骤**：

> ⚠️ **警告**：本操作不可逆。执行前必须确认已备份数据库。

1. **停服**：
   ```bash
   # 1. 维护模式开关
   curl -X POST https://admin.awkn.com/maintenance \
     -d '{"enabled": true, "message": "系统维护中，预计 30 分钟"}'
   ```

2. **备份当前数据**：
   ```bash
   pg_dump -h $DB_HOST -U $DB_USER -d awkn_prod \
     -F c -f /backup/awkn-pre-rollback-$(date +%Y%m%d-%H%M%S).dump
   ```

3. **执行 migration down**：
   ```bash
   cd awkn-life-backend
   npx prisma migrate resolve --rolled-back 20260613_add_state_fields
   npx prisma migrate down --to 20260612_pre_state_fields
   ```

4. **代码回退**：
   ```bash
   # git 回退
   git checkout 2026-06-12-stable
   pnpm build
   docker service update --image awkn/api-server:2026-06-12 api-server
   ```

5. **恢复服务**：
   ```bash
   # 关闭维护模式
   curl -X POST https://admin.awkn.com/maintenance \
     -d '{"enabled": false}'
   ```

6. **数据校验**：
   ```bash
   # 行数对比
   psql -h $DB_HOST -U $DB_USER -d awkn_prod \
     -c "SELECT count(*) FROM consult_record;"  # 应等于回退前
   ```

**回滚影响**：
- ✅ 完整恢复到变更前状态
- ❌ **30 分钟服务不可用**
- ❌ 期间产生的用户数据可能丢失
- ❌ 需要 DBA 配合

**验证 checklist**：
- [ ] 数据库行数与备份一致
- [ ] 所有 Prisma 迁移已正确 down
- [ ] 健康检查通过
- [ ] 关键功能 E2E 测试通过
- [ ] 数据完整性校验通过

---

## 三、回滚决策树

```
事故发生
    │
    ↓
用户投诉上升 / 监控告警
    │
    ↓
判断严重度
    │
    ├── P2 轻度问题
    │     │
    │     ↓
    │   一级回滚：关 Flag（30s）
    │     │
    │     ↓
    │   观察 30min
    │     │
    │     ├── 解决 → 修复后灰度重发
    │     └── 未解决 → 升级 P1
    │
    ├── P1 严重降级
    │     │
    │     ↓
    │   一级回滚：关 Flag（30s）
    │     │
    │     ↓
    │   验证
    │     │
    │     ├── 解决 → 修复后灰度重发
    │     └── 未解决 → 二级回滚
    │              │
    │              ↓
    │            代码回退到上一 release（5min）
    │              │
    │              ↓
    │            验证
    │              │
    │              ├── 解决 → 修复后灰度重发
    │              └── 未解决 → 升级 P0
    │
    └── P0 业务中断
          │
          ↓
        一级回滚：关 Flag（30s）
          │
          ↓
        验证
          │
          ├── 解决 → 紧急修复
          └── 未解决 → 二级回滚
                   │
                   ↓
                 代码回退（5min）
                   │
                   ↓
                 验证
                   │
                   ├── 解决 → 紧急修复
                   └── 未解决 → 三级回滚
                            │
                            ↓
                          停服 + DB 回退（30min）
```

---

## 四、灰度发布标准

### 4.1 灰度阶段

| 阶段 | 放量 | 观察期 | 通过标准 |
|------|------|-------|---------|
| **内测** | 1% | 24h | 错误率 < 0.5% / 性能无降级 |
| **小流量** | 10% | 48h | 错误率 < 1% / 用户反馈无重大问题 |
| **中流量** | 50% | 48h | 错误率 < 1.5% / 核心指标无下降 |
| **全量** | 100% | 持续监控 | 同上 |

**关键原则**：
- 任何阶段不通过，**自动回退到上一阶段**或关闭 Flag
- 灰度期间监控 6 个核心指标：错误率 / 响应时间 / 转化率 / 留存率 / 投诉率 / 退款率

### 4.2 灰度操作命令

```javascript
// feature-flag.ts 提供的运维 API
import { setFlagOverride, addToDenyList, applyRemoteRegistry }
  from '@/lib/feature-flag';

// 1. 设置百分比（0-100）
applyRemoteRegistry({
  'divination_ritual_enabled': { percentage: 10, ... }
});

// 2. 紧急关闭（30 秒内生效）
setFlagOverride('divination_ritual_enabled', false);

// 3. 拉黑特定用户
addToDenyList('multi_turn_enabled', 'user-12345');
```

---

## 五、紧急联系矩阵

| 角色 | 责任 | 联系方式（占位） |
|------|------|----------------|
| **On-call 工程师** | 一级/二级回滚 | PagerDuty 值班 |
| **DBA** | 三级回滚（数据库） | 内部通讯录 |
| **产品负责人** | 业务决策（是否回滚） | 内部通讯录 |
| **CEO** | 重大事故升级 | 紧急电话 |
| **客服** | 用户安抚 | 工单系统 |

---

## 六、回滚后必须做的事

1. **24h 内**：
   - 写事故复盘（5-Why 分析）
   - 通知所有相关方
   - 更新监控告警阈值
2. **48h 内**：
   - 修复根本原因
   - 补全测试用例（确保下次不会重犯）
   - 重新灰度发布
3. **7 天内**：
   - 团队复盘会议
   - 更新本 SOP（记录新发现的风险）

---

## 七、与其他文档的关系

```
DOD-开发整改计划.md  (验收标准)
  │
  ├──→ rollback-sop.md  (本文件 · 回滚路径)
  │
  ├──→ feature-flag.ts  (灰度实施)
  │
  └──→ 监控告警配置  (待补)
```

---

## 八、关键原则

1. **降级优先**：能用 Feature Flag 关闭就不要回滚代码
2. **备份先行**：DB 回退前必须备份
3. **沟通到位**：所有 P0/P1 必须 5 分钟内同步 CEO
4. **复盘必做**：每次回滚必须 24h 内复盘
5. **演练有备**：每季度演练一次（生产预演环境）

---

*文档结束。所有事故响应请按本 SOP 执行。*
