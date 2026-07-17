/**
 * L1 内容线 — 追问推荐库类型定义
 *
 * 追问是系统在回答后推荐用户继续提问的内容，按路由类型和用户状态分层。
 */

export interface Followup {
  /** 追问唯一标识 */
  id: string;
  /** 用户状态 */
  userState: string;
  /** 追问文本 */
  text: string;
  /** 路由类型 */
  routeTypes: string[];
}

export type FollowupCollection = Followup[];