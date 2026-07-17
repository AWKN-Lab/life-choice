import { Controller, Post, Get, Body, Param, UseGuards, Request, Headers, Req, Inject } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateOrderDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(@Inject(PaymentService) private readonly paymentService: PaymentService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.paymentService.createOrder(req.user.id, dto);
  }

  /**
   * 任务 3.1: ¥1 单事深推下单端点
   * 四重条件识别：productType='single' + amount=1 + productId=recordId + metadata.deepDive='true'
   */
  @Post('deep-dive/:recordId')
  @UseGuards(JwtAuthGuard)
  async createDeepDiveOrder(
    @Request() req: any,
    @Param('recordId') recordId: string,
    @Body() body?: { paymentMethod?: 'stripe' | 'wechat' | 'alipay' },
  ) {
    const paymentMethod = body?.paymentMethod || 'stripe';
    return this.paymentService.createDeepDiveOrder(req.user.id, recordId, paymentMethod);
  }

  @Get('status/:orderId')
  async getOrderStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getOrderStatus(orderId);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(@Request() req: any) {
    return this.paymentService.getOrders(req.user.id);
  }

  @Post('webhook/stripe')
  async handleStripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = Buffer.from(JSON.stringify(body));
    return this.paymentService.handleStripeWebhook(rawBody, signature);
  }

  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard)
  async refundOrder(@Request() req: any, @Param('orderId') orderId: string) {
    return this.paymentService.refundOrder(orderId, req.user.id);
  }
}
