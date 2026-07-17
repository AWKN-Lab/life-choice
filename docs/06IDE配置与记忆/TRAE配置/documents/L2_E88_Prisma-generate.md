# E88｜Prisma schema 变更后必须重新 generate

## 触发条件
Prisma / schema 变更 / 类型不存在 / PrismaService / generate

## 教训
修改 schema.prisma 后 TypeScript 编译报类型不存在错误。需要运行 `npx prisma generate` 重新生成 Prisma Client 类型。

## 反例
修改 schema 后直接 tsc --noEmit，14 个类型错误。运行 `npx prisma generate` 后类型错误消失。

## 判断规则
Prisma schema 变更后的标准流程：
1. 修改 schema.prisma
2. `npx prisma migrate dev`（开发环境）或 `npx prisma migrate deploy`（生产）
3. `npx prisma generate`（重新生成 Client 类型）
4. `tsc --noEmit`（验证类型正确）
5. 步骤 2-3 不可跳过

## 验证次数
1 | 跨场景：是 | 置信度：high

## 来源
2026-06-16 人生决策宗师项目全流程深度复盘

## 关联经验
- E86 端到端验证门禁（同根因：验证真空）
