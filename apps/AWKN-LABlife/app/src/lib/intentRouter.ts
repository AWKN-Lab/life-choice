/**
 * AI意图分流器
 * 核心逻辑：分析用户问题 → 判断意图类型 → 路由到对应引擎
 *
 * 路由规则：
 * - 断事类问题（能不能/会不会/要不要/何时）→ liuren断事推演
 * - 取名类问题（名字/起名/取名）→ quming八字取名
 * - 运势类问题（今年/运势/事业/感情/未来）→ ziping东方命理 或 zhangshengK线
 * - 六爻类问题（占卦/摇卦）→ liuyao六爻
 * - 奇门类问题（方位/布局/开店/搬家）→ qimen奇门遁甲
 */

import type { RouteType } from '@/types/api';

export type UserIntentType = 'career' | 'finance' | 'love' | 'cooperation' | 'travel' | 'decision' | 'other';

const USER_INTENT_KEYWORDS: Record<UserIntentType, string[]> = {
  career: ['工作', '事业', '升职', '跳槽', '创业', '职场', '转行', '面试', '晋升', '换工作', '离职', '入职', '辞职', 'career', 'job', 'promotion'],
  finance: ['投资', '理财', '财务', '赚钱', '股票', '基金', '买房', '贷款', '债务', '财运', '进账', '破财', 'finance', 'invest', 'stock', 'money'],
  love: ['感情', '恋爱', '婚姻', '分手', '复合', '相亲', '结婚', '离婚', '暗恋', '表白', '出轨', '姻缘', '桃花', 'love', 'marriage', 'relationship'],
  cooperation: ['合作', '合伙', '签约', '合同', '团队', '股东', '投资方', 'cooperation', 'partner', 'contract', 'team'],
  travel: ['出行', '搬家', '旅游', '出差', '出国', '移民', 'travel', 'move', 'relocate'],
  decision: ['选择', '决定', '要不要', '该不该', '纠结', '两难', '取舍', '还是', '能不能', '会不会', 'should', 'decide', 'choose'],
  other: []
};

export function detectUserIntent(question: string): UserIntentType {
  const lowerQuestion = question.toLowerCase();
  let bestIntent: UserIntentType = 'other';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(USER_INTENT_KEYWORDS)) {
    if (intent === 'other') continue;
    const matchCount = keywords.filter(kw => lowerQuestion.includes(kw.toLowerCase())).length;
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestIntent = intent as UserIntentType;
    }
  }

  return bestIntent;
}

export const USER_INTENT_ICONS: Record<UserIntentType, string> = {
  career: 'token',
  finance: 'diamond',
  love: 'favorite',
  cooperation: 'handshake',
  travel: 'flight',
  decision: 'gavel',
  other: 'help'
};

export interface RoutingResult {
  route_type: RouteType;
  need_clarify: boolean;
  required_fields: string[];
  next_step: 'info' | 'clarify' | 'result';
  clarify_question?: string;
  confidence: number; // 0-1，置信度
  reasoning?: string; // 判断理由
}

