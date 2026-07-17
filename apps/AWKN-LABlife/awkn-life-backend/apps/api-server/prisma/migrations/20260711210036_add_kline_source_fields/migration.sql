/*
  Warnings:

  - You are about to drop the `ConsultDialogueTurn` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "ConsultDialogueTurn_dialogueId_node_idx";

-- DropIndex
DROP INDEX "ConsultDialogueTurn_dialogueId_createdAt_idx";

-- DropIndex
DROP INDEX "ConsultRecord_klineType_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConsultDialogueTurn";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KlineBar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "monthLabel" TEXT NOT NULL,
    "career" TEXT NOT NULL DEFAULT '{}',
    "wealth" TEXT NOT NULL DEFAULT '{}',
    "health" TEXT NOT NULL DEFAULT '{}',
    "relationship" TEXT NOT NULL DEFAULT '{}',
    "growth" TEXT NOT NULL DEFAULT '{}',
    "freedom" TEXT NOT NULL DEFAULT '{}',
    "buffer" TEXT NOT NULL DEFAULT '{}',
    "compositeCapital" REAL NOT NULL DEFAULT 0,
    "volatility" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "dataVersion" TEXT NOT NULL DEFAULT 'v1',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_KlineBar" ("buffer", "career", "compositeCapital", "createdAt", "freedom", "growth", "health", "id", "month", "monthLabel", "relationship", "userId", "volatility", "wealth", "year") SELECT "buffer", "career", "compositeCapital", "createdAt", "freedom", "growth", "health", "id", "month", "monthLabel", "relationship", "userId", "volatility", "wealth", "year" FROM "KlineBar";
DROP TABLE "KlineBar";
ALTER TABLE "new_KlineBar" RENAME TO "KlineBar";
CREATE INDEX "KlineBar_userId_year_idx" ON "KlineBar"("userId", "year");
CREATE UNIQUE INDEX "KlineBar_userId_year_month_key" ON "KlineBar"("userId", "year", "month");
CREATE TABLE "new_StateSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "energy" REAL NOT NULL DEFAULT 50,
    "recovery" REAL NOT NULL DEFAULT 50,
    "emotion" REAL NOT NULL DEFAULT 50,
    "clarity" REAL NOT NULL DEFAULT 50,
    "liquidity" REAL NOT NULL DEFAULT 50,
    "momentum" REAL NOT NULL DEFAULT 50,
    "support" REAL NOT NULL DEFAULT 50,
    "agency" REAL NOT NULL DEFAULT 50,
    "order" REAL NOT NULL DEFAULT 50,
    "growth" REAL NOT NULL DEFAULT 50,
    "optionality" REAL NOT NULL DEFAULT 50,
    "buffer" REAL NOT NULL DEFAULT 50,
    "timeGroup" REAL,
    "positionGroup" REAL,
    "mindGroup" REAL,
    "capacity" REAL NOT NULL DEFAULT 50,
    "entropy" REAL NOT NULL DEFAULT 50,
    "quadrant" TEXT NOT NULL DEFAULT 'prosperous',
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "dataVersion" TEXT NOT NULL DEFAULT 'v1',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_StateSnapshot" ("agency", "buffer", "capacity", "clarity", "createdAt", "date", "emotion", "energy", "entropy", "growth", "id", "liquidity", "mindGroup", "momentum", "month", "optionality", "order", "positionGroup", "quadrant", "recovery", "support", "timeGroup", "userId", "year") SELECT "agency", "buffer", "capacity", "clarity", "createdAt", "date", "emotion", "energy", "entropy", "growth", "id", "liquidity", "mindGroup", "momentum", "month", "optionality", "order", "positionGroup", "quadrant", "recovery", "support", "timeGroup", "userId", "year" FROM "StateSnapshot";
DROP TABLE "StateSnapshot";
ALTER TABLE "new_StateSnapshot" RENAME TO "StateSnapshot";
CREATE INDEX "StateSnapshot_userId_year_idx" ON "StateSnapshot"("userId", "year");
CREATE INDEX "StateSnapshot_quadrant_createdAt_idx" ON "StateSnapshot"("quadrant", "createdAt");
CREATE UNIQUE INDEX "StateSnapshot_userId_year_month_key" ON "StateSnapshot"("userId", "year", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
