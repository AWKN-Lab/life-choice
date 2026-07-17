/**
 * L1 内容线 — 追问推荐库（32 条）
 *
 * 按路由类型（ziping/liuren/mixed/clarify）和用户状态分层。
 * 每条追问在系统回答后展示，引导用户继续深度互动。
 */

import { Followup } from './types';

const followups: Followup[] = [
  // ═══════════════════════════════════════════
  // ziping 路由 — 八字相关追问（10 条）
  // ═══════════════════════════════════════════
  {
    id: 'f-zi-001',
    userState: 'genuine',
    text: '那我的事业运什么时候能好转？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-002',
    userState: 'genuine',
    text: '能不能帮我看看财运方面需要注意什么？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-003',
    userState: 'genuine',
    text: '我的八字里有没有贵人？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-004',
    userState: 'genuine',
    text: '今年哪几个月比较关键？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-005',
    userState: 'genuine',
    text: '我的身体状况从八字看有什么需要注意的？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-006',
    userState: 'casual',
    text: '八字真的准吗？有没有科学依据？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-007',
    userState: 'casual',
    text: '那和星座比哪个更准？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-008',
    userState: 'validating',
    text: '别的师傅说我是身弱，你说身旺，能再确认一下吗？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-009',
    userState: 'validating',
    text: '这个结论和我在网上查的不太一样，你怎么看？',
    routeTypes: ['ziping'],
  },
  {
    id: 'f-zi-010',
    userState: 'repeating',
    text: '我还是觉得心里不踏实，能不能再帮我看看？',
    routeTypes: ['ziping'],
  },

  // ═══════════════════════════════════════════
  // liuren 路由 — 六壬相关追问（8 条）
  // ═══════════════════════════════════════════
  {
    id: 'f-lr-001',
    userState: 'genuine',
    text: '那什么时候行动比较合适？',
    routeTypes: ['liuren'],
  },
  {
    id: 'f-lr-002',
    userState: 'genuine',
    text: '除了这个方向，还有其他选择吗？',
    routeTypes: ['liuren'],
  },
  {
    id: 'f-lr-003',
    userState: 'genuine',
    text: '这个结果有没有什么可以化解的？',
    routeTypes: ['liuren'],
  },
  {
    id: 'f-lr-004',
    userState: 'genuine',
    text: '如果换个时间，结果会不会不一样？',
    routeTypes: ['liuren'],
  },
  {
    id: 'f-lr-005',
    userState: 'casual',
    text: '六壬和八字有什么区别？',
    routeTypes: ['liuren'],
  },
  {
    id: 'f-lr-006',
    userState: 'casual',
    text: '这个占卜是怎么算出来的？',
    routeTypes: ['liuren'],
  },
  {
    id: 'f-lr-007',
    userState: 'validating',
    text: '这个结果和我实际感受到的不太一样，能解释一下吗？',
    routeTypes: ['liuren'],
  },
  {
    id: 'f-lr-008',
    userState: 'repeating',
    text: '我还是不太放心，能不能从另一个角度再看看？',
    routeTypes: ['liuren'],
  },

  // ═══════════════════════════════════════════
  // mixed 路由 — 综合追问（8 条）
  // ═══════════════════════════════════════════
  {
    id: 'f-mx-001',
    userState: 'genuine',
    text: '能用紫微斗数帮我也分析一下吗？',
    routeTypes: ['mixed'],
  },
  {
    id: 'f-mx-002',
    userState: 'genuine',
    text: '八字和紫微的结果能相互印证吗？',
    routeTypes: ['mixed'],
  },
  {
    id: 'f-mx-003',
    userState: 'genuine',
    text: '那我的感情方面怎么样？',
    routeTypes: ['mixed'],
  },
  {
    id: 'f-mx-004',
    userState: 'genuine',
    text: '能不能帮我看看孩子的运势？',
    routeTypes: ['mixed'],
  },
  {
    id: 'f-mx-005',
    userState: 'casual',
    text: '这些东西到底准不准？有没有科学依据？',
    routeTypes: ['mixed'],
  },
  {
    id: 'f-mx-006',
    userState: 'casual',
    text: '你们是怎么分析的？背后是什么原理？',
    routeTypes: ['mixed'],
  },
  {
    id: 'f-mx-007',
    userState: 'validating',
    text: '我之前找别人看过，结论和你的不太一样，你觉得呢？',
    routeTypes: ['mixed'],
  },
  {
    id: 'f-mx-008',
    userState: 'repeating',
    text: '我还是不太明白，能用更简单的话再说一遍吗？',
    routeTypes: ['mixed'],
  },

  // ═══════════════════════════════════════════
  // clarify 路由 — 追问引导（6 条）
  // ═══════════════════════════════════════════
  {
    id: 'f-cl-001',
    userState: 'casual',
    text: '我是想问问事业方向的，你帮我看看？',
    routeTypes: ['clarify'],
  },
  {
    id: 'f-cl-002',
    userState: 'casual',
    text: '其实我就是好奇，随便问问，你随便说就行。',
    routeTypes: ['clarify'],
  },
  {
    id: 'f-cl-003',
    userState: 'casual',
    text: '那你能不能先告诉我，我适合做什么？',
    routeTypes: ['clarify'],
  },
  {
    id: 'f-cl-004',
    userState: 'genuine',
    text: '好的，我重新说一下我的情况，是1990年3月15日上午9点出生，男，想看看事业运势。',
    routeTypes: ['clarify'],
  },
  {
    id: 'f-cl-005',
    userState: 'genuine',
    text: '明白了，我现在的困惑是不知道要不要辞职创业，你帮我分析一下。',
    routeTypes: ['clarify'],
  },
  {
    id: 'f-cl-006',
    userState: 'repeating',
    text: '我上次问过类似的，但这次情况不一样，你帮我重新看看。',
    routeTypes: ['clarify'],
  },
];

export default followups;