// 关键词配置
const KEYWORD_CONFIGS: Record<RouteType, { keywords: string[]; weight: number }> = {
  liuren: {
    keywords: [
      // 断事核心词
      '能不能', '会不会', '要不要', '会不会', '合适不合适', '能不能做',
      '会不会成', '要不要去', '能不能成', '会不会发生', '会不会遇到',
      '这件事', '这个合作', '这笔交易', '这次', '这个项目',
      '签约', '见面', '谈判', '合作', '投资', '买房', '买车',
      '换工作', '离职', '跳槽', '入职', '辞职',
      '结婚', '表白', '分手', '复合', '出轨',
      '搬家', '出行', '旅游', '出发', '动土',
      '官司', '诉讼', '纠纷', '小人', '贵人',
      '健康', '疾病', '手术', '体检',
      '考试', '面试', '答辩', '考核',
      '财运', '破财', '进账', '赚钱',
      // 英文
      'should', 'can i', 'will it', 'suitable', 'sign', 'meet', 'negotiate',
      'cooperate', 'job', 'quit', 'invest', 'buy', 'marry', 'move', 'travel'
    ],
    weight: 1.0
  },
  ziping: {
    keywords: [
      // 运势核心词
      '运势', '运程', '命理', '命运', '人生', '一生',
      '今年', '明年', '去年', '今年运', '今年整体',
      '事业运', '感情运', '财运', '健康运', '学业运',
      '事业', '工作', 'job', 'career',
      '感情', '姻缘', '桃花', '单身', '恋爱', '婚姻',
      '未来', '今后', '以后', '接下来',
      '格局', '命格', '旺弱', '用神', '喜忌',
      '流年', '大运', '本年', '本运',
      // 趋势类
      '趋势', '走向', '发展', '前景'
    ],
    weight: 0.9
  },
  zhangsheng: {
    keywords: [
      // K线/张盛类
      'k线', 'kline', '人生曲线', '走势图', '节点',
      '波峰', '波谷', '高峰', '低谷', '转折点',
      '人生规划', '阶段规划', '里程碑',
      '何时起飞', '何时转运', '高峰在哪', '低点在哪'
    ],
    weight: 0.8
  },
  quming: {
    keywords: [
      // 取名核心词
      '取名', '起名', '名字', '命名', '姓名的',
      '宝宝名字', '孩子名字', '新生儿', '男宝', '女宝',
      '五行缺', '补五行', '八字缺', '缺什么',
      '名字打分', '名字测试', '名字分析',
      '开店名字', '公司名字', '品牌命名', '产品命名',
      '改名', '换名字', '艺名', '网名',
      'name', 'naming', 'baby name'
    ],
    weight: 1.0
  },
  liuyao: {
    keywords: [
      // 六爻核心词
      '六爻', '摇卦', '铜钱卦', '蓍草卦',
      '占卦', '起卦', '卦象', '卦辞',
      '这个卦', '这卦', '占一卦', '算一卦',
      '变爻', '动爻', '世应', '六亲',
      'yao', 'hexagram', 'divination coins'
    ],
    weight: 1.0
  },
  qimen: {
    keywords: [
      // 奇门核心词
      '奇门', '遁甲', '奇门遁甲',
      '方位', '朝向', '坐向', '朝向',
      '布局', '摆设', '风水布局',
      '开店', '动土', '奠基', '入宅',
      '出行方位', '吉方', '凶方', '宜忌',
      '吉时', '凶时', '最佳时间',
      '选日子', '择日', '黄道日', '黑道日',
      'qi men', 'placement', 'timing'
    ],
    weight: 1.0
  },
  ziwei: {
    keywords: [
      // 紫微核心词
      '紫微', '斗数', '紫微斗数', '星盘', '命盘',
      '紫微星', '天府星', '命宫', '星耀', '星曜',
      '四化', '化禄', '化权', '化科', '化忌',
      '大限', '流年命宫', '十二宫',
      '排盘', '紫微排盘', '紫微命盘',
      'ziwei', 'purple star', 'astrology chart'
    ],
    weight: 1.0
  },
  clarify: {
    keywords: [],
    weight: 0
  }
};

/**
 * 文本相似度匹配（简单版）
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

function isAnnualDestinyQuestion(question: string): boolean {
  const lowerText = question.toLowerCase();
  const timeWords = [
    '今年', '明年', '未来', '接下来', '下半年', '上半年', '本年', '流年', '大运',
    'this year', 'next year', 'future', 'coming year', 'annual', 'yearly',
  ];
  const fortuneWords = [
    '运势', '运程', '走势', '趋势', '发展', '事业', '工作', '职业', '财富', '财运', '收入',
    'career', 'job', 'work', 'wealth', 'finance', 'money', 'fortune', 'trend',
  ];
  const eventDecisionWords = [
    '要不要', '能不能', '会不会', '可不可以', '该不该', '是否应该',
    '这件事', '这次', '这个项目', '这个合作', '这笔交易', '签约', '谈判', '面试',
    'should', 'can i', 'will it', 'this deal', 'this project', 'sign', 'negotiate',
  ];

  const hasTime = timeWords.some((word) => lowerText.includes(word));
  const hasFortuneTopic = fortuneWords.some((word) => lowerText.includes(word));
  const hasEventDecision = eventDecisionWords.some((word) => lowerText.includes(word));

  if (hasTime && hasFortuneTopic && !hasEventDecision) return true;
  if ((lowerText.includes('事业运') || lowerText.includes('财运') || lowerText.includes('财富运')) && !hasEventDecision) return true;
  if ((lowerText.includes('career luck') || lowerText.includes('wealth luck')) && !hasEventDecision) return true;
  return false;
}

/**
 * 计算每个引擎的匹配得分
 * 按关键词匹配次数加权，防止单次通用词（如"健康"）覆盖多次专用词（如"取名"+"
名字"）
 */
