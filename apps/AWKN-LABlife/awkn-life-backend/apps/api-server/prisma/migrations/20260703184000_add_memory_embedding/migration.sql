-- Phase 4 T4.2: MemoryEmbedding 表 — 记忆向量存储
-- 支持 T4.3 向量+关键词混合检索
-- embedding 用 JSON 字符串存储（SQLite 不支持 vector 类型）

-- CreateTable
CREATE TABLE `MemoryEmbedding` (
    `id` TEXT NOT NULL PRIMARY KEY,
    `memoryId` TEXT NOT NULL,
    `userId` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `embedding` TEXT NOT NULL,
    `dim` INTEGER NOT NULL DEFAULT 256,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX `MemoryEmbedding_memoryId_idx` ON `MemoryEmbedding`(`memoryId`);

-- CreateIndex
CREATE INDEX `MemoryEmbedding_userId_idx` ON `MemoryEmbedding`(`userId`);
