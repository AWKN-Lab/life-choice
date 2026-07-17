import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RouteDecision, RouteType } from './types';

/**
 * P2.2: 加权关键词路由
 *
 * 权重说明:
 * - 5: 强信号 — 几乎可以确定路由（如"奇门遁甲""紫微斗数""取名"）
 * - 4: 强上下文 — 特定问题模式（如"能不能""摇卦""星盘"）
 * - 3: 中等信号 — 有意义但不唯一（如"今年运势""跳槽""择日"）
 * - 2: 弱信号 — 通用词（如"方位""出行""运势"）
 * - 1: 极弱信号 — 可能指多种事（如"趋势""整体""竞争"）
 *
 * 路由规则:
 * 1. 按加权得分降序排列所有路由
 * 2. 如果最高分 ≥ CLARIFY_THRESHOLD 且领先第二名 ≥ CLOSE_GAP_RATIO，直接路由
 * 3. 否则询问用户澄清
 * 4. 模糊情绪词（vague）单独处理：高分时触发澄清而非路由
 * 5. 所有路由都没有匹配时，默认走 ziping（八字）
 */

interface WeightedKeyword {
  keyword: string;
  weight: number;
}

type RouteKey = 'event' | 'trend' | 'vague' | 'qimen' | 'liuyao' | 'ziwei' | 'quming' | 'meihua';

const ROUTE_TABLE: Record<RouteKey, WeightedKeyword[]> = {
  event: [
    // 决策类问题 — 具体事件
    { keyword: '能不能', weight: 4 }, { keyword: '要不要', weight: 4 },
    { keyword: '会不会', weight: 4 }, { keyword: '可不可以', weight: 4 },
    { keyword: '适不适合', weight: 4 },
    { keyword: '合作', weight: 3 }, { keyword: '签约', weight: 3 },
    { keyword: '谈判', weight: 3 }, { keyword: '见面', weight: 3 },
    { keyword: '辞职', weight: 4 }, { keyword: '跳槽', weight: 3 },
    { keyword: '入职', weight: 3 },
    { keyword: '投资', weight: 4 }, { keyword: '买房', weight: 4 },
    { keyword: '买车', weight: 3 }, { keyword: '开店', weight: 3 },
    { keyword: '创业', weight: 3 },
    { keyword: '分手', weight: 4 }, { keyword: '复合', weight: 4 },
    { keyword: '官司', weight: 4 }, { keyword: '纠纷', weight: 3 },
    { keyword: '推广', weight: 2 }, { keyword: '上线', weight: 2 },
    { keyword: '发布', weight: 2 }, { keyword: '开盘', weight: 3 },
  ],
  trend: [
    // 运势趋势类 — 整体走向
    { keyword: '今年运势', weight: 5 }, { keyword: '明年运势', weight: 5 },
    { keyword: '整体运势', weight: 5 },
    { keyword: '今年怎么样', weight: 4 }, { keyword: '明年怎么样', weight: 4 },
    { keyword: '事业运', weight: 4 }, { keyword: '财运', weight: 4 },
    { keyword: '感情运', weight: 4 }, { keyword: '健康运', weight: 4 },
    { keyword: '学业运', weight: 4 },
    { keyword: '今年', weight: 2 }, { keyword: '明年', weight: 2 },
    { keyword: '本周', weight: 2 }, { keyword: '本月', weight: 2 },
    { keyword: '本年', weight: 2 },
    { keyword: '运势', weight: 2 }, { keyword: '节律', weight: 2 },
    { keyword: '整体', weight: 1 }, { keyword: '趋势', weight: 1 },
    { keyword: '走向', weight: 1 },
  ],
  vague: [
    // 模糊情绪词 — 触发澄清
    { keyword: '不知道该怎么办', weight: 5 }, { keyword: '不知道该怎么做', weight: 5 },
    { keyword: '该怎么办', weight: 4 }, { keyword: '怎么办才好', weight: 4 },
    { keyword: '不知所措', weight: 4 },
    { keyword: '迷茫', weight: 3 }, { keyword: '怎么办', weight: 3 },
    { keyword: '很乱', weight: 3 }, { keyword: '很烦躁', weight: 3 },
    { keyword: '很焦虑', weight: 3 }, { keyword: '很困惑', weight: 3 },
    { keyword: '不知道', weight: 2 }, { keyword: '没方向', weight: 3 },
    { keyword: '没目标', weight: 2 },
  ],
  qimen: [
    // 奇门遁甲类 — 时空决策
    { keyword: '奇门遁甲', weight: 5 }, { keyword: '奇门', weight: 5 },
    { keyword: '遁甲', weight: 5 },
    { keyword: '择日', weight: 4 }, { keyword: '择时', weight: 4 },
    { keyword: '出行吉凶', weight: 4 },
    { keyword: '出行', weight: 3 }, { keyword: '搬家', weight: 3 },
    { keyword: '开业', weight: 3 }, { keyword: '面试', weight: 3 },
    { keyword: '考试', weight: 3 },
    { keyword: '方位', weight: 2 }, { keyword: '打仗', weight: 2 },
    { keyword: '比赛', weight: 2 }, { keyword: '竞争', weight: 1 },
  ],
  liuyao: [
    // 六爻类 — 一事一断
    { keyword: '六爻', weight: 5 }, { keyword: '一事一断', weight: 5 },
    { keyword: '摇卦', weight: 4 }, { keyword: '摇一卦', weight: 4 }, { keyword: '起卦', weight: 4 },
    { keyword: '卜卦', weight: 4 }, { keyword: '占卦', weight: 4 },
    { keyword: '算卦', weight: 4 },
    { keyword: '铜钱', weight: 3 }, { keyword: '硬币', weight: 3 },
    { keyword: '卦象', weight: 3 }, { keyword: '本卦', weight: 3 },
    { keyword: '变卦', weight: 3 }, { keyword: '问事', weight: 3 },
  ],
  ziwei: [
    // 紫微斗数类
    { keyword: '紫微斗数', weight: 5 }, { keyword: '紫微', weight: 5 },
    { keyword: '斗数', weight: 5 }, { keyword: '紫微星', weight: 5 },
    { keyword: '天府星', weight: 5 },
    { keyword: '星盘', weight: 4 }, { keyword: '命盘', weight: 4 },
    { keyword: '命宫', weight: 4 }, { keyword: '四化', weight: 4 },
    { keyword: '大限', weight: 3 }, { keyword: '流年', weight: 3 },
    { keyword: '星耀', weight: 3 }, { keyword: '宫位', weight: 3 },
  ],
  quming: [
    // 取名类
    { keyword: '宝宝取名', weight: 5 }, { keyword: '公司取名', weight: 5 },
    { keyword: '品牌取名', weight: 5 }, { keyword: '起名字', weight: 5 },
    { keyword: '取名字', weight: 5 },
    { keyword: '取名', weight: 5 }, { keyword: '起名', weight: 5 },
    { keyword: '改名', weight: 5 }, { keyword: '命名', weight: 4 },
    { keyword: '名字', weight: 4 },
  ],
  meihua: [
    // U-P2-1: 梅花易数类 — 感情/关系体用生克
    { keyword: '梅花易数', weight: 5 }, { keyword: '梅花', weight: 5 },
    { keyword: '体用', weight: 4 },
    { keyword: '感情要不要继续', weight: 5 }, { keyword: '该不该分', weight: 5 },
    { keyword: '寒了', weight: 4 }, { keyword: '累了', weight: 3 },
    { keyword: '不爱了', weight: 4 }, { keyword: '还爱不爱', weight: 4 },
    { keyword: '关系还能不能', weight: 4 },
  ],
};

