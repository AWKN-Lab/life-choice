import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface EvidencePacketData {
  recordId: string;
  routeType: string;
  version: string;
  packetData: Record<string, unknown>;
  warnings?: string[];
}

@Injectable()
export class EvidencePacketBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async build(input: EvidencePacketData): Promise<string> {
    const { recordId, routeType, version, packetData, warnings = [] } = input;

    const inputHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(packetData))
      .digest('hex')
      .substring(0, 32);

    const packetJson = JSON.stringify(packetData);

    const packet = await this.prisma.evidencePacket.create({
      data: {
        recordId,
        routeType,
        version,
        inputHash,
        packetJson,
        warnings: JSON.stringify(warnings),
      },
    });

    return packet.id;
  }

  async getPacket(packetId: string) {
    return this.prisma.evidencePacket.findUnique({ where: { id: packetId } });
  }
}
