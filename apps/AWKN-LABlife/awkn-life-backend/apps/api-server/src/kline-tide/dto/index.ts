// kline-tide 模块 DTO

export class KlineQueryDto {
  /** 起始年 */
  startYear?: number;
  /** 起始月 */
  startMonth?: number;
  /** 月数，默认36 */
  months?: number;
}

export class TideQueryDto {
  /** 起始年 */
  startYear?: number;
  /** 起始月 */
  startMonth?: number;
  /** 月数，默认12 */
  months?: number;
}