import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NetworkDataDto, NetworkNodeDto, NetworkEdgeDto } from './dto';

@Injectable()
export class NetworkService {
  constructor(private readonly prisma: PrismaService) {}

  async getNetwork(userId: string): Promise<NetworkDataDto> {
    const people = await this.prisma.personProfile.findMany({
      where: { userId },
      include: { eightDimensions: true },
      orderBy: { updatedAt: 'desc' },
    });

    const nodes: NetworkNodeDto[] = people.map((p) => ({
      id: p.id,
      name: p.name || '未命名',
      relationType: p.relationType || '其他',
      importance: p.importance || 'normal',
      currentStatus: p.currentStatus || '观察中',
      riskTags: JSON.parse(p.riskTags || '[]'),
      currentAdvice: p.currentAdvice || '观察',
      completeness: p.eightDimensions?.completeness || 0,
    }));

    // 生成边：基于关系类型和共同事项
    const edges: NetworkEdgeDto[] = [];
    const cases = await this.prisma.personRelatedCase.findMany({
      where: { personId: { in: people.map((p) => p.id) } },
    });

    // 同一事项下的人物建立连接
    const caseToPeople = new Map<string, string[]>();
    for (const c of cases) {
      if (!caseToPeople.has(c.caseTitle)) {
        caseToPeople.set(c.caseTitle, []);
      }
      caseToPeople.get(c.caseTitle)!.push(c.personId);
    }

    for (const [, personIds] of caseToPeople) {
      for (let i = 0; i < personIds.length; i++) {
        for (let j = i + 1; j < personIds.length; j++) {
          edges.push({
            source: personIds[i],
            target: personIds[j],
            relation: '共同事项',
          });
        }
      }
    }

    return {
      nodes,
      edges,
      center: '我',
    };
  }

  async getStats(userId: string) {
    const total = await this.prisma.personProfile.count({ where: { userId } });
    const critical = await this.prisma.personProfile.count({
      where: { userId, importance: { in: ['critical', 'high'] } },
    });
    const withRisk = await this.prisma.personProfile.count({
      where: { userId, riskTags: { not: '[]' } },
    });
    // 计算平均完整度
    const allPeople = await this.prisma.personProfile.findMany({
      where: { userId },
      include: { eightDimensions: true },
    });
    const avgCompleteness =
      allPeople.length > 0
        ? allPeople.reduce((sum, p) => sum + (p.eightDimensions?.completeness || 0), 0) /
          allPeople.length
        : 0;

    return {
      total,
      critical,
      withRisk,
      avgCompleteness,
    };
  }
}
