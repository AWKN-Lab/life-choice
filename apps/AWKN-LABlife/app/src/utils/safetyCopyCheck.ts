/**
 * 文案安全扫描函数
 * 上线前要自动扫一遍文案，避免禁词漏出去。
 */

import { POLITICAL_SENSITIVE_WORDS } from './sensitive-words';

/** 命理文案禁词（绝对禁止出现在输出中） */
const FORBIDDEN_WORDS = [
  '命运上涨',
  '命运下跌',
  '必有机会',
  '必有风险',
  '注定',
  '一定会',
  '大灾',
  '凶灾',
];

/** 合并词表：命理禁词 + 政治敏感词 */
const ALL_FORBIDDEN_WORDS = [...FORBIDDEN_WORDS, ...POLITICAL_SENSITIVE_WORDS];

/**
 * 扫描文本中的禁词
 * @param text 待扫描文案
 * @returns 命中的禁词列表（空数组表示安全）
 */
export function checkUnsafeCopy(text: string): string[] {
  return ALL_FORBIDDEN_WORDS.filter((word) => text.includes(word));
}

/**
 * 断言式扫描：用于测试
 * @param text 待扫描文案
 * @throws 如果命中禁词则抛出 Error
 */
export function assertSafeCopy(text: string): void {
  const hits = checkUnsafeCopy(text);
  if (hits.length > 0) {
    throw new Error(`[safety-copy] 命中禁词: ${hits.join(', ')}`);
  }
}

/**
 * 过滤文案中的禁词，替换为等长星号
 * @param text 待过滤文案
 * @returns 过滤后的安全文案
 */
export function safetyCopyFilter(text: string): string {
  let result = text;
  for (const word of ALL_FORBIDDEN_WORDS) {
    if (result.includes(word)) {
      result = result.split(word).join('*'.repeat(word.length));
    }
  }
  return result;
}
