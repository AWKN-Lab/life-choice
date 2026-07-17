import { Test, TestingModule } from '@nestjs/testing';
import { GrowthService } from '../growth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

describe('GrowthService', () => {
  let service: GrowthService;
  let module: TestingModule;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      invite: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      referral: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    module = await Test.createTestingModule({
      providers: [
        GrowthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    // 抑制 Logger 输出
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    service = module.get<GrowthService>(GrowthService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  describe('getInviteStats', () => {
    it('TC-1: should return correct 3-level chain statistics', async () => {
      // Mock: user has invite with 2 activated L1 referrals (only L1 in referrals array)
      const l1Referrals = [
        { id: 'ref-1', status: 'activated', inviteCode: 'CODE1', parentReferralId: null },
        { id: 'ref-2', status: 'activated', inviteCode: 'CODE1', parentReferralId: null },
      ];

      const l2Referrals = [
        { id: 'ref-3', status: 'activated', inviteCode: 'CODE1', parentReferralId: 'ref-1' },
        { id: 'ref-4', status: 'activated', inviteCode: 'CODE1', parentReferralId: 'ref-1' },
        { id: 'ref-5', status: 'activated', inviteCode: 'CODE1', parentReferralId: 'ref-2' },
      ];

      mockPrisma.invite.findFirst.mockResolvedValue({
        id: 'inv-1',
        code: 'CODE1',
        userId: 'user-1',
        usedCount: 2,
        totalCount: 5,
        rewardTier: 'newbie',
        referrals: l1Referrals,  // 只有 L1
      });

      // L2 查询：parentReferralId in ['ref-1', 'ref-2']
      mockPrisma.referral.findMany.mockResolvedValue(l2Referrals);

      // L3 查询：parentReferralId in ['ref-3', 'ref-4', 'ref-5']
      mockPrisma.referral.count.mockResolvedValue(1);

      const result = await service.getInviteStats('user-1');

      expect(result).toBeDefined();
      expect(result?.level1Count).toBe(2);
      expect(result?.level2Count).toBe(3);
      expect(result?.level3Count).toBe(1);
      expect(result?.totalChainCount).toBe(6);
    });

    it('TC-2: should return null when no invite exists', async () => {
      mockPrisma.invite.findFirst.mockResolvedValue(null);

      const result = await service.getInviteStats('user-no-invite');

      expect(result).toBeNull();
    });
  });

  describe('calculateReferralRewards', () => {
    it('TC-3: should calculate correct reward points', async () => {
      const l1Referrals = [
        { id: 'ref-1', status: 'activated' },
        { id: 'ref-2', status: 'activated' },
      ];

      const l2Referrals = [
        { id: 'ref-3', status: 'activated', parentReferralId: 'ref-1' },
        { id: 'ref-4', status: 'activated', parentReferralId: 'ref-1' },
        { id: 'ref-5', status: 'activated', parentReferralId: 'ref-2' },
      ];

      mockPrisma.invite.findFirst.mockResolvedValue({
        id: 'inv-1',
        userId: 'user-1',
        referrals: l1Referrals,  // 只有 L1
      });

      mockPrisma.referral.findMany.mockResolvedValue(l2Referrals);
      mockPrisma.referral.count.mockResolvedValue(1);

      const result = await service.calculateReferralRewards('user-1');

      // L1=2*5=10, L2=3*2=6, L3=1*1=1, total=17
      expect(result.l1Reward).toBe(10);
      expect(result.l2Reward).toBe(6);
      expect(result.l3Reward).toBe(1);
      expect(result.totalReward).toBe(17);
    });

    it('TC-4: should return all zeros when no invite exists', async () => {
      mockPrisma.invite.findFirst.mockResolvedValue(null);

      const result = await service.calculateReferralRewards('user-no-invite');

      expect(result.l1Reward).toBe(0);
      expect(result.l2Reward).toBe(0);
      expect(result.l3Reward).toBe(0);
      expect(result.totalReward).toBe(0);
    });
  });
});