function scoreEngines(question: string): Record<RouteType, number> {
  const scores: Partial<Record<RouteType, number>> = {};
  const lowerQuestion = question.toLowerCase();

  for (const [engine, config] of Object.entries(KEYWORD_CONFIGS)) {
    if (engine === 'clarify') continue;
    const matchCount = config.keywords.filter(kw => lowerQuestion.includes(kw.toLowerCase())).length;
    if (matchCount > 0) {
      scores[engine as RouteType] = config.weight * (1 + (matchCount - 1) * 0.1);
    }
  }

  return scores as Record<RouteType, number>;
}

/**
 * 判断是否需要补充信息
 */
function getMissingFields(routeType: RouteType, hasBirthInfo: boolean, hasAskTime: boolean, hasGender: boolean = false): string[] {
  const fields: string[] = [];

  // 断事类(lieren) 需要问事时间
  if (routeType === 'liuren' || routeType === 'liuyao' || routeType === 'qimen') {
    if (!hasAskTime) fields.push('ask_time');
  }

  // 命理类(ziping/zhangsheng/quming/ziwei) 需要出生信息
  if (routeType === 'ziping' || routeType === 'zhangsheng' || routeType === 'quming' || routeType === 'ziwei') {
    if (!hasBirthInfo) {
      fields.push('birth_date');
      fields.push('birth_time');
    }
    if (routeType === 'quming' && !hasGender) {
      fields.push('gender');
    }
  }

  return fields;
}

/**
 * 核心路由函数
 */
export function routeIntent(
  question: string,
  options: {
    hasBirthInfo?: boolean;
    hasAskTime?: boolean;
    hasGender?: boolean;
    hasCity?: boolean;
  } = {}
): RoutingResult {
  const { hasBirthInfo = false, hasAskTime = false, hasGender = false, hasCity = false } = options;

  if (isAnnualDestinyQuestion(question)) {
    const missingFields = getMissingFields('ziping', hasBirthInfo, hasAskTime, hasGender);
    return {
      route_type: 'ziping',
      need_clarify: false,
      required_fields: missingFields,
      next_step: missingFields.length > 0 ? 'info' : 'result',
      confidence: 0.98,
      reasoning: '识别为年度/阶段性事业财富运势，应走东方命理而非断事',
    };
  }

  // 1. 计算各引擎匹配得分
  const scores = scoreEngines(question);

  // 2. 找出最高分
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topEngine = entries[0];
  const topScore = topEngine ? topEngine[1] : 0;

  // 3. 判断是否需要澄清
  // 如果没有任何引擎得分高，返回clarify
  if (topScore === 0) {
    return {
      route_type: 'clarify',
      need_clarify: true,
      required_fields: [],
      next_step: 'clarify',
      clarify_question: '您想了解哪方面呢？可以告诉我：是想问某件事的成败（断事）、看整体运势、还是想给宝宝起名字？',
      confidence: 0,
      reasoning: '未识别到明确意图'
    };
  }

  const routeType = topEngine[0] as RouteType;

  // 4. 检查必要字段
  const missingFields = getMissingFields(routeType, hasBirthInfo, hasAskTime, hasGender);

  // 5. 判断下一步
  if (missingFields.length > 0) {
    return {
      route_type: routeType,
      need_clarify: false,
      required_fields: missingFields,
      next_step: 'info',
      confidence: topScore,
      reasoning: `${routeType}引擎匹配成功（置信度${Math.round(topScore * 100)}%），缺少字段：${missingFields.join(', ')}`
    };
  }

  // 6. 直接生成结果
  return {
    route_type: routeType,
    need_clarify: false,
    required_fields: [],
    next_step: 'result',
    confidence: topScore,
    reasoning: `${routeType}引擎匹配成功（置信度${Math.round(topScore * 100)}%），信息完整`
  };
}

