import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { MiaosuanInputDto, MiaosuanResultDto } from './dto';
import { buildIdentityLayer } from '../consult/orchestrator/prompt-layers';

@Injectable()
export class MiaosuanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmProviders: LlmProvidersService,
  ) {}

  async create(input: MiaosuanInputDto): Promise<MiaosuanResultDto> {
    // 1. 获取上下文数据
    let contextData: Record<string, unknown> = {};
    if (input.consultRecordId) {
      const record = await this.prisma.consultRecord.findUnique({
        where: { id: input.consultRecordId },
      });
      if (record) {
        contextData = {
          question: record.question,
          spreadData: JSON.parse(record.spreadData || '{}'),
          bottomData: JSON.parse(record.bottomData || '{}'),
        };
      }
    }

    // 2. 调用 LLM 进行庙算推演
    const result = await this.analyzeWithLLM(input, contextData);

    // 3. 保存庙算记录
    const entry = await this.prisma.chronicleEntry.create({
      data: {
        userId: input.userId || null,
        consultRecordId: input.consultRecordId || null,
        personId: input.personId || null,
        title: input.title,
        content: JSON.stringify(result),
        entryType: 'case',
        miaoSuanId: null,
      },
    });

    return {
      id: entry.id,
      type: input.type,
      title: input.title,
      scenarios: result.scenarios,
      keyFactors: result.keyFactors,
      blindSpots: result.blindSpots,
      recommendation: result.recommendation,
      createdAt: entry.createdAt,
    };
  }

  async findByUser(userId: string): Promise<MiaosuanResultDto[]> {
    const entries = await this.prisma.chronicleEntry.findMany({
      where: { userId, entryType: 'case' },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((e) => {
      const content = JSON.parse(e.content || '{}');
      return {
        id: e.id,
        type: 'case',
        title: e.title,
        scenarios: content.scenarios || [],
        keyFactors: content.keyFactors || [],
        blindSpots: content.blindSpots || [],
        recommendation: content.recommendation || '',
        createdAt: e.createdAt,
      };
    });
  }

  private async analyzeWithLLM(
    input: MiaosuanInputDto,
    context: Record<string, unknown>,
  ): Promise<{
    scenarios: any[];
    keyFactors: string[];
    blindSpots: string[];
    recommendation: string;
  }> {
    const prompt = `你是一位战略推演专家。请对以下事项进行"庙算"推演：

事项类型：${input.type}
标题：${input.title}
内容：${input.content}

${context.question ? `原始问题：${context.question}` : ''}
${context.spreadData ? `摆开数据：${JSON.stringify(context.spreadData)}` : ''}
${context.bottomData ? `这事底分析：${JSON.stringify(context.bottomData)}` : ''}

请用 JSON 格式返回：
- scenarios: 三种情景推演（乐观/中性/悲观），每个包含 name/probability/outcome/risks/requirements
- keyFactors: 关键影响因素列表
- blindSpots: 可能忽略的盲点
- recommendation: 综合建议

只返回 JSON，不要其他内容。`;

    try {
      const response = await this.llmProviders.chatCheap(
        [
          { role: 'system', content: buildIdentityLayer() + '\n\n你是一位专业的战略推演顾问，擅长多情景分析和风险评估。' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.5, jsonMode: true },
      );

      const result = JSON.parse(this.extractJson(response.content));
      return {
        scenarios: result.scenarios || [],
        keyFactors: result.keyFactors || [],
        blindSpots: result.blindSpots || [],
        recommendation: result.recommendation || '',
      };
    } catch (error) {
      return {
        scenarios: [
          { name: '乐观', probability: '30%', outcome: '结果较好', risks: [], requirements: [] },
          { name: '中性', probability: '50%', outcome: '结果一般', risks: [], requirements: [] },
          { name: '悲观', probability: '20%', outcome: '结果较差', risks: [], requirements: [] },
        ],
        keyFactors: ['信息不足'],
        blindSpots: ['未充分评估'],
        recommendation: '建议收集更多信息后再做决策',
      };
    }
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}
