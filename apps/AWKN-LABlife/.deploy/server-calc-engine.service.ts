import { Injectable, Logger, Inject } from '@nestjs/common';
import { SolarTerm, LunarDate, LiurenResult } from './types';
import { calculateSolarTerm, getLunarDate } from './calculators';
import { BaziCalculatorWrapper, BaziFullResult } from './bazi-calculator-wrapper';
import { QimenAgentService, QimenResult } from '../qimen-agent/qimen-agent.service';

export interface CalcInput {
  routeType: 'liuren' | 'ziping' | 'quming' | 'qimen';
  question: string;
  askTime?: string;
  askLocation?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  gender?: string;
  timeUnknown?: boolean;
}

export interface CalcResult {
  routeType: string;
  calcData: LiurenResult | any;
  summary_core: string;
  risk_tags: string[];
  action_tags: string[];
  time_window: string[];
  evidence_tags: string[];
}

@Injectable()
export class CalcEngineService {
  private readonly logger = new Logger(CalcEngineService.name);

  constructor(
    @Inject(BaziCalculatorWrapper)
    private readonly baziCalculator: BaziCalculatorWrapper,
    @Inject(QimenAgentService)
    private readonly qimenAgent: QimenAgentService,
  ) {}

  async calculate(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculate called, routeType:', input.routeType);
    if (input.routeType === 'liuren') {
      return this.calculateLiuren(input);
    }
    if (input.routeType === 'quming') {
      return this.calculateQuming(input);
    }
    if (input.routeType === 'qimen') {
      return this.calculateQimen(input);
    }
    return this.calculateZiping(input);
  }

  /**
   * 取名算法计算（复用八字计算）
   */
  private async calculateQuming(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateQuming, input:', JSON.stringify(input));
    if (!input.birthDate) {
      throw new Error('缺少出生日期');
    }

    // 取名计算复用八字算法
    const zipingResult = await this.calculateZiping(input);

    // 额外返回取名所需的数据
    return {
      ...zipingResult,
      routeType: 'quming',
      summary_core: '取名八字分析完成',
    };
  }

  private async calculateLiuren(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateLiuren, input:', JSON.stringify(input));
    const askTime = input.askTime ? new Date(input.askTime) : new Date();
    const lunarDate = getLunarDate(askTime);
    const solarTerm = calculateSolarTerm(askTime);

    const tianDiPan = this.buildTianDiPan(lunarDate, solarTerm);
    const siKe = this.buildSiKe(tianDiPan);
    const sanChuan = this.buildSanChuan(siKe);
    const keTi = this.determineKeTi(sanChuan, siKe);
    const shensha = this.calculateShinsha(sanChuan, keTi);

    return {
      routeType: 'liuren',
      calcData: {
        tianDiPan,
        siKe,
        sanChuan,
        keTi,
        shensha,
      },
      summary_core: '断事推演排盘完成',
      risk_tags: ['需结合具体情境分析'],
      action_tags: ['建议进一步咨询'],
      time_window: ['近期关键节点'],
      evidence_tags: [keTi],
    };
  }

  private async calculateQimen(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateQimen, input:', JSON.stringify(input));
    const askTime = input.askTime ? new Date(input.askTime) : new Date();

    const paipanData: QimenResult = this.qimenAgent.paipan({
      year: askTime.getFullYear(),
      month: askTime.getMonth() + 1,
      day: askTime.getDate(),
      hour: askTime.getHours(),
      minute: askTime.getMinutes(),
      askTime: input.askTime,
      askLocation: input.askLocation,
      question: input.question,
    });

    const kaiMenPalace = paipanData.palaces.find((p) => p.door?.name === '开门');
    const shengMenPalace = paipanData.palaces.find((p) => p.door?.name === '生门');

    return {
      routeType: 'qimen',
      calcData: paipanData,
      summary_core: `${paipanData.geJu}排盘完成`,
      risk_tags: this.extractQimenRisks(paipanData),
      action_tags: this.extractQimenActions(paipanData),
      time_window: [paipanData.geJu],
      evidence_tags: [paipanData.xunHead, kaiMenPalace ? `开门${kaiMenPalace.name}宫` : '', shengMenPalace ? `生门${shengMenPalace.name}宫` : ''].filter(Boolean),
    };
  }

