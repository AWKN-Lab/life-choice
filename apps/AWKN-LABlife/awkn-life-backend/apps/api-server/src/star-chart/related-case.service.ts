import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRelatedCaseDto } from './dto';

@Injectable()
export class RelatedCaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(personId: string, dto: CreateRelatedCaseDto) {
    const person = await this.prisma.personProfile.findUnique({
      where: { id: personId },
    });
    if (!person) throw new NotFoundException('Person not found');

    return this.prisma.personRelatedCase.create({
      data: {
        personId,
        caseTitle: dto.caseTitle,
        hisRole: dto.hisRole,
        whatHeSaid: dto.whatHeSaid,
        whatHeDid: dto.whatHeDid,
        result: dto.result,
        impactOnJudgment: dto.impactOnJudgment,
        consultRecordId: dto.consultRecordId,
      },
    });
  }

  async findByPerson(personId: string) {
    return this.prisma.personRelatedCase.findMany({
      where: { personId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateNeedsReview(id: string, needsReview: boolean) {
    return this.prisma.personRelatedCase.update({
      where: { id },
      data: { needsReview },
    });
  }
}
