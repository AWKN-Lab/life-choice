import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { SolarTerm, LunarDate, LiurenResult } from './types';
import { calculateSolarTerm, getLunarDate } from './calculators';
import { BaziCalculatorWrapper, BaziFullResult } from './bazi-calculator-wrapper';
import { getShishen } from './bazi-engine/core/bazi-data.service';
import { NamingCalculator } from './naming-engine/naming-calculator';
import { QimenAgentService, QimenResult } from '../qimen-agent/qimen-agent.service';
import { LiuyaoAgentService, LiuyaoResult } from '../liuyao-agent/liuyao-agent.service';
import { ZiweiAgentService, ZiweiResult } from '../ziwei-agent/ziwei-agent.service';
import { MeihuaAgentService, MeihuaResult } from '../meihua-agent/meihua-agent.service';

export interface CalcInput {
  routeType: 'liuren' | 'ziping' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'meihua';
  question: string;
  askTime?: string;
  askLocation?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  gender?: string;
  timeUnknown?: boolean;
  hexagramCode?: string;
  // 取名专用参数
  surname?: string;
  givenName?: string;
  parentWish?: string;
  avoidChars?: string[];
  // 流盘参数
  targetYear?: number;
  targetMonth?: number;
  targetDay?: number;
  targetHour?: number;
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
    @Inject(LiuyaoAgentService)
    private readonly liuyaoAgent: LiuyaoAgentService,
    @Inject(ZiweiAgentService)
    private readonly ziweiAgent: ZiweiAgentService,
    @Inject(MeihuaAgentService)
    private readonly meihuaAgent: MeihuaAgentService,
    @Inject(NamingCalculator)
    private readonly namingCalculator: NamingCalculator,
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
    if (input.routeType === 'liuyao') {
      return this.calculateLiuyao(input);
    }
    if (input.routeType === 'ziwei') {
      return this.calculateZiwei(input);
    }
    if (input.routeType === 'meihua') {
      return this.calculateMeihua(input);
    }
    return this.calculateZiping(input);
  }

  /**
   * 取名算法计算（复用八字计算）
   */
  private async calculateQuming(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateQuming, input:', JSON.stringify(input));
    if (!input.birthDate) {
      throw new BadRequestException('缺少出生日期');
    }

    const zipingResult = await this.calculateZiping(input);

    let wuge = null;
    if (input.surname && input.givenName) {
      wuge = this.namingCalculator.computeWuge({
        surname: input.surname,
        givenName: input.givenName,
      });
    }

    return {
      ...zipingResult,
      routeType: 'quming',
      summary_core: wuge
        ? `取名分析完成 | 五格总分: ${wuge.scores.total} | ${wuge.sancaiJi ? '三才配置吉' : '三才配置需注意'}`
        : '取名八字分析完成',
      calcData: {
        ...zipingResult.calcData,
        wuge,
        surname: input.surname || '',
        givenName: input.givenName || '',
      },
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

  private async calculateLiuyao(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateLiuyao, input:', JSON.stringify(input));
    const askTime = input.askTime ? new Date(input.askTime) : new Date();

    const paipanData: LiuyaoResult = this.liuyaoAgent.paipan({
      askTime: input.askTime,
      question: input.question,
      hexagramCode: input.hexagramCode,
      year: askTime.getFullYear(),
      month: askTime.getMonth() + 1,
      day: askTime.getDate(),
      hour: askTime.getHours(),
      minute: askTime.getMinutes(),
    });

    const yongShen = this.extractLiuyaoYongShen(input.question, paipanData);
    const dongYaoText = paipanData.movingYaoPositions.length > 0
      ? `动爻第${paipanData.movingYaoPositions.join('、')}爻`
      : '无动爻';

    return {
      routeType: 'liuyao',
      calcData: paipanData,
      summary_core: `${paipanData.benGua.guaName}之${paipanData.zhiGua.guaName}排盘完成`,
      risk_tags: this.extractLiuyaoRisks(paipanData),
      action_tags: this.extractLiuyaoActions(paipanData),
      time_window: [paipanData.dongYaoCount > 0 ? '动爻变后7-14天' : '静卦以月令判断'],
      evidence_tags: [
        paipanData.benGua.guaName,
        paipanData.zhiGua.guaName,
        `用神${yongShen}`,
        dongYaoText,
        paipanData.dayKong ? `旬空${paipanData.dayKong}` : '',
      ].filter(Boolean),
    };
  }

  private extractLiuyaoYongShen(question: string, paipanData: LiuyaoResult): string {
    if (/财|钱|投资|收益/.test(question)) return '妻财';
    if (/官|职|事业|考试/.test(question)) return '官鬼';
    if (/病|健康/.test(question)) return '官鬼';
    if (/婚|恋|感情/.test(question)) return '妻财';
    if (/子|孩|学/.test(question)) return '子孙';
    if (/房|文书|合同/.test(question)) return '父母';
    const shiYao = paipanData.benGua.yaoList.find((y) => y.shiYing === '世');
    return shiYao?.liuQin || '兄弟';
  }

  private extractLiuyaoRisks(paipanData: LiuyaoResult): string[] {
    const risks: string[] = [];
    if (paipanData.dayKong) risks.push(`旬空${paipanData.dayKong}`);
    const movingYao = paipanData.benGua.yaoList.filter((y) => y.isMoving);
    for (const yao of movingYao) {
      risks.push(`${yao.liuQin}${yao.naJia}动`);
    }
    return risks.length > 0 ? risks : ['需结合具体情境分析'];
  }

  private extractLiuyaoActions(paipanData: LiuyaoResult): string[] {
    const actions: string[] = [];
    const shiYao = paipanData.benGua.yaoList.find((y) => y.shiYing === '世');
    if (shiYao) actions.push(`世爻${shiYao.naJia}（${shiYao.liuQin}）`);
    const yingYao = paipanData.benGua.yaoList.find((y) => y.shiYing === '應');
    if (yingYao) actions.push(`应爻${yingYao.naJia}（${yingYao.liuQin}）`);
    return actions.length > 0 ? actions : ['建议进一步咨询'];
  }

  private async calculateZiwei(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateZiwei, input:', JSON.stringify(input));
    if (!input.birthDate) {
      throw new BadRequestException('缺少出生日期');
    }

    const paipanData: ZiweiResult = this.ziweiAgent.paipan({
      birthDate: input.birthDate,
      birthTime: input.birthTime || '12:00',
      gender: (input.gender as 'male' | 'female') || 'male',
      birthPlace: input.birthPlace,
      question: input.question,
      targetYear: input.targetYear,
      targetMonth: input.targetMonth,
      targetDay: input.targetDay,
      targetHour: input.targetHour,
    });

    const mingGong = paipanData.palaces.find((p) => p.name === '命宫');
    const mingGongStars = mingGong?.majorStars.map((s) => s.name).join('、') || '空宫';

    const huaJiStars = paipanData.palaces
      .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '忌').map((s) => s.name));
    const huaLuStars = paipanData.palaces
      .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '禄').map((s) => s.name));

    return {
      routeType: 'ziwei',
      calcData: paipanData,
      summary_core: `${paipanData.fiveElementsClass}命宫${mingGongStars}排盘完成`,
      risk_tags: huaJiStars.length > 0 ? huaJiStars.map((s) => `${s}化忌`) : ['需结合大限流年判断'],
      action_tags: huaLuStars.length > 0 ? huaLuStars.slice(0, 3).map((s) => `${s}化禄`) : ['建议进一步咨询'],
      time_window: ['需结合大限流年判断'],
      evidence_tags: [
        paipanData.fiveElementsClass,
        `命宫${mingGongStars}`,
        paipanData.soul ? `命主${paipanData.soul}` : '',
        paipanData.zodiac ? `生肖${paipanData.zodiac}` : '',
        huaJiStars.length > 0 ? `化忌${huaJiStars.join('、')}` : '',
      ].filter(Boolean),
    };
  }

  // U-P2-1: 梅花易数计算
  private async calculateMeihua(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateMeihua, input:', JSON.stringify(input));
    const askTime = input.askTime ? new Date(input.askTime) : new Date();

    const paipanData: MeihuaResult = this.meihuaAgent.paipan({
      askTime: input.askTime,
      question: input.question,
      year: askTime.getFullYear(),
      month: askTime.getMonth() + 1,
      day: askTime.getDate(),
      hour: askTime.getHours(),
      minute: askTime.getMinutes(),
    });

    const dongYaoText = `动爻第${paipanData.movingYaoPos}爻`;
    const tiYongText = `体${paipanData.tiGua.guaName}·用${paipanData.yongGua.guaName}`;

    return {
      routeType: 'meihua',
      calcData: paipanData,
      summary_core: `${paipanData.benGua.guaName}之${paipanData.bianGua.guaName}排盘完成（${paipanData.jixiong}）`,
      risk_tags: paipanData.jixiong === '凶'
        ? [`${paipanData.tiYongRelation}，凶象`]
        : [paipanData.tiYongRelation],
      action_tags: [tiYongText, dongYaoText],
      time_window: [paipanData.jixiong === '吉' ? '近期可动' : paipanData.jixiong === '凶' ? '宜静守待变' : '动静皆可'],
      evidence_tags: [
        paipanData.benGua.guaName,
        paipanData.huGua.guaName,
        paipanData.bianGua.guaName,
        dongYaoText,
        tiYongText,
        paipanData.tiYongRelation,
      ],
    };
  }

  private async calculateZiping(input: CalcInput): Promise<CalcResult> {
    this.logger.log('[CalcEngine] calculateZiping, input:', JSON.stringify(input));
    if (!input.birthDate) {
      throw new BadRequestException('缺少出生日期');
    }

    const birthDate = new Date(input.birthDate);
    const birthTime = input.birthTime || '12:00';
    const timeParts = birthTime.split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10) || 0;
    const gender = (input.gender as 'male' | 'female') || 'male';

    const baziResult = await this.baziCalculator.calculate({
      year: birthDate.getFullYear(),
      month: birthDate.getMonth(),
      day: birthDate.getDate(),
      hour,
      minute,
      gender
    });

    let ziweiSummary = null;
    try {
      const ziweiData = this.ziweiAgent.paipan({
        birthDate: input.birthDate,
        birthTime: input.birthTime || '12:00',
        gender: (input.gender as 'male' | 'female') || 'male',
        birthPlace: input.birthPlace,
      });

      const mingGong = ziweiData.palaces.find((p) => p.name === '命宫');
      const shenGong = ziweiData.palaces.find((p) => p.isBodyPalace);
      const huaLu = ziweiData.palaces
        .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '禄').map((s) => ({ star: s.name, palace: p.name })));
      const huaQuan = ziweiData.palaces
        .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '权').map((s) => ({ star: s.name, palace: p.name })));
      const huaKe = ziweiData.palaces
        .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '科').map((s) => ({ star: s.name, palace: p.name })));
      const huaJi = ziweiData.palaces
        .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '忌').map((s) => ({ star: s.name, palace: p.name })));

      ziweiSummary = {
        fiveElementsClass: ziweiData.fiveElementsClass,
        soul: ziweiData.soul,
        body: ziweiData.body,
        mingGong: {
          ganZhi: mingGong ? `${mingGong.heavenlyStem}${mingGong.earthlyBranch}` : '',
          majorStars: mingGong?.majorStars.map((s) => s.name) || [],
          minorStars: mingGong?.minorStars.map((s) => s.name) || [],
        },
        shenGongName: shenGong?.name || '',
        sihua: {
          lu: huaLu,
          quan: huaQuan,
          ke: huaKe,
          ji: huaJi,
        },
        palaces: ziweiData.palaces.map((p) => ({
          name: p.name,
          ganZhi: `${p.heavenlyStem}${p.earthlyBranch}`,
          majorStars: p.majorStars.map((s) => {
            let label = s.name;
            if (s.mutagen) label += `[${s.mutagen}]`;
            return label;
          }),
          isBodyPalace: p.isBodyPalace,
          isMingGong: p.name === '命宫',
        })),
      };
      this.logger.log(`[CalcEngine] 紫微盘同步排盘成功: ${ziweiData.fiveElementsClass}`);
    } catch (err) {
      this.logger.warn('[CalcEngine] 紫微排盘失败，使用纯八字分析:', (err as Error).message);
    }

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
        qiYunAge: baziResult.qiYunAge,
        liuNian: baziResult.liuNian,
        liuNianDetail: baziResult.liuNianDetail,
        liuYue: this.buildLiuYue(baziResult.dayPillar[0], new Date().getFullYear()),
        shenSha: baziResult.shenSha,
        naYin: baziResult.naYin,
        kongWang: baziResult.kongWang,
        taiYuan: baziResult.taiYuan,
        mingGong: baziResult.mingGong,
        shenGong: baziResult.shenGong,
        zangganShishen: baziResult.zangganShishen,
        changsheng: baziResult.changsheng,
        selfSeat: baziResult.selfSeat,
        shenShaByPillar: baziResult.shenShaByPillar,
        xingChongHeHai: baziResult.xingChongHeHai,
        ziweiSummary,
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

  private buildLiuYue(dayGan: string, year: number) {
    const gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    const yearGan = gan[((year - 4) % 10 + 10) % 10];
    const firstMonthGanIndexMap: Record<string, number> = {
      '甲': 2, '己': 2,
      '乙': 4, '庚': 4,
      '丙': 6, '辛': 6,
      '丁': 8, '壬': 8,
      '戊': 0, '癸': 0,
    };
    const firstGanIndex = firstMonthGanIndexMap[yearGan] ?? 0;
    return monthBranches.map((branch, index) => {
      const monthGan = gan[(firstGanIndex + index) % 10];
      return {
        month: index + 1,
        solarTermMonth: branch,
        ganZhi: `${monthGan}${branch}`,
        gan: monthGan,
        zhi: branch,
        shishen: getShishen(dayGan, monthGan),
        season: ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'][index],
        theme: this.getLiuYueTheme(getShishen(dayGan, monthGan), branch),
      };
    });
  }

  private getLiuYueTheme(shishen: string, branch: string): string {
    const themeMap: Record<string, string> = {
      '正官': '规则、职位、责任与外部评价',
      '七杀': '压力、竞争、突破与风险边界',
      '正财': '稳定收入、预算、现金流',
      '偏财': '机会、资源流动、项目收益',
      '正印': '贵人、学习、资质与保护',
      '偏印': '灵感、策略、反思与非标路径',
      '食神': '表达、作品、口碑与稳定产出',
      '伤官': '突破、表达锋芒、制度摩擦',
      '比肩': '同辈、竞争、自我主张',
      '劫财': '资源分配、合伙、消耗与防守',
    };
    return `${branch}月主${themeMap[shishen] || '阶段性变化'}。`;
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
