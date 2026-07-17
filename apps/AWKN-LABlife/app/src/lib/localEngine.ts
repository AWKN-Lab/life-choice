/**
 * 本地引擎调用（从 ResultPage 抽取）
 * 包含: callRealEngine 函数 + liuren 完整实现
 * ziping 不再前端本地排盘，统一由后端 BaziCalculatorWrapper 计算
 */
import LiuRenEngine from '@/lib/liuren-engine';
import type { RouteType } from '@/types/api';
import type { UnifiedResult } from '@/components/result/resultTypes';
import type { TFunction } from 'i18next';

/**
 * 调用真实引擎（本地排盘）
 * - liuren: 前端完整实现（LiuRenEngine）
 * - ziping: 前端不排盘，抛错强制走后端 BaziCalculatorWrapper
 * - 其他: 降级到 Mock
 */
export async function callRealEngine(
  routeType: RouteType,
  data: Record<string, unknown>,
  t: TFunction,
  language: string
): Promise<UnifiedResult> {
  const isEnglish = language.startsWith('en');
  try {
    if (routeType === 'liuren') {
      const engine = new LiuRenEngine();
      const askTime = data.ask_time as string;
      const normalizedDate = askTime.replace('T', ' ');
      const result = engine.calculate(normalizedDate, 0, Date.now());
      const engineTerms = [
        result.guiShen.name,
        result.yueJiang.full,
        result.siKe.firstKe,
        result.sizhu.year.full,
        result.sizhu.month.full,
        result.sizhu.day.full,
        result.sizhu.time.full,
        result.difenName,
        result.jiangShen.full,
        result.renYuan.full,
        result.siKe.secondKe,
        result.siKe.thirdKe,
        result.siKe.fourthKe,
        result.sanChuan.shang,
        result.sanChuan.zhong,
        result.sanChuan.xia,
        result.yuanWang,
      ].filter(Boolean).join(' / ');

      return {
        route_type: 'liuren',
        currentQuestion: String(data.question || ''),
        summary_line: isEnglish
          ? t('resultPage.localFallback.liuren.summary', { guiShen: result.guiShen.name, yueJiang: result.yueJiang.full })
          : `【${result.guiShen.name}】${result.yueJiang.full}月将，${result.siKe.firstKe}为用事之神`,
        summary_body: isEnglish ? t('resultPage.localFallback.liuren.body', { terms: engineTerms }) : `四柱：${result.sizhu.year.full}年 ${result.sizhu.month.full}月 ${result.sizhu.day.full}日 ${result.sizhu.time.full}时\n` +
          `地分：${result.difenName}\n月将：${result.yueJiang.full} 将神：${result.jiangShen.full}\n` +
          `贵神：${result.guiShen.name} 人元：${result.renYuan.full}\n` +
          `四课：${result.siKe.firstKe} | ${result.siKe.secondKe} | ${result.siKe.thirdKe} | ${result.siKe.fourthKe}\n` +
          `三传：${result.sanChuan.shang} → ${result.sanChuan.zhong} → ${result.sanChuan.xia}\n` +
          `元丈：${result.yuanWang}（${result.isDayTime ? '昼' : '夜'}时断事）`,
        risks: isEnglish ? [
          t('resultPage.localFallback.liuren.risk1', { shang: result.sanChuan.shang }),
          t('resultPage.localFallback.liuren.risk2', { guiShen: result.guiShen.name }),
          t('resultPage.localFallback.liuren.risk3', { yueJiang: result.yueJiang.full }),
          t('resultPage.localFallback.liuren.risk4', { zhong: result.sanChuan.zhong }),
        ] : [
          `初传${result.sanChuan.shang}若遇克害，需防阻碍`,
          `${result.guiShen.name}为贵神，忌逢空亡或冲破`,
          `${result.yueJiang.full}月将若失令，事体有拖延之象`,
          `三传${result.sanChuan.zhong}中传欠力，宜保守待机`,
        ],
        actions: isEnglish ? [
          t('resultPage.localFallback.liuren.action1', { firstKe: result.siKe.firstKe }),
          t('resultPage.localFallback.liuren.action2', { guiShen: result.guiShen.name }),
          t('resultPage.localFallback.liuren.action3', { yuanWang: result.yuanWang }),
          t('resultPage.localFallback.liuren.action4', { zhong: result.sanChuan.zhong }),
        ] : [
          `以${result.siKe.firstKe}为事体核心，循其克应而行`,
          `逢${result.guiShen.name}值日或时辰，可把握时机`,
          `${result.yuanWang}门宜静不宜动，待气机明确再发`,
          `中传${result.sanChuan.zhong}为转折点，关注此阶段变化`,
        ],
        time_window: isEnglish
          ? t('resultPage.localFallback.liuren.timeWindow', { shang: result.sanChuan.shang, zhong: result.sanChuan.zhong, xia: result.sanChuan.xia })
          : `三传流转约${result.sanChuan.shang}→${result.sanChuan.zhong}→${result.sanChuan.xia}，约7-14天气机转换`,
        evidence_fold: engine.formatResult(result),
        paywall_modules: ['breakthrough', 'morning', 'kline'],
        record_id: `LIUREN_${Date.now().toString(36).slice(2, 10)}`,
        engine_data: result as unknown as Record<string, unknown>,
      };
    }

    // 子平命理不在前端本地排盘。统一由后端 BaziCalculatorWrapper 计算，避免多套算法结果不一致。
    // B4 清理：移除 Mock 空壳返回，强制走后端真实引擎或抛错，防止生产环境返回假八字数据。
    if (routeType === 'ziping') {
      throw new Error('ZIPING_ENGINE_NOT_AVAILABLE_LOCALLY: ziping 必须通过后端 API 调用，前端不支持本地排盘');
    }
  } catch (e) {
    console.error('Engine error:', e);
    throw e; // 重新抛出，让调用方处理（不再降级到 Mock）
  }

  // 降级到Mock
  return {
    route_type: routeType,
    summary_line: t('resultPage.localFallback.generic.summary'),
    summary_body: t('resultPage.localFallback.generic.body'),
    risks: [
      t('resultPage.localFallback.generic.risk1'),
      t('resultPage.localFallback.generic.risk2'),
    ],
    actions: [
      t('resultPage.localFallback.generic.action1'),
      t('resultPage.localFallback.generic.action2'),
    ],
    time_window: t('resultPage.localFallback.generic.timeWindow'),
    evidence_fold: t('resultPage.localFallback.generic.evidence'),
    paywall_modules: ['breakthrough', 'morning', 'kline'],
    record_id: `${routeType.toUpperCase()}_${Date.now().toString(36).slice(2, 10)}`,
  };
}
