import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * 记录页面访问（优雅降级：写入失败不抛 500）
   */
  async trackPageVisit(data: {
    pageName: string;
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
    screenSize?: string;
    duration?: number;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
  }) {
    try {
      const deviceInfo = this.parseUserAgent(data.userAgent);

      const visit = await this.prisma.pageVisit.create({
        data: {
          userId: data.userId || null,
          sessionId: data.sessionId || null,
          pageName: data.pageName,
          pageUrl: data.pageUrl || '',
          referrer: data.referrer || '',
          deviceInfo: JSON.stringify(deviceInfo),
          screenSize: data.screenSize || '',
          duration: data.duration || 0,
          exitTime: data.duration ? new Date() : null,
        },
      });

      return { success: true, visitId: visit.id };
    } catch (error) {
      this.logger.warn(`[trackPageVisit] write failed: ${error.message}`);
      return { success: false, error: 'tracking_unavailable' };
    }
  }

  /**
   * 记录用户活动（优雅降级：写入失败不抛 500）
   */
  async trackActivity(data: {
    activityType: string;
    activityData?: Record<string, any>;
    duration?: number;
    userId?: string;
    sessionId?: string;
  }) {
    try {
      const activity = await this.prisma.userActivity.create({
        data: {
          userId: data.userId || null,
          sessionId: data.sessionId || null,
          activityType: data.activityType,
          activityData: JSON.stringify(data.activityData || {}),
          duration: data.duration || null,
        },
      });

      return { success: true, activityId: activity.id };
    } catch (error) {
      this.logger.warn(`[trackActivity] write failed: ${error.message}`);
      return { success: false, error: 'tracking_unavailable' };
    }
  }

  /**
   * 保存八字档案
   */
  async saveBaZiProfile(userId: string, data: any) {
    const profile = await this.prisma.baZiProfile.upsert({
      where: { userId },
      update: {
        birthYear: data.birthYear,
        birthMonth: data.birthMonth,
        birthDay: data.birthDay,
        birthHour: data.birthHour,
        birthMinute: data.birthMinute || 0,
        gender: data.gender,
        yearGanZhi: data.baZiData?.year || '',
        monthGanZhi: data.baZiData?.month || '',
        dayGanZhi: data.baZiData?.day || '',
        timeGanZhi: data.baZiData?.time || '',
        wuXingDist: JSON.stringify(data.wuXingDist || {}),
        shenWang: data.shenWang || '',
        shenWangScore: data.shenWangScore || 50,
        xiYongShen: JSON.stringify(data.xiYongShen || {}),
        shiShen: JSON.stringify(data.shiShen || {}),
        shenSha: JSON.stringify(data.shenSha || {}),
        qiYunAge: typeof data.qiYunAge === 'object' ? data.qiYunAge?.years || 0 : (data.qiYunAge || 0),
        isShunYun: data.isShunYun ?? true,
        taiYuan: data.taiYuan,
        mingGong: data.mingGong,
        naYinYear: data.naYin?.year,
        naYinMonth: data.naYin?.month,
        naYinDay: data.naYin?.day,
        naYinTime: data.naYin?.time,
        city: data.city,
        correctedHour: data.correctedHour,
      },
      create: {
        userId,
        birthYear: data.birthYear,
        birthMonth: data.birthMonth,
        birthDay: data.birthDay,
        birthHour: data.birthHour,
        birthMinute: data.birthMinute || 0,
        gender: data.gender,
        yearGanZhi: data.baZiData?.year || '',
        monthGanZhi: data.baZiData?.month || '',
        dayGanZhi: data.baZiData?.day || '',
        timeGanZhi: data.baZiData?.time || '',
        wuXingDist: JSON.stringify(data.wuXingDist || {}),
        shenWang: data.shenWang || '',
        shenWangScore: data.shenWangScore || 50,
        xiYongShen: JSON.stringify(data.xiYongShen || {}),
        shiShen: JSON.stringify(data.shiShen || {}),
        shenSha: JSON.stringify(data.shenSha || {}),
        qiYunAge: typeof data.qiYunAge === 'object' ? data.qiYunAge?.years || 0 : (data.qiYunAge || 0),
        isShunYun: data.isShunYun ?? true,
        taiYuan: data.taiYuan,
        mingGong: data.mingGong,
        naYinYear: data.naYin?.year,
        naYinMonth: data.naYin?.month,
        naYinDay: data.naYin?.day,
        naYinTime: data.naYin?.time,
        city: data.city,
        correctedHour: data.correctedHour,
      },
    });

    return { success: true, profileId: profile.id };
  }

  /**
   * 获取八字档案
   */
  async getBaZiProfile(userId: string) {
    const profile = await this.prisma.baZiProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    return {
      ...profile,
      wuXingDist: JSON.parse(profile.wuXingDist || '{}'),
      xiYongShen: JSON.parse(profile.xiYongShen || '{}'),
      shiShen: JSON.parse(profile.shiShen || '{}'),
      shenSha: JSON.parse(profile.shenSha || '{}'),
    };
  }

  /**
   * 更新咨询记录的详细分析数据
   */
  async updateConsultAnalysisData(userId: string, recordId: string, analysisData: any) {
    const record = await this.prisma.consultRecord.findFirst({
      where: { id: recordId, userId },
    });

    if (!record) {
      return { success: false, error: 'Record not found' };
    }

    await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: {
        analysisData: JSON.stringify(analysisData),
        isSaved: true,
      },
    });

    return { success: true, recordId };
  }

  /**
   * 获取用户统计数据
   */
  async getUserStats(userId: string) {
    // 并行查询多个统计数据
    const [
      consultCount,
      recentConsults,
      pageVisitCount,
      activityCount,
      totalConsultDuration,
    ] = await Promise.all([
      // 咨询次数
      this.prisma.consultRecord.count({
        where: { userId, status: 'completed' },
      }),
      // 最近咨询
      this.prisma.consultRecord.findMany({
        where: { userId, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          question: true,
          routeType: true,
          summaryScore: true,
          calcDuration: true,
          llmDuration: true,
          createdAt: true,
        },
      }),
      // 页面访问次数
      this.prisma.pageVisit.count({
        where: { userId },
      }),
      // 活动次数
      this.prisma.userActivity.count({
        where: { userId },
      }),
      // 总咨询耗时
      this.prisma.consultRecord.aggregate({
        where: { userId, status: 'completed' },
        _sum: {
          calcDuration: true,
          llmDuration: true,
        },
      }),
    ]);

    // 获取页面停留时间统计
    const pageStats = await this.prisma.pageVisit.groupBy({
      by: ['pageName'],
      where: { userId },
      _count: { pageName: true },
      _avg: { duration: true },
    });

    return {
      consultCount,
      pageVisitCount,
      activityCount,
      totalCalcDuration: totalConsultDuration._sum.calcDuration || 0,
      totalLlmDuration: totalConsultDuration._sum.llmDuration || 0,
      recentConsults,
      pageStats: pageStats.map((p) => ({
        pageName: p.pageName,
        visitCount: p._count.pageName,
        avgDuration: Math.round(p._avg.duration || 0),
      })),
    };
  }

  /**
   * 获取管理后台统计数据（所有用户）
   * 含 UV（独立访客）+ 今日 UV — 用 $queryRaw 做去重计数
   */
  async getAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 并行查询多个统计数据
    const [
      totalUsers,
      totalPageVisits,
      totalActivities,
      totalConsultRecords,
      todayPageVisits,
      todayActivities,
      todayConsultRecords,
      recentPageVisits,
      recentActivities,
      recentConsultRecords,
      pageStats,
      activityTypes,
      // S1 (2026-07-06): UV 去重计数（登录用户按 user_id，匿名用户按 session_id）
      totalUVRows,
      todayUVRows,
    ] = await Promise.all([
      // 总用户数
      this.prisma.user.count(),
      // 总页面访问
      this.prisma.pageVisit.count(),
      // 总活动数
      this.prisma.userActivity.count(),
      // 总咨询记录
      this.prisma.consultRecord.count(),
      // 今日页面访问
      this.prisma.pageVisit.count({
        where: { createdAt: { gte: today } },
      }),
      // 今日活动
      this.prisma.userActivity.count({
        where: { createdAt: { gte: today } },
      }),
      // 今日咨询
      this.prisma.consultRecord.count({
        where: { createdAt: { gte: today } },
      }),
      // 最近页面访问
      this.prisma.pageVisit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // 最近活动
      this.prisma.userActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // 最近咨询
      this.prisma.consultRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { email: true, nickname: true } } },
      }),
      // 页面统计
      this.prisma.pageVisit.groupBy({
        by: ['pageName'],
        _count: { pageName: true },
      }),
      // 活动类型统计
      this.prisma.userActivity.groupBy({
        by: ['activityType'],
        _count: { activityType: true },
      }),
      // 总 UV：user_id 不为空按 user_id 去重 + user_id 为空按 session_id 去重
      this.prisma.$queryRaw<{ uv: number }[]>`
        SELECT COUNT(*) as uv FROM (
          SELECT user_id FROM page_visit WHERE user_id IS NOT NULL GROUP BY user_id
          UNION
          SELECT session_id FROM page_visit WHERE user_id IS NULL AND session_id IS NOT NULL GROUP BY session_id
        ) AS distinct_users
      `,
      // 今日 UV
      this.prisma.$queryRaw<{ uv: number }[]>`
        SELECT COUNT(*) as uv FROM (
          SELECT user_id FROM page_visit WHERE user_id IS NOT NULL AND created_at >= ${today} GROUP BY user_id
          UNION
          SELECT session_id FROM page_visit WHERE user_id IS NULL AND session_id IS NOT NULL AND created_at >= ${today} GROUP BY session_id
        ) AS distinct_users_today
      `,
    ]);

    const totalUV = Number(totalUVRows?.[0]?.uv ?? 0);
    const todayUV = Number(todayUVRows?.[0]?.uv ?? 0);

    return {
      overview: {
        totalUsers,
        totalPageVisits,
        totalActivities,
        totalConsultRecords,
        todayPageVisits,
        todayActivities,
        todayConsultRecords,
        // S1 (2026-07-06): UV 字段
        totalUV,
        todayUV,
      },
      pageStats: pageStats.map((p) => ({
        pageName: p.pageName,
        count: p._count.pageName,
      })),
      activityTypes: activityTypes.map((a) => ({
        activityType: a.activityType,
        count: a._count.activityType,
      })),
      recentPageVisits: recentPageVisits.map((v) => ({
        id: v.id,
        pageName: v.pageName,
        pageUrl: v.pageUrl,
        referrer: v.referrer,
        deviceInfo: v.deviceInfo,
        screenSize: v.screenSize,
        createdAt: v.createdAt.toISOString(),
      })),
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        activityType: a.activityType,
        activityData: a.activityData,
        createdAt: a.createdAt.toISOString(),
      })),
      recentConsultRecords: recentConsultRecords.map((r) => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.user?.email,
        userNickname: r.user?.nickname,
        question: r.question,
        routeType: r.routeType,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * S2 (2026-07-06): 漏斗统计 — 按 activityType 分组，同时统计 PV 和 UV
   * UV = distinct userId（登录）+ distinct sessionId（匿名）
   * 转化率 = 当前步骤 PV / 第一步 PV
   */
  async getFunnelStats() {
    // 用 $queryRaw 一次拿到每个 activityType 的 PV + UV
    const rows = await this.prisma.$queryRaw<
      { activity_type: string; pv: number; uv: number }[]
    >`
      SELECT
        activity_type,
        COUNT(*) as pv,
        COUNT(DISTINCT user_id) + COUNT(DISTINCT CASE WHEN user_id IS NULL THEN session_id END) as uv
      FROM user_activity
      GROUP BY activity_type
      ORDER BY pv DESC
    `;

    const total = rows.reduce((sum, r) => sum + Number(r.pv), 0);
    const firstStepPv = rows[0] ? Number(rows[0].pv) : 0;

    return {
      totalEvents: total,
      steps: rows.map((r, idx) => ({
        activityType: r.activity_type,
        pv: Number(r.pv),
        uv: Number(r.uv),
        // 第一步转化率 100%；其余相对于第一步的 PV
        conversionRate: firstStepPv > 0 ? Number((Number(r.pv) / firstStepPv * 100).toFixed(2)) : 0,
        stepIndex: idx + 1,
      })),
    };
  }

  /**
   * S4 (2026-07-06): 趋势统计 — 按天返回 PV + UV
   * UV = 登录用户按 user_id 去重 + 匿名用户按 session_id 去重（UNION）
   */
  async getTrendStats(days = 7) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const rows = await this.prisma.$queryRaw<
      { date: string; pv: number; uv: number }[]
    >`
      SELECT
        date(created_at) as date,
        COUNT(*) as pv,
        COUNT(DISTINCT user_id) + COUNT(DISTINCT CASE WHEN user_id IS NULL THEN session_id END) as uv
      FROM page_visit
      WHERE created_at >= ${startDate}
      GROUP BY date(created_at)
      ORDER BY date ASC
    `;

    // 补齐缺失日期（避免图表断点）
    const dateMap = new Map<string, { date: string; pv: number; uv: number }>();
    rows.forEach((r) => {
      dateMap.set(r.date, { date: r.date, pv: Number(r.pv), uv: Number(r.uv) });
    });

    const result: { date: string; pv: number; uv: number }[] = [];
    const cursor = new Date(startDate);
    for (let i = 0; i < days; i++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      result.push(dateMap.get(dateStr) || { date: dateStr, pv: 0, uv: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return { days, data: result };
  }

  /**
   * S4 (2026-07-06): 复玩统计 — 访问次数 ≥ 2 的用户数 + 占比
   */
  async getRetentionStats() {
    const totalUsersRow = await this.prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*) as cnt FROM (
        SELECT user_id FROM page_visit WHERE user_id IS NOT NULL GROUP BY user_id
        UNION
        SELECT session_id FROM page_visit WHERE user_id IS NULL AND session_id IS NOT NULL GROUP BY session_id
      ) AS d
    `;
    const totalUsers = Number(totalUsersRow?.[0]?.cnt ?? 0);

    // 复玩用户 = 同一 user_id 或 session_id 出现 ≥ 2 次
    const returningRows = await this.prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*) as cnt FROM (
        SELECT user_id FROM page_visit WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) >= 2
        UNION
        SELECT session_id FROM page_visit WHERE user_id IS NULL AND session_id IS NOT NULL GROUP BY session_id HAVING COUNT(*) >= 2
      ) AS r
    `;
    const returningUsers = Number(returningRows?.[0]?.cnt ?? 0);

    const retentionRate = totalUsers > 0 ? Number((returningUsers / totalUsers * 100).toFixed(2)) : 0;

    return {
      totalUsers,
      returningUsers,
      newUsers: totalUsers - returningUsers,
      retentionRate,
    };
  }

  /**
   * Phase 9: CEO 周经营看板 — 12 个指标聚合
   * 口径来源：docs/01商业计划/CEO季度目标与经营看板-2026-06-24.md §5
   * 数据源缺失时返回 value=null + availability='unavailable'，不以 0 冒充健康
   */
  async getOperatingDashboard(days = 7) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const [
      consultRecords,
      namingResults,
      memberships,
      creditLedgers,
      generationRuns,
      pageVisits,
      userActivities,
    ] = await Promise.all([
      this.prisma.consultRecord.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          userId: true,
          anonymousId: true,
          sessionId: true,
          sourceEntry: true,
          routeType: true,
          status: true,
        },
      }),
      this.prisma.namingResult.findMany({
        where: { createdAt: { gte: startDate } },
        select: { userId: true, consultRecordId: true },
      }),
      this.prisma.membership.findMany({
        where: { createdAt: { gte: startDate } },
        select: { userId: true },
      }),
      this.prisma.creditLedger.findMany({
        where: { createdAt: { gte: startDate } },
        select: { userId: true },
      }),
      this.prisma.generationRun.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          moduleId: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          qualityScore: true,
        },
      }),
      this.prisma.pageVisit.findMany({
        where: { createdAt: { gte: startDate } },
        select: { userId: true, sessionId: true, pageName: true, pageUrl: true },
      }),
      this.prisma.userActivity.findMany({
        where: {
          createdAt: { gte: startDate },
          activityType: { in: ['api_request_metrics', 'frontend_error'] },
        },
        select: { activityType: true, activityData: true },
      }),
    ]);

    // 1. 周活跃咨询用户数 = distinct(userId) from consultRecord + distinct(userId) from namingResult
    const consultUserIds = new Set<string>();
    for (const r of consultRecords) {
      if (r.userId) consultUserIds.add(r.userId);
    }
    for (const n of namingResults) {
      if (n.userId) consultUserIds.add(n.userId);
    }
    const weeklyActiveConsultUsers = consultUserIds.size;

    // 2. 首问完成用户数 = distinct(userId) from consultRecord where sourceEntry='question' and status='completed'
    const questionCompletedUsers = new Set<string>();
    for (const r of consultRecords) {
      if (r.sourceEntry === 'question' && r.status === 'completed' && r.userId) {
        questionCompletedUsers.add(r.userId);
      }
    }

    // 3. 深推付费用户数 = distinct(userId) from creditLedger
    const deepDivePaidUsers = new Set<string>();
    for (const c of creditLedgers) {
      if (c.userId) deepDivePaidUsers.add(c.userId);
    }

    // 4. 会员新增数 = membership count
    const membershipNewCount = memberships.length;

    // 5. K线成功率 = sourceEntry='kline' completed/total * 100
    const klineRecords = consultRecords.filter((r) => r.sourceEntry === 'kline');
    const klineCompleted = klineRecords.filter((r) => r.status === 'completed').length;
    const klineSuccessRate =
      klineRecords.length > 0
        ? Number(((klineCompleted / klineRecords.length) * 100).toFixed(2))
        : null;

    // 6. 问事首问完成率 = sourceEntry='question' completed/total * 100
    const questionRecords = consultRecords.filter((r) => r.sourceEntry === 'question');
    const questionCompletedCount = questionRecords.filter((r) => r.status === 'completed').length;
    const questionCompletionRate =
      questionRecords.length > 0
        ? Number(((questionCompletedCount / questionRecords.length) * 100).toFixed(2))
        : null;

    // 7. 取名完成率 = sourceEntry='naming' completed/total * 100
    const namingRecords = consultRecords.filter((r) => r.sourceEntry === 'naming');
    const namingCompleted = namingRecords.filter((r) => r.status === 'completed').length;
    const namingCompletionRate =
      namingRecords.length > 0
        ? Number(((namingCompleted / namingRecords.length) * 100).toFixed(2))
        : null;

    // 8. 历史重开率 = HistoryPage distinct users / weeklyActiveConsultUsers * 100
    const historyUsers = new Set<string>();
    for (const p of pageVisits) {
      if (p.pageName === 'HistoryPage' && p.userId) historyUsers.add(p.userId);
    }
    const historyReopenRate =
      weeklyActiveConsultUsers > 0
        ? Number(((historyUsers.size / weeklyActiveConsultUsers) * 100).toFixed(2))
        : null;

    // 9. API 4xx/5xx 比例 = 从 userActivity api_request_metrics 聚合
    let apiNumerator = 0;
    let apiDenominator = 0;
    let apiMeasured = false;
    for (const a of userActivities) {
      if (a.activityType === 'api_request_metrics') {
        try {
          const data = JSON.parse(a.activityData || '{}');
          if (typeof data.total === 'number' && data.total > 0) {
            apiNumerator += (data.clientErrors || 0) + (data.serverErrors || 0);
            apiDenominator += data.total;
            apiMeasured = true;
          }
        } catch {
          /* ignore malformed payload */
        }
      }
    }
    const apiErrorRateValue =
      apiMeasured && apiDenominator > 0
        ? Number(((apiNumerator / apiDenominator) * 100).toFixed(2))
        : null;

    // 10. 深推超时率 = generationRun moduleId='breakthrough' failed_retryable/total * 100
    const breakthroughRuns = generationRuns.filter((g) => g.moduleId === 'breakthrough');
    const breakthroughTimeouts = breakthroughRuns.filter(
      (g) => g.status === 'failed_retryable',
    ).length;
    const deepDiveTimeoutRate =
      breakthroughRuns.length > 0
        ? Number(((breakthroughTimeouts / breakthroughRuns.length) * 100).toFixed(2))
        : null;

    // 11. LLM 异常输出率 = generationRun status !== 'completed' / total * 100
    const llmTotal = generationRuns.length;
    const llmAbnormal = generationRuns.filter((g) => g.status !== 'completed').length;
    const llmAbnormalOutputRate =
      llmTotal > 0 ? Number(((llmAbnormal / llmTotal) * 100).toFixed(2)) : null;

    // 12. 关键页面白屏/资源错误次数 = 从 userActivity frontend_error 聚合
    let frontendErrorCount = 0;
    let frontendMeasured = false;
    for (const a of userActivities) {
      if (a.activityType === 'frontend_error') {
        frontendMeasured = true;
        try {
          const data = JSON.parse(a.activityData || '{}');
          frontendErrorCount += data.criticalCount || data.count || 1;
        } catch {
          frontendErrorCount += 1;
        }
      }
    }
    const criticalFrontendErrorCount = frontendMeasured ? frontendErrorCount : null;

    const metrics = [
      {
        key: 'weekly_active_consult_users',
        value: weeklyActiveConsultUsers,
        availability: 'measured' as const,
      },
      {
        key: 'question_completed_users',
        value: questionCompletedUsers.size,
        availability: 'measured' as const,
      },
      {
        key: 'deep_dive_paid_users',
        value: deepDivePaidUsers.size,
        availability: 'measured' as const,
      },
      {
        key: 'membership_new_count',
        value: membershipNewCount,
        availability: 'measured' as const,
      },
      {
        key: 'kline_success_rate',
        value: klineSuccessRate,
        availability: (klineSuccessRate === null ? 'unavailable' : 'measured') as 'measured' | 'unavailable',
      },
      {
        key: 'question_completion_rate',
        value: questionCompletionRate,
        availability: (questionCompletionRate === null ? 'unavailable' : 'measured') as 'measured' | 'unavailable',
      },
      {
        key: 'naming_completion_rate',
        value: namingCompletionRate,
        availability: (namingCompletionRate === null ? 'unavailable' : 'measured') as 'measured' | 'unavailable',
      },
      {
        key: 'history_reopen_rate',
        value: historyReopenRate,
        availability: (historyReopenRate === null ? 'unavailable' : 'measured') as 'measured' | 'unavailable',
      },
      {
        key: 'api_error_rate',
        value: apiErrorRateValue,
        numerator: apiNumerator,
        denominator: apiDenominator,
        availability: (apiMeasured ? 'measured' : 'unavailable') as 'measured' | 'unavailable',
      },
      {
        key: 'deep_dive_timeout_rate',
        value: deepDiveTimeoutRate,
        availability: (deepDiveTimeoutRate === null ? 'unavailable' : 'measured') as 'measured' | 'unavailable',
      },
      {
        key: 'llm_abnormal_output_rate',
        value: llmAbnormalOutputRate,
        availability: (llmAbnormalOutputRate === null ? 'unavailable' : 'measured') as 'measured' | 'unavailable',
      },
      {
        key: 'critical_frontend_error_count',
        value: criticalFrontendErrorCount,
        availability: (frontendMeasured ? 'measured' : 'unavailable') as 'measured' | 'unavailable',
      },
    ];

    return {
      days,
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 解析 User-Agent
   */
  private parseUserAgent(userAgent?: string): {
    device: string;
    browser: string;
    os: string;
  } {
    if (!userAgent) {
      return { device: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    let device = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      device = /iPad/i.test(userAgent) ? 'Tablet' : 'Mobile';
    }

    if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';

    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS';

    return { device, browser, os };
  }
}
