import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';
import { SpreadConfirmDto, SpreadOutputDto, SpreadCardDto, PeopleQuestionDto } from './dto';

@Injectable()
export class SpreadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmGateway: LlmGatewayService,
  ) {}

  async generateSpread(recordId: string): Promise<SpreadOutputDto> {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException('Record not found');

    const analysis = JSON.parse(record.analysisData || '{}');
    const question = record.question;

    // 生成动态卡片
    const cards: SpreadCardDto[] = [
      {
        key: 'stuckPoint',
        title: '真正卡住的地方',
        content: analysis.coreStuckPoint || '尚未识别',
        type: 'default',
        editable: true,
      },
      {
        key: 'fearedResult',
        title: '最怕的结果',
        content: '',
        type: 'default',
        editable: true,
      },
      {
        key: 'desiredResult',
        title: '想要的结果',
        content: '',
        type: 'default',
        editable: true,
      },
      {
        key: 'regretPoint',
        title: '最不想后悔的点',
        content: '',
        type: 'default',
        editable: true,
      },
    ];

    // 条件卡片：涉及人物时显示
    const hasPeople = analysis.relatedPeople?.length > 0;
    if (hasPeople) {
      cards.splice(1, 0, {
        key: 'people',
        title: '这事里的人',
        content: analysis.relatedPeople.join('、'),
        type: 'conditional',
        editable: true,
      });
    }

    // 更新记录状态
    await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: {
        flowStatus: 'spreading',
        spreadData: JSON.stringify({ cards: cards.map(c => ({ key: c.key, content: c.content })) }),
      },
    });

    return {
      recordId,
      cards,
      needsPeopleDetail: hasPeople,
      peopleQuestions: hasPeople ? this.generatePeopleQuestions(analysis.relatedPeople) : undefined,
    };
  }

  async confirmSpread(
    recordId: string,
    dto: SpreadConfirmDto,
  ): Promise<SpreadOutputDto> {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException('Record not found');

    // 保存用户确认的数据
    const spreadData = {
      stuckPoint: dto.stuckPoint,
      people: dto.people,
      fearedResult: dto.fearedResult,
      desiredResult: dto.desiredResult,
      regretPoint: dto.regretPoint,
      confirmed: dto.confirmed,
    };

    await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: {
        spreadData: JSON.stringify(spreadData),
      },
    });

    // 重新生成卡片（带用户输入）
    const cards: SpreadCardDto[] = [
      {
        key: 'stuckPoint',
        title: '真正卡住的地方',
        content: dto.stuckPoint || '',
        type: 'default',
        editable: true,
      },
      {
        key: 'people',
        title: '这事里的人',
        content: dto.people?.join('、') || '',
        type: 'conditional',
        editable: true,
      },
      {
        key: 'fearedResult',
        title: '最怕的结果',
        content: dto.fearedResult || '',
        type: 'default',
        editable: true,
      },
      {
        key: 'desiredResult',
        title: '想要的结果',
        content: dto.desiredResult || '',
        type: 'default',
        editable: true,
      },
      {
        key: 'regretPoint',
        title: '最不想后悔的点',
        content: dto.regretPoint || '',
        type: 'default',
        editable: true,
      },
    ];

    return {
      recordId,
      cards,
      needsPeopleDetail: !!dto.people?.length,
    };
  }

  private generatePeopleQuestions(people: string[]): PeopleQuestionDto[] {
    return [
      {
        question: '谁最影响结果？',
        options: people,
      },
      {
        question: '谁在推动这件事？',
        options: [...people, '我自己', '没有人在推动'],
      },
      {
        question: '谁可能让事情卡住？',
        options: [...people, '我自己', '外部因素'],
      },
    ];
  }
}
