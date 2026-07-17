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
};