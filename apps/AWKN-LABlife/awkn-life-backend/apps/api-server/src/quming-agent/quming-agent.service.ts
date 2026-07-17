import { Injectable, Logger, Inject, Optional, forwardRef } from '@nestjs/common';
import { LlmProvidersService, LlmProviderType } from '../llm-providers/llm-providers.service';
import { BaZiCalculator, PatternAnalysis } from '../knowledge-base/bazi-calculator';
import { NamingCalculator } from '../calc-engine/naming-engine/naming-calculator';
import { getZodiacTaboo, filterZodiacTabooChars, checkCharZodiacTaboo } from '../calc-engine/naming-engine/zodiac-taboo';
import { checkLlmQuality } from '../consult/llm-quality-guard';
import { WUXING_TO_EN } from '../calc-engine/bazi-engine/core/bazi-data.service';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 取名输入接口
 */
export interface QumingInput {
  birthDate?: string;       // 出生日期 (YYYY-MM-DD) - baby naming 必填
  birthTime?: string;       // 出生时间 (HH:mm) - baby naming 必填
  gender?: 'male' | 'female';  // 性别 - baby naming 必填
  parentWishWords?: string[];  // 家长意愿词（可选）
  avoidChars?: string[];      // 需要避开的字（可选）
  surname?: string;            // 姓氏（可选，用于测试搭配）
  lang?: string;
  /** P1-11: 多轮对话输入参数 */
  namingType?: 'baby' | 'adult' | 'brand';  // 取名类型
  stylePreference?: string[];   // 风格偏好（如 steady, lively, scholarly, modern 等）
  improveFocus?: string;        // 改善方向（成人改名用）
  industry?: string;            // 行业（品牌取名用）
  targetAudience?: string;      // 目标人群（品牌取名用）
  originalName?: string;        // 原名（成人改名用）
  customDescription?: string;   // 自定义描述/期望
}

/**
 * 取名输出接口
 */
export interface QumingOutput {
  summaryLine: string;
  summaryBody: string;
  confidence?: '高' | '中' | '低';
  uncertaintyFactors?: string[];
  bazi: {
    yearPillar: string;       // 年柱
    monthPillar: string;       // 月柱
    dayPillar: string;        // 日柱
    hourPillar: string;       // 时柱
    dayGan: string;           // 日主天干
    naYin: string;            // 纳音五行
  };
  wuxingAnalysis: {
    current: Record<string, number>;  // 当前五行分布
    missing: string[];                 // 缺失的五行
    excessive: string[];               // 过旺的五行
    recommendation: string;            // 补充建议
  };
  xiYongShen: {
    xi: string[];       // 喜神
    yong: string[];     // 用神
    ji: string[];       // 忌神
  };
  nameSuggestions: {
    characters: string[];      // 推荐用字
    names: string[];           // 完整名字推荐
    reason: string;             // 推荐理由
    wuge?: {
      tiange: { num: number; wuxing: string; ji: boolean };
      renge: { num: number; wuxing: string; ji: boolean };
      dige: { num: number; wuxing: string; ji: boolean };
      waige: { num: number; wuxing: string; ji: boolean };
      zongge: { num: number; wuxing: string; ji: boolean };
      score: number;
    };
  }[];
  risks: string[];
  actions: string[];
  llmFallback?: boolean;
  lowQuality?: boolean;
  qualityWarning?: string;
}

/**
 * 取名分析服务 - 基于八字五行平衡的取名推荐
 */
@Injectable()
export class QumingAgentService {
  private readonly logger = new Logger(QumingAgentService.name);
  private readonly calculator: BaZiCalculator;

  // 五行对应的推荐偏旁部首
  private readonly WUXING_RADICALS: Record<string, string[]> = {
    '木': ['木', '艹', '讠', '纟', '亻', '氵', '冫', '阝'],
    '火': ['火', '灬', '日', '光', '灬', '离'],
    '土': ['土', '艹', '田', '阝', '厂'],
    '金': ['金', '钅', '刂', '刀', '戈', '玉', '王'],
    '水': ['水', '氵', '冫', '雨', '辶', '阝'],
  };