  private extractQimenRisks(paipanData: QimenResult): string[] {
    const risks: string[] = [];
    for (const palace of paipanData.palaces) {
      if (palace.door && ['死门', '惊门', '伤门'].includes(palace.door.name)) {
        risks.push(`${palace.door.name}临${palace.name}宫`);
      }
    }
    return risks.length > 0 ? risks : ['需结合具体情境分析'];
  }

  private extractQimenActions(paipanData: QimenResult): string[] {
    const actions: string[] = [];
    for (const palace of paipanData.palaces) {
      if (palace.door && ['开门', '休门', '生门'].includes(palace.door.name)) {
        actions.push(`${palace.door.name}临${palace.name}宫`);
      }
    }
    return actions.length > 0 ? actions : ['建议进一步咨询'];
  }

  private async calculateZiping(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateZiping, input:', JSON.stringify(input));
    if (!input.birthDate) {
      throw new Error('缺少出生日期');
    }

    const birthDate = new Date(input.birthDate);
    const birthTime = input.birthTime || '12:00';
    const timeParts = birthTime.split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10) || 0;
    const gender = (input.gender as 'male' | 'female') || 'male';

    // 使用 BaziCalculatorWrapper 进行八字计算
    const baziResult = await this.baziCalculator.calculate({
      year: birthDate.getFullYear(),
      month: birthDate.getMonth(), // 0-11
      day: birthDate.getDate(),
      hour,
      minute,
      gender
    });

    return {
      routeType: 'ziping',
      calcData: {
        yearPillar: baziResult.yearPillar,
        monthPillar: baziResult.monthPillar,
        dayPillar: baziResult.dayPillar,
        hourPillar: baziResult.hourPillar,
        yearShishen: baziResult.yearShishen,
        monthShishen: baziResult.monthShishen,
        dayShishen: baziResult.dayShishen,
        hourShishen: baziResult.hourShishen,
        wuxing: baziResult.wuxing,
        daYun: baziResult.daYun.map((d) => ({
          index: d.index,
          age: d.startAge,
          gan: d.gan,
          zhi: d.zhi,
          full: d.full,
          startAge: d.startAge,
          endAge: d.endAge,
        })),
        shenSha: baziResult.shenSha,
        naYin: baziResult.naYin,
        kongWang: baziResult.kongWang,
        taiYuan: baziResult.taiYuan,
        mingGong: baziResult.mingGong,
      },
      summary_core: '八字命盘计算完成',
      risk_tags: ['运势分析中'],
      action_tags: ['建议持续关注'],
      time_window: ['近期运势'],
      evidence_tags: [baziResult.yearPillar, baziResult.monthPillar],
    };
  }

  private buildTianDiPan(lunarDate: LunarDate, solarTerm: SolarTerm): any {
    const gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    return {
      riGan: gan[lunarDate.dayGan],
      yueJiang: solarTerm.yueJiang,
      tianPan: gan,
      diPan: zhi,
      lunarDate: lunarDate,
    };
  }

  private buildSiKe(tianDiPan: any): any[] {
    return [
      { gan: tianDiPan.riGan, zhi: tianDiPan.diPan[0] },
      { gan: tianDiPan.tianPan[1], zhi: tianDiPan.diPan[1] },
      { gan: tianDiPan.tianPan[2], zhi: tianDiPan.diPan[2] },
      { gan: tianDiPan.tianPan[3], zhi: tianDiPan.diPan[3] },
    ];
  }

  private buildSanChuan(siKe: any[]): any[] {
    return [
      { chuan: '初', gan: siKe[0].gan, zhi: siKe[0].zhi },
      { chuan: '中', gan: siKe[1].gan, zhi: siKe[1].zhi },
      { chuan: '末', gan: siKe[2].gan, zhi: siKe[2].zhi },
    ];
  }

  private determineKeTi(sanChuan: any[], siKe: any[]): string {
    return '一般课体';
  }

  private calculateShinsha(sanChuan: any[], keTi: string): Record<string, string> {
    return {
      keTi,
      total: `${sanChuan.length}传`,
    };
  }
}
