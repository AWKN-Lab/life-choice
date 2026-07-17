import { Injectable, Logger } from '@nestjs/common';
import { translateTerm, translateGanZhi, DIVINATION_DICT } from './divination-dictionary';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  translateCalcResult(calcResult: Record<string, any>, lang: string): Record<string, any> {
    if (!lang || lang === 'zh-CN' || lang === 'zh') return calcResult;

    const result = JSON.parse(JSON.stringify(calcResult));
    this.translateBaziResult(result, lang);
    this.translateLiurenResult(result, lang);
    this.translateFortuneResult(result, lang);
    this.translateCelebrityResult(result, lang);
    return result;
  }

  private translateBaziResult(obj: Record<string, any>, lang: string): void {
    const gzFields = ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar', 'taiYuan', 'mingGong'];
    for (const f of gzFields) {
      if (obj[f] && typeof obj[f] === 'string') obj[f] = translateGanZhi(obj[f], lang);
    }

    const ssFields = ['yearShishen', 'monthShishen', 'dayShishen', 'hourShishen'];
    for (const f of ssFields) {
      if (obj[f] && typeof obj[f] === 'string') obj[f] = translateTerm(obj[f], lang);
    }

    if (obj.naYin && typeof obj.naYin === 'object') {
      for (const k of Object.keys(obj.naYin)) {
        if (typeof obj.naYin[k] === 'string') obj.naYin[k] = translateGanZhi(obj.naYin[k], lang);
      }
    }

    if (obj.shenSha && typeof obj.shenSha === 'object') {
      for (const k of Object.keys(obj.shenSha)) {
        if (Array.isArray(obj.shenSha[k])) {
          obj.shenSha[k] = obj.shenSha[k].map((v: string) => translateTerm(v, lang));
        }
      }
    }

    if (obj.kongWang && Array.isArray(obj.kongWang)) {
      obj.kongWang = obj.kongWang.map((v: string) => translateTerm(v, lang));
    }

    if (obj.daYun && Array.isArray(obj.daYun)) {
      obj.daYun = obj.daYun.map((dy: any) => ({
        ...dy,
        gan: translateTerm(dy.gan, lang),
        zhi: translateTerm(dy.zhi, lang),
        full: translateGanZhi(dy.full, lang),
      }));
    }

    if (obj.liuNian && Array.isArray(obj.liuNian)) {
      obj.liuNian = obj.liuNian.map((ln: any) => ({
        ...ln,
        ganZhi: translateGanZhi(ln.ganZhi, lang),
        shishen: translateTerm(ln.shishen, lang),
      }));
    }

    if (obj.wuxing && typeof obj.wuxing === 'object') {
      const wxMap: Record<string, string> = { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' };
      const newWx: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj.wuxing)) {
        newWx[lang === 'en' ? wxMap[k] || k : k] = v as number;
      }
      obj.wuxing = newWx;
    }
  }

  private translateLiurenResult(obj: Record<string, any>, lang: string): void {
    const termFields = ['jiangjiang', 'zhoushi', 'tiTi', 'keTi'];
    for (const f of termFields) {
      if (obj[f] && typeof obj[f] === 'string') obj[f] = translateTerm(obj[f], lang) || translateGanZhi(obj[f], lang);
    }

    if (obj.trueSolarTime && typeof obj.trueSolarTime === 'string') {
      obj.trueSolarTime = this.translateTrueSolarTime(obj.trueSolarTime, lang);
    }

    if (obj.tianpan && Array.isArray(obj.tianpan)) {
      obj.tianpan = obj.tianpan.map((item: any) => this.translatePlateItem(item, lang));
    }
    if (obj.dipan && Array.isArray(obj.dipan)) {
      obj.dipan = obj.dipan.map((item: any) => this.translatePlateItem(item, lang));
    }
    if (obj.siKe && Array.isArray(obj.siKe)) {
      obj.siKe = obj.siKe.map((item: any) => ({
        ...item,
        label: translateTerm(item.label, lang),
        upperGanZhi: translateGanZhi(item.upperGanZhi, lang),
        lowerGanZhi: translateGanZhi(item.lowerGanZhi, lang),
      }));
    }
    if (obj.sanChuan && Array.isArray(obj.sanChuan)) {
      obj.sanChuan = obj.sanChuan.map((item: any) => ({
        ...item,
        label: translateTerm(item.label, lang),
        ganZhi: translateGanZhi(item.ganZhi, lang),
        tianJiang: translateTerm(item.tianJiang, lang),
        wuXing: translateTerm(item.wuXing, lang),
      }));
    }
    if (obj.shenSha && Array.isArray(obj.shenSha)) {
      obj.shenSha = obj.shenSha.map((item: any) => ({
        ...item,
        name: translateTerm(item.name, lang),
        meaning: translateTerm(item.meaning, lang),
      }));
    }
    if (obj.biFa && Array.isArray(obj.biFa)) {
      obj.biFa = obj.biFa.map((v: string) => translateTerm(v, lang));
    }
  }

  private translatePlateItem(item: any, lang: string): any {
    return {
      ...item,
      zhi: translateTerm(item.zhi, lang),
      tianJiang: item.tianJiang ? translateTerm(item.tianJiang, lang) : undefined,
      wuXing: item.wuXing ? translateTerm(item.wuXing, lang) : undefined,
    };
  }

  private translateTrueSolarTime(text: string, lang: string): string {
    if (lang === 'en') {
      return text
        .replace(/北京时间/g, 'Beijing Time ')
        .replace(/校正后/g, ' corrected to ')
        .replace(/早/g, ' early by ')
        .replace(/晚/g, ' late by ')
        .replace(/分钟/g, ' min')
        .replace(/时/g, ':00');
    }
    return text;
  }

  private translateFortuneResult(obj: Record<string, any>, lang: string): void {
    if (obj.lucky_colors && Array.isArray(obj.lucky_colors)) {
      obj.lucky_colors = obj.lucky_colors.map((c: string) => translateTerm(c, lang));
    }
    if (obj.auspicious_hours && Array.isArray(obj.auspicious_hours)) {
      obj.auspicious_hours = obj.auspicious_hours.map((h: string) => {
        for (const [zh, en] of Object.entries(DIVINATION_DICT.shiChen)) {
          if (h.includes(zh)) return h.replace(zh, en);
        }
        return h;
      });
    }
    if (obj.month_name && typeof obj.month_name === 'string') {
      obj.month_name = translateTerm(obj.month_name, lang);
    }
    if (obj.gan_zhi && typeof obj.gan_zhi === 'string') {
      obj.gan_zhi = translateGanZhi(obj.gan_zhi, lang);
    }

    const aspectFields = ['career', 'wealth', 'relationship', 'health'];
    for (const f of aspectFields) {
      if (obj[f] && typeof obj[f] === 'object') {
        // description/advice are free text, will be handled by LLM
      }
    }
  }

  private translateCelebrityResult(obj: Record<string, any>, lang: string): void {
    if (obj.category_cn && typeof obj.category_cn === 'string') {
      obj.category_cn = translateTerm(obj.category_cn, lang);
    }
    if (obj.tags && Array.isArray(obj.tags)) {
      obj.tags = obj.tags.map((t: string) => translateTerm(t, lang));
    }
    if (obj.year_pillar) obj.year_pillar = translateGanZhi(obj.year_pillar, lang);
    if (obj.month_pillar) obj.month_pillar = translateGanZhi(obj.month_pillar, lang);
    if (obj.day_pillar) obj.day_pillar = translateGanZhi(obj.day_pillar, lang);
    if (obj.hour_pillar) obj.hour_pillar = translateGanZhi(obj.hour_pillar, lang);
  }

  translateAgentInput(input: Record<string, any>, lang: string): Record<string, any> {
    if (!lang || lang === 'zh-CN' || lang === 'zh') return input;
    return this.translateCalcResult(input, lang);
  }
}
