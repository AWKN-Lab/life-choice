import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { BottomResultDto, DispatchOptionDto } from './dto';
import { buildIdentityLayer } from '../consult/orchestrator/prompt-layers';

@Injectable()
export class BottomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmProviders: LlmProvidersService,
  ) {}

  async generateBottom(recordId: string): Promise<BottomResultDto> {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException('Record not found');

    const spreadData = JSON.parse(record.spreadData || '{}');
    const question = record.question;

    // 调用 LLM 生成"这事底"结果
    const bottomResult = await this.analyzeBottomWithLLM(question, spreadData);

    // 保存结果
    await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: {
        flowStatus: 'bottomed',
        bottomData: JSON.stringify(bottomResult),
      },
    });

    const dispatchOptions: DispatchOptionDto[] = [
      {
        key: 'chronicle',
        label: '写入通鉴',
        description: '记录这次判断，方便以后回看',
      },
      {
        key: 'respread',
        label: '再摆一次',
        description: '换个角度重新分析',
      },
      {
        key: 'miaosuan',
        label: '进入庙算',
        description: '深度推演各种可能',
      },
      {
        key: 'xingtu',
        label: '关联星图',
        description: '将涉及的人物加入星图',
      },
    ];

    return {
      recordId,
      stuckPoint: bottomResult.stuckPoint,
      people: bottomResult.people,
      risks: bottomResult.risks,
      threeWays: bottomResult.threeWays,
      minStep: bottomResult.minStep,
      reviewPoint: bottomResult.reviewPoint,
      dispatchOptions,
    };
  }

  private async analyzeBottomWithLLM(
    question: string,
    spreadData: Record<string, unknown>,
  ): Promise<{
    stuckPoint: string;
    people: string[];
    risks: string[];
    threeWays: string[];
    minStep: string;
    reviewPoint: string;
  }> {
    const prompt = `你是一位人生决策顾问。用户已经完成"摆开"阶段，现在需要得到"这事底"的最终分析。

原始问题："""${question}"""

摆开数据：
- 真正卡住的地方：${spreadData.stuckPoint || '未填写'}
- 涉及的人：${(spreadData.people as string[])?.join('、') || '未填写'}
- 最怕的结果：${spreadData.fearedResult || '未填写'}
- 想要的结果：${spreadData.desiredResult || '未填写'}
- 最不想后悔的点：${spreadData.regretPoint || '未填写'}

请用 JSON 格式返回以下字段：
- stuckPoint: 真正卡住用户的地方（一句话点破）
- people: 关键人物列表及他们的角色
- risks: 最该看见的风险点（3-5条）
- threeWays: 三种走法（保守/平衡/激进）
- minStep: 最小一步（现在就能做的具体行动）
- reviewPoint: 回看点（什么时候该回看这个决策）

只返回 JSON，不要其他内容。`;

    try {
      const response = await this.llmProviders.chatCheap(
        [
          { role: 'system', content: buildIdentityLayer() + '\n\n你是一位专业的人生决策顾问，擅长在复杂情境中找到关键突破点。' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.4, jsonMode: true },
      );

      const result = JSON.parse(this.extractJson(response.content));
      return {
        stuckPoint: result.stuckPoint || '',
        people: result.people || [],
        risks: result.risks || [],
        threeWays: result.threeWays || [],
        minStep: result.minStep || '',
        reviewPoint: result.reviewPoint || '',
      };
    } catch (error) {
      return {
        stuckPoint: spreadData.stuckPoint as string || '',
        people: (spreadData.people as string[]) || [],
        risks: ['风险未识别'],
        threeWays: ['继续观察', '主动推进', '暂时搁置'],
        minStep: '先收集更多信息',
        reviewPoint: '一周后回看',
      };
    }
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}
