/**
 * WebSocket 客户端 - 对接后端 NestJS WebSocket Gateway（namespace: /ws）
 *
 * 事件约定：
 *  - client → server: 'authenticate'  { token: string }
 *  - server → client: 'progress'  { sessionId, progress, message, timestamp }
 *  - server → client: 'result'    { sessionId, result, timestamp }
 *  - server → client: 'error'     { sessionId, error, timestamp }
 *
 * 注：后端 gateway 在 /ws 命名空间下，连接 URL 形如 http://localhost:3000/ws
 */
import { io, type Socket } from 'socket.io-client';
import { getAuthToken } from '@/lib/tokenStorage';

let socket: Socket | null = null;
let connectingPromise: Promise<Socket> | null = null;

function resolveWsUrl(): string {
  // 优先从 Vite 环境变量读取，否则用当前 origin
  const envUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (envUrl) return envUrl;

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (apiBase) {
    // http://localhost:3000/api/v1 → http://localhost:3000
    return apiBase.replace(/\/api\/.*$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

/** 拿到已连接或新建的 socket 实例（单例） */
export function getSocket(): Socket {
  if (!socket) {
    const url = resolveWsUrl();
    // 生产环境：path=/life/socket.io，Nginx 代理到后端
    // 开发环境：path=/socket.io，直连 localhost:3000
    const isProd = import.meta.env.PROD;
    socket = io(url, {
      path: isProd ? '/life/socket.io' : '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      const token = getAuthToken();
      if (token) {
        socket?.emit('authenticate', { token });
      }
    });
  }
  return socket;
}

/** 主动连接并等待 connect 事件（用于必须在已连接后才能发消息的场景） */
export function connectSocket(): Promise<Socket> {
  if (socket?.connected) return Promise.resolve(socket);
  if (connectingPromise) return connectingPromise;

  const s = getSocket();
  connectingPromise = new Promise<Socket>((resolve, reject) => {
    if (s.connected) {
      resolve(s);
      connectingPromise = null;
      return;
    }
    const onConnect = () => {
      s.off('connect_error', onError);
      resolve(s);
      connectingPromise = null;
    };
    const onError = (err: Error) => {
      s.off('connect', onConnect);
      reject(err);
      connectingPromise = null;
    };
    s.once('connect', onConnect);
    s.once('connect_error', onError);
  });
  return connectingPromise;
}

/** 主动断开（仅在登出/卸载时调用） */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  connectingPromise = null;
}

/** 类型化的事件订阅 */
export interface ProgressPayload {
  sessionId: string;
  progress: number;
  message: string;
  timestamp: number;
}

export interface ResultPayload {
  sessionId: string;
  result: any;
  timestamp: number;
}

export interface ErrorPayload {
  sessionId: string;
  error: string;
  timestamp: number;
}

/**
 * P1-1: 流式 LLM token
 * - stage: 'judgment' | 'premise' | 'cost' | 'reasoning' | 'meta'
 * - done: true 表示该 recordId 的流式结束（meta 阶段发送 done=true）
 */
export interface LLMTokenPayload {
  sessionId: string | null;
  recordId?: string;
  stage: 'judgment' | 'premise' | 'cost' | 'reasoning' | 'meta';
  token: string;
  content?: string;
  done?: boolean;
  provider?: string;
  error?: string;
  timestamp: number;
}
