-- AlterTable
ALTER TABLE "ConsultFollowUp" ADD COLUMN "issueId" TEXT;
ALTER TABLE "ConsultFollowUp" ADD COLUMN "messageTemplate" TEXT;
ALTER TABLE "ConsultFollowUp" ADD COLUMN "triggerType" TEXT;

-- CreateIndex
CREATE INDEX "ConsultFollowUp_triggerType_idx" ON "ConsultFollowUp"("triggerType");
