import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

export interface CreateOrderDto {
  productType: 'membership' | 'single';
  productId: string;
  paymentMethod: 'stripe' | 'wechat' | 'alipay';
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe | null = null;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey && stripeSecretKey !== 'sk_test_xxx') {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const order = await this.prisma.order.create({
      data: {
        userId,
        productType: dto.productType,
        productId: dto.productId,
        amount: dto.amount,
        currency: dto.currency || 'cny',
        paymentMethod: dto.paymentMethod,
        status: 'pending',
        metadata: dto.metadata as any,
      },
    });

    let paymentUrl: string | null = null;
    let stripeSessionId: string | null = null;

    switch (dto.paymentMethod) {
      case 'stripe':
        const stripeResult = await this.createStripeCheckoutSession(order);
        paymentUrl = stripeResult.url;
        stripeSessionId = stripeResult.sessionId;
        break;
      case 'wechat':
        paymentUrl = await this.createWechatPayment(order);
        break;
      case 'alipay':
        paymentUrl = await this.createAlipayPayment(order);
        break;
    }

    if (stripeSessionId) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentId: stripeSessionId },
      });
    }

    return {
      orderId: order.id,
      paymentUrl,
      amount: dto.amount,
      currency: dto.currency || 'cny',
    };
  }

  /**
   * 任务 3.1: 创建 ¥1 单事深推订单（四重条件识别）
   *
   * 四重条件（防跑偏条款 #3，与 199 元 single 区分）：
   *   1. productType='single'（复用现有类型，不新增）
   *   2. amount=1（单位：元；Stripe unit_amount = 1 * 100 = 100 分）
   *   3. productId=recordId（绑定当前咨询记录）
   *   4. metadata.deepDive='true' + metadata.recordId=recordId
   *
   * 支付成功后由 webhook 主动解锁 unlockStatus='unlocked_full' + analysisData.deepDiveBonus=3
   */
  async createDeepDiveOrder(userId: string, recordId: string, paymentMethod: 'stripe' | 'wechat' | 'alipay' = 'stripe') {
    // 校验 recordId 归属当前用户（防止越权深推他人记录）
    const record = await this.prisma.consultRecord.findFirst({
      where: { id: recordId, userId },
      select: { id: true, unlockStatus: true },
    });
    if (!record) {
      throw new BadRequestException('咨询记录不存在或不属于当前用户');
    }

    // 幂等性检查：同一 recordId 已有 paid 的深推订单则直接返回已支付
    const existingPaidOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        productId: recordId,
        productType: 'single',
        status: 'paid',
        metadata: { contains: '"deepDive":"true"' },
      },
      select: { id: true },
    });
    if (existingPaidOrder) {
      this.logger.log(`[DeepDive] recordId=${recordId} 已有 paid 深推订单 ${existingPaidOrder.id}，幂等返回`);
      return {
        orderId: existingPaidOrder.id,
        paymentUrl: null,
        amount: 1,
        currency: 'cny',
        alreadyPaid: true,
        message: '此记录已深推，无需重复支付',
      };
    }

    const dto: CreateOrderDto = {
      productType: 'single',
      productId: recordId,
      paymentMethod,
      amount: 1, // ¥1 = 1 元（内部单位），Stripe 会 * 100 转为分
      currency: 'cny',
      metadata: {
        deepDive: 'true',
        recordId,
      },
    };

    this.logger.log(`[DeepDive] 创建 ¥1 深推订单：userId=${userId}, recordId=${recordId}, paymentMethod=${paymentMethod}`);
    return this.createOrder(userId, dto);
  }

  private async createStripeCheckoutSession(order: any): Promise<{ url: string; sessionId: string }> {
    if (!this.stripe) {
      return {
        url: `https://checkout.stripe.com/test?orderId=${order.id}`,
        sessionId: `test_session_${order.id}`,
      };
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: order.currency,
            product_data: {
              name: order.productType === 'membership' ? '会员订阅' : '单次推演',
              description: `订单号: ${order.id}`,
            },
            unit_amount: order.amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment/success?orderId=${order.id}`,
      cancel_url: `${baseUrl}/payment/cancel?orderId=${order.id}`,
      metadata: {
        orderId: order.id,
        userId: order.userId,
        productType: order.productType,
        productId: order.productId,
      },
    });

    return {
      url: session.url || `https://checkout.stripe.com/test?orderId=${order.id}`,
      sessionId: session.id,
    };
  }

  private async createWechatPayment(order: any): Promise<string> {
    const wechatAppId = process.env.WECHAT_APP_ID;

    if (!wechatAppId || wechatAppId === 'wx_your_app_id') {
      return `wechat://pay?orderId=${order.id}&amount=${order.amount}`;
    }

    return `wechat://pay?orderId=${order.id}&amount=${order.amount}`;
  }

  private async createAlipayPayment(order: any): Promise<string> {
    const alipayAppId = process.env.ALIPAY_APP_ID;

    if (!alipayAppId || alipayAppId === 'your_alipay_app_id') {
      return `alipay://pay?orderId=${order.id}&amount=${order.amount}`;
    }

    return `alipay://pay?orderId=${order.id}&amount=${order.amount}`;
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!this.stripe || !webhookSecret) {
      this.logger.warn('Stripe not configured, skipping webhook verification');
      return { received: true };
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'paid',
              paymentId: session.payment_intent as string,
            },
          });

          // 任务 3.3 + 3.4: ¥1 深推订单主动解锁 + 追问额度 +3
          // 识别条件：metadata.deepDive='true' + metadata.recordId 存在
          const deepDiveFlag = session.metadata?.deepDive;
          const recordId = session.metadata?.recordId || session.metadata?.productId;
          if (deepDiveFlag === 'true' && recordId) {
            try {
              // 1. 解锁 ConsultRecord.unlockStatus='unlocked_full'
              await this.prisma.consultRecord.update({
                where: { id: recordId },
                data: { unlockStatus: 'unlocked_full' },
              });

              // 2. analysisData 新增 deepDiveBonus=3（追问额度 +3）
              const record = await this.prisma.consultRecord.findUnique({
                where: { id: recordId },
                select: { analysisData: true, userId: true },
              });
              if (record) {
                const analysisData = record.analysisData
                  ? (this.safeParseJson(record.analysisData) as Record<string, any>)
                  : {};
                analysisData.deepDiveBonus = 3;
                analysisData.deepDiveOrderId = orderId;
                analysisData.deepDiveUnlockedAt = new Date().toISOString();
                await this.prisma.consultRecord.update({
                  where: { id: recordId },
                  data: { analysisData: JSON.stringify(analysisData) },
                });
                this.logger.log(
                  `[DeepDive Webhook] recordId=${recordId} 已主动解锁 unlocked_full + deepDiveBonus=3, orderId=${orderId}`,
                );
              }
            } catch (err) {
              // 解锁失败不阻断 webhook 返回（Stripe 会重试，但需记录日志便于追踪）
              this.logger.error(
                `[DeepDive Webhook] recordId=${recordId} 主动解锁失败：${(err as Error).message}`,
              );
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.prisma.order.updateMany({
          where: { paymentId: paymentIntent.id },
          data: { status: 'failed' },
        });
        break;
      }
    }

    return { received: true };
  }

  async getOrderStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    return {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      productType: order.productType,
      productId: order.productId,
    };
  }

  async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productType: true,
        productId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      },
    });
  }

  async refundOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (order.status !== 'paid') {
      throw new BadRequestException('只能退款已支付的订单');
    }

    if (order.paymentMethod === 'stripe' && this.stripe && order.paymentId) {
      await this.stripe.refunds.create({
        payment_intent: order.paymentId,
      });
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'refunded' },
    });

    return { success: true };
  }

  /** 任务 3.3: 安全解析 JSON（webhook 中解析 analysisData） */
  private safeParseJson(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
}
