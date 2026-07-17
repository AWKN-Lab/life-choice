import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto, UpdatePersonDto } from './dto';

@Injectable()
export class PersonService {
  private readonly logger = new Logger(PersonService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePersonDto) {
    return this.prisma.personProfile.create({
      data: {
        userId,
        name: dto.name,
        relationType: dto.relationType,
        importance: dto.importance || 'normal',
        currentStatus: dto.currentStatus,
        riskTags: JSON.stringify(dto.riskTags || []),
        recentInteraction: dto.recentInteraction,
        currentAdvice: dto.currentAdvice,
        birthDate: dto.birthDate,
        birthTime: dto.birthTime,
        gender: dto.gender,
        birthPlace: dto.birthPlace,
      },
    });
  }

  async findAll(userId: string, filter?: string) {
    const where: any = { userId };

    if (filter === 'important') {
      where.importance = { in: ['critical', 'high'] };
    } else if (filter === 'risk') {
      where.riskTags = { not: '[]' };
    } else if (filter === 'watch') {
      where.currentAdvice = { in: ['观察', '试探', '设边界', '暂缓', '止损'] };
    }

    return this.prisma.personProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        eightDimensions: true,
        _count: { select: { relatedCases: true } },
      },
    });
  }

  async findOne(id: string) {
    const person = await this.prisma.personProfile.findUnique({
      where: { id },
      include: {
        eightDimensions: true,
        relatedCases: { orderBy: { createdAt: 'desc' } },
        chronicleEntries: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!person) throw new NotFoundException('Person not found');
    return person;
  }

  async update(id: string, dto: UpdatePersonDto) {
    return this.prisma.personProfile.update({
      where: { id },
      data: {
        name: dto.name,
        relationType: dto.relationType,
        importance: dto.importance,
        currentStatus: dto.currentStatus,
        riskTags: dto.riskTags ? JSON.stringify(dto.riskTags) : undefined,
        recentInteraction: dto.recentInteraction,
        currentAdvice: dto.currentAdvice,
      },
    });
  }

  async remove(id: string) {
    // P0-8 删除审计
    const existing = await this.prisma.personProfile.findUnique({ where: { id }, select: { id: true, name: true, userId: true } });
    if (existing) {
      this.logger.log(`[P0-8-AUDIT] personProfile.remove pending: id=${id} name=${existing.name} userId=${existing.userId}`);
    }
    const result = await this.prisma.personProfile.delete({ where: { id } });
    this.logger.log(`[P0-8-AUDIT] personProfile.remove executed: id=${id}`);
    return result;
  }
}
