/**
 * 行为记录本地失败队列
 * 现在写行为失败只 console.warn，还不够。
 * 至少补一个本地队列，防止反馈丢失。
 */

const STORAGE_KEY = 'life_state_behavior_queue';

interface BehaviorEvent {
  recordId: string;
  body: Record<string, unknown>;
  timestamp: number;
}

/** 将失败的行为事件入本地队列 */
export function enqueueBehavior(event: BehaviorEvent) {
  const list = getBehaviorQueue();
  list.push(event);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-100)));
  } catch {
    // localStorage 满或禁用时静默降级
  }
}

/** 获取本地队列中的所有事件 */
export function getBehaviorQueue(): BehaviorEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BehaviorEvent[]) : [];
  } catch {
    return [];
  }
}

/** 清空本地队列 */
export function clearBehaviorQueue() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 尝试 flush 队列中的事件
 * 调用方应传入一个发送函数，成功后再清队列
 */
export async function flushBehaviorQueue(
  sender: (events: BehaviorEvent[]) => Promise<void>,
): Promise<void> {
  const queue = getBehaviorQueue();
  if (queue.length === 0) return;
  try {
    await sender(queue);
    clearBehaviorQueue();
  } catch (err) {
    console.warn('[behavior-queue] flush failed, keep queue for next retry:', err);
  }
}