  // 五行相生相克
  private readonly WUXING_RELATIONS = {
    sheng: { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' },
    ke: { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' },
  };

  // 高分名字常用字库（按五行分类，精选去重）
  private readonly NAME_CHARACTERS: Record<string, string[]> = {
    '木': '林森柳杨松柏桐桓梓楠榆槐樱桂枫桦竹筠笙笛策箐箫籁篇籍简筑筱茗莉蓉兰菊芬芳芸芷若茜莹萱薇蕾荷莲菲蕊苗荃荟蕙芝蔓蔚蓝苏蒲苍芦英华蓓蔻薰芊荏苒菡蓁莘彬斌彦嘉文杰俊豪贤哲睿慧敏聪颖勤勉毅恒诚信忠义礼谦恭温良俭让宽厚德仁慈恩惠泽庆祥瑞奕弈奇祺禧福凯歌乐和安康宁泰平顺达通明亮辉启元亨利贞吉熙盛昌荣茂'.split(''),
    '火': '炎焱灿熠炬烽煜炜煌烨炫炳炽燃焕曦旭昊昌明晖熙亮晶灵星晨昕昀晟暄曜彤丹红赤赫朱艳丽瑛玲珊珍珠琼瑶日阳昭晔暖晴旻晏晗暘昶昪昱宁静怡悦欣欢乐愉恺畅恬恩慈慧智聪颖哲思念怀恋慕爱情意心志德道理文章诗词赋曲歌音韵声鸣凤龙麟骏驰腾飞翔跃'.split(''),
    '土': '城坚培增墨坤壁壑塘均垣地坦坪埕山岩峰岳崇峻岭巍峨嵘峥嵋岗崖岱石磊砺硕磐碣砥田疆畴畹畿域境佳伊悠安宇宬容宏宜建康庄庆延永维稳重厚实固定正直端方圆宽博翔恩惠慈善德仁义礼信忠诚敬恭谦让轩堂阁殿宫室宙寰'.split(''),
    '金': '铭锐锋锦钧铎钰钟铁钢铮镛鑫银铖钊鉴锡镇铉钦铠刀刂戈弓矢斤戎武威刚强勇猛毅剑弩箭靶盾盔甲胄壮健玉珍珠琳琅玮珂珊瑾瑜琪珞瑶璟璐琼瑗琬珏琛璧玺璜珑璎瓅瑄瑢瑱玙承新辛锌诚信正义坚卓超越胜利功勋杰俊豪雄英才能贤达通畅瑞祥嘉福禄寿康宁安泰和平顺齐治邦国家世代传继续延衍'.split(''),
    '水': '泽润瀚潇洋洁清渊泉波涛浪潮汐潞江河湖海溪涧池潭瀑沅湘沣沝淼澧滨浦漭澎湃漾激漪涟沦沧溟云雨霖霏霓霞露雾雪霜冰雹霁霭霄霈淳汝沁淑沂洛湛涵滢澜澄澈涓静靖温柔和顺慧智明远深博浩汪渺茫敏灵秀雅文彬白纯素净正廉'.split(''),
  };

  // 常见好听名字（用于组合）
  private readonly COMMON_NAMES: Record<string, string[]> = {
    male: ['子轩', '浩然', '宇轩', '子墨', '梓涵', '天佑', '俊豪', '子涵', '雨泽', '晨曦', '明轩', '伟泽', '子轩', '睿', '泽', '俊杰', '思远', '宇航', '天翔', '鸿飞', '鹏程', '远航', '君浩', '文博', '志强'],
    female: ['子涵', '梓萱', '诗涵', '思雨', '欣怡', '雨萱', '梦琪', '梓琳', '静怡', '雅婷', '雅静', '欣悦', '雨桐', '思琪', '思瑶', '雅琳', '晓燕', '诗琪', '紫萱', '梦瑶', '静萱', '雅欣', '雨涵', '诗雨', '雨露'],
  };

  constructor(
    @Optional() @Inject(LlmProvidersService) private readonly llmProviders?: LlmProvidersService,
    private readonly namingCalculator?: NamingCalculator,
  ) {
    this.calculator = new BaZiCalculator();
  }

  onModuleInit() {
    if (this.llmProviders?.isConfigured()) {
      this.logger.log('✅ QumingAgent LLM 已配置，可进行智能取名推荐');
    } else {
      this.logger.warn('⚠️ LLM 未配置，使用算法兜底逻辑');
    }
  }

  /**
   * 分析取名建议
   */
  async analyze(input: QumingInput): Promise<QumingOutput> {
    try {
      const startTime = Date.now();

      // P0-3: 按 namingType 分叉，避免静默补伪默认
      const namingType = input.namingType || 'baby';

      // Baby naming 缺少出生日期 → 返回低质量结果，不调 LLM
      if (namingType === 'baby' && !input.birthDate) {
        this.logger.warn('[QumingAgent] 宝宝取名缺少出生日期，返回低质量结果');
        return this.buildEmptyBaziResult({
          lowQuality: true,
          qualityWarning: '宝宝取名需要出生日期，请提供出生日期后重新尝试',
        });
      }

      // Brand naming → 场景化命名，不需要八字
      if (namingType === 'brand') {
        return await this.analyzeBrandNaming(input);
      }

      // Adult naming → Q4 默认：先返回提示（场景化命名留 v0.2）
      if (namingType === 'adult') {
        return this.buildEmptyBaziResult({
          lowQuality: true,
          qualityWarning: '成人改名场景化命名功能即将上线，请暂使用宝宝取名流程',
        });
      }

      // Step 1: 排盘计算八字（baby naming with birthDate）
      const bazi = this.calculator.calculateBaZi(
        input.birthDate!,
        input.birthTime || '12:00',
        input.gender || 'male',
      );

      // P1.1b: 从年支推导生肖及禁忌偏旁
      const yearZhi = bazi.chart.year.zhi;
      const zodiacTaboo = getZodiacTaboo(yearZhi);
      if (zodiacTaboo) {
        this.logger.log(`[QumingAgent] 生肖: ${zodiacTaboo.zodiac}，禁忌偏旁: ${zodiacTaboo.rule.taboos.join('、')}`);
      }

      // Step 2: 分析五行缺失
      let wuxingCount = bazi.wuxingCount;
      const totalCount = (wuxingCount.wood || 0) + (wuxingCount.fire || 0) + (wuxingCount.earth || 0) + (wuxingCount.metal || 0) + (wuxingCount.water || 0);
      if (totalCount === 0) {
        const ganWx: Record<string, string> = { '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water' };
        const zhiWx: Record<string, string> = { '寅': 'wood', '卯': 'wood', '巳': 'fire', '午': 'fire', '辰': 'earth', '丑': 'earth', '未': 'earth', '戌': 'earth', '申': 'metal', '酉': 'metal', '子': 'water', '亥': 'water' };
        wuxingCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
        const pillars = [bazi.chart.year, bazi.chart.month, bazi.chart.day, bazi.chart.hour];
        for (const p of pillars) {
          const gw = ganWx[p.gan]; if (gw) wuxingCount[gw as keyof typeof wuxingCount] += 2;
          const zw = zhiWx[p.zhi]; if (zw) wuxingCount[zw as keyof typeof wuxingCount] += 2;
          const hidden = p.hiddenStems || [];
          for (let i = 0; i < hidden.length; i++) {
            const hw = ganWx[hidden[i]];
            if (hw) wuxingCount[hw as keyof typeof wuxingCount] += (i === 0 ? 3 : i === 1 ? 2 : 1);
          }
        }
        this.logger.warn('[QumingAgent] wuxingCount 为 0，已从 chart 重新计算');
      }
      const wuxingAnalysis = this.analyzeWuxing(wuxingCount, bazi.chart.day.gan);

      // Step 3: 计算喜用神
      const xiYongShen = this.calculateXiYongShen(bazi.pattern, wuxingAnalysis, bazi.chart.day.gan);

      // Step 4: 生成名字推荐
      let nameSuggestions: QumingOutput['nameSuggestions'] = [];
      let llmFallback = false;
      let lowQuality = false;
      let qualityWarning: string | undefined;

      if (this.llmProviders?.isConfigured()) {
        try {
          const llmResult = await this.generateNamesWithLLM(input, bazi, wuxingAnalysis, xiYongShen, zodiacTaboo);
          nameSuggestions = llmResult;
          if (llmResult.lowQuality) {
            lowQuality = true;
            qualityWarning = llmResult.qualityWarning;
          }
        } catch (llmErr) {
          this.logger.warn(`[QumingAgent] LLM失败，降级到算法: ${(llmErr as Error).message}`);
          nameSuggestions = this.generateNamesWithAlgorithm(input, bazi, wuxingAnalysis, xiYongShen, zodiacTaboo);
          llmFallback = true;
        }
      } else {
        nameSuggestions = this.generateNamesWithAlgorithm(input, bazi, wuxingAnalysis, xiYongShen, zodiacTaboo);
      }

      // 五格验证
      const surname = input.surname || '李';
      nameSuggestions = this.validateNameWuge(nameSuggestions, surname);

      // P1.1b: 生肖禁忌后过滤（对 LLM 和算法路径都生效）
      if (zodiacTaboo) {
        nameSuggestions = this.validateZodiacTaboo(nameSuggestions, zodiacTaboo);
      }

      // Step 5: 构建结果
      const summaryLine = this.buildSummaryLine(bazi, wuxingAnalysis, xiYongShen);
      const summaryBody = this.buildSummaryBody(bazi, wuxingAnalysis, xiYongShen);

      const duration = Date.now() - startTime;
      this.logger.log(`取名分析完成，耗时 ${duration}ms`);

      return {
        summaryLine,
        summaryBody,
        bazi: {
          yearPillar: bazi.chart.year.pillar,
          monthPillar: bazi.chart.month.pillar,
          dayPillar: bazi.chart.day.pillar,
          hourPillar: bazi.chart.hour.pillar,
          dayGan: bazi.chart.day.gan,
          naYin: this.getNaYin(bazi.chart.day.pillar) || '',
        },
        wuxingAnalysis,
        xiYongShen,
        nameSuggestions,
        risks: this.buildRisks(wuxingAnalysis),
        actions: this.buildActions(wuxingAnalysis, xiYongShen),
        llmFallback,
        lowQuality: lowQuality || undefined,
        qualityWarning,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('取名分析失败', err.stack);
      return this.getFallbackResult(input);
    }
  }

  /**
   * 分析五行缺失
   */
  private analyzeWuxing(
    wuxingCount: { wood: number; fire: number; earth: number; metal: number; water: number },
    dayGan: string,
  ) {
    const total = wuxingCount.wood + wuxingCount.fire + wuxingCount.earth + wuxingCount.metal + wuxingCount.water;
    const expectedAvg = total / 5;

    // 计算各五行占比
    const ratios: Record<string, number> = {};
    for (const [key, value] of Object.entries(wuxingCount)) {
      ratios[key] = value / total;
    }

    // 找出缺失和过旺的五行
    const missing: string[] = [];
    const excessive: string[] = [];

    for (const [element, count] of Object.entries(wuxingCount)) {
      if (count < expectedAvg * 0.6) {
        missing.push(this.getElementChinese(element));
      } else if (count > expectedAvg * 1.5) {
        excessive.push(this.getElementChinese(element));
      }
    }

    // 构建补充建议
    let recommendation = '';
    if (missing.length > 0) {
      recommendation = `宜补${missing.join('、')}之属`;
      if (excessive.length > 0) {
        recommendation += `，忌${excessive.join('、')}过旺`;
      }
    } else if (excessive.length > 0) {
      recommendation = `需泄${excessive.join('、')}过旺之气`;
    } else {
      recommendation = '五行相对平衡';
    }

    return {
      current: wuxingCount,
      missing,
      excessive,
      recommendation,
    };
  }

  /**
   * 计算喜用神（三层判定法）
   * 1. 特殊格局 → 直接使用 pattern
   * 2. 非特殊格局 → pattern十神映射五行 ∩ 日主强弱五行
   * 3. 交集非空则用交集，空则以pattern为准
   */
  private calculateXiYongShen(
    pattern: any,
    wuxingAnalysis: { current: Record<string, number> },
    dayGan: string,
  ): QumingOutput['xiYongShen'] {
    const ganWx: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
    const dayWx = ganWx[dayGan] || '木';
    const dayCount = wuxingAnalysis.current[this.getElementEnglish(dayWx)] || 0;

    const shengMap: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    const keMap: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

    const specialPatterns = ['化气', '专旺', '两气成象', '从格'];
    const isSpecial = specialPatterns.some(p => (pattern.patternName || '').includes(p));
    if (isSpecial) {
      const yong = pattern.favorableElements || [];
      return { xi: yong.length > 1 ? yong.slice(1, 3) : [], yong: yong.length > 0 ? [yong[0]] : [], ji: pattern.unfavorableElements || [] };
    }

    const shiShenToWx = (ss: string): string => {
      if (ss.includes('比') || ss.includes('劫')) return dayWx;
      if (ss.includes('印') || ss.includes('枭')) return shengMap[dayWx] || '';
      if (ss.includes('官') || ss.includes('杀')) return keMap[dayWx] || '';
      if (ss.includes('食') || ss.includes('伤')) return shengMap[dayWx] ? Object.keys(shengMap).find(k => shengMap[k] === dayWx) || '' : '';
      if (ss.includes('财')) return keMap[dayWx] ? Object.keys(keMap).find(k => keMap[k] === dayWx) || '' : '';
      return '';
    };

    const patternWx = new Set<string>();
    for (const f of (pattern.favorableElements || [])) { const wx = shiShenToWx(f); if (wx) patternWx.add(wx); }

    const strengthWx = new Set<string>();
    if (dayCount >= 4) {
      const ke = keMap[dayWx]; if (ke) strengthWx.add(ke);
      const xie = dayWx ? Object.keys(shengMap).find(k => shengMap[k] === dayWx) : undefined; if (xie) strengthWx.add(xie);
    } else if (dayCount <= 2) {
      const sheng = shengMap[dayWx]; if (sheng) strengthWx.add(sheng);
      strengthWx.add(dayWx);
    } else {
      for (const wx of patternWx) strengthWx.add(wx);
    }

    const intersection = [...patternWx].filter(wx => strengthWx.has(wx));
    let yongWx: string[];
    if (intersection.length > 0) {
      yongWx = intersection;
    } else {
      this.logger.warn(`[QumingAgent] 喜用神矛盾: pattern=[${[...patternWx]}] 强弱=[${[...strengthWx]}], 以pattern为准`);
      yongWx = [...patternWx];
    }

    const xiWx = new Set<string>();
    for (const yw of yongWx) { const s = shengMap[yw]; if (s && !yongWx.includes(s)) xiWx.add(s); }

    const jiWx = new Set<string>();
    for (const yw of yongWx) { const k = keMap[yw]; if (k && !yongWx.includes(k)) jiWx.add(k); }
    for (const uf of (pattern.unfavorableElements || [])) { const wx = shiShenToWx(uf); if (wx) jiWx.add(wx); }

    return { xi: [...xiWx], yong: yongWx, ji: [...jiWx] };
  }

  /**
   * 使用算法生成名字推荐
   */
  private generateNamesWithAlgorithm(
    input: QumingInput,
    bazi: any,
    wuxingAnalysis: any,
    xiYongShen: QumingOutput['xiYongShen'],
    zodiacTaboo?: { zodiac: string; rule: { taboos: string[]; reason: string } } | null,
  ): QumingOutput['nameSuggestions'] {
    const suggestions: QumingOutput['nameSuggestions'] = [];
    const gender = input.gender;

    // 需要补充的五行
    const needElements = wuxingAnalysis.missing.length > 0
      ? wuxingAnalysis.missing
      : xiYongShen.yong.map(w => this.getElementEnglish(w));

    // 获取推荐字
    let recommendedChars: string[] = [];

    // 优先从缺失五行取字
    for (const element of needElements) {
      const elementCn = this.getElementChinese(element);
      if (this.NAME_CHARACTERS[elementCn]) {
        recommendedChars.push(...this.NAME_CHARACTERS[elementCn].slice(0, 10));
      }
    }

    // 如果不够，从用神五行取
    if (recommendedChars.length < 10) {
      for (const yong of xiYongShen.yong) {
        const elementCn = this.getElementChinese(yong);
        if (this.NAME_CHARACTERS[elementCn]) {
          recommendedChars.push(...this.NAME_CHARACTERS[elementCn].slice(0, 5));
        }
      }
    }

    // 过滤掉需要避开的字
    if (input.avoidChars && input.avoidChars.length > 0) {
      recommendedChars = recommendedChars.filter(c => !input.avoidChars!.includes(c));
    }

    // P1.1b: 生肖禁忌过滤 — 移除含忌讳偏旁的字
    if (zodiacTaboo) {
      const before = recommendedChars.length;
      recommendedChars = filterZodiacTabooChars(recommendedChars, zodiacTaboo.rule.taboos);
      const removed = before - recommendedChars.length;
      if (removed > 0) {
        this.logger.debug(`[QumingAgent] 生肖「${zodiacTaboo.zodiac}」禁忌过滤: 移除 ${removed} 个含忌偏旁的字`);
      }
    }

    // 去重
    recommendedChars = [...new Set(recommendedChars)];

    // 生成完整名字
    const surname = input.surname || '李';
    const commonNames = this.COMMON_NAMES[gender] || this.COMMON_NAMES.male;

    // 策略1：直接使用推荐字搭配
    for (let i = 0; i < Math.min(5, recommendedChars.length); i++) {
      for (let j = i + 1; j < Math.min(i + 5, recommendedChars.length); j++) {
        if (suggestions.length >= 10) break;
        const name = `${surname}${recommendedChars[i]}${recommendedChars[j]}`;
        suggestions.push({
          characters: [recommendedChars[i], recommendedChars[j]],
          names: [name],
          reason: `名字含${recommendedChars[i]}、${recommendedChars[j]}，补足命局所需五行`,
        });
      }
      if (suggestions.length >= 10) break;
    }

    // 策略2：从常用名字库中筛选五行合适的
    for (const baseName of commonNames.slice(0, 10)) {
      if (suggestions.length >= 10) break;
      const givenName = baseName.slice(1); // 去掉姓氏
      const wuxing = this.checkNameWuxing(givenName);
      const matches = wuxing.filter(w => needElements.includes(w));
      if (matches.length > 0) {
        const fullName = surname + givenName;
        suggestions.push({
          characters: givenName.split(''),
          names: [fullName],
          reason: `名字含${matches.join('、')}属性，助益命局`,
        });
      }
    }

    // 策略3：添加一些好听的名字选项
    for (const baseName of commonNames.slice(0, 5)) {
      if (suggestions.length >= 10) break;
      const fullName = surname + baseName.slice(1);
      if (!suggestions.find(s => s.names.includes(fullName))) {
        suggestions.push({
          characters: baseName.slice(1).split(''),
          names: [fullName],
          reason: `音韵优美，寓意吉祥`,
        });
      }
    }

    return suggestions;
  }

  /**
   * 使用LLM生成名字推荐
   */
  private async generateNamesWithLLM(
    input: QumingInput,
    bazi: any,
    wuxingAnalysis: any,
    xiYongShen: QumingOutput['xiYongShen'],
    zodiacTaboo?: { zodiac: string; rule: { taboos: string[]; reason: string } } | null,
    retryCount = 0,
  ): Promise<QumingOutput['nameSuggestions'] & { lowQuality?: boolean; qualityWarning?: string }> {
    const surname = input.surname || '李';
    const genderStr = input.gender === 'male' ? '男孩' : '女孩';
    const missingStr = wuxingAnalysis.missing.join('、') || '无';
    const xiStr = [...xiYongShen.xi, ...xiYongShen.yong].join('、') || '待定';
    const jiStr = xiYongShen.ji.join('、') || '无';

    // 从独立的 md 文件读取 prompt 模板
    const promptsDir = path.join(__dirname, 'prompts');
    const systemPrompt = fs.readFileSync(
      path.join(promptsDir, 'quming-system-prompt.md'),
      'utf-8',
    );
    const userPromptTemplate = fs.readFileSync(
      path.join(promptsDir, 'quming-user-prompt.md'),
      'utf-8',
    );

    const userPrompt = userPromptTemplate
      .replace(/\{\{surname\}\}/g, surname)
      .replace(/\{\{gender\}\}/g, genderStr)
      .replace(/\{\{birthDate\}\}/g, input.birthDate)
      .replace(/\{\{birthTime\}\}/g, input.birthTime)
      .replace(/\{\{fourPillars\}\}/g, `${bazi.chart.year.pillar}/${bazi.chart.month.pillar}/${bazi.chart.day.pillar}/${bazi.chart.hour.pillar}`)
      .replace(/\{\{dayGan\}\}/g, bazi.chart.day.gan)
      .replace(/\{\{naYin\}\}/g, bazi.naYin.day || '未知')
      .replace(/\{\{wood\}\}/g, String(wuxingAnalysis.current.wood))
      .replace(/\{\{fire\}\}/g, String(wuxingAnalysis.current.fire))
      .replace(/\{\{earth\}\}/g, String(wuxingAnalysis.current.earth))
      .replace(/\{\{metal\}\}/g, String(wuxingAnalysis.current.metal))
      .replace(/\{\{water\}\}/g, String(wuxingAnalysis.current.water))
      .replace(/\{\{missing\}\}/g, missingStr)
      .replace(/\{\{xiYongShen\}\}/g, xiStr)
      .replace(/\{\{jiShen\}\}/g, jiStr)
      .replace(/\{\{parentWish\}\}/g, input.parentWishWords?.join('、') || input.customDescription || '无特别要求')
      .replace(/\{\{avoidChars\}\}/g, input.avoidChars?.join('、') || '无')
      .replace(/\{\{zodiac\}\}/g, zodiacTaboo?.zodiac || '未知')
      .replace(/\{\{zodiacTaboos\}\}/g, zodiacTaboo?.rule.taboos.join('、') || '无');

    // P1-11: 多轮对话上下文补充
    let contextAddition = '';
    if (input.namingType) {
      const typeMap = { baby: '宝宝取名', adult: '成人改名', brand: '品牌取名' };
      contextAddition += `\n取名类型：${typeMap[input.namingType] || input.namingType}`;
    }
    if (input.stylePreference && input.stylePreference.length > 0) {
      contextAddition += `\n风格偏好：${input.stylePreference.join('、')}`;
    }
    if (input.improveFocus) {
      contextAddition += `\n改善方向：${input.improveFocus}`;
    }
    if (input.industry) {
      contextAddition += `\n行业：${input.industry}`;
    }
    if (input.targetAudience) {
      contextAddition += `\n目标人群：${input.targetAudience}`;
    }
    if (input.originalName) {
      contextAddition += `\n原名：${input.originalName}`;
    }
    if (input.customDescription) {
      contextAddition += `\n用户特别要求：${input.customDescription}`;
    }

    const finalUserPrompt = contextAddition
      ? `${userPrompt}\n\n【用户补充信息】${contextAddition}`
      : userPrompt;

    const response = await this.llmProviders!.chatWithUser(
      finalUserPrompt,
      systemPrompt,
      undefined,
      { temperature: 0.7, maxTokens: 2000, timeout: 60000 },
    );

    const { suggestions, qualityResult } = this.parseNameSuggestions(response.content, surname);

    // 质量不通过：重试一次
    if (!qualityResult.passed && retryCount < 1) {
      this.logger.warn(`[QumingAgent] 质量不通过(score=${qualityResult.qualityScore})，重试第${retryCount + 1}次`);
      return this.generateNamesWithLLM(input, bazi, wuxingAnalysis, xiYongShen, zodiacTaboo, retryCount + 1);
    }

    // 重试仍不通过：降级返回
    if (!qualityResult.passed) {
      this.logger.warn(`[QumingAgent] 重试后质量仍不通过(score=${qualityResult.qualityScore})，返回降级结果`);
      return {
        ...suggestions,
        lowQuality: true,
        qualityWarning: 'AI 生成结果质量较低，建议重新生成',
      };
    }

    return suggestions;
  }

  /**
   * 解析LLM返回的名字建议
   */
  private parseNameSuggestions(content: string, surname: string): { suggestions: QumingOutput['nameSuggestions']; qualityResult: import('../consult/llm-quality-guard').QualityCheckResult } {
    try {
      // 安全提取：从第一个 { 到最后一个 } 匹配，然后验证
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let parsed: Record<string, unknown> | undefined;
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          // 贪婪匹配可能包含多余内容，尝试逐步缩小范围
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            try {
              parsed = JSON.parse(content.substring(firstBrace, lastBrace + 1));
            } catch {
              this.logger.warn('[QumingAgent] 缩小范围后仍无法解析 JSON');
            }
          }
        }

        if (parsed) {
          // P1-1: 接入统一质量守卫
          const qualityResult = checkLlmQuality(parsed, 'quming');
          this.logger.log(`[QumingAgent] 质量校验: score=${qualityResult.qualityScore}, passed=${qualityResult.passed}, barnumHits=${qualityResult.barnumHits.length}, missingFields=${qualityResult.missingFields.join(',')}`);

          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            const suggestions = parsed.suggestions.map((s: any) => {
              const name = s.name || '';
              const givenName = name.startsWith(surname) ? name.slice(surname.length) : name;
              return {
                characters: givenName.split(''),
                names: [name],
                reason: s.reason || '',
                barnumHit: qualityResult.barnumHits.length > 0,
              };
            });
            return { suggestions, qualityResult };
          }

          return { suggestions: [], qualityResult };
        }
      }
    } catch (parseErr) {
      this.logger.error(`[QumingAgent] LLM JSON 解析失败，原始输出前200字: ${content.substring(0, 200)}`);
      return {
        suggestions: [],
        qualityResult: { schemaValid: false, qualityScore: 0, barnumHits: [], validationFlags: ['parse_failed'], missingFields: ['parse_failed'], passed: false },
      };
    }

