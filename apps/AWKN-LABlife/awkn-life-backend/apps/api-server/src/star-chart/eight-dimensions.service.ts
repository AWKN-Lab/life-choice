import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EightDimensionsDto } from './dto';

@Injectable()
export class EightDimensionsService {
  constructor(private readonly prisma: PrismaService) {}

  async update(personId: string, dto: EightDimensionsDto) {
    const person = await this.prisma.personProfile.findUnique({
      where: { id: personId },
      include: { eightDimensions: true },
    });
    if (!person) throw new NotFoundException('Person not found');

    const dimensions = [
      dto.role,
      dto.relationship,
      dto.motivation,
      dto.ability,
      dto.resources,
      dto.credit,
      dto.behavior,
      dto.risk,
    ];
    const filledCount = dimensions.filter((d) => d && d.trim().length > 0).length;
    const completeness = filledCount / 8;

    const pendingObservations = this.generatePendingObservations(dto);

    if (person.eightDimensions) {
      return this.prisma.personEightDimensions.update({
        where: { personId },
        data: {
          role: dto.role,
          relationship: dto.relationship,
          motivation: dto.motivation,
          ability: dto.ability,
          resources: dto.resources,
          credit: dto.credit,
          behavior: dto.behavior,
          risk: dto.risk,
          completeness,
          pendingObservations: JSON.stringify(pendingObservations),
        },
      });
    }

    return this.prisma.personEightDimensions.create({
      data: {
        personId,
        role: dto.role,
        relationship: dto.relationship,
        motivation: dto.motivation,
        ability: dto.ability,
        resources: dto.resources,
        credit: dto.credit,
        behavior: dto.behavior,
        risk: dto.risk,
        completeness,
        pendingObservations: JSON.stringify(pendingObservations),
      },
    });
  }

  async findByPerson(personId: string) {
    return this.prisma.personEightDimensions.findUnique({
      where: { personId },
    });
  }

  private generatePendingObservations(dto: EightDimensionsDto): string[] {
    const pending: string[] = [];
    if (!dto.motivation) pending.push('他的真实动机是什么？');
    if (!dto.credit) pending.push('他的承诺是否可靠？');
    if (!dto.behavior) pending.push('他过去的行为模式如何？');
    if (!dto.risk) pending.push('与他相关的风险点有哪些？');
    return pending;
  }
}
