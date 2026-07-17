import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserInsights {
  topEntry: 'kline' | 'naming' | 'question' | null;
  preferredRouteType: string | null;
  unlockedModules: string[];
  recentTopics: string[];
  totalConsults: number;
  namingPreferences?: { type?: string; style?: string };
  questionIntents?: string[];
}

@Injectable()
export class UserProfileService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getUserInsights(userId: string): Promise<UserInsights> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.consultRecord.findMany({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!records || records.length === 0) {
      return {
        topEntry: null,
        preferredRouteType: null,
        unlockedModules: [],
        recentTopics: [],
        totalConsults: 0,
      };
    }

    const totalConsults = records.length;

    const entryCounts = new Map<string, number>();
    const routeTypeCounts = new Map<string, number>();
    const unlockedModules = new Set<string>();
    const recentTopics: string[] = [];
    const questionIntents: string[] = [];
    let namingPreferences: { type?: string; style?: string } | undefined;

    for (const record of records) {
      if (record.sourceEntry) {
        entryCounts.set(record.sourceEntry, (entryCounts.get(record.sourceEntry) || 0) + 1);
      }

      if (record.routeType) {
        routeTypeCounts.set(record.routeType, (routeTypeCounts.get(record.routeType) || 0) + 1);
      }

      if (record.unlockStatus === 'unlocked_full' && record.routeType) {
        unlockedModules.add(record.routeType);
      }

      if (recentTopics.length < 3 && record.question) {
        recentTopics.push(record.question);
      }

      if (record.questionIntent) {
        questionIntents.push(record.questionIntent);
      }

      if (record.namingPreferences && !namingPreferences) {
        try {
          const parsed = JSON.parse(record.namingPreferences);
          namingPreferences = {
            type: record.namingType || parsed.type,
            style: parsed.style,
          };
        } catch {
          namingPreferences = {
            type: record.namingType || undefined,
          };
        }
      }
    }

    const topEntry = this.getMaxKey(entryCounts) as 'kline' | 'naming' | 'question' | null;
    const preferredRouteType = this.getMaxKey(routeTypeCounts);

    return {
      topEntry,
      preferredRouteType,
      unlockedModules: Array.from(unlockedModules),
      recentTopics,
      totalConsults,
      namingPreferences,
      questionIntents: questionIntents.length > 0 ? questionIntents : undefined,
    };
  }

  private getMaxKey(map: Map<string, number>): string | null {
    if (map.size === 0) return null;
    let maxKey: string | null = null;
    let maxCount = 0;
    for (const [key, count] of map.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }
    return maxKey;
  }
}
