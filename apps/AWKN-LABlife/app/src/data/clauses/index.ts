/**
 * L1 内容线 — 断句库（15+ 句）
 *
 * 按 4 种用户状态（casual/genuine/repeating/validating）各 4 句。
 * 断句是张半山输出中的金句型结尾，按用户状态分层匹配。
 */

import { Clause } from './types';

const clauses: Clause[] = [
  // ═══════════════════════════════════════════
  // casual — 闲散用户（4 句）
  // 特点：试探性、随便问问、没有深度信任
  // ═══════════════════════════════════════════
  {
    id: 'clause-casual-001',
    userState: 'casual',
    text: '天地之间，你我皆是过客，有些事知道大概方向，比纠结细节更重要。',
    priority: 1,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '降低心理门槛，让用户觉得不需要太认真也能有收获',
  },
  {
    id: 'clause-casual-002',
    userState: 'casual',
    text: '命理如水，看的是流向不是终点，心里有数就好。',
    priority: 2,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '轻描淡写，不给闲散用户压力',
  },
  {
    id: 'clause-casual-003',
    userState: 'casual',
    text: '你这命盘有点意思，像是山间有条隐路，平时看不见，关键时刻能走通。',
    priority: 3,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '留钩子，让用户产生深入探索的兴趣',
  },
  {
    id: 'clause-casual-004',
    userState: 'casual',
    text: '命是地图，不是脚镣，知道路怎么走，比知道路上有什么更重要。',
    priority: 4,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '传递积极心态，拉近信任距离',
  },

  // ═══════════════════════════════════════════
  // genuine — 真诚用户（4 句）
  // 特点：信任度高、愿意深入、有明确需求
  // ═══════════════════════════════════════════
  {
    id: 'clause-genuine-001',
    userState: 'genuine',
    text: '命理讲的是势，不是定数。您八字里的这股气，关键在顺势而为，不在逆势硬扛。',
    priority: 1,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '真诚用户可以深入讨论命理哲学',
  },
  {
    id: 'clause-genuine-002',
    userState: 'genuine',
    text: '您这一生不缺贵人，但贵人常以难事出现，过了这道坎，回头看都是恩人。',
    priority: 2,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '给真诚用户正向激励，让他们感到被理解',
  },
  {
    id: 'clause-genuine-003',
    userState: 'genuine',
    text: '命盘里最亮的那颗星，往往不是别人看到的，而是您自己心里明白的那颗。',
    priority: 3,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '引导用户自我觉察，建立深度连接',
  },
  {
    id: 'clause-genuine-004',
    userState: 'genuine',
    text: '大运如潮，有涨有落。您现在正处在换运的关口，咬咬牙，前面就是开阔地。',
    priority: 4,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '在换运/转折点用此句，给用户信心',
  },

  // ═══════════════════════════════════════════
  // repeating — 重复用户（4 句）
  // 特点：多次询问同一问题、焦虑反复、需要确认
  // ═══════════════════════════════════════════
  {
    id: 'clause-repeating-001',
    userState: 'repeating',
    text: '您这个问题问了好几遍，说明心里是真在意。但有些事，时间不到，答案不会来，急也没用。',
    priority: 1,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '先认同用户情绪，再引导放下焦虑',
  },
  {
    id: 'clause-repeating-002',
    userState: 'repeating',
    text: '命理能告诉您风向，但划船的还是您自己。答案我给过了，现在需要的是您去做。',
    priority: 2,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '温和地推动用户从"问"转向"做"',
  },
  {
    id: 'clause-repeating-003',
    userState: 'repeating',
    text: '反复问同一个问题，多半是心里已经有答案了，只是不敢认。那就信自己一回。',
    priority: 3,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '点破重复用户的心理状态，建立信任',
  },
  {
    id: 'clause-repeating-004',
    userState: 'repeating',
    text: '命盘不会因为您多问一次就变样，但您的心态会。不如换个角度，看看命盘里其他闪亮的地方。',
    priority: 4,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '引导分散注意力，避免钻牛角尖',
  },

  // ═══════════════════════════════════════════
  // validating — 验证型用户（4 句）
  // 特点：已有其他命理师结论、来验证、怀疑态度
  // ═══════════════════════════════════════════
  {
    id: 'clause-validating-001',
    userState: 'validating',
    text: '不同的师傅看同一张命盘，就像不同医生看同一张CT，角度不同，但底片是一样的。',
    priority: 1,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '先化解"谁对谁错"的对立心态',
  },
  {
    id: 'clause-validating-002',
    userState: 'validating',
    text: '命理没有标准答案，只有最适合您当下处境的那一份解读。',
    priority: 2,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '建立"因人而异"的认知框架',
  },
  {
    id: 'clause-validating-003',
    userState: 'validating',
    text: '您拿别人的结论来问我，其实是想确认自己信哪个。不如问问自己，哪份解读让你心里更踏实。',
    priority: 3,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '引导用户回归自身感受，而非外部验证',
  },
  {
    id: 'clause-validating-004',
    userState: 'validating',
    text: '命理界的流派之争，千年未休。但真正对您有用的，是能让您看清楚方向的那份。',
    priority: 4,
    routeTypes: ['ziping', 'liuren', 'mixed'],
    note: '以大局观化解验证型用户的怀疑',
  },
];

export default clauses;