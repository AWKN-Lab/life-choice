-- CreateTable
CREATE TABLE "User" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "moduleId" TEXT,
    "recordId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "chartHistory" TEXT DEFAULT '{}',
    "consultHistory" TEXT DEFAULT '{}',
    "timelineEvents" TEXT DEFAULT '{}',
    "insights" TEXT DEFAULT '{}',
    CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BaZiProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "birthMonth" INTEGER NOT NULL,
    "birthDay" INTEGER NOT NULL,
    "birthHour" INTEGER NOT NULL,
    "birthMinute" INTEGER NOT NULL DEFAULT 0,
    "gender" TEXT NOT NULL,
    "yearGanZhi" TEXT NOT NULL,
    "monthGanZhi" TEXT NOT NULL,
    "dayGanZhi" TEXT NOT NULL,
    "timeGanZhi" TEXT NOT NULL,
    "wuXingDist" TEXT NOT NULL DEFAULT '{}',
    "shenWang" TEXT NOT NULL,
    "shenWangScore" INTEGER NOT NULL DEFAULT 50,
    "xiYongShen" TEXT NOT NULL DEFAULT '{}',
    "shiShen" TEXT NOT NULL DEFAULT '{}',
    "shenSha" TEXT NOT NULL DEFAULT '{}',
    "qiYunAge" INTEGER NOT NULL DEFAULT 0,
    "isShunYun" BOOLEAN NOT NULL DEFAULT true,
    "taiYuan" TEXT,
    "mingGong" TEXT,
    "naYinYear" TEXT,
    "naYinMonth" TEXT,
    "naYinDay" TEXT,
    "naYinTime" TEXT,
    "correctedHour" INTEGER,
    "city" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BaZiProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "question" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "flowStatus" TEXT,
    "inputData" TEXT NOT NULL DEFAULT '{}',
    "calcResult" TEXT,
    "llmResult" TEXT,
    "summaryScore" INTEGER DEFAULT 0,
    "summaryLine" TEXT,
    "analysisData" TEXT DEFAULT '{}',
    "spreadData" TEXT,
    "bottomData" TEXT,
    "calcDuration" INTEGER,
    "llmDuration" INTEGER,
    "modelUsed" TEXT,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "anonymousId" TEXT,
    "structuredInput" TEXT DEFAULT '{}',
    "coreChartSnapshot" TEXT,
    "resultSummary" TEXT,
    "lastViewedAt" DATETIME,
    "deletedAt" DATETIME,
    "sourceEntry" TEXT,
    "namingType" TEXT,
    "namingPreferences" TEXT,
    "questionIntent" TEXT,
    "unlockStatus" TEXT,
    "shareGenerated" BOOLEAN NOT NULL DEFAULT false,
    "emotionSnapshot" TEXT,
    "extractedFacts" TEXT,
    "isHighRisk" BOOLEAN NOT NULL DEFAULT false,
    "costConfirmationPrompt" TEXT,
    "costUserRestated" TEXT,
    "costConfirmedAt" DATETIME,
    "closedLoopResult" TEXT,
    CONSTRAINT "ConsultRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "userId" TEXT,
    "reviewerId" TEXT,
    "rating" INTEGER NOT NULL,
    "accuracy" INTEGER,
    "helpfulness" INTEGER,
    "tone" INTEGER,
    "comment" TEXT,
    "isJudgmentCorrect" BOOLEAN,
    "calibrationTag" TEXT,
    "calibrationNote" TEXT,
    "appliedAt" DATETIME,
    "appliedByCronId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsultFeedback_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ConsultRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "birthDate" TEXT,
    "birthTime" TEXT,
    "gender" TEXT,
    "birthPlace" TEXT,
    "name" TEXT,
    "yearPillar" TEXT,
    "monthPillar" TEXT,
    "dayPillar" TEXT,
    "hourPillar" TEXT,
    "naYin" TEXT,
    "kongWang" TEXT,
    "relationType" TEXT,
    "importance" TEXT DEFAULT 'normal',
    "currentStatus" TEXT,
    "riskTags" TEXT DEFAULT '[]',
    "recentInteraction" TEXT,
    "currentAdvice" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonProfileRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personProfileId" TEXT NOT NULL,
    "consultRecordId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonProfileRecord_personProfileId_fkey" FOREIGN KEY ("personProfileId") REFERENCES "PersonProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonProfileRecord_consultRecordId_fkey" FOREIGN KEY ("consultRecordId") REFERENCES "ConsultRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "pageName" TEXT NOT NULL,
    "pageUrl" TEXT,
    "referrer" TEXT,
    "deviceInfo" TEXT,
    "screenSize" TEXT,
    "ipCountry" TEXT,
    "ipCity" TEXT,
    "entryTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" DATETIME,
    "duration" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "activityType" TEXT NOT NULL,
    "activityData" TEXT NOT NULL DEFAULT '{}',
    "duration" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "rewardTier" TEXT NOT NULL DEFAULT 'newbie',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "referredUserId" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrowthOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "badgeColor" TEXT NOT NULL DEFAULT 'red',
    "ctaText" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "discount" TEXT,
    "startAt" DATETIME NOT NULL,
    "expireAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LiurenCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "askTime" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "lessonData" TEXT NOT NULL,
    "judgment" TEXT NOT NULL,
    "verification" TEXT,
    "keyPoints" TEXT NOT NULL,
    "keTi" TEXT,
    "tags" TEXT NOT NULL,
    "shenshaList" TEXT NOT NULL,
    "biFaList" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EvidencePacket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "packetJson" TEXT NOT NULL DEFAULT '{}',
    "warnings" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT NOT NULL,
    "evidenceId" TEXT,
    "rawOutput" TEXT,
    "finalJson" TEXT,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "reasoningContent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KnowledgeHit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InteractionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "recordId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConsultPreview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "inputData" TEXT,
    "calcResult" TEXT,
    "freeContent" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'zh-CN',
    "userId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BenchmarkRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "useCot" BOOLEAN NOT NULL DEFAULT false,
    "useAstro" BOOLEAN NOT NULL DEFAULT false,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "maxWorkers" INTEGER NOT NULL DEFAULT 1,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "accuracy" REAL NOT NULL,
    "avgDurationMs" INTEGER NOT NULL,
    "resultsJson" TEXT NOT NULL,
    "categoryStats" TEXT,
    "detailedResults" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PersonEightDimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "role" TEXT,
    "relationship" TEXT,
    "motivation" TEXT,
    "ability" TEXT,
    "resources" TEXT,
    "credit" TEXT,
    "behavior" TEXT,
    "risk" TEXT,
    "completeness" REAL NOT NULL DEFAULT 0,
    "pendingObservations" TEXT DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonEightDimensions_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonRelatedCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "caseTitle" TEXT NOT NULL,
    "hisRole" TEXT,
    "whatHeSaid" TEXT,
    "whatHeDid" TEXT,
    "result" TEXT,
    "impactOnJudgment" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "consultRecordId" TEXT,
    "chronicleEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonRelatedCase_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChronicleEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "consultRecordId" TEXT,
    "personId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "initialView" TEXT,
    "whatHappened" TEXT,
    "gotRight" TEXT,
    "gotWrong" TEXT,
    "nextReminder" TEXT,
    "reviewAt" DATETIME,
    "reviewedAt" DATETIME,
    "entryType" TEXT NOT NULL DEFAULT 'case',
    "miaoSuanId" TEXT,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChronicleEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChronicleEntry_consultRecordId_fkey" FOREIGN KEY ("consultRecordId") REFERENCES "ConsultRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChronicleEntry_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserInsightProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "commonStuckPoints" TEXT DEFAULT '[]',
    "riskPreference" TEXT,
    "relationshipHabits" TEXT DEFAULT '[]',
    "misjudgmentPatterns" TEXT DEFAULT '[]',
    "commonTriggers" TEXT DEFAULT '[]',
    "longTermTrend" TEXT,
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" REAL,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserInsightProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KlineBar" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StateSnapshot" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConsultFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "result" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsultFollowUp_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ConsultRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultFollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultDialogue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recordId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'IDLE',
    "currentNode" INTEGER NOT NULL DEFAULT 0,
    "turns" TEXT NOT NULL DEFAULT '[]',
    "collectedBackground" TEXT,
    "costConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "costUserRestated" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsultDialogue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsultDialogue_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ConsultRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recordId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "snapshot" TEXT NOT NULL DEFAULT '{}',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedCase_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ConsultRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_wxOpenId_key" ON "User"("wxOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMemory_userId_key" ON "UserMemory"("userId");

-- CreateIndex
CREATE INDEX "UserMemory_userId_idx" ON "UserMemory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BaZiProfile_userId_key" ON "BaZiProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultRecord_sessionId_key" ON "ConsultRecord"("sessionId");

-- CreateIndex
CREATE INDEX "ConsultFeedback_recordId_idx" ON "ConsultFeedback"("recordId");

-- CreateIndex
CREATE INDEX "ConsultFeedback_userId_idx" ON "ConsultFeedback"("userId");

-- CreateIndex
CREATE INDEX "ConsultFeedback_appliedAt_idx" ON "ConsultFeedback"("appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonProfileRecord_personProfileId_consultRecordId_key" ON "PersonProfileRecord"("personProfileId", "consultRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthOffer_offerType_key" ON "GrowthOffer"("offerType");

-- CreateIndex
CREATE INDEX "EvidencePacket_recordId_idx" ON "EvidencePacket"("recordId");

-- CreateIndex
CREATE INDEX "EvidencePacket_routeType_createdAt_idx" ON "EvidencePacket"("routeType", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationRun_recordId_moduleId_idx" ON "GenerationRun"("recordId", "moduleId");

-- CreateIndex
CREATE INDEX "GenerationRun_status_createdAt_idx" ON "GenerationRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeHit_runId_idx" ON "KnowledgeHit"("runId");

-- CreateIndex
CREATE INDEX "KnowledgeHit_sourceId_idx" ON "KnowledgeHit"("sourceId");

-- CreateIndex
CREATE INDEX "InteractionEvent_userId_createdAt_idx" ON "InteractionEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InteractionEvent_recordId_createdAt_idx" ON "InteractionEvent"("recordId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultPreview_module_createdAt_idx" ON "ConsultPreview"("module", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultPreview_userId_createdAt_idx" ON "ConsultPreview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BenchmarkRun_provider_createdAt_idx" ON "BenchmarkRun"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "BenchmarkRun_year_createdAt_idx" ON "BenchmarkRun"("year", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonEightDimensions_personId_key" ON "PersonEightDimensions"("personId");

-- CreateIndex
CREATE INDEX "PersonRelatedCase_personId_createdAt_idx" ON "PersonRelatedCase"("personId", "createdAt");

-- CreateIndex
CREATE INDEX "ChronicleEntry_userId_createdAt_idx" ON "ChronicleEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChronicleEntry_entryType_createdAt_idx" ON "ChronicleEntry"("entryType", "createdAt");

-- CreateIndex
CREATE INDEX "ChronicleEntry_reviewAt_idx" ON "ChronicleEntry"("reviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInsightProfile_userId_key" ON "UserInsightProfile"("userId");

-- CreateIndex
CREATE INDEX "KlineBar_userId_year_idx" ON "KlineBar"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "KlineBar_userId_year_month_key" ON "KlineBar"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "StateSnapshot_userId_year_idx" ON "StateSnapshot"("userId", "year");

-- CreateIndex
CREATE INDEX "StateSnapshot_quadrant_createdAt_idx" ON "StateSnapshot"("quadrant", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StateSnapshot_userId_year_month_key" ON "StateSnapshot"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "ConsultFollowUp_userId_scheduledAt_idx" ON "ConsultFollowUp"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ConsultFollowUp_status_scheduledAt_idx" ON "ConsultFollowUp"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultDialogue_recordId_key" ON "ConsultDialogue"("recordId");

-- CreateIndex
CREATE INDEX "ConsultDialogue_userId_createdAt_idx" ON "ConsultDialogue"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultDialogue_state_createdAt_idx" ON "ConsultDialogue"("state", "createdAt");

-- CreateIndex
CREATE INDEX "SavedCase_userId_createdAt_idx" ON "SavedCase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedCase_userId_category_idx" ON "SavedCase"("userId", "category");

-- CreateIndex
CREATE INDEX "SavedCase_visibility_idx" ON "SavedCase"("visibility");

-- CreateIndex
CREATE INDEX "SavedCase_userId_visibility_idx" ON "SavedCase"("userId", "visibility");
