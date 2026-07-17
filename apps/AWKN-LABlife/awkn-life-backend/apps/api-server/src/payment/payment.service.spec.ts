import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  consultRecord: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('PaymentService', () => {
  let service: PaymentService;
  let module: TestingModule;

  beforeEach(async () => {
    // 重置环境变量，避免 Stripe 初始化干扰
    process.env.STRIPE_SECRET_KEY = '';
    process.env.STRIPE_WEBHOOK_SECRET = '';

    module = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  describe('任务 3.1 — createDeepDiveOrder（¥1 单事深推下单）', () => {
    it('应在 recordId 不存在时抛出 BadRequestException', async () => {
      mockPrisma.consultRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.createDeepDiveOrder('user-1', 'record-not-exist', 'stripe'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.consultRecord.findFirst).toHaveBeenCalledWith({
        where: { id: 'record-not-exist', userId: 'user-1' },
        select: { id: true, unlockStatus: true },
      });
    });

    it('应在已有 paid 深推订单时返回 alreadyPaid=true（幂等性）', async () => {
      mockPrisma.consultRecord.findFirst.mockResolvedValue({
        id: 'record-1',
        unlockStatus: 'unlocked_partial',
      });
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-existing' });

      const result = await service.createDeepDiveOrder('user-1', 'record-1', 'stripe');

      expect(result).toEqual({
        orderId: 'order-existing',
        paymentUrl: null,
        amount: 1,
        currency: 'cny',
        alreadyPaid: true,
        message: '此记录已深推，无需重复支付',
      });
      // 不应再调用 createOrder
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it('应在新下单时正确组装四重条件并调用 createOrder', async () => {
      mockPrisma.consultRecord.findFirst.mockResolvedValue({
        id: 'record-1',
        unlockStatus: 'unlocked_partial',
      });
      mockPrisma.order.findFirst.mockResolvedValue(null); // 无已支付订单
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-new',
        userId: 'user-1',
        productType: 'single',
        productId: 'record-1',
        amount: 1,
        currency: 'cny',
        paymentMethod: 'stripe',
        status: 'pending',
      });

      const result = await service.createDeepDiveOrder('user-1', 'record-1', 'stripe');

      // 验证四重条件：productType + amount + productId + metadata.deepDive
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          productType: 'single',
          productId: 'record-1',
          amount: 1,
          currency: 'cny',
          paymentMethod: 'stripe',
          status: 'pending',
          metadata: {
            deepDive: 'true',
            recordId: 'record-1',
          },
        },
      });
      expect(result.orderId).toBe('order-new');
      expect(result.amount).toBe(1);
    });
  });

  describe('任务 3.3+3.4 — handleStripeWebhook 主动解锁 + deepDiveBonus=3', () => {
    it('应在 Stripe 未配置时跳过 webhook 校验', async () => {
      const result = await service.handleStripeWebhook(
        Buffer.from('test'),
        'sig-test',
      );
      expect(result).toEqual({ received: true });
    });

    /**
     * 由于 Stripe 真实校验依赖 STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET，
     * 此处通过 mock Stripe 实例的方式测试 deepDive 主动解锁逻辑分支。
     */
    it('应在 deepDive=true 时主动写 unlockStatus=unlocked_full + deepDiveBonus=3', async () => {
      // 构造已初始化 stripe 的 service 实例
      const fakeSession = {
        metadata: {
          orderId: 'order-deepdive-1',
          deepDive: 'true',
          recordId: 'record-deepdive-1',
        },
        payment_intent: 'pi_test_1',
      };
      const fakeEvent = {
        type: 'checkout.session.completed',
        data: { object: fakeSession },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fakeStripe: any = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(fakeEvent),
        },
      };
      // 注入 fakeStripe
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).stripe = fakeStripe;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      // mock order.update 第一次（标记 paid）
      mockPrisma.order.update.mockResolvedValue({});
      // mock consultRecord.update 第一次（解锁）
      mockPrisma.consultRecord.update.mockResolvedValueOnce({});
      // mock consultRecord.findUnique 返回已有 analysisData
      mockPrisma.consultRecord.findUnique.mockResolvedValue({
        analysisData: JSON.stringify({ followupCount: 1 }),
        userId: 'user-1',
      });
      // mock consultRecord.update 第二次（写 deepDiveBonus）
      mockPrisma.consultRecord.update.mockResolvedValueOnce({});

      const result = await service.handleStripeWebhook(
        Buffer.from('test'),
        'sig-test',
      );

      expect(result).toEqual({ received: true });

      // 验证：order 标记为 paid
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-deepdive-1' },
        data: { status: 'paid', paymentId: 'pi_test_1' },
      });

      // 验证：第一次 consultRecord.update — 解锁为 unlocked_full
      expect(mockPrisma.consultRecord.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'record-deepdive-1' },
        data: { unlockStatus: 'unlocked_full' },
      });

      // 验证：第二次 consultRecord.update — 写入 deepDiveBonus=3
      expect(mockPrisma.consultRecord.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'record-deepdive-1' },
        data: { analysisData: expect.stringContaining('"deepDiveBonus":3') },
      });
    });

    it('应在非深推订单时仅更新 order 状态，不触发主动解锁', async () => {
      const fakeSession = {
        metadata: {
          orderId: 'order-normal-1',
          // 无 deepDive 字段
        },
        payment_intent: 'pi_test_2',
      };
      const fakeEvent = {
        type: 'checkout.session.completed',
        data: { object: fakeSession },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fakeStripe: any = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(fakeEvent),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).stripe = fakeStripe;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockPrisma.order.update.mockResolvedValue({});
      mockPrisma.consultRecord.update.mockClear();

      await service.handleStripeWebhook(Buffer.from('test'), 'sig-test');

      expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.consultRecord.update).not.toHaveBeenCalled();
    });

    it('应在主动解锁失败时不阻断 webhook 返回', async () => {
      const fakeSession = {
        metadata: {
          orderId: 'order-deepdive-fail',
          deepDive: 'true',
          recordId: 'record-fail',
        },
        payment_intent: 'pi_test_3',
      };
      const fakeEvent = {
        type: 'checkout.session.completed',
        data: { object: fakeSession },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fakeStripe: any = {
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(fakeEvent),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).stripe = fakeStripe;
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      mockPrisma.order.update.mockResolvedValue({});
      // 第一次 consultRecord.update 抛出错误（解锁失败）
      mockPrisma.consultRecord.update.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.handleStripeWebhook(
        Buffer.from('test'),
        'sig-test',
      );

      // 仍应返回 received: true（不阻断）
      expect(result).toEqual({ received: true });
      expect(mockPrisma.order.update).toHaveBeenCalled();
    });
  });
});
