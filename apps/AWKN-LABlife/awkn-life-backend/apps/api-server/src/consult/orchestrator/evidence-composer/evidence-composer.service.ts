/**
 * EvidenceComposerService 主入口
 * 把 chartSnapshot + matchedRules + userContext 打包成 evidencePackage
 *
 * 输出三类证据：
 *   1. chartSnapshot：来自 calc-engine 的排盘快照（非 LLM 生成）
 *   2. matchedRules：按 severity 分组后的规则命中结果
 *   3. userContext：用户背景与关切点
 * 并附加：
 *   - knowledgeFragments：L2 检索器返回的占位知识片段
 *   - ruleBasedScore：规则化评分（完整度/置信度/风险/倾向）
 *   - meta：版本与时间戳
 */
import { Injectable } from '@nestjs/common';
import {
  EvidenceComposerInput,
  EvidencePackage,
  RuleBasedScore,
} from './evidence-composer.types';
import { MatchedRule } from '../rule-matcher/rule-matcher.types';
import { KnowledgeRetrieverService } from './knowledge-retriever/knowledge-retriever.service';

@Injectable()
export class EvidenceComposerService {
  constructor(private readonly knowledgeRetriever: KnowledgeRetrieverService) {}

  compose(input: EvidenceComposerInput): EvidencePackage {
    const { chartSnapshot, matchedRules, userContext } = input;

    // 按 severity 分组
    const high = matchedRules.filter(r => r.severity === 'high');
    const medium = matchedRules.filter(r => r.severity === 'medium');
    const low = matchedRules.filter(r => r.severity === 'low');

    // L2 知识检索
    const ruleIds = matchedRules.map(r => r.ruleId);
    const knowledgeFragments = this.knowledgeRetriever.retrieve(ruleIds);

    // 规则化评分
    const ruleBasedScore = this.computeScore(
      high,
      medium,
      low,
      chartSnapshot.female !== undefined,
    );

    return {
      chartSnapshot,
      matchedRules: { high, medium, low },
      knowledgeFragments,
      userContext,
      ruleBasedScore,
      meta: {
        versions: {
          prompt: 'v2.0',
          rules: 'v1.0',
          knowledge: 'v1.0-l2',
        },
        createdAt: new Date().toISOString(),
      },
    };
  }

  private computeScore(
    high: MatchedRule[],
    medium: MatchedRule[],
    low: MatchedRule[],
    hasFemale: boolean,
  ): RuleBasedScore {
    // evidenceCompleteness: 资料完整度 + 规则命中覆盖度
    const dataCompleteness = hasFemale ? 0.5 : 0.3;
    const ruleCoverage = Math.min(0.5, (high.length + medium.length + low.length) * 0.08);
    const evidenceCompleteness = Math.min(1, dataCompleteness + ruleCoverage);

    // decisionConfidence: 高风险规则越多，置信度越高（能下判断），
    // 但超过阈值反而降低（矛盾太多）
    const totalRules = high.length + medium.length + low.length;
    let decisionConfidence = 0.5;
    if (totalRules >= 3) decisionConfidence = 0.65;
    if (totalRules >= 5) decisionConfidence = 0.75;
    if (high.length >= 3) decisionConfidence = Math.min(decisionConfidence, 0.6);

    // riskLevel
    const riskLevel: 'low' | 'medium' | 'high' =
      high.length >= 2 ? 'high'
      : high.length >= 1 || medium.length >= 2 ? 'medium'
      : 'low';

    // decisionBias
    let decisionBias: 'proceed' | 'observe' | 'stop' | 'defer' = 'observe';
    if (riskLevel === 'high' && high.length >= 2) decisionBias = 'stop';
    else if (riskLevel === 'high') decisionBias = 'observe';
    else if (riskLevel === 'medium') decisionBias = 'observe';
    else decisionBias = 'proceed';

    return { evidenceCompleteness, decisionConfidence, riskLevel, decisionBias };
  }
}
