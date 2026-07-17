import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface CaseExample {
  id: string;
  title: string;
  category: string;
  question: string;
  context: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
}

export interface CaseLibrary {
  version: string;
  updated: string;
  cases: {
    liuren: CaseExample[];
    bazi: CaseExample[];
  };
}

@Injectable()
export class CaseLibraryService {
  private readonly logger = new Logger(CaseLibraryService.name);
  private readonly library: CaseLibrary;

  constructor() {
    this.library = this.loadCases();
  }

  private loadCases(): CaseLibrary {
    try {
      const filePath = path.resolve(__dirname, 'cases.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as CaseLibrary;
    } catch (err) {
      this.logger.warn(`Failed to load case library: ${(err as Error).message}`);
      return { version: 'v1', updated: '', cases: { liuren: [], bazi: [] } };
    }
  }

  getLiurenExamples(count = 2): CaseExample[] {
    return this.library.cases.liuren.slice(0, count);
  }

  getBaziExamples(count = 2): CaseExample[] {
    return this.library.cases.bazi.slice(0, count);
  }

  formatLiurenExample(caseItem: CaseExample): string {
    const ctx = caseItem.context as Record<string, unknown>;
    const out = caseItem.outputSummary as Record<string, unknown>;
    const doList = (out.actionDo as string[] || []).map((a: string) => `  - ${a}`).join('\n');
    const dontList = (out.actionDont as string[] || []).map((a: string) => `  - ${a}`).join('\n');
    const windows = (out.timeWindows as string[] || []).map((w: string) => `  - ${w}`).join('\n');

    return `【案例参考：${caseItem.title}】
问题：${caseItem.question}
课式背景：${ctx.classType || ''}，三传${ctx.tripleTransmission || ''}，关键结构${JSON.stringify(ctx.keyStructures || [])}
输出示范：
> 结论：${out.conclusion || ''}
> 风险：${out.risk || ''}
> 该做：
${doList}
> 不该做：
${dontList}
> 时间窗口：
${windows}
> 落一句实在话：${out.closingLine || ''}`;
  }

  formatBaziExample(caseItem: CaseExample): string {
    const ctx = caseItem.context as Record<string, unknown>;
    const out = caseItem.outputSummary as Record<string, unknown>;

    return `【案例参考：${caseItem.title}】
问题：${caseItem.question}
命局背景：${JSON.stringify(ctx.fourPillars || {})}，日主${ctx.dayMaster || ''}，格局${ctx.pattern || ''}
输出示范：
> 结论：${out.conclusion || ''}
> 关键结构：${out.keyStructure || ''}
> 各板块判断：${JSON.stringify(out.fourDomains || out.sections || {})}
> 最佳月份：${JSON.stringify(out.bestMonths || [])}
> 最差月份：${JSON.stringify(out.worstMonths || [])}
> 落一句实在话：${out.closingLine || ''}`;
  }

  getLiurenFewShot(maxChars = 1500): string {
    const examples = this.getLiurenExamples(2);
    return examples
      .map((e) => this.formatLiurenExample(e))
      .join('\n\n')
      .slice(0, maxChars);
  }

  getBaziFewShot(maxChars = 1500): string {
    const examples = this.getBaziExamples(2);
    return examples
      .map((e) => this.formatBaziExample(e))
      .join('\n\n')
      .slice(0, maxChars);
  }
}