import { Injectable } from '@nestjs/common';
import { WritingStyle } from './style-template.service';

export interface StyleCapability {
  style: WritingStyle;
  supportedAgents: string[];
  supportedCategories: string[];
  qualityScore: number;
  avgLatencyMs: number;
}

@Injectable()
export class StyleCapabilityMatrixService {
  private readonly matrix: Map<string, StyleCapability> = new Map();

  constructor() {
    this.initializeMatrix();
  }

  private initializeMatrix(): void {
    const capabilities: StyleCapability[] = [
      {
        style: 'professional',
        supportedAgents: ['bazi-agent', 'ziwei-agent', 'liuren-agent', 'ziping-agent'],
        supportedCategories: ['事业', '财运', '学业', '健康'],
        qualityScore: 0.85,
        avgLatencyMs: 2000,
      },
      {
        style: 'warm',
        supportedAgents: ['bazi-agent', 'ziwei-agent', 'ziping-agent', 'qiming-agent'],
        supportedCategories: ['婚姻', '感情', '健康', '运势'],
        qualityScore: 0.9,
        avgLatencyMs: 1800,
      },
      {
        style: 'concise',
        supportedAgents: ['bazi-agent', 'liuren-agent'],
        supportedCategories: ['事业', '财运'],
        qualityScore: 0.75,
        avgLatencyMs: 1200,
      },
      {
        style: 'detailed',
        supportedAgents: ['bazi-agent', 'ziwei-agent', 'liuren-agent'],
        supportedCategories: ['事业', '财运', '婚姻', '健康', '学业'],
        qualityScore: 0.88,
        avgLatencyMs: 3000,
      },
      {
        style: 'literary',
        supportedAgents: ['bazi-agent', 'ziwei-agent'],
        supportedCategories: ['运势', '性格', '婚姻'],
        qualityScore: 0.82,
        avgLatencyMs: 2500,
      },
    ];

    for (const cap of capabilities) {
      this.matrix.set(cap.style, cap);
    }
  }

  /**
   * 获取风格能力
   */
  getCapability(style: WritingStyle): StyleCapability | undefined {
    return this.matrix.get(style);
  }

  /**
   * 检查Agent是否支持指定风格
   */
  isAgentStyleSupported(agentName: string, style: WritingStyle): boolean {
    const cap = this.matrix.get(style);
    return cap ? cap.supportedAgents.includes(agentName) : false;
  }

  /**
   * 获取Agent支持的所有风格
   */
  getAgentStyles(agentName: string): WritingStyle[] {
    const styles: WritingStyle[] = [];
    for (const [style, cap] of this.matrix) {
      if (cap.supportedAgents.includes(agentName)) {
        styles.push(style as WritingStyle);
      }
    }
    return styles;
  }

  /**
   * 获取分类推荐风格
   */
  getRecommendedStyle(category: string, agentName: string): WritingStyle {
    let bestStyle: WritingStyle = 'warm';
    let bestScore = 0;

    for (const [style, cap] of this.matrix) {
      if (
        cap.supportedCategories.includes(category) &&
        cap.supportedAgents.includes(agentName) &&
        cap.qualityScore > bestScore
      ) {
        bestScore = cap.qualityScore;
        bestStyle = style as WritingStyle;
      }
    }

    return bestStyle;
  }

  /**
   * 获取完整矩阵
   */
  getFullMatrix(): StyleCapability[] {
    return Array.from(this.matrix.values());
  }
}
