-- CreateTable
CREATE TABLE "NamingProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "namingType" TEXT NOT NULL,
    "surname" TEXT,
    "stylePreference" TEXT,
    "industry" TEXT,
    "targetAudience" TEXT,
    "originalName" TEXT,
    "customDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NamingProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NamingCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" REAL NOT NULL DEFAULT 0,
    "analysis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "candidateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NamingCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "NamingProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NamingIteration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "iterationNo" INTEGER NOT NULL,
    "promptSnapshot" TEXT,
    "modelUsed" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NamingIteration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "NamingProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NamingProject_userId_idx" ON "NamingProject"("userId");

-- CreateIndex
CREATE INDEX "NamingProject_status_idx" ON "NamingProject"("status");

-- CreateIndex
CREATE INDEX "NamingCandidate_projectId_idx" ON "NamingCandidate"("projectId");

-- CreateIndex
CREATE INDEX "NamingCandidate_status_idx" ON "NamingCandidate"("status");

-- CreateIndex
CREATE INDEX "NamingCandidate_name_idx" ON "NamingCandidate"("name");

-- CreateIndex
CREATE INDEX "NamingIteration_projectId_idx" ON "NamingIteration"("projectId");
