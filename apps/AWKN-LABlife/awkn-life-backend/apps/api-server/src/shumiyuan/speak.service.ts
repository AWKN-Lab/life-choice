import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { SpeakInputDto, SpeakOutputDto } from './dto';
import { buildIdentityLayer } from '../consult/orchestrator/prompt-layers';

@Injectable()
export class SpeakService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmProviders: LlmProvidersService,
  ) {}

  async process(input: SpeakInputDto): Promise<SpeakOutputDto> {
    // 1. 创建 ConsultRecord
    const record = await this.prisma.consultRecord.create({
      data: {
        userId: input.userId || null,
        question: input.question,
        routeType: 'shumiyuan',
        status: 'analyzing',
        flowStatus: 'speaking',
        inputData: JSON.stringify({ question: input.question }),
      },
    });

    // 2. 调用 LLM 识别
    const llmResult = await this.analyzeWithLLM(input.question);

    // 3. 更新记录
    await this.prisma.consultRecord.update({
      where: { id: record.id },
      data: {
        status: 'completed',
        llmResult: JSON.stringify(llmResult),
        analysisData: JSON.stringify(llmResult),
      },
    });

    return {
      recordId: record.id,
      sessionId: record.sessionId!,
      identifiedType: llmResult.identifiedType,
      relatedPeople: llmResult.relatedPeople,
      userEmotion: llmResult.userEmotion,
      coreStuckPoint: llmResult.coreStuckPoint,
      riskWords: llmResult.riskWords,
      options: llmResult.options,
      nextStep: 'spreading',
    };
  }

  private async analyzeWithLLM(question: string): Promise<{
    identifiedType: string;
    relatedPeople: string[];
    userEmotion: string;
    coreStuckPoint: string;
    riskWords: string[];
    options: string[];
  }> {
    const prompt = `你是一位人生决策顾问。用户正在描述一件让他心里没底的事。请分析以下内容：

用户输入："""${question}"""

请用 JSON 格式返回以下字段：
- identifiedType: 事项类型（职场/感情/投资/健康/人际关系/其他）
- relatedPeople: 涉及的人物列表（名字或角色）
- userEmotion: 用户的情绪状态
- coreStuckPoint: 核心卡点（一句话）
- riskWords: 风险关键词列表
- options: 用户面临的选择项

只返回 JSON，不要其他内容。`;

    try {
      const response = await this.llmProviders.chatCheap(
        [
          { role: 'system', content: buildIdentityLayer() + '\n\n你是一位专业的人生决策顾问，擅长分析复杂决策情境。' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, jsonMode: true },
      );

      const result = JSON.parse(this.extractJson(response.content));
      return {
        identifiedType: result.identifiedType || '其他',
        relatedPeople: result.relatedPeople || [],
        userEmotion: result.userEmotion || '未知',
        coreStuckPoint: result.coreStuckPoint || '',
        riskWords: result.riskWords || [],
        options: result.options || [],
      };
    } catch (error) {
      // LLM 失败时返回基础分析
      return {
        identifiedType: '其他',
        relatedPeople: [],
        userEmotion: '未知',
        coreStuckPoint: question.slice(0, 50),
        riskWords: [],
        options: [],
      };
    }
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}
