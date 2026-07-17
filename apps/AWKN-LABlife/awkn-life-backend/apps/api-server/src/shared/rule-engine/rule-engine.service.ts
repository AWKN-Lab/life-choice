import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ConditionClause, Rule, RuleSet, StructuredConclusion } from './rule-types';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);
  private ruleSets: Map<string, RuleSet> = new Map();
  private readonly rulesDir: string;

  constructor() {
    this.rulesDir = path.resolve(__dirname, 'rules');
    this.loadAllRuleSets();
  }

  private loadAllRuleSets() {
    if (!fs.existsSync(this.rulesDir)) {
      this.logger.warn(`Rules directory not found: ${this.rulesDir}`);
      return;
    }

    const files = fs.readdirSync(this.rulesDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const filePath = path.join(this.rulesDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const ruleSet = JSON.parse(raw) as RuleSet;
        this.ruleSets.set(ruleSet.name, ruleSet);
        this.logger.log(`Loaded rule set: ${ruleSet.name} (${ruleSet.rules.length} rules)`);
      } catch (err) {
        this.logger.error(`Failed to load rule file ${file}: ${(err as Error).message}`);
      }
    }
  }

  reload(): void {
    this.ruleSets.clear();
    this.loadAllRuleSets();
    this.logger.log('All rule sets reloaded');
  }

  getRuleSet(name: string): RuleSet | undefined {
    return this.ruleSets.get(name);
  }

  getAllRuleSets(): RuleSet[] {
    return Array.from(this.ruleSets.values());
  }

  evaluate(ruleSetName: string, facts: Record<string, unknown>): Rule[] {
    const ruleSet = this.ruleSets.get(ruleSetName);
    if (!ruleSet) {
      this.logger.warn(`Rule set not found: ${ruleSetName}`);
      return [];
    }

    const matched: Rule[] = [];

    for (const rule of ruleSet.rules) {
      if (this.matchConditions(rule.condition, facts)) {
        matched.push(rule);
      }
    }

    matched.sort((a, b) => b.priority - a.priority);
    return matched;
  }

  evaluateAll(facts: Record<string, unknown>): Map<string, Rule[]> {
    const results = new Map<string, Rule[]>();
    for (const [name] of this.ruleSets) {
      const matched = this.evaluate(name, facts);
      if (matched.length > 0) {
        results.set(name, matched);
      }
    }
    return results;
  }

  private matchConditions(
    conditions: Record<string, ConditionClause>,
    facts: Record<string, unknown>,
  ): boolean {
    for (const [key, clause] of Object.entries(conditions)) {
      const factValue = facts[key];
      if (!this.evaluateClause(clause, factValue)) {
        return false;
      }
    }
    return true;
  }

  private evaluateClause(clause: ConditionClause, factValue: unknown): boolean {
    if (factValue === undefined || factValue === null) {
      return clause.op === 'neq';
    }

    switch (clause.op) {
      case 'eq':
        return String(factValue) === String(clause.value);
      case 'neq':
        return String(factValue) !== String(clause.value);
      case 'in':
        return Array.isArray(clause.value) && clause.value.some((v) => String(v) === String(factValue));
      case 'notIn':
        return Array.isArray(clause.value) && !clause.value.some((v) => String(v) === String(factValue));
      case 'contains':
        return String(factValue).includes(String(clause.value));
      case 'gte':
        return Number(factValue) >= Number(clause.value);
      case 'lte':
        return Number(factValue) <= Number(clause.value);
      case 'between': {
        if (!Array.isArray(clause.value) || clause.value.length !== 2) return false;
        const num = Number(factValue);
        return num >= Number(clause.value[0]) && num <= Number(clause.value[1]);
      }
      default:
        return false;
    }
  }

  buildStructuredConclusion(
    method: string,
    matchedRules: Map<string, Rule[]>,
    paipanData: Record<string, unknown>,
  ): StructuredConclusion {
    const allRules: Rule[] = [];
    for (const rules of matchedRules.values()) {
      allRules.push(...rules);
    }
    allRules.sort((a, b) => b.priority - a.priority);

    const shenshaRules = allRules.filter((r) => r.category === 'shensha');
    const patternRules = allRules.filter((r) => r.category === 'pattern' || r.category === 'keti');
    const zhanduanRules = allRules.filter((r) => r.category === 'zhanduan');

    const triggeredShensha = shenshaRules.map((r) => ({
      name: (r.then.name as string) || r.id,
      level: (r.then.level as string) || '平',
      judgment: (r.then.judgment as string) || '',
      source: r.source,
    }));

    const triggeredPatterns = patternRules.map((r) => ({
      name: (r.then.name as string) || r.id,
      judgment: (r.then.judgment as string) || '',
      source: r.source,
    }));

    const jiCount = triggeredShensha.filter((s) => s.level === '吉').length;
    const xiongCount = triggeredShensha.filter((s) => s.level === '凶').length;

    let jixiong: StructuredConclusion['jixiong'] = '平';
    if (jiCount > xiongCount + 1) jixiong = '吉';
    else if (xiongCount > jiCount + 1) jixiong = '凶';
    else if (jiCount > 0 && xiongCount > 0) jixiong = '吉凶参半';

    const riskLevelMap: Record<string, StructuredConclusion['riskLevel']> = {
      '吉': '低',
      '平': '中',
      '吉凶参半': '中高',
      '凶': '高',
    };

    const summary = this.buildSummary(method, jixiong, triggeredShensha, zhanduanRules);

    return {
      method,
      summary,
      jixiong,
      riskLevel: riskLevelMap[jixiong],
      riskDescription: xiongCount > 0 ? `触发${xiongCount}个凶煞，需注意` : '当前无明显凶煞',
      triggeredShensha,
      triggeredPatterns,
      timeWindows: zhanduanRules
        .filter((r) => r.then.timeWindow)
        .map((r) => ({
          period: (r.then.timeWindow as string) || '',
          theme: (r.then.theme as string) || '',
          advice: (r.then.advice as string) || '',
        })),
      doList: zhanduanRules
        .filter((r) => r.then.actionDo)
        .flatMap((r) => (Array.isArray(r.then.actionDo) ? r.then.actionDo : [r.then.actionDo])) as string[],
      dontList: zhanduanRules
        .filter((r) => r.then.actionDont)
        .flatMap((r) => (Array.isArray(r.then.actionDont) ? r.then.actionDont : [r.then.actionDont])) as string[],
      evidenceTags: allRules.map((r) => `${r.source}:${r.id}`),
    };
  }

  private buildSummary(
    method: string,
    jixiong: string,
    shensha: { name: string; level: string }[],
    zhanduanRules: Rule[],
  ): string {
    const jiList = shensha.filter((s) => s.level === '吉').map((s) => s.name);
    const xiongList = shensha.filter((s) => s.level === '凶').map((s) => s.name);

    const parts: string[] = [];
    parts.push(`${method}断事：总体${jixiong}`);

    if (jiList.length > 0) {
      parts.push(`吉神：${jiList.join('、')}`);
    }
    if (xiongList.length > 0) {
      parts.push(`凶煞：${xiongList.join('、')}`);
    }

    const mainJudgment = zhanduanRules.find((r) => r.then.mainJudgment);
    if (mainJudgment) {
      parts.push(mainJudgment.then.mainJudgment as string);
    }

    return parts.join('。');
  }
}