export interface FortuneAspect {
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  advice: string;
}

export interface DailyFortune {
  date: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  lucky_numbers: number[];
  lucky_colors: string[];
  advice: string[];
  auspicious_hours: string[];
  warnings: string[];
}

export interface MonthlyFortune {
  year: number;
  month: number;
  month_name: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  lucky_days: number[];
  advice: string[];
  warnings: string[];
}

export interface YearlyFortune {
  year: number;
  gan_zhi: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  key_moments: Array<{ month: number; description: string }>;
  crisis_periods: Array<{ start_month: number; end_month: number; description: string }>;
  opportunities: Array<{ month: number; type: string; description: string }>;
  best_months: number[];
  worst_months: number[];
  zodiac_compatibility: Array<{ zodiac: string; score: number }>;
  advice: string[];
}

export interface CelebrityCase {
  id: string;
  name: string;
  name_cn: string;
  category: string;
  category_cn: string;
  birth_date: string;
  birth_location: { city: string; lat: number; lng: number };
  description: string;
  tags: string[];
  year_pillar: string;
  month_pillar: string;
  day_pillar: string;
  hour_pillar: string;
  scores?: CelebrityScores;
}

export interface CelebrityScores {
  overall: number;
  personality: number;
  career: number;
  wealth: number;
  marriage: number;
  health: number;
}

export interface BaziSimilarity {
  overall_score: number;
  year_pillar_score: number;
  month_pillar_score: number;
  day_pillar_score: number;
  hour_pillar_score: number;
  wuxing_balance_score: number;
  day_master_relation: string;
  insights: string[];
}

export interface MAData {
  ma5: (number | null)[];
  ma10: (number | null)[];
  trend_status: Array<{
    status: 'bullish' | 'bearish' | 'neutral';
    signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  }>;
  cross_points: Array<{
    index: number;
    type: 'golden_cross' | 'death_cross';
    age: number;
    year: number;
  }>;
}
