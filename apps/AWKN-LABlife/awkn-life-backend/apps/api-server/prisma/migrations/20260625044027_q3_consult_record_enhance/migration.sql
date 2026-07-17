-- Q3 P2-2/P2-4: 补齐咨询记录字段（主键贯通+K线类型+分享/重试计数）

-- AlterTable
ALTER TABLE "ConsultRecord" ADD COLUMN "klineType" TEXT;
ALTER TABLE "ConsultRecord" ADD COLUMN "shareCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConsultRecord" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConsultRecord" ADD COLUMN "consultationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ConsultRecord_consultationId_key" ON "ConsultRecord"("consultationId");
CREATE INDEX "ConsultRecord_klineType_idx" ON "ConsultRecord"("klineType");