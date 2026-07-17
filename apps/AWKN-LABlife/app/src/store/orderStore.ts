import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { paymentApi, type CreateOrderRequest, type OrderStatus } from '@/api/payment';
import { ApiError } from '@/api/client';
import { trackEvent } from '@/lib/analytics';

interface OrderState {
  currentOrder: OrderStatus | null;
  orders: OrderStatus[];
  isProcessing: boolean;
  error: string | null;

  // 与后端 CreateOrderDto 对齐：productType / productId / paymentMethod / amount
  createOrder: (input: CreateOrderRequest) => Promise<OrderStatus>;
  checkOrderStatus: (orderId: string) => Promise<void>;
  pollOrderStatusUntilPaid: (orderId: string, maxAttempts?: number) => Promise<OrderStatus | null>;
  loadOrders: () => Promise<void>;
  clearCurrentOrder: () => void;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      currentOrder: null,
      orders: [],
      isProcessing: false,
      error: null,

      createOrder: async (input: CreateOrderRequest) => {
        set({ isProcessing: true, error: null });

        try {
          const resp = await paymentApi.createOrder(input);
          // 立即拉一次状态作为 currentOrder 初始值
          let initial: OrderStatus;
          try {
            initial = await paymentApi.getOrderStatus(resp.orderId);
          } catch {
            // 拉取失败时用 createOrder 的返回值构造一个 pending 占位
            initial = {
              orderId: resp.orderId,
              status: 'pending',
              amount: resp.amount,
              currency: resp.currency,
              productType: input.productType,
              productId: input.productId,
            };
          }
          set({ currentOrder: initial, isProcessing: false });
          trackEvent('payment_order_created', {
            order_id: initial.orderId,
            product_type: initial.productType,
            product_id: initial.productId,
            amount: initial.amount,
          });
          return initial;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : '创建订单失败';
          set({ error: message, isProcessing: false });
          throw err;
        }
      },

      checkOrderStatus: async (orderId: string) => {
        try {
          const order = await paymentApi.getOrderStatus(orderId);
          set((state) => ({
            currentOrder: state.currentOrder?.orderId === orderId ? order : state.currentOrder,
            orders: state.orders.map((o) =>
              o.orderId === orderId ? order : o
            ),
          }));
          if (order.status === 'paid') {
            trackEvent('payment_success', { order_id: orderId });
          }
        } catch (err) {
          // 未认证（401）是预期状态（token 过期），client.ts 已处理，此处静默
          if (err instanceof ApiError && err.statusCode === 401) return;
          console.error('Check order status failed:', err);
        }
      },

      // 轮询订单状态直到 paid / expired 或达最大次数
      pollOrderStatusUntilPaid: async (orderId: string, maxAttempts = 30) => {
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const order = await paymentApi.getOrderStatus(orderId);
            set((state) => ({
              currentOrder: state.currentOrder?.orderId === orderId ? order : state.currentOrder,
              orders: state.orders.map((o) => (o.orderId === orderId ? order : o)),
            }));
            if (order.status === 'paid') {
              trackEvent('payment_success', { order_id: orderId });
              return order;
            }
            if (order.status === 'expired' || order.status === 'refunded') {
              return order;
            }
          } catch (err) {
            // 未认证（401）是预期状态（token 过期），client.ts 已处理，此处静默
            if (err instanceof ApiError && err.statusCode === 401) return null;
            console.error('Poll order status failed:', err);
          }
          // 间隔 2s 轮询
          await new Promise((r) => setTimeout(r, 2000));
        }
        return null;
      },

      loadOrders: async () => {
        try {
          const orders = await paymentApi.getOrders();
          set({ orders });
        } catch (err) {
          // 未认证（401）是预期状态（用户未登录或 token 过期），client.ts 已处理，此处静默
          if (err instanceof ApiError && err.statusCode === 401) return;
          console.error('Load orders failed:', err);
        }
      },

      clearCurrentOrder: () => {
        set({ currentOrder: null, error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'order-storage',
      partialize: (state) => ({ orders: state.orders }),
    }
  )
);
