/**
 * L1 内容线 — 断句库类型定义
 *
 * 断句是张半山输出中的金句型结尾，按用户状态分层匹配。
 */

export interface Clause {
  /** 断句唯一标识 */
  id: string;
  /** 适配用户状态 */
  userState: string;
  /** 断句内容（可为模板，{dayGan} 等占位符由运行时替换） */
  text: string;
  /** 优先级（数值越低越优先） */
  priority: number;
  /** 适用路由类型 */
  routeTypes: string[];
  /** 来源/作者 */
  author?: string;
  /** 内部备注（设计意图/使用说明） */
  note?: string;
}

export type ClauseCollection = Clause[];