/**
 * 生成澄清问题
 */
export function generateClarifyQuestion(routeType: RouteType, question: string): string {
  const clarifyMap: Record<RouteType, string> = {
    liuren: '您想问的这件事，您想预测什么时间发生的结果呢？',
    ziping: '您想了解哪方面的运势呢？比如事业、感情、财运等。',
    zhangsheng: '您想通过人生K线了解什么阶段的发展呢？',
    quming: '您是想给自己取名还是给宝宝起名呢？',
    liuyao: '您想用六爻占卜什么事呢？',
    qimen: '您想通过奇门看方位还是选日子呢？',
    ziwei: '您想看紫微命盘的整体格局，还是某个具体宫位的运势？',
    clarify: ''
  };

  return clarifyMap[routeType] || '您能具体说说想了解什么吗？';
}

/**
 * 引擎名称映射（中文显示）
 */
export const ENGINE_NAMES: Record<RouteType, string> = {
  liuren: '断事推演',
  ziping: '东方命理',
  zhangsheng: '人生K线',
  quming: '八字取名',
  liuyao: '六爻占卜',
  qimen: '奇门遁甲',
  ziwei: '紫微斗数',
  clarify: '需要澄清'
};

/**
 * 引擎图标映射（lucide图标名）
 */
export const ENGINE_ICONS: Record<RouteType, string> = {
  liuren: 'Compass',
  ziping: 'Eye',
  zhangsheng: 'TrendingUp',
  quming: 'Users',
  liuyao: 'Sparkles',
  qimen: 'MapPin',
  ziwei: 'Stars',
  clarify: 'HelpCircle'
};

/**
 * P1-4: AI 意图路由（调用后端 /consult/route 接口）
 *
 * 调用后端 AI 路由服务，返回更精准的路由结果。
 * 超时或失败时返回 null，由调用方降级到 routeIntent 关键词匹配。
 *
 * @param question 用户问题
 * @param timeoutMs 超时时间（默认 3 秒）
 * @returns AI 路由结果，失败返回 null
 */
export async function routeIntentAI(
  question: string,
  timeoutMs = 3000
): Promise<RoutingResult | null> {
  try {
    const { consultApi } = await import('@/api/consult');
    const response = await Promise.race([
      consultApi.route({ question_text: question }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI route timeout')), timeoutMs)
      ),
    ]);

    // 后端返回的 route_type 映射到 RoutingResult
    const routeType = (response.route_type || 'liuren') as RouteType;
    return {
      route_type: routeType,
      need_clarify: routeType === 'clarify',
      required_fields: response.required_fields || [],
      next_step: routeType === 'clarify' ? 'clarify' : 'info',
      clarify_question: response.clarify_question,
      confidence: response.confidence ?? 0.8,
      reasoning: response.reasoning || 'AI 路由',
    };
  } catch (error) {
    console.warn('[routeIntentAI] AI 路由失败，将降级到关键词匹配:', error);
    return null;
  }
}

/**
 * P1-4: 意图路由（AI 优先 + 关键词降级）
 *
 * 先尝试 AI 路由，失败或超时自动降级到关键词匹配。
 *
 * @param question 用户问题
 * @param options 关键词路由选项（hasBirthInfo 等）
 * @returns 路由结果
 */
export async function routeIntentWithFallback(
  question: string,
  options: {
    hasBirthInfo?: boolean;
    hasAskTime?: boolean;
    hasGender?: boolean;
    hasCity?: boolean;
  } = {}
): Promise<RoutingResult> {
  // 先尝试 AI 路由
  const aiResult = await routeIntentAI(question);
  if (aiResult) {
    return aiResult;
  }

  // 降级到关键词匹配
  return routeIntent(question, options);
}
