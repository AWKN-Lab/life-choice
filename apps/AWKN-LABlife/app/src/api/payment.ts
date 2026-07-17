/**
 * 支付 API 客户端 - 对接真实后端
 */
import apiClient from './client';

const PAYMENT_BASE = '/payment';

export interface CreateOrderRequest {
  productType: 'membership' | 'single';
  productId: string;
  paymentMethod: 'stripe' | 'wechat' | 'alipay';
  amount: number;
  currency?: string;
}

export interface OrderResponse {
  orderId: string;
  paymentUrl?: string;
  amount: number;
  currency: string;
}

/** 任务 3.5: ¥1 深推订单响应（含幂等已支付标记） */
export interface DeepDiveOrderResponse extends OrderResponse {
  alreadyPaid?: boolean;
  message?: string;
}

export interface OrderStatus {
  orderId: string;
  status: 'pending' | 'paid' | 'expired' | 'refunded';
  amount: number;
  currency: string;
  productType: string;
  productId: string;
}

export const paymentApi = {
  createOrder: async (data: CreateOrderRequest): Promise<OrderResponse> => {
    return apiClient.post<OrderResponse>(`${PAYMENT_BASE}/create`, data);
  },

  getOrderStatus: async (orderId: string): Promise<OrderStatus> => {
    return apiClient.get<OrderStatus>(`${PAYMENT_BASE}/status/${orderId}`);
  },

  getOrders: async (): Promise<OrderStatus[]> => {
    return apiClient.get<OrderStatus[]>(`${PAYMENT_BASE}/orders`);
  },

  refundOrder: async (orderId: string): Promise<{ success: boolean }> => {
    return apiClient.post(`${PAYMENT_BASE}/refund/${orderId}`, {});
  },

  /**
   * 任务 3.5: 创建 ¥1 单事深推订单
   * 后端四重条件识别：productType='single' + amount=1 + productId=recordId + metadata.deepDive='true'
   * 支付成功后 webhook 主动解锁 unlockStatus='unlocked_full' + deepDiveBonus=3
   */
  createDeepDiveOrder: async (
    recordId: string,
    paymentMethod: 'stripe' | 'wechat' | 'alipay' = 'stripe',
  ): Promise<DeepDiveOrderResponse> => {
    return apiClient.post<DeepDiveOrderResponse>(
      `${PAYMENT_BASE}/deep-dive/${recordId}`,
      { paymentMethod },
    );
  },
};