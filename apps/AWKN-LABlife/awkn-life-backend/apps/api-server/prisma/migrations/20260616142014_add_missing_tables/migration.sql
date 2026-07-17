-- AlterTable
ALTER TABLE "PageVisit" ADD COLUMN "campaign" TEXT;
ALTER TABLE "PageVisit" ADD COLUMN "medium" TEXT;
ALTER TABLE "PageVisit" ADD COLUMN "qrCodeId" TEXT;
ALTER TABLE "PageVisit" ADD COLUMN "source" TEXT;

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN "parentReferralId" TEXT;

-- CreateTable
CREATE TABLE "NamingResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "consultRecordId" TEXT NOT NULL,
    "names" TEXT NOT NULL,
    "wuge" TEXT,
    "sancai" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NamingResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NamingResult_consultRecordId_fkey" FOREIGN KEY ("consultRecordId") REFERENCES "ConsultRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "wxOpenId" TEXT,
    "password" TEXT,
    "nickname" TEXT,
    "gender" TEXT,
    "birthDate" DATETIME,
    "birthTime" TEXT,
    "birthPlace" TEXT,
    "timezone" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "freeTrialUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("birthDate", "birthPlace", "birthTime", "createdAt", "creditBalance", "email", "gender", "id", "isAdmin", "nickname", "password", "phone", "timezone", "updatedAt", "wxOpenId") SELECT "birthDate", "birthPlace", "birthTime", "createdAt", "creditBalance", "email", "gender", "id", "isAdmin", "nickname", "password", "phone", "timezone", "updatedAt", "wxOpenId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_wxOpenId_key" ON "User"("wxOpenId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "NamingResult_consultRecordId_key" ON "NamingResult"("consultRecordId");

-- CreateIndex
CREATE INDEX "NamingResult_userId_idx" ON "NamingResult"("userId");

-- CreateIndex
CREATE INDEX "NamingResult_consultRecordId_idx" ON "NamingResult"("consultRecordId");
