-- AlterTable
ALTER TABLE "UserMemory" ADD COLUMN "confidence" REAL DEFAULT 0.5;
ALTER TABLE "UserMemory" ADD COLUMN "content" TEXT;
ALTER TABLE "UserMemory" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "UserMemory" ADD COLUMN "issueId" TEXT;
ALTER TABLE "UserMemory" ADD COLUMN "memoryId" TEXT;
ALTER TABLE "UserMemory" ADD COLUMN "sourceQuote" TEXT;
ALTER TABLE "UserMemory" ADD COLUMN "type" TEXT;
ALTER TABLE "UserMemory" ADD COLUMN "weight" REAL DEFAULT 1.0;

-- CreateIndex
CREATE INDEX "UserMemory_type_idx" ON "UserMemory"("type");
