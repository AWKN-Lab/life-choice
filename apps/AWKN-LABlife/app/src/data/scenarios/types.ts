/**
 * L1 内容线 — 对话样例类型定义
 *
 * 每个样例对应一个具体用户场景，包含用户消息和期望的 Agent 回复结构。
 * 用于 L1 Pipeline 的 prompt 示例和回归测试。
 */

export interface ConversationScenario {
  /** 场景唯一标识 */
  id: string;
  /** 场景分类：八字/紫微/六壬/综合/取名 */
  category: 'bazi' | 'ziwei' | 'liuren' | 'mixed' | 'naming';
  /** 用户状态：casual / genuine / repeating / validating / emotional_pressure / high_risk */
  userState: string;
  /** 用户输入消息 */
  userMessage: string;
  /** 期望的路由类型 */
  expectedRoute: 'ziping' | 'liuren' | 'mixed' | 'clarify';
  /** 期望的判断结论（judgment） */
  expectedJudgment: string;
  /** 是否有八字信息 */
  hasBirthInfo: boolean;
  /** 是否有问事时间 */
  hasAskTime: boolean;
  /** 备注 */
  note?: string;
}

export type ScenarioCategory = ConversationScenario['category'];