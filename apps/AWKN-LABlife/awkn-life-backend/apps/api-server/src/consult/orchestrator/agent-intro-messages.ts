/**
 * P1-4: 算法调用引子话术（三段式）
 *
 * 每种算法调用前，张半山说三段话术：
 * - opening：人格化开场，让用户感知"他在用不同方式看我的问题"
 * - process：算法过程描述，建立仪式感
 * - setup：结果预告，设定预期
 */

export interface AgentIntroStages {
  opening: string;
  process: string;
  setup: string;
}

export const AGENT_INTRO_MESSAGES: Record<string, AgentIntroStages> = {
  liuren: {
    opening: '你这个局面，我用六壬看了一下——',
    process: '六壬排盘，天盘地盘人盘三才交汇，月将加时，四课三传，每一步都指向你当下的处境。',
    setup: '推演完成后，我会告诉你：这个局面的大势在哪、关键转折在哪、你要避开什么。',
  },
  qimen: {
    opening: '这个方向用奇门看比较清楚——',
    process: '奇门遁甲，九宫飞泊，天盘地盘人盘神盘四层叠加，八门九星各有吉凶。',
    setup: '推演完成后，我会告诉你：哪个方向对你有利、什么时候行动最好、要避开什么格局。',
  },
  ziping: {
    opening: '从你的命盘格局看了一下——',
    process: '八字排盘，四柱八字，天干地支，五行生克，十神配合，大运流年一一推算。',
    setup: '推演完成后，我会告诉你：你的命格大势、当前运势走向、以及需要注意的年份。',
  },
  ziwei: {
    opening: '紫微从性格配合的角度看了一下——',
    process: '紫微斗数，十二宫位，十四主星，四化飞星，每颗星都在讲述你的性格与命运。',
    setup: '推演完成后，我会告诉你：你的性格底色、天赋方向、以及人际关系中的模式。',
  },
  liuyao: {
    opening: '你现在问的这事，我起一卦看看——',
    process: '六爻起卦，世应定位，六亲配六神，动变之间藏着你要的答案。',
    setup: '推演完成后，我会告诉你：这件事的吉凶趋势、关键人物、以及你该怎么做。',
  },
  quming: {
    opening: '从八字五行出发，我挑了几个字——',
    process: '取名讲究五行补缺、音韵和谐、寓意深远，每个字都要跟你的命格对上。',
    setup: '推演完成后，我会告诉你：哪几个字最适合你、为什么适合、以及怎么用。',
  },
};

/**
 * 获取算法引子话术
 * @param agentType 算法类型（liuren/qimen/ziping/ziwei/liuyao/quming）
 * @returns 三段式引子话术，未匹配返回 null
 */
export function getAgentIntro(agentType: string): AgentIntroStages | null {
  return AGENT_INTRO_MESSAGES[agentType] || null;
}