/** 路由得分达到此阈值才直接路由，否则要求澄清 */
const CLARIFY_THRESHOLD = 4;
/** 如果最高分和第二名的差距小于此比例，要求澄清 */
const CLOSE_GAP_RATIO = 0.5;

interface ScoredRoute {
  routeKey: RouteKey;
  score: number;
  matchedKeywords: string[];
}

@Injectable()
export class RouterService {
  constructor(private readonly prisma: PrismaService) {}

  async route(question: string): Promise<RouteDecision> {
    const normalizedQuestion = question.toLowerCase().trim();

    // 计算所有路由的加权得分
    const scored: ScoredRoute[] = (Object.keys(ROUTE_TABLE) as RouteKey[]).map(routeKey => {
      const { score, matched } = this.calculateWeightedScore(
        normalizedQuestion,
        ROUTE_TABLE[routeKey],
      );
      return { routeKey, score, matchedKeywords: matched };
    });

    // 按得分降序排列
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];

    // 模糊情绪词特殊处理：vague 得分高时触发澄清
    const vagueEntry = scored.find(s => s.routeKey === 'vague');
    if (vagueEntry && vagueEntry.score >= 4) {
      // vague 得分最高 或 与最高分差距不大 → 澄清
      if (vagueEntry === top || vagueEntry.score >= top.score * 0.7) {
        return this.createClarifyDecision();
      }
    }

