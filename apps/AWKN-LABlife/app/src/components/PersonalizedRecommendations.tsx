import { useState, useEffect } from 'react';
import { consultApi } from '../api/consult';
import { useAuthStore } from '../store/authStore';

interface RecommendationItem {
  key: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

const DEFAULT_RECOMMENDATIONS: RecommendationItem[] = [
  {
    key: 'kline',
    title: '命运K线',
    description: '查看你的人生运势曲线',
    icon: '📈',
    route: '/?entry=kline', // entry → HomePage.tsx
  },
];

const ENTRY_RECOMMENDATIONS: Record<string, RecommendationItem> = {
  kline: {
    key: 'kline',
    title: '命运K线',
    description: '基于你的生辰，解读人生运势走向',
    icon: '📈',
    route: '/?entry=kline', // entry → HomePage.tsx
  },
  naming: {
    key: 'naming',
    title: '姓名分析',
    description: '解析姓名中的命理密码',
    icon: '✍️',
    route: '/?entry=naming', // entry → HomePage.tsx
  },
  question: {
    key: 'question',
    title: '问事占卜',
    description: '针对具体问题，给出决策建议',
    icon: '🔮',
    route: '/?entry=question', // entry → HomePage.tsx
  },
};

export default function PersonalizedRecommendations() {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    consultApi.getUserInsights()
      .then((data) => {
        setInsights(data);
      })
      .catch(() => {
        setInsights(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
        <div className="h-4 w-24 bg-purple-200/50 rounded animate-pulse mb-2" />
        <div className="h-3 w-40 bg-purple-200/30 rounded animate-pulse" />
      </div>
    );
  }

  const recommendations: RecommendationItem[] = [];

  if (insights?.topEntry && ENTRY_RECOMMENDATIONS[insights.topEntry]) {
    recommendations.push(ENTRY_RECOMMENDATIONS[insights.topEntry]);
  }

  if (insights?.preferredRouteType && insights.preferredRouteType !== insights.topEntry) {
    const routeEntry = Object.values(ENTRY_RECOMMENDATIONS).find(
      (r) => r.key === insights.preferredRouteType
    );
    if (routeEntry) recommendations.push(routeEntry);
  }

  if (recommendations.length === 0) {
    recommendations.push(...DEFAULT_RECOMMENDATIONS);
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-sm font-medium text-purple-700">✨ 为您推荐</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recommendations.map((rec) => (
          <a
            key={rec.key}
            href={rec.route}
            className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">{rec.icon}</span>
            <div>
              <div className="text-sm font-medium text-gray-800">{rec.title}</div>
              <div className="text-xs text-gray-500">{rec.description}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
