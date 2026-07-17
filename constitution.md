# 人生决策宗师 项目宪法

## 核心原则

- 技术栈：NestJS (后端) + React/Vite (前端) + Prisma (ORM) + SQLite/PostgreSQL
- 包管理：npm
- 代码风格：2空格缩进，小驼峰命名，TypeScript 严格模式
- 测试覆盖率：核心算法模块 ≥80%，其他模块 ≥60%
- 语言：代码注释英文，用户面向内容中文

## 约束

- 禁止硬编码敏感信息（API Key、私钥路径、服务器IP）
- 禁止提交 .env.prod / .env.production 到版本控制
- 所有 LLM 调用必须走 LlmGatewayService，不得直接调用 Provider
- 八字排盘必须走 BaziCalculatorWrapper，不得 LLM 自行推算
- 六壬起课必须走 LiurenAgentService，不得 LLM 自行起课
- 算法证据与 LLM 生成必须分层：EvidencePacket → GenerationComposer → QualityGate
- 前台禁止出现后台字段、JSON 碎片、空泛模板话

## 审查规则

- 任何 PRD/验收报告/工程文档不得由 AI 单方面标记 PASS
- 必须由用户给出三结论之一：放行 / 打回 / 升级
- AI 可在文档状态字段标注"待审查"，但不得标注"PASS / 放行"（除用户明确指令外）
- 审查记录必须写入 docs/05审核与质量/审查记录.md
- 违反此规则的文档视为无效，不得作为下游依据
- 审查结论必须附证据（Glob/LS/Read 交叉验证结果，非主观判断）

## 架构约束

- NestJS 是唯一生产入口
- Knowledge Service 只监听 127.0.0.1:8701
- LLM 长任务走 BullMQ 队列，前端拿 recordId 轮询
- /life 子站不影响 awkn.cn 首页

## 部署策略

- 平台：阿里云 ECS (8.148.245.29)
- 方式：PM2 + Nginx
- 数据库：SQLite (开发) / PostgreSQL (生产)
- 健康检查：/health 端点

## V1 范围

- 子平八字 + 大六壬
- 不做：六爻、梅花、紫微、奇门前台入口

## 代码生命周期管理

- 代码唯一真相 = 中央 Git 仓库（GitHub）的默认分支
- 禁止在本地保留多个备份文件夹（project_final/、project_new/、project_backup/）
- 备份策略：git tag + 推送到远程，禁止手动复制文件夹
- 工程级检查产出必须提交到 reports/engineering-checks/，随代码版本化
- 部署包不保留在仓库目录，靠 git tag 回溯版本
- 多 IDE 协同：通过 Git 同步，不用复制文件；需要多分支并行时用 git worktree

## 质量门禁

- npm run build 通过
- npm run typecheck 零错误
- npm run test 通过
- 无孤立 TODO/FIXME
- 无 .bak / fix_*.cjs / fix_*.py 残留文件
- 无一次性修复脚本（.ps1/.cjs）提交到主线 apps/ 目录
- 工具脚本统一归入 scripts/ 目录

## AI 协作约束

> 详细规则见 [AI-ENTRY-PROTOCOL.md](AI-ENTRY-PROTOCOL.md)，本段为宪法级硬约束。

- **入口强制**：任何 AI 会话进入本项目，第一个动作必须是按 AI-ENTRY-PROTOCOL.md 读完 6 份必读文档并输出自检表
- **计划强制**：所有计划必须写入 `docs/03开发过程稿/已完成执行计划/`，含 5 件套（目标/产出/验收/验证/回滚），未写入文档的计划视为不存在
- **对齐强制**：AI 计划必须合并进当前迭代 PRD 的 P0/P1 清单，不另开线
- **审查强制**：AI 出计划后必触发审查（走 tianhuo-review Skill）
- **回看强制**：任何计划含 7/14/30 天回看钩子，由每周一 09:00 定时任务自动扫描
- **禁止行为**：不读必读就出计划 / 用 grep 替代 Read / 重复发明已有制度