    // 所有路由都没匹配 → 默认 ziping
    if (top.score === 0) {
      return this.createZipingDecision();
    }

    // 最高分低于阈值 → 信号太弱，要求澄清
    if (top.score < CLARIFY_THRESHOLD) {
      return this.createClarifyDecision();
    }

    // 最高分和第二名的差距不够大 → 歧义，要求澄清
    if (second.score > 0) {
      const gap = top.score - second.score;
      if (gap < top.score * CLOSE_GAP_RATIO) {
        return this.createClarifyDecision();
      }
    }

    // 确定路由
    return this.createDecisionForRoute(top.routeKey);
  }

  /**
   * 加权得分计算
   * 对文本匹配关键词的权重求和（长关键词优先匹配，避免子串重复计数）
   */
  private calculateWeightedScore(
    text: string,
    keywords: WeightedKeyword[],
  ): { score: number; matched: string[] } {
    let score = 0;
    const matched: string[] = [];
    const consumed = new Set<number>(); // 已消费的字符位置

    // 按关键词长度降序排列，优先匹配长关键词
    const sorted = [...keywords].sort((a, b) => b.keyword.length - a.keyword.length);

    for (const { keyword, weight } of sorted) {
      const idx = text.indexOf(keyword);
      if (idx === -1) continue;

      // 检查是否与已匹配的关键词位置重叠
      const range = Array.from({ length: keyword.length }, (_, i) => idx + i);
      const overlaps = range.some(pos => consumed.has(pos));
      if (overlaps) continue;

      // 标记消费
      range.forEach(pos => consumed.add(pos));
      score += weight;
      matched.push(keyword);
    }

    return { score, matched };
  }

  private createDecisionForRoute(routeKey: RouteKey): RouteDecision {
    switch (routeKey) {
      case 'event': return this.createLiurenDecision();
      case 'trend': return this.createZipingDecision();
      case 'qimen': return this.createQimenDecision();
      case 'liuyao': return this.createLiuyaoDecision();
      case 'ziwei': return this.createZiweiDecision();
      case 'quming': return this.createQumingDecision();
      case 'meihua': return this.createMeihuaDecision();
      case 'vague': return this.createClarifyDecision();
      default: return this.createZipingDecision();
    }
  }

  // ── Decision factories ──

  private createLiurenDecision(): RouteDecision {
    return {
      routeType: 'liuren',
      needClarify: false,
      requiredFields: ['askTime', 'askLocation'],
      nextStep: 'submit_info',
    };
  }

  private createZipingDecision(): RouteDecision {
    return {
      routeType: 'ziping',
      needClarify: false,
      requiredFields: ['birthDate', 'birthTime', 'birthPlace', 'gender'],
      nextStep: 'submit_info',
    };
  }

  private createClarifyDecision(): RouteDecision {
    return {
      routeType: 'clarify',
      needClarify: true,
      requiredFields: [],
      clarifyingQuestion: '您是想了解一件具体的事情，还是想看整体的运势趋势？',
      nextStep: 'clarify',
    };
  }

  private createQimenDecision(): RouteDecision {
    return {
      routeType: 'qimen',
      needClarify: false,
      requiredFields: ['askTime'],
      nextStep: 'submit_info',
    };
  }

  private createLiuyaoDecision(): RouteDecision {
    return {
      routeType: 'liuyao',
      needClarify: false,
      requiredFields: ['askTime', 'hexagramCode', 'changingLines'],
      nextStep: 'submit_info',
    };
  }

  private createZiweiDecision(): RouteDecision {
    return {
      routeType: 'ziwei',
      needClarify: false,
      requiredFields: ['birthDate', 'birthTime', 'gender'],
      nextStep: 'submit_info',
    };
  }

  private createQumingDecision(): RouteDecision {
    return {
      routeType: 'quming',
      needClarify: false,
      requiredFields: ['birthDate', 'birthTime', 'gender'],
      nextStep: 'submit_info',
    };
  }

  // U-P2-1: 梅花易数路由决策
  private createMeihuaDecision(): RouteDecision {
    return {
      routeType: 'meihua',
      needClarify: false,
      requiredFields: ['askTime'],
      nextStep: 'submit_info',
    };
  }

  async generateClarifyQuestion(originalQuestion: string): Promise<string> {
    return '您的问题比较模糊，为了给您更准确的建议，请告诉我：\n1. 您是想看一件具体的事，还是想了解整体运势？\n2. 如果是具体事，是关于哪个方面的？（如：事业、感情、财运、健康）';
  }
}
