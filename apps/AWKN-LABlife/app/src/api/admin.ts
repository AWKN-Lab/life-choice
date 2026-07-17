/**
 * 管理后台 API
 */
import { apiClient } from '@/api/client';

export interface PageVisitStats {
  totalVisits: number;
  todayVisits: number;
  uniquePages: string[];
  recentVisits: Array<{
    id: string;
    pageName: string;
    pageUrl: string;
    referrer: string;
    deviceInfo: string;
    screenSize: string;
    createdAt: string;
  }>;
}

export interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  activityTypes: Record<string, number>;
  recentActivities: Array<{
    id: string;
    activityType: string;
    activityData: string;
    createdAt: string;
  }>;
}

export interface ConsultStats {
  totalRecords: number;
  todayRecords: number;
  recentRecords: Array<{
    id: string;
    userId: string | null;
    question: string;
    routeType: string;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminStats {
  pageVisits: PageVisitStats;
  activities: ActivityStats;
  consultRecords: ConsultStats;
}

/**
 * 获取管理后台统计数据
 */
export async function getAdminStats(): Promise<AdminStats> {
  return apiClient.get<AdminStats>('/analytics/admin/stats');
}