    return {
      suggestions: [],
      qualityResult: { schemaValid: false, qualityScore: 0, barnumHits: [], validationFlags: ['no_json_found'], missingFields: ['no_json_found'], passed: false },
    };
  }

  /**
   * 五格验证：对名字进行三才五格评分，过滤三格以上为凶的名字
   */
  private validateNameWuge(
    suggestions: QumingOutput['nameSuggestions'],
    surname: string,
  ): QumingOutput['nameSuggestions'] {
    if (!this.namingCalculator) return suggestions;

    const filtered: QumingOutput['nameSuggestions'] = [];

    for (const s of suggestions) {
      for (const name of s.names) {
        const givenName = name.startsWith(surname) ? name.slice(surname.length) : name;
        try {
          const wuge = this.namingCalculator.computeWuge({ surname, givenName });
          const detail = wuge.details;
          const jiCount = [detail.tiange, detail.renge, detail.dige, detail.waige, detail.zongge]
            .filter(g => g.ji).length;

          if (jiCount >= 3) {
            this.logger.debug(`[QumingAgent] 五格过滤: ${name} (吉格数=${jiCount}/5)`);
            continue;
          }

          filtered.push({
            ...s,
            names: [name],
            wuge: {
              tiange: { num: detail.tiange.num, wuxing: detail.tiange.wuxing, ji: detail.tiange.ji },
              renge: { num: detail.renge.num, wuxing: detail.renge.wuxing, ji: detail.renge.ji },
              dige: { num: detail.dige.num, wuxing: detail.dige.wuxing, ji: detail.dige.ji },
              waige: { num: detail.waige.num, wuxing: detail.waige.wuxing, ji: detail.waige.ji },
              zongge: { num: detail.zongge.num, wuxing: detail.zongge.wuxing, ji: detail.zongge.ji },
              score: jiCount,
            },
          });
        } catch {
          filtered.push(s);
        }
      }
    }

    return filtered;
  }

  /**
   * P1.1b: 生肖禁忌后过滤
   * 对已生成的名字逐字检查是否含禁忌偏旁，过滤命中的名字
   */
  private validateZodiacTaboo(
    suggestions: QumingOutput['nameSuggestions'],
    zodiacTaboo: { zodiac: string; rule: { taboos: string[]; reason: string } },
  ): QumingOutput['nameSuggestions'] {
    const filtered: QumingOutput['nameSuggestions'] = [];

    for (const s of suggestions) {
      let hasTaboo = false;
      for (const char of s.characters) {
        const hits = checkCharZodiacTaboo(char, zodiacTaboo.rule.taboos);
        if (hits.length > 0) {
          this.logger.debug(`[QumingAgent] 生肖后过滤: 字「${char}」含忌偏旁「${hits.join('、')}」（生肖${zodiacTaboo.zodiac}）`);
          hasTaboo = true;
          break;
        }
      }
      if (!hasTaboo) {
        filtered.push(s);
      }
    }

    // 如果过滤后为空，保留原始结果并记录警告
    if (filtered.length === 0 && suggestions.length > 0) {
      this.logger.warn(`[QumingAgent] 生肖后过滤移除了所有名字，保留原始结果`);
      return suggestions;
    }

    return filtered;
  }

  /**
   * 检查名字的五行属性
   */
  private checkNameWuxing(name: string): string[] {
    const result: string[] = [];
    const radicals = this.WUXING_RADICALS;

    for (const char of name) {
      for (const [element, radicalList] of Object.entries(radicals)) {
        if (radicalList.some(r => char.includes(r) || r.includes(char))) {
          if (!result.includes(element)) {
            result.push(element);
          }
        }
      }
    }

    return result;
  }

  /**
   * 构建一句准话
   */
  private buildSummaryLine(bazi: any, wuxingAnalysis: any, xiYongShen: QumingOutput['xiYongShen']): string {
    const dayGan = bazi.chart.day.gan;
    const missing = wuxingAnalysis.missing;
    const yong = xiYongShen.yong;

    if (missing.length > 0) {
      return `${dayGan}日主，八字缺${missing.join('、')}，宜取含${yong.join('')}偏旁之字以平衡命局`;
    }
    return `${dayGan}日主，八字五行相对平衡，取名宜顺势而为`;
  }

  /**
   * 构建详细分析
   */
  private buildSummaryBody(bazi: any, wuxingAnalysis: any, xiYongShen: QumingOutput['xiYongShen']): string {
    const dayGan = bazi.chart.day.gan;
    const naYin = this.getNaYin(bazi.chart.day.pillar) || '未知';
    const wuxing = wuxingAnalysis;

    let body = `日主${dayGan}，生于${naYin}之年。\n\n`;

    body += `【五行分布】木${wuxing.current.wood}、火${wuxing.current.fire}、土${wuxing.current.earth}、金${wuxing.current.metal}、水${wuxing.current.water}\n\n`;

    if (wuxing.missing.length > 0) {
      body += `【五行缺失】${wuxing.missing.join('、')}偏弱，需要补充\n`;
    }
    if (wuxing.excessive.length > 0) {
      body += `【五行过旺】${wuxing.excessive.join('、')}偏旺，需要泄耗\n`;
    }

    body += `【喜用神】${[...xiYongShen.xi, ...xiYongShen.yong].join('、')}\n`;
    body += `【忌神】${xiYongShen.ji.join('、') || '无'}\n\n`;

    body += `取名宜选用含${wuxing.recommendation}属性的字，同时注意音韵搭配和寓意吉祥。`;

    return body;
  }

  /**
   * 构建风险提示
   */
  private buildRisks(wuxingAnalysis: any): string[] {
    const risks: string[] = [];

    if (wuxingAnalysis.excessive.length > 0) {
      risks.push(`忌用${wuxingAnalysis.excessive.join('、')}属性过旺的字`);
    }

    risks.push('名字与姓氏搭配需综合考虑笔画数');
    risks.push('读音意境同样重要，避免谐音歧义');

    return risks;
  }

  /**
   * 构建行动建议
   */
  private buildActions(wuxingAnalysis: any, xiYongShen: QumingOutput['xiYongShen']): string[] {
    const actions: string[] = [];

    if (wuxingAnalysis.missing.length > 0) {
      actions.push(`列出5-10个候选名字，优先选择含${wuxingAnalysis.missing.join('、')}偏旁的字`);
    }

    actions.push('结合姓氏测试读音是否顺口');
    actions.push('考虑名字寓意与家族期望的契合度');
    actions.push('如有多字名可选，注意最后一个字的声调');

    return actions;
  }

  /**
   * 获取纳音五行
   */
  private getNaYin(pillar: string): string {
    if (!pillar) return '';
    const nayinMap: Record<string, string> = {
      '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
      '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
      '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
      '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
      '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
      '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
      '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
      '壬辰': '长流水', '癸巳': '长流水', '甲午': '沙中金', '乙未': '沙中金',
      '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
      '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
      '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
      '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
      '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
      '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
      '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
    };
    return nayinMap[pillar] || '';
  }

  /**
   * 获取五行中文字符
   */
  private getElementChinese(key: string): string {
    const map: Record<string, string> = {
      'wood': '木', 'fire': '火', 'earth': '土', 'metal': '金', 'water': '水',
      '木': '木', '火': '火', '土': '土', '金': '金', '水': '水',
    };
    return map[key] || key;
  }

  /**
   * 获取五行英文字符
   */
  private getElementEnglish(key: string): string {
    return WUXING_TO_EN[key] || key;
  }

  /**
   * 兜底结果
   */
  // P0-3: 构建空八字结果（用于 baby 缺出生日期 / adult 场景化提示）
  private buildEmptyBaziResult(options?: { lowQuality?: boolean; qualityWarning?: string }): QumingOutput {
    return {
      summaryLine: '',
      summaryBody: '',
      bazi: {
        yearPillar: '', monthPillar: '', dayPillar: '', hourPillar: '',
        dayGan: '', naYin: '',
      },
      wuxingAnalysis: {
        current: {}, missing: [], excessive: [],
        recommendation: '不进行五行判断',
      },
      xiYongShen: { xi: [], yong: [], ji: [] },
      nameSuggestions: [],
      risks: [],
      actions: [],
      lowQuality: options?.lowQuality,
      qualityWarning: options?.qualityWarning,
    };
  }

  // P0-3: 品牌取名场景化命名
  private async analyzeBrandNaming(input: QumingInput): Promise<QumingOutput> {
    this.logger.log('[QumingAgent] 品牌取名场景化命名');

    let nameSuggestions: QumingOutput['nameSuggestions'] = [];
    let llmFallback = false;

    if (this.llmProviders?.isConfigured()) {
      try {
        const prompt = `你是品牌命名专家。行业：${input.industry || '通用'}，目标人群：${input.targetAudience || '通用'}，风格偏好：${input.stylePreference?.join('、') || '无'}。请推荐2个品牌名，返回JSON格式：{"suggestions":[{"name":"名称","reason":"理由"}]}`;
        const response = await this.llmProviders.chatWithUser(
          prompt,
          '你是品牌命名专家，擅长为不同行业创造有记忆点、有寓意的品牌名。',
        );
        const parsed = JSON.parse(response.content);
        nameSuggestions = (parsed.suggestions || []).map((s: { name: string; reason?: string }) => ({
          characters: [],
          names: [s.name],
          reason: s.reason || '',
        }));
      } catch (err) {
        this.logger.warn(`[QumingAgent] 品牌取名LLM失败: ${(err as Error).message}`);
        llmFallback = true;
      }
    }

    return {
      summaryLine: '品牌取名方案',
      summaryBody: `针对${input.industry || '通用'}行业的品牌命名建议`,
      bazi: {
        yearPillar: '', monthPillar: '', dayPillar: '', hourPillar: '',
        dayGan: '', naYin: '',
      },
      wuxingAnalysis: {
        current: {}, missing: [], excessive: [],
        recommendation: '品牌取名不进行五行判断',
      },
      xiYongShen: { xi: [], yong: [], ji: [] },
      nameSuggestions,
      risks: ['商标注册需自行核验', '域名可用性需自行查询'],
      actions: [],
      llmFallback: llmFallback || undefined,
    };
  }

  private getFallbackResult(input: QumingInput): QumingOutput {
    return {
      summaryLine: '系统暂时无法完成取名分析，请稍后重试',
      summaryBody: '由于数据或计算原因，当前无法给出完整的取名建议。',
      bazi: {
        yearPillar: '', monthPillar: '', dayPillar: '', hourPillar: '',
        dayGan: '', naYin: '',
      },
      wuxingAnalysis: {
        current: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        missing: [], excessive: [], recommendation: '系统异常',
      },
      xiYongShen: { xi: [], yong: [], ji: [] },
      nameSuggestions: [],
      risks: ['系统暂时不可用'],
      actions: ['请稍后重试'],
      llmFallback: true,
    };
  }
}
