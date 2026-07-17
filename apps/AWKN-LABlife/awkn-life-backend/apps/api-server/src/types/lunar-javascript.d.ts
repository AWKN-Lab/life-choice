/**
 * lunar-javascript 类型声明（最小 API 子集）
 *
 * Phase 1 Step 1.3 引入：用精确流月干支替换近似算法
 * 仅声明 V2 链路实际使用的方法，避免过度声明。
 */
declare module 'lunar-javascript' {
  export class Lunar {
    static fromDate(date: Date): Lunar;
    /** 精确流月干支（基于节气） */
    getMonthInGanZhi(): string;
    /** 精确流月干支（按节气精确切分） */
    getMonthInGanZhiExact(): string;
    /** 流年干支 */
    getYearInGanZhi(): string;
    /** 月干 */
    getMonthGan(): string;
    /** 月支 */
    getMonthZhi(): string;
  }

  export class Solar {
    static fromDate(date: Date): Solar;
  }
}
