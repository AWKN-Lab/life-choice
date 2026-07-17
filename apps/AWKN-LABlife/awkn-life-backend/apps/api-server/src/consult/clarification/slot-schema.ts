/**
 * T2.1: 咨询类型槽位 Schema
 *
 * 替代 DialogueService 中基于字符长度的追问逻辑，
 * 改为基于槽位填充的信息完整性评估。
 *
 * 设计原则：
 * - 每种咨询类型定义一组槽位（必填 + 选填）
 * - 必填槽位缺失 → 触发追问
 * - 选填槽位缺失 → 不触发追问，但影响 clarityScore
 */

/**
 * 咨询类型枚举
 */
export type ConsultType = 'career' | 'relationship' | 'wealth' | 'health' | 'general';

/**
 * 槽位定义
 */
export interface SlotDefinition {
  name: string;
  label: string;
  required: boolean;
  description: string;
}

/**
 * 按咨询类型定义必填槽位
 *
 * - career: 事业/工作/学业
 * - relationship: 感情/婚姻/人际
 * - wealth: 投资/财运/消费
 * - health: 健康/身体/心理
 * - general: 兜底类型
 */
export const SLOT_SCHEMAS: Record<ConsultType, SlotDefinition[]> = {
  career: [
    { name: 'issue_domain', label: '问题领域', required: true, description: '事业/工作/学业的具体领域' },
    { name: 'current_situation', label: '当前处境', required: true, description: '目前的状态和背景' },
    { name: 'core_conflict', label: '核心矛盾', required: true, description: '面临的主要矛盾或选择' },
    { name: 'time_urgency', label: '时间紧迫度', required: false, description: '是否有时间限制' },
  ],
  relationship: [
    { name: 'relationship_status', label: '关系状态', required: true, description: '单身/恋爱/婚姻等' },
    { name: 'core_conflict', label: '核心矛盾', required: true, description: '面临的主要问题' },
    { name: 'partner_attitude', label: '当事人态度', required: false, description: '对方的想法或态度' },
    { name: 'user_expectation', label: '用户期望', required: true, description: '希望达到什么结果' },
  ],
  wealth: [
    { name: 'decision_type', label: '决策类型', required: true, description: '投资/消费/储蓄/借贷' },
    { name: 'amount_range', label: '金额量级', required: false, description: '涉及的金额大小' },
    { name: 'risk_preference', label: '风险偏好', required: false, description: '保守/平衡/激进' },
    { name: 'core_conflict', label: '核心矛盾', required: true, description: '主要纠结点' },
  ],
  health: [
    { name: 'symptom', label: '症状描述', required: true, description: '身体或心理的不适' },
    { name: 'duration', label: '持续时间', required: false, description: '症状持续多久了' },
    { name: 'action_taken', label: '已采取措施', required: false, description: '是否已就医或自我处理' },
    { name: 'core_concern', label: '核心担忧', required: true, description: '最担心什么' },
  ],
  general: [
    { name: 'core_question', label: '核心问题', required: true, description: '用户最想问的' },
    { name: 'background', label: '背景信息', required: false, description: '相关背景' },
  ],
};

/**
 * 咨询类型关键词映射（用于规则匹配兜底）
 */
export const CONSULT_TYPE_KEYWORDS: Record<ConsultType, string[]> = {
  career: ['事业', '工作', '职业', '学业', '升职', '跳槽', '辞职', '创业', '考研', '考公', '就业'],
  relationship: ['感情', '婚姻', '恋爱', '分手', '复合', '相亲', '结婚', '离婚', '暗恋', '前任', '对象', '男友', '女友', '老公', '老婆'],
  wealth: ['投资', '财运', '理财', '股票', '基金', '买房', '消费', '储蓄', '借贷', '生意', '赚钱', '破财'],
  health: ['健康', '身体', '生病', '症状', '失眠', '焦虑', '抑郁', '就医', '治疗', '不舒服', '疼痛'],
  general: [],
};

/**
 * 获取指定咨询类型的必填槽位
 */
export function getRequiredSlots(consultType: ConsultType): SlotDefinition[] {
  return SLOT_SCHEMAS[consultType].filter(slot => slot.required);
}

/**
 * 获取指定咨询类型的所有槽位
 */
export function getAllSlots(consultType: ConsultType): SlotDefinition[] {
  return SLOT_SCHEMAS[consultType];
}

/**
 * 根据 slot name 查找 SlotDefinition
 */
export function findSlot(consultType: ConsultType, slotName: string): SlotDefinition | undefined {
  return SLOT_SCHEMAS[consultType].find(slot => slot.name === slotName);
}
