// API服务

import type { UserBazi, HighlightDay } from '../lib/bazi-engine';

interface DecisionAnalysisRequest {
  birthInfo: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    isLunar: boolean;
    gender: 'male' | 'female';
  };
  userQuestion?: string;
}

interface DecisionAnalysisResponse {
  userBazi: UserBazi;
  highlightDays: HighlightDay[];
  fourAspects: {
    career: number;
    wealth: number;
    noble: number;
    romance: number;
  };
  aiAnswer: string;
}

// API基础URL
const API_BASE_URL = 'http://localhost:3000';

/**
 * 调用决策分析API
 */
export async function getDecisionAnalysis(
  birthInfo: DecisionAnalysisRequest['birthInfo'],
  userQuestion?: string
): Promise<DecisionAnalysisResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/decision-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        birthInfo,
        userQuestion,
      }),
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('决策分析API调用失败:', error);
    throw error;
  }
}

/**
 * 检查API健康状态
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('API健康检查失败:', error);
    return false;
  }
}

/**
 * 获取API基础URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
