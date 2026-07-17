import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { CRISIS_KEYWORDS, isCrisisQuestion } from './crisis-keywords';

interface ScenarioRule {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  patterns: string[];
  response: string;
}

interface HighRiskScenario {
  scenarioId: string;
  scenarioName: string;
  response: string;
  isCrisis: boolean;
}

@Injectable()
export class HighRiskDetectorService {
  private readonly logger = new Logger(HighRiskDetectorService.name);
  private rules: ScenarioRule[] = [];

  constructor() {
    this.loadRules();
  }

  private loadRules() {
    try {
      const rulesPath = path.join(__dirname, 'scenario-rules.yaml');
      if (fs.existsSync(rulesPath)) {
        const content = fs.readFileSync(rulesPath, 'utf-8');
        const parsed = yaml.load(content) as any;
        this.rules = parsed?.scenarios || [];
        this.logger.log(`Loaded ${this.rules.length} scenario rules`);
      } else {
        this.logger.warn('scenario-rules.yaml not found, using empty rules');
        this.rules = [];
      }
    } catch (e) {
      this.logger.error(`Failed to load scenario rules: ${(e as Error).message}`);
      this.rules = [];
    }
  }

  detect(question: string): HighRiskScenario | null {
    // 1. 优先检测危机关键词
    if (isCrisisQuestion(question)) {
      this.logger.warn(`[CRISIS] Crisis keywords detected in question`);
      return {
        scenarioId: 'crisis',
        scenarioName: '危机干预',
        response: `我听到你了。你现在可能正在经历非常困难的时刻。

命理不能解决所有问题，有些时候你需要的是专业的帮助。

请记住——你不是一个人：
- 全国24小时心理援助热线：400-161-9995
- 北京心理危机研究与干预中心：010-82951332
- 生命热线：400-821-1215

如果你现在安全，我们可以继续聊。如果你需要帮助，请先拨打上面的电话。`,
        isCrisis: true,
      };
    }

    // 2. 检测高风险场景
    for (const rule of this.rules) {
      // 关键词匹配
      const keywordMatch = rule.keywords.some(kw =>
        question.toLowerCase().includes(kw.toLowerCase())
      );
      if (keywordMatch) {
        this.logger.log(`[SAFETY] Scenario matched: ${rule.name} (keyword)`);
        return {
          scenarioId: rule.id,
          scenarioName: rule.name,
          response: rule.response.trim(),
          isCrisis: false,
        };
      }

      // 正则匹配
      const patternMatch = rule.patterns.some(pattern => {
        try {
          return new RegExp(pattern, 'i').test(question);
        } catch {
          return false;
        }
      });
      if (patternMatch) {
        this.logger.log(`[SAFETY] Scenario matched: ${rule.name} (pattern)`);
        return {
          scenarioId: rule.id,
          scenarioName: rule.name,
          response: rule.response.trim(),
          isCrisis: false,
        };
      }
    }

    return null;
  }
}
