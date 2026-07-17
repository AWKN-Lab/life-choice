-- Phase 4 T4.4: UserMemory 添加 lastAccessedAt 字段 + 索引
-- 用于记忆遗忘定时任务的衰减策略（30天未命中降权，90天未命中归档）

-- AddColumn
ALTER TABLE `UserMemory` ADD COLUMN `lastAccessedAt` DATETIME;

-- CreateIndex
CREATE INDEX `UserMemory_expiresAt_idx` ON `UserMemory`(`expiresAt`);

-- CreateIndex
CREATE INDEX `UserMemory_lastAccessedAt_idx` ON `UserMemory`(`lastAccessedAt`);
