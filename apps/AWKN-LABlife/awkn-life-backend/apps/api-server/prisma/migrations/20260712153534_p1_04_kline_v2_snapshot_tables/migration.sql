-- AlterTable
ALTER TABLE "KlineBar" ADD COLUMN "snapshotId" TEXT;

-- AlterTable
ALTER TABLE "StateSnapshot" ADD COLUMN "snapshotId" TEXT;

-- CreateTable
CREATE TABLE "KlineSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVersion" TEXT NOT NULL DEFAULT 'v1.1',
    "algorithmVersion" TEXT NOT NULL DEFAULT 'alg-v1',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sourceSummary" TEXT NOT NULL DEFAULT '[]',
    "confidence" REAL,
    "degradedReason" TEXT,
    "supersedesId" TEXT,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KlineNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "monthLabel" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceRefs" TEXT NOT NULL DEFAULT '[]',
    "confidence" REAL NOT NULL,
    "consultRecordId" TEXT,
    "askedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KlineOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "actualScore" REAL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'user_reported',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "KlineSnapshot_userId_status_idx" ON "KlineSnapshot"("userId", "status");

-- CreateIndex
CREATE INDEX "KlineSnapshot_profileId_idx" ON "KlineSnapshot"("profileId");

-- CreateIndex
CREATE INDEX "KlineNode_snapshotId_idx" ON "KlineNode"("snapshotId");

-- CreateIndex
CREATE INDEX "KlineNode_nodeType_idx" ON "KlineNode"("nodeType");

-- CreateIndex
CREATE INDEX "KlineOutcome_nodeId_idx" ON "KlineOutcome"("nodeId");

-- CreateIndex
CREATE INDEX "KlineOutcome_userId_idx" ON "KlineOutcome"("userId");

-- CreateIndex
CREATE INDEX "KlineBar_snapshotId_idx" ON "KlineBar"("snapshotId");

-- CreateIndex
CREATE INDEX "StateSnapshot_snapshotId_idx" ON "StateSnapshot"("snapshotId");
