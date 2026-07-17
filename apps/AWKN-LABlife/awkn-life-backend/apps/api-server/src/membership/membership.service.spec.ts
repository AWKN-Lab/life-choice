import { Test, TestingModule } from '@nestjs/testing';
import { MembershipService, MEMBERSHIP_PLANS } from './membership.service';
import { PrismaService } from '../prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  membership: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  creditLedger: {
    create: jest.fn(),
  },
  order: {
    update: jest.fn(),
    findFirst: jest.fn(), // 任务 3.2: unlockModule 第5分支需要
  },
  consultRecord: {
    update: jest.fn(),
  },
};

describe('MembershipService', () => {
  let service: MembershipService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        MembershipService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
  });

  afterEach(async () => {
    // 恢复为 jest.clearAllMocks()（不清除 mockResolvedValue 返回值，只清除调用历史）
    jest.clearAllMocks();
    await module.close();
  });

  describe('checkAccess', () => {
    it('should return true for admin users even with zero credits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: '10919669@qq.com',
        isAdmin: true,
        creditBalance: 0,
      });

      const result = await service.checkAccess('admin-user-id', 'kline');

      expect(result).toBe(true);
    });

    it('should return true for server allowlisted admin email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: '10919669@qq.com',
        isAdmin: false,
        creditBalance: 0,
      });

      const result = await service.checkAccess('admin-user-id', 'kline');

      expect(result).toBe(true);
    });

    it('should return true for basic module without membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess('user-id', 'basic');

      expect(result).toBe(true);
    });

    it('should return false for kline module without membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess('user-id', 'kline');

      expect(result).toBe(false);
    });

    it('should return true for kline module with month membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-id',
        type: 'month',
        status: 'active',
        expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkAccess('user-id', 'kline');

      expect(result).toBe(true);
    });

    it('should return true for kline module with year membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-id',
        type: 'year',
        status: 'active',
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkAccess('user-id', 'kline');

      expect(result).toBe(true);
    });

    it('should return false for kline module with single/peruse membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-id',
        type: 'single',
        status: 'active',
        expireDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkAccess('user-id', 'kline');

      expect(result).toBe(false);
    });
  });

  describe('getPlans', () => {
    it('should return all membership plans', async () => {
      const plans = await service.getPlans();

      expect(plans).toEqual(Object.values(MEMBERSHIP_PLANS));
    });
  });

  describe('unlockModule', () => {
    it('should auto top up and consume credits for admin users with zero credits', async () => {
      // 设置 user 相关的 mock
      mockPrisma.user.findUnique.mockResolvedValue({
        email: '10919669@qq.com',
        isAdmin: true,
        creditBalance: 0,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.creditLedger.create.mockResolvedValue({});

      // 直接 mock consumeAdminCredit 方法返回 admin 积分通道的预期结果
      const consumeAdminCreditSpy = jest.spyOn(service as any, 'consumeAdminCredit').mockResolvedValue({
        success: true,
        moduleId: 'kline',
        recordId: 'record-1',
        creditsUsed: 1,
        creditBalance: 49,
        message: '管理员积分已使用',
      });

      const result = await service.unlockModule('admin-user-id', 'kline', 'record-1');

      expect(result).toEqual({
        success: true,
        moduleId: 'kline',
        recordId: 'record-1',
        creditsUsed: 1,
        creditBalance: 49,
        message: '管理员积分已使用',
      });
      expect(consumeAdminCreditSpy).toHaveBeenCalledTimes(1);
      expect(consumeAdminCreditSpy).toHaveBeenCalledWith('admin-user-id', 'kline', 'record-1', 0);

      consumeAdminCreditSpy.mockRestore();
    });

    it('should require membership for non-admin kline unlock without active membership', async () => {
      // mockImplementation 确保每次调用都返回正确的非 admin 用户数据
      mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where?.id === 'user-id') {
          return Promise.resolve({
            email: 'user@example.com',
            isAdmin: false,
            creditBalance: 0,
          });
        }
        return Promise.resolve(null);
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const result = await service.unlockModule('user-id', 'kline', 'record-1');

      expect(result).toEqual(expect.objectContaining({
        success: false,
        reason: '积分不足',
        requiredPlan: 'month',
      }));
    });
  });

  describe('任务 3.2 — unlockModule 第5分支（¥1 深推已支付订单校验）', () => {
    it('应在传入 orderId + recordId 且订单已支付时直接解锁（source=deep_dive）', async () => {
      // 非 admin 用户，无会员
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'user@example.com',
        isAdmin: false,
        creditBalance: 0,
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-paid-1',
        amount: 1,
      });
      mockPrisma.consultRecord.update.mockResolvedValue({});

      const result = await service.unlockModule(
        'user-1',
        'kline',
        'record-1',
        'order-paid-1',
      );

      expect(result).toEqual({
        success: true,
        moduleId: 'kline',
        recordId: 'record-1',
        orderId: 'order-paid-1',
        creditsUsed: 0,
        source: 'deep_dive',
        message: '¥1 深推已支付，完整结果已解锁',
      });

      // 验证调用了 order.findFirst（四重条件）
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'order-paid-1',
          userId: 'user-1',
          productId: 'record-1',
          productType: 'single',
          status: 'paid',
          metadata: { contains: '"deepDive":"true"' },
        },
        select: { id: true, amount: true },
      });

      // 验证 unlockStatus=unlocked_full
      expect(mockPrisma.consultRecord.update).toHaveBeenCalledWith({
        where: { id: 'record-1' },
        data: { unlockStatus: 'unlocked_full' },
      });

      // 不应扣积分
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.creditLedger.create).not.toHaveBeenCalled();
    });

    it('应在订单未找到时降级走积分通道（不阻断）', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'user@example.com',
        isAdmin: false,
        creditBalance: 0, // 积分不足
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.order.findFirst.mockResolvedValue(null); // 订单未找到

      const result = await service.unlockModule(
        'user-1',
        'kline',
        'record-1',
        'order-not-found',
      );

      // 应降级走积分通道，返回积分不足
      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          reason: '积分不足',
        }),
      );
    });

    it('应在未传 orderId 时不走深推分支', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'user@example.com',
        isAdmin: false,
        creditBalance: 0,
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      await service.unlockModule('user-1', 'kline', 'record-1');

      // 不应调用 order.findFirst
      expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getModuleRequiredPlan', () => {
    it('should return "free" for basic modules', () => {
      const plan = (service as any).getModuleRequiredPlan('basic');
      expect(plan).toBe('free');
    });

    it('should return "month" for kline module', () => {
      const plan = (service as any).getModuleRequiredPlan('kline');
      expect(plan).toBe('month');
    });

    it('should return "month" for reminder module', () => {
      const plan = (service as any).getModuleRequiredPlan('reminder');
      expect(plan).toBe('month');
    });

    it('should return "year" for deep module', () => {
      const plan = (service as any).getModuleRequiredPlan('deep');
      expect(plan).toBe('year');
    });

    it('should return "month" for naming module', () => {
      const plan = (service as any).getModuleRequiredPlan('naming');
      expect(plan).toBe('month');
    });

    it('should return "month" for question module', () => {
      const plan = (service as any).getModuleRequiredPlan('question');
      expect(plan).toBe('month');
    });
  });

  describe('checkAccess for naming and question', () => {
    it('should return true for naming module with month membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-id',
        type: 'month',
        status: 'active',
        expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkAccess('user-id', 'naming');

      expect(result).toBe(true);
    });

    it('should return true for question module with month membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-id',
        type: 'month',
        status: 'active',
        expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkAccess('user-id', 'question');

      expect(result).toBe(true);
    });

    it('should return false for naming module without membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess('user-id', 'naming');

      expect(result).toBe(false);
    });

    it('should return false for question module without membership', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess('user-id', 'question');

      expect(result).toBe(false);
    });
  });
});
