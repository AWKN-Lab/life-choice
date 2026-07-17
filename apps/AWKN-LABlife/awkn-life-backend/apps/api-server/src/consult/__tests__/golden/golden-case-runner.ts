/**
 * Golden Case Runner - 半自动端到端回归测试
 *
 * 三种模式：
 * 1. --dry-run：加载 golden-cases.json + 验证字段，不调 LLM
 * 2. --analyze <file>：分析 LLM 输出文件，校验 14 段完整性 + 分值 + 关键词命中
 * 3. --prompt <caseId>：打印指定 case 的完整 prompt（供人工复制到 LLM）
 *
 * 14 段结构（对齐 prompt-layers.ts Layer 2）：
 *   5层：【事实层】【解读层】【推演层】【建议层】【点睛层】
 *   4段三段式：【我的判断】【前提】【代价】【推理轨迹】
 *   5段可证伪：【分值】【观察期】【红线】【三窗口】【落一句最实在的话】
 *
 * 用法：
 *   npx ts-node golden-case-runner.ts --dry-run
 *   npx ts-node golden-case-runner.ts --analyze output.txt
 *   npx ts-node golden-case-runner.ts --prompt gc-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { enforceRiskLevel } from '../../orchestrator/score-engine';

// ─── 14 段标记定义（对齐 prompt-layers.ts Layer 2） ───

const SEGMENT_MARKERS = [
  // 5 层
  { name: '事实层', pattern: /【事实层】([\s\S]*?)(?=【|$)/ },
  { name: '解读层', pattern: /【解读层】([\s\S]*?)(?=【|$)/ },
  { name: '推演层', pattern: /【推演层】([\s\S]*?)(?=【|$)/ },
  { name: '建议层', pattern: /【建议层】([\s\S]*?)(?=【|$)/ },
  { name: '点睛层', pattern: /【点睛层】([\s\S]*?)(?=【|$)/ },
  // 4 段三段式
  { name: '我的判断', pattern: /【我的判断】([\s\S]*?)(?=【|$)/ },
  { name: '前提', pattern: /【前提】([\s\S]*?)(?=【|$)/ },
  { name: '代价', pattern: /【代价】([\s\S]*?)(?=【|$)/ },
  { name: '推理轨迹', pattern: /【推理轨迹】([\s\S]*?)(?=【|$)/ },
  // 5 段可证伪
  { name: '分值', pattern: /【分值】([\s\S]*?)(?=【|$)/ },
  { name: '观察期', pattern: /【观察期】([\s\S]*?)(?=【|$)/ },
  { name: '红线', pattern: /【红线】([\s\S]*?)(?=【|$)/ },
  { name: '三窗口', pattern: /【三窗口】([\s\S]*?)(?=【|$)/ },
  { name: '落一句最实在的话', pattern: /【落一句最实在的话】([\s\S]*?)(?=【|$)/ },
];

const TOTAL_SEGMENTS = SEGMENT_MARKERS.length; // 14

// ─── 分值提取正则 ───

// 支持多种 LLM 输出格式：
//   "55/100"  → 分支1
//   "分值：55" / "分值: 55"  → 分支2
//   "【分值】55" / "【分值】\n- **分值**：55（说明）" / "【分值】55 风险等级：medium"  → 分支3
//   "55分"  → 分支4
const SCORE_PATTERN = /(\d{1,3})\s*\/\s*100|分值[：:]\s*(\d{1,3})|【分值】[^\d]*?(\d{1,3})|(\d{1,3})\s*分/i;
const RISK_PATTERN = /(low|medium|high|低|中|高)/i;

// ─── 类型定义 ───

interface GoldenCase {
  id: string;
  sourceRef: string;
  scenario: string;
  birthInfo: {
    year: number;
    month: number;
    day: number;
    hour: number;
    gender: string;
    birthPlace?: string;
  };
  partnerBirthInfo?: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    gender: string;
    birthPlace?: string;
  };
  multiTurn?: boolean;
  rounds?: Array<{
    round: number;
    role: string;
    content: string;
    context?: string;
    expectedCorrection?: string;
  }>;
  askTime?: string;
  question: string;
  expectedScoreRange: [number, number];
  expectedKeywords: string[];
  expectedSegments: string[];
  expectedRiskLevel: 'low' | 'medium' | 'high';
  expectedRedLines: string[];
  notes?: string;
}

interface GoldenCasesFile {
  version: string;
  description: string;
  source: string;
  baselineCase: string;
  totalCases: number;
  cases: GoldenCase[];
}

interface AnalyzeResult {
  caseId: string;
  segmentsFound: string[];
  segmentsMissing: string[];
  segmentsCount: number;
  isComplete: boolean;
  score: number | null;
  scoreInRange: boolean | null;
  riskLevel: string | null;
  riskMatch: boolean | null;
  keywordsHit: string[];
  keywordsHitCount: number;
  keywordsPassed: boolean;
  redLinesFound: string[];
  redLinesPassed: boolean;
  passed: boolean;
  failureReasons: string[];
  rawOutputLength: number;
}

// ─── 主入口 ───

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const mode = args[0];

  switch (mode) {
    case '--dry-run':
      runDryRun();
      break;
    case '--analyze':
      if (!args[1]) {
        console.error('❌ --analyze 需要指定文件路径');
        process.exit(1);
      }
      runAnalyze(args[1], args[2]); // args[2] = 可选 caseId
      break;
    case '--prompt':
      if (!args[1]) {
        console.error('❌ --prompt 需要指定 caseId');
        process.exit(1);
      }
      runPrintPrompt(args[1]);
      break;
    default:
      console.error(`❌ 未知模式：${mode}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
Golden Case Runner - 半自动端到端回归测试

用法：
  npx ts-node golden-case-runner.ts --dry-run
    加载 golden-cases.json + 验证字段，不调 LLM

  npx ts-node golden-case-runner.ts --analyze <file> [caseId]
    分析 LLM 输出文件，校验 14 段完整性 + 分值 + 关键词命中
    file: LLM 原始输出文本文件
    caseId: 可选，指定对应的 case（用于分值/关键词校验）

  npx ts-node golden-case-runner.ts --prompt <caseId>
    打印指定 case 的完整 prompt（供人工复制到 LLM）

14 段结构：
  5层：事实层/解读层/推演层/建议层/点睛层
  4段三段式：我的判断/前提/代价/推理轨迹
  5段可证伪：分值/观察期/红线/三窗口/落一句最实在的话
`);
}

// ─── 加载 golden cases ───

function loadGoldenCases(): GoldenCasesFile {
  const jsonPath = path.join(__dirname, 'golden-cases.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ golden-cases.json 不存在：${jsonPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(raw) as GoldenCasesFile;
}

// ─── 模式1：dry-run ───

function runDryRun() {
  console.log('━━━ Golden Case Runner - Dry Run ━━━\n');
  const data = loadGoldenCases();

  console.log(`版本：${data.version}`);
  console.log(`描述：${data.description}`);
  console.log(`来源：${data.source}`);
  console.log(`基准 case：${data.baselineCase}`);
  console.log(`声明总数：${data.totalCases}`);
  console.log(`实际总数：${data.cases.length}`);
  console.log(`字段校验：${validateCases(data.cases) ? '✅ 通过' : '❌ 失败'}\n`);

  console.log('Case 列表：');
  for (const c of data.cases) {
    const kwPreview = c.expectedKeywords.slice(0, 3).join('、');
    console.log(`  ${c.id} [${c.scenario}] 分值${c.expectedScoreRange[0]}-${c.expectedScoreRange[1]} 风险${c.expectedRiskLevel}`);
    console.log(`    Q: ${c.question.substring(0, 50)}...`);
    console.log(`    关键词: ${kwPreview}... (${c.expectedKeywords.length} 个)`);
  }

  console.log(`\n✅ Dry run 完成。共 ${data.cases.length} 条 case，字段齐全。`);
}

function validateCases(cases: GoldenCase[]): boolean {
  for (const c of cases) {
    if (!c.id || !c.scenario || !c.question || !c.birthInfo) {
      console.error(`❌ ${c.id || '未知'}: 缺少必填字段`);
      return false;
    }
    if (!Array.isArray(c.expectedScoreRange) || c.expectedScoreRange.length !== 2) {
      console.error(`❌ ${c.id}: expectedScoreRange 格式错误`);
      return false;
    }
    if (!Array.isArray(c.expectedKeywords) || c.expectedKeywords.length < 2) {
      console.error(`❌ ${c.id}: expectedKeywords 至少 2 个`);
      return false;
    }
    if (!['low', 'medium', 'high'].includes(c.expectedRiskLevel)) {
      console.error(`❌ ${c.id}: expectedRiskLevel 必须是 low/medium/high`);
      return false;
    }
  }
  return true;
}

// ─── 模式2：analyze ───

function runAnalyze(filePath: string, caseId?: string) {
  console.log('━━━ Golden Case Runner - Analyze ━━━\n');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在：${filePath}`);
    process.exit(1);
  }

  const rawOutput = fs.readFileSync(filePath, 'utf-8');
  console.log(`输出文件：${filePath}`);
  console.log(`输出长度：${rawOutput.length} 字符\n`);

  // 解析 14 段
  const segmentsFound: string[] = [];
  const segmentsMissing: string[] = [];

  for (const marker of SEGMENT_MARKERS) {
    const match = rawOutput.match(marker.pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      segmentsFound.push(marker.name);
    } else {
      segmentsMissing.push(marker.name);
    }
  }

  // 提取分值
  const scoreMatch = rawOutput.match(SCORE_PATTERN);
  const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3] || scoreMatch[4], 10) : null;

  // 提取风险等级
  const riskMatch = rawOutput.match(RISK_PATTERN);
  const llmRiskLevel = riskMatch ? normalizeRisk(riskMatch[1]) : null;

  // P0-③ (2026-07-06): 规则强制 riskLevel — 扫描 rawOutput 中的风险信号，调用 enforceRiskLevel 重算
  // 根因: enforceRiskLevel 已实现但全仓库无调用点，LLM 自评 riskLevel 漂移（gc-005 minimax=medium, deepseek=high）
  // 修复: 规则 > LLM 自评，扫描全文命中 HIGH/MEDIUM 信号，强制重算 riskLevel
  const HIGH_RISK_SIGNALS = ['七杀无制', '羊刃逢冲', '三刑', '伤官见官', '财坏印'];
  const MEDIUM_RISK_SIGNALS = ['子午冲', '卯酉冲', '子未害', '伏吟', '比劫夺财'];
  const allSignals = [...HIGH_RISK_SIGNALS, ...MEDIUM_RISK_SIGNALS];
  const hitSignals = allSignals.filter(s => rawOutput.includes(s));
  const ruleRiskLevel = enforceRiskLevel(hitSignals);
  const riskLevel = ruleRiskLevel; // 规则强制覆盖 LLM 自评

  // 关键词命中
  let keywordsHit: string[] = [];
  let expectedKeywords: string[] = [];
  let expectedScoreRange: [number, number] = [0, 100];
  let expectedRiskLevel: string | null = null;
  let expectedRedLines: string[] = [];

  if (caseId) {
    const data = loadGoldenCases();
    const caseData = data.cases.find(c => c.id === caseId);
    if (!caseData) {
      console.error(`❌ caseId ${caseId} 不存在于 golden-cases.json`);
      process.exit(1);
    }
    expectedKeywords = caseData.expectedKeywords;
    expectedScoreRange = caseData.expectedScoreRange;
    expectedRiskLevel = caseData.expectedRiskLevel;
    expectedRedLines = caseData.expectedRedLines;

    keywordsHit = expectedKeywords.filter(kw => rawOutput.includes(kw));
  }

  // 红线命中（在输出中查找 expectedRedLines 的关键词）
  const redLinesFound = caseId
    ? expectedRedLines.filter(rl => {
        // 提取红线关键词（如"不冲动领证"→"冲动领证"）
        const keyword = rl.replace(/^不/, '');
        return rawOutput.includes(keyword) || rawOutput.includes(rl);
      })
    : [];

  // 构建结果
  const failureReasons: string[] = [];

  if (segmentsMissing.length > 0) {
    failureReasons.push(`缺段：${segmentsMissing.join('、')}`);
  }
  if (score === null) {
    failureReasons.push('未提取到分值');
  } else if (caseId) {
    const [min, max] = expectedScoreRange;
    if (score < min || score > max) {
      failureReasons.push(`分值 ${score} 超出预期区间 ${min}-${max}`);
    }
  }
  if (caseId && riskLevel && expectedRiskLevel && riskLevel !== expectedRiskLevel) {
    failureReasons.push(`风险等级 ${riskLevel} ≠ 预期 ${expectedRiskLevel}`);
  }
  if (caseId && keywordsHit.length < 2) {
    failureReasons.push(`关键词命中 ${keywordsHit.length} < 2（命中：${keywordsHit.join('、') || '无'}）`);
  }

  const result: AnalyzeResult = {
    caseId: caseId || 'unknown',
    segmentsFound,
    segmentsMissing,
    segmentsCount: segmentsFound.length,
    isComplete: segmentsMissing.length === 0,
    score,
    scoreInRange: score !== null && caseId
      ? score >= expectedScoreRange[0] && score <= expectedScoreRange[1]
      : null,
    riskLevel,
    riskMatch: caseId && riskLevel && expectedRiskLevel ? riskLevel === expectedRiskLevel : null,
    keywordsHit,
    keywordsHitCount: keywordsHit.length,
    keywordsPassed: caseId ? keywordsHit.length >= 2 : true,
    redLinesFound,
    redLinesPassed: caseId ? redLinesFound.length >= 1 : true,
    passed: failureReasons.length === 0,
    failureReasons,
    rawOutputLength: rawOutput.length,
  };

  // 输出结果
  console.log('━━━ 分析结果 ━━━');
  console.log(`Case ID: ${result.caseId}`);
  console.log(`段数：${result.segmentsCount}/${TOTAL_SEGMENTS} ${result.isComplete ? '✅' : '❌'}`);
  if (segmentsMissing.length > 0) {
    console.log(`  缺段：${segmentsMissing.join('、')}`);
  }
  console.log(`分值：${result.score ?? '未提取'} ${result.scoreInRange === false ? '❌ 超区间' : result.scoreInRange === true ? '✅ 在区间' : ''}`);
  console.log(`风险：${result.riskLevel ?? '未提取'} ${result.riskMatch === false ? '❌ 不匹配' : result.riskMatch === true ? '✅ 匹配' : ''}`);
  if (llmRiskLevel && llmRiskLevel !== riskLevel) {
    console.log(`  └ LLM 自评：${llmRiskLevel} → 规则强制：${riskLevel}（命中信号：${hitSignals.join('、') || '无'}）`);
  } else if (hitSignals.length > 0) {
    console.log(`  └ 规则命中信号：${hitSignals.join('、')}`);
  }
  console.log(`关键词命中：${result.keywordsHitCount}/${expectedKeywords.length} ${result.keywordsPassed ? '✅' : '❌'}`);
  if (keywordsHit.length > 0) {
    console.log(`  命中：${keywordsHit.join('、')}`);
  }
  console.log(`红线命中：${redLinesFound.length}/${expectedRedLines.length} ${result.redLinesPassed ? '✅' : '❌'}`);
  console.log(`输出长度：${result.rawOutputLength} 字符`);
  console.log(`\n总结：${result.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (failureReasons.length > 0) {
    console.log('失败原因：');
    for (const r of failureReasons) {
      console.log(`  - ${r}`);
    }
  }

  // 输出 JSON 结果（供后续统计）
  const resultJson = JSON.stringify(result, null, 2);
  const resultPath = filePath.replace(/\.\w+$/, '') + `.${caseId || 'unknown'}.result.json`;
  fs.writeFileSync(resultPath, resultJson, 'utf-8');
  console.log(`\n结果已保存：${resultPath}`);
}

function normalizeRisk(s: string): string {
  const lower = s.toLowerCase();
  if (lower.includes('low') || s.includes('低')) return 'low';
  if (lower.includes('medium') || s.includes('中')) return 'medium';
  if (lower.includes('high') || s.includes('高')) return 'high';
  return lower;
}

// ─── 模式3：prompt ───

function runPrintPrompt(caseId: string) {
  console.log('━━━ Golden Case Runner - Print Prompt ━━━\n');
  const data = loadGoldenCases();
  const caseData = data.cases.find(c => c.id === caseId);

  if (!caseData) {
    console.error(`❌ caseId ${caseId} 不存在。可用：${data.cases.map(c => c.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`Case: ${caseData.id}`);
  console.log(`来源: ${caseData.sourceRef}`);
  console.log(`场景: ${caseData.scenario}`);
  console.log(`\n出生信息：`);
  console.log(`  年: ${caseData.birthInfo.year}`);
  console.log(`  月: ${caseData.birthInfo.month}`);
  console.log(`  日: ${caseData.birthInfo.day}`);
  console.log(`  时: ${caseData.birthInfo.hour}`);
  console.log(`  性别: ${caseData.birthInfo.gender}`);
  if (caseData.birthInfo.birthPlace) {
    console.log(`  出生地: ${caseData.birthInfo.birthPlace}`);
  }
  if (caseData.askTime) {
    console.log(`  问事时间: ${caseData.askTime}`);
  }
  console.log(`\n用户问题：`);
  console.log(caseData.question);
  console.log(`\n预期：`);
  console.log(`  分值区间: ${caseData.expectedScoreRange[0]}-${caseData.expectedScoreRange[1]}`);
  console.log(`  风险等级: ${caseData.expectedRiskLevel}`);
  console.log(`  关键词（至少命中2个）: ${caseData.expectedKeywords.join('、')}`);
  console.log(`  红线（至少命中1条）:`);
  for (const rl of caseData.expectedRedLines) {
    console.log(`    - ${rl}`);
  }
  console.log(`\n备注: ${caseData.notes || '无'}`);

  console.log('\n━━━ 复制以下内容到 LLM 调用 ━━━\n');
  console.log(`【场景】${caseData.scenario}`);
  console.log(`【出生】${caseData.birthInfo.year}年${caseData.birthInfo.month}月${caseData.birthInfo.day}日${caseData.birthInfo.hour}时 ${caseData.birthInfo.gender === 'male' ? '男' : '女'}${caseData.birthInfo.birthPlace ? ' ' + caseData.birthInfo.birthPlace : ''}`);
  if (caseData.askTime) {
    console.log(`【问时】${caseData.askTime}`);
  }
  console.log(`【问题】${caseData.question}`);
}

// ─── 启动 ───

main();
