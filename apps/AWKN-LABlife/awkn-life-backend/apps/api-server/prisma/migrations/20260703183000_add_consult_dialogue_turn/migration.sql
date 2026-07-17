-- Phase 4 T4.1: ConsultDialogueTurn 独立表
-- 替代 ConsultDialogue.turns JSON 字符串，支持高效查询/索引/分页/embedding
-- 开关式迁移：保留 turns JSON 字段向后兼容，新代码可用 dialogueTurns relation

-- CreateTable
CREATE TABLE `ConsultDialogueTurn` (
    `id` TEXT NOT NULL PRIMARY KEY,
    `dialogueId` TEXT NOT NULL,
    `role` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `node` INTEGER,
    `tokenCount` INTEGER,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (`dialogueId`) REFERENCES `ConsultDialogue`(`id`) ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX `ConsultDialogueTurn_dialogueId_createdAt_idx` ON `ConsultDialogueTurn`(`dialogueId`, `createdAt`);

-- CreateIndex
CREATE INDEX `ConsultDialogueTurn_dialogueId_node_idx` ON `ConsultDialogueTurn`(`dialogueId`, `node`);
