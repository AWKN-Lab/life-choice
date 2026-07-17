/**
 * Barnum 效应短语库（统一源）
 *
 * P0-5 修复: 合并原三套短语库
 *   - V1 shared/constants/barnum-phrases.ts (44 条，中英文混合)
 *   - V2 consult/barnum-phrases.ts (50 条，全中文)
 *   - V3 consult/orchestrator/quality-gate.service.ts 内联 (5 条身份感巴纳姆)
 *
 * 使用者：
 *   - BARNUM_PHRASES: ziwei/liuren/ziping/qimen/liuyao-agent 的 isBarnumOutput 检测
 *   - BARNUM_PHRASES_V2: consult/llm-quality-guard.ts 的质量配置
 *   - BARNUM_IDENTITY_PHRASES: consult/orchestrator/quality-gate.service.ts 的身份感校验
 */

// 建议性 Barnum 短语（V1 + V2 合并去重，共 76 条）
export const BARNUM_PHRASES: readonly string[] = [
  // ===== V1 原有 44 条 =====
  '事情有起有落', '注意人际关系', '可能会遇到贵人', '需要谨慎行事',
  '有时候顺利有时候困难', '把握好机会', '保持努力', '未来可期',
  '顺势而为', '稳扎稳打', '静观其变', '顺其自然', '随缘就好',
  '注意细节', '保持积极心态', '脚踏实地', '循序渐进', '做好准备工作',
  '把握时机', '做好风险防范', '注意平衡', '保持耐心', '冷静应对',
  '保持乐观', '注意调整', '量力而行', '审时度势', '未雨绸缪',
  '不宜盲目扩张', '注意调节情绪', '打好基础', '借力发展', '蓄势待发',
  '有时候果断，有时候犹豫', '事业有起有落', '注意身体健康', '适合多种行业',
  '性格复杂多变',
  'things have ups and downs', 'seize the opportunity', 'stay positive',
  'be careful with relationships', 'trust your intuition', 'balance work and life',
  // ===== V2 独有 32 条（与 V1 去重后）=====
  '多加小心', '谨慎行事', '保持平衡', '适度调整', '把握机会',
  '注意休息', '保持专注', '稳步前进', '灵活应对', '积极面对',
  '合理规划', '注意沟通', '保持冷静', '一切都会好起来', '相信自己的直觉',
  '保持开放心态', '注意身边的变化', '珍惜当下', '做好自己', '不要过于执着',
  '学会放手', '保持内心平静', '注意情绪管理', '保持良好习惯', '适当放松',
  '关注自身成长', '保持自律', '学会调整节奏', '注意安全', '保持信心',
  '理性看待问题', '注重过程', '保持谦逊', '学会取舍', '注意时间管理',
  '保持热情', '适当冒险', '关注身边人', '保持独立思考', '学会拒绝',
  '注意财务规划', '保持学习',
];

// V2 别名（向后兼容 consult/llm-quality-guard.ts 的 BARNUM_PHRASES_V2 引用）
export const BARNUM_PHRASES_V2: readonly string[] = BARNUM_PHRASES;

// 身份感 Barnum 短语（V3，"你是一个..."等人格描述模板）
// 与建议性短语性质不同：用于检测 LLM 输出是否套用通用人格描述
export const BARNUM_IDENTITY_PHRASES: readonly string[] = [
  '你是一个', '你往往', '你通常', '你总是', '每个人都会',
];
