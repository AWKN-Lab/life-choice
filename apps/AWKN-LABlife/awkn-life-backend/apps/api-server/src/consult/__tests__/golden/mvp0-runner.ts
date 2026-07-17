/**
 * MVP-0 Runner - 单条 case 端到端测试
 *
 * 用法：
 *   npx ts-node mvp0-runner.ts <caseId> [provider]
 *
 * 示例：
 *   npx ts-node mvp0-runner.ts gc-001 minimax
 *   npx ts-node mvp0-runner.ts gc-001 doubao
 *   npx ts-node mvp0-runner.ts gc-001 kimi
 *
 * provider 可选：minimax (默认) | doubao | kimi
 *
 * 流程：
 *   1. 加载 golden-cases.json
 *   2. 用 prompt-layers 构造完整 system prompt（含 14 段约束）
 *   3. 直接调 LLM provider API（OpenAI 兼容格式）
 *   4. 保存原始输出到 mvp0-output-<caseId>-<provider>.txt
 *   5. 打印简要结果（段数/分值/关键词）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { buildSystemPromptFromLayers } from '../../orchestrator/prompt-layers';
import { BaziCalculatorWrapper } from '../../../calc-engine/bazi-calculator-wrapper';
import { RuleMatcherService } from '../../orchestrator/rule-matcher/rule-matcher.service';
import { RuleMatcherInput } from '../../orchestrator/rule-matcher/rule-matcher.types';
import { EvidenceComposerService } from '../../orchestrator/evidence-composer/evidence-composer.service';
import { KnowledgeRetrieverService } from '../../orchestrator/evidence-composer/knowledge-retriever/knowledge-retriever.service';
import { EvidencePackage } from '../../orchestrator/evidence-composer/evidence-composer.types';

// ─── 加载 .env ───

const envPaths = [
  path.join(__dirname, '..', '..', '..', '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// ─── 类型定义 ───

interface GoldenCase {
  id: string;
  scenario: string;
  birthInfo: { year: number; month: number; day: number; hour: number; gender: string; birthPlace?: string };
  askTime?: string;
  question: string;
  expectedScoreRange: [number, number];
  expectedKeywords: string[];
  expectedRiskLevel: string;
  expectedRedLines: string[];
}

interface GoldenCasesFile {
  cases: GoldenCase[];
}

// ─── LLM Provider 配置 ───

const PROVIDERS: Record<string, { apiKeyEnv: string; baseUrl: string; model: string; temperature?: number }> = {
  minimax: {
    apiKeyEnv: 'MINIMAX_API_KEY',
    baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1',
    model: process.env.MINIMAX_MODEL || 'MiniMax-M2.7',
    temperature: 1.0, // minimax 必须为 1.0
  },
  doubao: {
    apiKeyEnv: 'DOUBAO_API_KEY',
    baseUrl: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    model: process.env.DOUBAO_MODEL || 'Doubao-Seed-2.0-pro',
  },
  kimi: {
    apiKeyEnv: 'KIMI_API_KEY',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
  },
  'deepseek-direct': {
    apiKeyEnv: 'DEEPSEEK_DIRECT_API_KEY',
    baseUrl: process.env.DEEPSEEK_DIRECT_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_DIRECT_MODEL || 'deepseek-v4-flash',
  },
};

// ─── 主入口 ───

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('用法：npx ts-node mvp0-runner.ts <caseId> [provider] [--with-evidence]');
    console.error('provider 可选：minimax (默认), doubao, kimi, deepseek-direct');
    console.error('--with-evidence: 启用证据包注入（RuleMatcher + EvidenceComposer）');
    process.exit(1);
  }

  const caseId = args[0];
  const providerName = args[1] && !args[1].startsWith('--') ? args[1] : 'minimax';
  const withEvidence = args.includes('--with-evidence');

  // 加载 case
  const jsonPath = path.join(__dirname, 'golden-cases.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as GoldenCasesFile;
  const caseData = data.cases.find(c => c.id === caseId);
  if (!caseData) {
    console.error(`❌ caseId ${caseId} 不存在。可用：${data.cases.map(c => c.id).join(', ')}`);
    process.exit(1);
  }

  // 检查 provider
  const provider = PROVIDERS[providerName];
  if (!provider) {
    console.error(`❌ provider ${providerName} 不支持。可用：${Object.keys(PROVIDERS).join(', ')}`);
    process.exit(1);
  }

  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) {
    console.error(`❌ ${provider.apiKeyEnv} 未设置`);
    process.exit(1);
  }

  console.log(`━━━ MVP-0 Runner ━━━`);
  console.log(`Case: ${caseData.id} [${caseData.scenario}]`);
  console.log(`Provider: ${providerName} (${provider.model})`);
  console.log(`Question: ${caseData.question.substring(0, 60)}...`);
  console.log();

  // ─── 调用 calc-engine 真实排盘（不再让 LLM 自己排盘） ───
  // BaziInput.month 是 0-11 (JS month)，golden-cases.json 的 month 是 1-12 自然月，需要 -1
  const baziCalc = new BaziCalculatorWrapper();
  const baziInput = {
    year: caseData.birthInfo.year,
    month: caseData.birthInfo.month - 1,  // 自然月 → JS month
    day: caseData.birthInfo.day,
    hour: caseData.birthInfo.hour,
    minute: 0,
    gender: caseData.birthInfo.gender as 'male' | 'female',
  };
  console.log(`排盘输入：${baziInput.year}-${baziInput.month + 1}-${baziInput.day} ${baziInput.hour}:00 ${baziInput.gender}`);
  const baziResult = await baziCalc.calculate(baziInput);
  console.log(`排盘结果：${baziResult.yearPillar} ${baziResult.monthPillar} ${baziResult.dayPillar} ${baziResult.hourPillar}`);
  console.log(`日主：${baziResult.dayPillar[0]}  日柱：${baziResult.dayPillar}`);

  // ═══ 当前年份（partner bazi 和主 bazi 共用） ═══
  const currentYear = new Date().getFullYear();

  // ─── 多轮合婚 case：对方八字排盘（gc-012） ───
  let partnerBaziResult: typeof baziResult | null = null;
  let partnerAgentSummary = '';
  if ((caseData as any).partnerBirthInfo) {
    const pbi = (caseData as any).partnerBirthInfo;
    const partnerInput = {
      year: pbi.year,
      month: pbi.month - 1,
      day: pbi.day,
      hour: pbi.hour ?? 12, // 时辰不详默认午时
      minute: 0,
      gender: pbi.gender as 'male' | 'female',
    };
    console.log(`对方排盘输入：${partnerInput.year}-${partnerInput.month + 1}-${partnerInput.day} ${partnerInput.hour}:00 ${partnerInput.gender}`);
    partnerBaziResult = await baziCalc.calculate(partnerInput);
    console.log(`对方排盘结果：${partnerBaziResult.yearPillar} ${partnerBaziResult.monthPillar} ${partnerBaziResult.dayPillar} ${partnerBaziResult.hourPillar}`);
    console.log(`对方日主：${partnerBaziResult.dayPillar[0]}  日柱：${partnerBaziResult.dayPillar}`);

    // 保存对方排盘 JSON
    const partnerBaziFile = path.join(__dirname, `mvp0-bazi-${caseId}-partner-${providerName}.json`);
    fs.writeFileSync(partnerBaziFile, JSON.stringify(partnerBaziResult, null, 2), 'utf-8');
    console.log(`对方排盘 JSON 已保存：${partnerBaziFile}`);

    // 对方当前流年
    const pActiveLiuNian = partnerBaziResult.liuNianDetail.find(l => l.year === currentYear) || partnerBaziResult.liuNianDetail[0];
    const pLiuNianSummary = pActiveLiuNian
      ? `${pActiveLiuNian.year}年(${pActiveLiuNian.ganZhi}) 十神=${pActiveLiuNian.shishen} 用忌=${pActiveLiuNian.yongJi} 主题="${pActiveLiuNian.theme}"`
      : '无流年数据';

    // 对方当前大运
    const pUserAge = currentYear - pbi.year;
    const pActiveDaYun = partnerBaziResult.daYun.find(d => pUserAge >= d.startAge && pUserAge <= d.endAge) || partnerBaziResult.daYun[0];
    const pDaYunSummary = pActiveDaYun
      ? `${pActiveDaYun.full}运(${pActiveDaYun.startAge}-${pActiveDaYun.endAge}岁)`
      : '无大运数据';

    // 对方刑冲合害
    const pxch = partnerBaziResult.xingChongHeHai;
    const pChongStr = pxch.chong.length > 0 ? pxch.chong.map(c => `${c.pillars.join('+')}(${c.relation})`).join('、') : '无';
    const pHeStr = pxch.he.length > 0 ? pxch.he.map(h => `${h.pillars.join('+')}(${h.relation})`).join('、') : '无';
    const pHaiStr = pxch.hai.length > 0 ? pxch.hai.map(h => `${h.pillars.join('+')}(${h.relation})`).join('、') : '无';
    const pXingStr = pxch.xing.length > 0 ? pxch.xing.map(x => `${x.pillars.join('+')}(${x.relation})`).join('、') : '无';

    // 对方流年刑冲合害
    const plnxChongStr = pActiveLiuNian && pActiveLiuNian.chong.length > 0
      ? pActiveLiuNian.chong.map(c => `${c.with}(${c.relation})`).join('、')
      : '无';
    const plnxHeStr = pActiveLiuNian && pActiveLiuNian.he.length > 0
      ? pActiveLiuNian.he.map(h => `${h.with}(${h.relation})`).join('、')
      : '无';

    // 互冲分析（男方四柱 vs 女方四柱）
    const mPillars = [baziResult.yearPillar, baziResult.monthPillar, baziResult.dayPillar, baziResult.hourPillar];
    const fPillars = [partnerBaziResult.yearPillar, partnerBaziResult.monthPillar, partnerBaziResult.dayPillar, partnerBaziResult.hourPillar];
    const pillarNames = ['年柱', '月柱', '日柱（夫妻宫）', '时柱'];
    const crossChong: string[] = [];
    const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const CHONG_PAIRS: Record<string, string> = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
    for (let i = 0; i < 4; i++) {
      const mDiZhi = mPillars[i][1];
      const fDiZhi = fPillars[i][1];
      if (CHONG_PAIRS[mDiZhi] === fDiZhi) {
        crossChong.push(`${pillarNames[i]}：男方${mDiZhi} ↔ 女方${fDiZhi}（相冲）`);
      }
    }
    const crossChongStr = crossChong.length > 0 ? crossChong.join('\n') : '无互冲';

    partnerAgentSummary = `
【对方四柱】
- 年柱：${partnerBaziResult.yearPillar}（${partnerBaziResult.yearShishen}）
- 月柱：${partnerBaziResult.monthPillar}（${partnerBaziResult.monthShishen}）
- 日柱：${partnerBaziResult.dayPillar} ← 夫妻宫
- 时柱：${partnerBaziResult.hourPillar}（${partnerBaziResult.hourShishen}）

【对方日主】${partnerBaziResult.dayPillar[0]}（${partnerBaziResult.naYin.day}）

【对方五行统计】木${partnerBaziResult.wuxing.wood} 火${partnerBaziResult.wuxing.fire} 土${partnerBaziResult.wuxing.earth} 金${partnerBaziResult.wuxing.metal} 水${partnerBaziResult.wuxing.water}

【对方当前大运】${pDaYunSummary}
【对方当前流年】${pLiuNianSummary}
- 流年冲：${plnxChongStr}
- 流年合：${plnxHeStr}

【对方原局刑冲合害】
- 冲：${pChongStr}
- 合：${pHeStr}
- 害：${pHaiStr}
- 刑：${pXingStr}

【双方互冲分析（四柱交叉对比）】
${crossChongStr}

${pbi.gender === 'female' ? '女方' : '男方'}生于${pbi.year}年${pbi.month}月${pbi.day}日${pbi.hour ? pbi.hour + '时' : '（时辰不详）'}${pbi.birthPlace ? '，' + pbi.birthPlace : ''}。
`;
  }

  const baziJsonFile = path.join(__dirname, `mvp0-bazi-${caseId}-${providerName}.json`);
  fs.writeFileSync(baziJsonFile, JSON.stringify(baziResult, null, 2), 'utf-8');
  console.log(`排盘 JSON 已保存：${baziJsonFile}`);

  // 格式化 agentSummary：包含四柱 + 五行 + 大运 + 流年 + 刑冲合害 + 神煞
  // 这是"强工程"的关键：把排盘事实喂给 LLM，让 LLM 只做解读+表达
  const dayGan = baziResult.dayPillar[0];
  const wx = baziResult.wuxing;
  const wxStr = `木${wx.wood} 火${wx.fire} 土${wx.earth} 金${wx.metal} 水${wx.water}`;

  // 当前活跃大运：根据当前年份推算（用 liuNian 找当前年）
  const activeLiuNian = baziResult.liuNianDetail.find(l => l.year === currentYear) || baziResult.liuNianDetail[0];
  const liuNianSummary = activeLiuNian
    ? `${activeLiuNian.year}年(${activeLiuNian.ganZhi}) 十神=${activeLiuNian.shishen} 用忌=${activeLiuNian.yongJi} 主题="${activeLiuNian.theme}"`
    : '无流年数据';

  // 当前活跃大运：用 user 当前年龄推断
  const userAge = currentYear - caseData.birthInfo.year;
  const activeDaYun = baziResult.daYun.find(d => userAge >= d.startAge && userAge <= d.endAge) || baziResult.daYun[0];
  const daYunSummary = activeDaYun
    ? `${activeDaYun.full}运(${activeDaYun.startAge}-${activeDaYun.endAge}岁)`
    : '无大运数据';

  // 刑冲合害（最关键：包含子午冲、申子辰三合等）
  const xch = baziResult.xingChongHeHai;
  const chongStr = xch.chong.length > 0 ? xch.chong.map(c => `${c.pillars.join('+')}(${c.relation})`).join('、') : '无';
  const heStr = xch.he.length > 0 ? xch.he.map(h => `${h.pillars.join('+')}(${h.relation})`).join('、') : '无';
  const haiStr = xch.hai.length > 0 ? xch.hai.map(h => `${h.pillars.join('+')}(${h.relation})`).join('、') : '无';
  const xingStr = xch.xing.length > 0 ? xch.xing.map(x => `${x.pillars.join('+')}(${x.relation})`).join('、') : '无';

  // 神煞
  const shenShaEntries = Object.entries(baziResult.shenSha);
  const shenShaStr = shenShaEntries.length > 0
    ? shenShaEntries.map(([name, pillars]) => `${name}(${pillars.join('/')})`).join('、')
    : '无';

  // 流年刑冲合害（流年 vs 原局）
  const lnxChongStr = activeLiuNian && activeLiuNian.chong.length > 0
    ? activeLiuNian.chong.map(c => `${c.with}(${c.relation})`).join('、')
    : '无';
  const lnxHeStr = activeLiuNian && activeLiuNian.he.length > 0
    ? activeLiuNian.he.map(h => `${h.with}(${h.relation})`).join('、')
    : '无';

  const agentSummary = `【系统已为你完成八字排盘，请基于以下排盘事实进行解读，不要再自己排盘】

【四柱】
- 年柱：${baziResult.yearPillar}（${baziResult.yearShishen}）
- 月柱：${baziResult.monthPillar}（${baziResult.monthShishen}）
- 日柱：${baziResult.dayPillar} ← 夫妻宫
- 时柱：${baziResult.hourPillar}（${baziResult.hourShishen}）

【日主】${dayGan}（${baziResult.naYin.day}）

【五行统计】${wxStr}

【当前大运】${daYunSummary}
【当前流年】${liuNianSummary}
- 流年冲：${lnxChongStr}
- 流年合：${lnxHeStr}

【原局刑冲合害】
- 冲：${chongStr}
- 合：${heStr}
- 害：${haiStr}
- 刑：${xingStr}

【神煞】${shenShaStr}

【空亡】${baziResult.kongWang.join('、') || '无'}

用户生于${caseData.birthInfo.year}年${caseData.birthInfo.month}月${caseData.birthInfo.day}日${caseData.birthInfo.hour}时，${caseData.birthInfo.gender === 'male' ? '男' : '女'}${caseData.birthInfo.birthPlace ? '，' + caseData.birthInfo.birthPlace : ''}。
${partnerAgentSummary}
【重要约束】以上排盘结果由系统计算，你必须直接使用这些四柱、五行、刑冲合害事实进行解读，不得修改或重新推算。${partnerBaziResult ? '\n【合婚专属约束】这是合婚问题，你需要同时分析双方八字。先分别解读男方和女方，再做互动分析（夫妻宫互冲、五行互补/克制、共同流年影响）。禁止只分析一方。' : ''}`;

  console.log(`agentSummary 长度：${agentSummary.length} 字符`);
  console.log();

  // ─── P1-A: 证据包注入（--with-evidence 时启用） ───
  let evidencePackage: EvidencePackage | undefined;
  if (withEvidence) {
    console.log('━━━ 证据包注入模式（--with-evidence）━━━');
    const ruleMatcher = new RuleMatcherService();
    const retriever = new KnowledgeRetrieverService();
    const composer = new EvidenceComposerService(retriever);

    const matchInput: RuleMatcherInput = {
      chartSnapshot: {
        male: baziResult,
        female: partnerBaziResult || undefined,
      },
      questionType: 'marriage_decision',
      userContext: {
        background: caseData.question.substring(0, 80),
        concerns: [],
      },
      currentYear,
      birthInfo: {
        maleBirthYear: caseData.birthInfo.year,
        femaleBirthYear: (caseData as any).partnerBirthInfo?.year,
      },
    };

    const matchResult = ruleMatcher.match(matchInput);
    console.log(`RuleMatcher 命中 ${matchResult.matchedRules.length} 条规则：${matchResult.matchedRules.map(r => r.ruleId).join(', ')}`);

    evidencePackage = composer.compose({
      chartSnapshot: matchInput.chartSnapshot,
      matchedRules: matchResult.matchedRules,
      userContext: matchInput.userContext,
    });

    console.log(`EvidenceComposer 产出证据包：high=${evidencePackage.matchedRules.high.length} medium=${evidencePackage.matchedRules.medium.length} low=${evidencePackage.matchedRules.low.length}`);
    console.log(`规则化评估：完整度=${evidencePackage.ruleBasedScore.evidenceCompleteness} 置信度=${evidencePackage.ruleBasedScore.decisionConfidence} 风险=${evidencePackage.ruleBasedScore.riskLevel} 偏置=${evidencePackage.ruleBasedScore.decisionBias}`);
    console.log();
  }

  // 构造 system prompt（用 prompt-layers，含 14 段约束）
  const systemPrompt = buildSystemPromptFromLayers({
    scenarioName: caseData.scenario,
    primaryAgent: 'zhangbanshan',
    primaryAgentName: 'liuren',
    secondaryAgent: null,
    availableTools: ['bazi', 'liuren'],
    memorySummary: '',
    emotionInstruction: '保持沉稳',
    question: caseData.question,
    agentName: '六壬+八字综合',
    agentSummary,
    secondarySection: '',
    evidencePackage,
  });

  // 构造 user prompt
  const birthStr = `${caseData.birthInfo.year}年${caseData.birthInfo.month}月${caseData.birthInfo.day}日${caseData.birthInfo.hour}时 ${caseData.birthInfo.gender === 'male' ? '男' : '女'}${caseData.birthInfo.birthPlace ? ' ' + caseData.birthInfo.birthPlace : ''}`;
  const userPrompt = `【用户出生信息】${birthStr}
${caseData.askTime ? `【问事时间】${caseData.askTime}\n` : ''}【用户问题】${caseData.question}

请按照系统提示的 14 段格式输出（5层 + 4段三段式 + 5段可证伪），缺一段视为未完成。`;

  console.log(`System prompt 长度：${systemPrompt.length} 字符`);
  console.log(`User prompt 长度：${userPrompt.length} 字符`);
  console.log(`\n开始调用 ${providerName} API...`);

  // 调用 LLM API
  const startTime = Date.now();
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: provider.temperature ?? 0.7,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      console.error(`\n❌ API 调用失败：${response.status} ${response.statusText}`);
      console.error(errText);
      process.exit(1);
    }

    const result = await response.json() as any;
    const content = result.choices?.[0]?.message?.content || '';
    const usage = result.usage || {};

    console.log(`\n✅ API 调用成功`);
    console.log(`耗时：${durationMs}ms`);
    console.log(`输出长度：${content.length} 字符`);
    console.log(`Token 使用：prompt=${usage.prompt_tokens || '?'}, completion=${usage.completion_tokens || '?'}, total=${usage.total_tokens || '?'}`);

    // 保存原始输出（--with-evidence 时加 -evidence 后缀区分新旧路径）
    const evidenceSuffix = withEvidence ? '-evidence' : '';
    const outputFile = path.join(__dirname, `mvp0-output-${caseId}-${providerName}${evidenceSuffix}.txt`);
    fs.writeFileSync(outputFile, content, 'utf-8');
    console.log(`\n原始输出已保存：${outputFile}`);

    // 简要分析
    console.log(`\n━━━ 简要分析 ━━━`);
    const segments = ['事实层', '解读层', '推演层', '建议层', '点睛层', '我的判断', '前提', '代价', '推理轨迹', '分值', '观察期', '红线', '三窗口', '落一句最实在的话'];
    let segCount = 0;
    const missingSegs: string[] = [];
    for (const seg of segments) {
      if (content.includes(`【${seg}】`)) {
        segCount++;
      } else {
        missingSegs.push(seg);
      }
    }
    console.log(`段数：${segCount}/14 ${segCount === 14 ? '✅' : '❌'}`);
    if (missingSegs.length > 0) {
      console.log(`  缺段：${missingSegs.join('、')}`);
    }

    // 关键词命中
    const keywordsHit = caseData.expectedKeywords.filter(kw => content.includes(kw));
    console.log(`关键词命中：${keywordsHit.length}/${caseData.expectedKeywords.length} ${keywordsHit.length >= 2 ? '✅' : '❌'}`);
    if (keywordsHit.length > 0) {
      console.log(`  命中：${keywordsHit.join('、')}`);
    }

    // 分值提取（支持多种 LLM 输出格式：见 golden-case-runner.ts SCORE_PATTERN 注释）
    const scoreMatch = content.match(/(\d{1,3})\s*\/\s*100|分值[：:]\s*(\d{1,3})|【分值】[^\d]*?(\d{1,3})|(\d{1,3})\s*分/i);
    const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3] || scoreMatch[4], 10) : null;
    const [minSc, maxSc] = caseData.expectedScoreRange;
    console.log(`分值：${score ?? '未提取'} ${score !== null ? (score >= minSc && score <= maxSc ? `✅ 在区间 ${minSc}-${maxSc}` : `❌ 超区间 ${minSc}-${maxSc}`) : ''}`);

    console.log(`\n用以下命令做完整分析：`);
    console.log(`npx ts-node golden-case-runner.ts --analyze ${outputFile} ${caseId}`);

  } catch (error) {
    console.error(`\n❌ 调用失败：${error.message}`);
    process.exit(1);
  }
}

main();
