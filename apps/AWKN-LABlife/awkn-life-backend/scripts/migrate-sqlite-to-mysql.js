const Database = require("better-sqlite3");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const sqlite = new Database("/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db");
  sqlite.pragma("journal_mode = WAL");
  const mysql = new PrismaClient({
    datasources: { db: { url: "mysql://awkn_life:Awkn2026Life!@localhost:3306/awkn_life" } }
  });

  try {
    // Check what's already migrated
    const existingUsers = await mysql.user.count();
    const existingRecords = await mysql.consultRecord.count();
    console.log("Existing: Users=", existingUsers, "Records=", existingRecords);

    // 3. ConsultRecord (skip if userId is null - use raw SQL)
    if (existingRecords === 0) {
      const records = sqlite.prepare("SELECT * FROM ConsultRecord").all();
      for (const r of records) {
        // Use raw SQL to avoid Prisma relation issues
        await mysql.$executeRawUnsafe(`
          INSERT INTO ConsultRecord (id, userId, type, question, status, result, summary,
            routeType, calcResult, engineData, birthDate, birthHour, city, gender,
            askTime, namingType, originalName, sourceEntry, isShunYun, paywallModules,
            modulesRating, modules, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, r.id, r.userId, r.type || null, r.question, r.status, r.result || null,
           r.summary || null, r.routeType || null, r.calcResult || null, r.engineData || null,
           r.birthDate || null, r.birthHour || null, r.city || null, r.gender || null,
           r.askTime || null, r.namingType || null, r.originalName || null, r.sourceEntry || null,
           r.isShunYun ? 1 : 0, r.paywallModules || null, r.modulesRating || null,
           r.modules || null, new Date(r.createdAt), new Date(r.updatedAt));
      }
      console.log("ConsultRecord:", records.length);
    } else {
      console.log("ConsultRecord: skipped (already exists)");
    }

    // 4. Membership
    const existingMemberships = await mysql.membership.count();
    if (existingMemberships === 0) {
      const memberships = sqlite.prepare("SELECT * FROM Membership").all();
      for (const m of memberships) {
        await mysql.$executeRawUnsafe(`
          INSERT INTO Membership (id, userId, planId, status, startDate, expireDate, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, m.id, m.userId, m.planId, m.status,
           new Date(m.startDate), m.expireDate ? new Date(m.expireDate) : null,
           new Date(m.createdAt), new Date(m.updatedAt));
      }
      console.log("Membership:", memberships.length);
    } else {
      console.log("Membership: skipped");
    }

    // 5. Session
    const existingSessions = await mysql.session.count();
    if (existingSessions === 0) {
      const sessions = sqlite.prepare("SELECT * FROM Session").all();
      for (const s of sessions) {
        await mysql.$executeRawUnsafe(`
          INSERT INTO Session (id, userId, token, nonce, expiresAt, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `, s.id, s.userId, s.token, s.nonce, new Date(s.expiresAt), new Date(s.createdAt));
      }
      console.log("Session:", sessions.length);
    } else {
      console.log("Session: skipped");
    }

    // 6. PageVisit
    const existingVisits = await mysql.pageVisit.count();
    if (existingVisits === 0) {
      const visits = sqlite.prepare("SELECT * FROM PageVisit").all();
      for (const v of visits) {
        await mysql.$executeRawUnsafe(`
          INSERT INTO PageVisit (id, userId, page, referrer, userAgent, ip, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, v.id, v.userId, v.page, v.referrer, v.userAgent, v.ip, new Date(v.createdAt));
      }
      console.log("PageVisit:", visits.length);
    } else {
      console.log("PageVisit: skipped");
    }

    // 7. UserActivity
    const existingActivities = await mysql.userActivity.count();
    if (existingActivities === 0) {
      const activities = sqlite.prepare("SELECT * FROM UserActivity").all();
      for (const a of activities) {
        await mysql.$executeRawUnsafe(`
          INSERT INTO UserActivity (id, userId, action, details, moduleId, recordId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, a.id, a.userId, a.action, a.details, a.moduleId, a.recordId, new Date(a.createdAt));
      }
      console.log("UserActivity:", activities.length);
    } else {
      console.log("UserActivity: skipped");
    }

    console.log("Migration complete!");
  } catch (e) {
    console.error("Migration error:", e.message);
  } finally {
    sqlite.close();
    await mysql.$disconnect();
  }
}

main();
