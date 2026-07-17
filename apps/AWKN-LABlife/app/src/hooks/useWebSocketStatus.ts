import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/websocket';

// U-P2-3: WebSocket 应用层断连重连状态
export type WebSocketStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketStatusState {
  status: WebSocketStatus;
  /** 重连尝试次数（disconnected/reconnecting 时有意义） */
  reconnectAttempts: number;
}

/**
 * 监听 socket.io 应用层连接状态。
 *
 * socket.io 底层 reconnection=true 已启用（见 websocket.ts），
 * 但应用层无 disconnect/reconnect 事件监听，导致断连时 UI 无感知。
 * 本 hook 补齐应用层状态暴露。
 */
export function useWebSocketStatus(): WebSocketStatusState {
  const [state, setState] = useState<WebSocketStatusState>({
    status: 'connected',
    reconnectAttempts: 0,
  });

  useEffect(() => {
    const socket = getSocket();

    // 初始状态同步
    setState({
      status: socket.connected ? 'connected' : 'reconnecting',
      reconnectAttempts: 0,
    });

    const handleConnect = () => {
      setState({ status: 'connected', reconnectAttempts: 0 });
    };

    const handleDisconnect = () => {
      setState((prev) => ({
        ...prev,
        status: 'disconnected',
        reconnectAttempts: 0,
      }));
    };

    const handleReconnectAttempt = (attempt: number) => {
      setState({ status: 'reconnecting', reconnectAttempts: attempt });
    };

    const handleReconnect = () => {
      setState({ status: 'connected', reconnectAttempts: 0 });
    };

    const handleReconnectError = () => {
      // 重连失败，保持 reconnecting 状态，等待下一次尝试
      setState((prev) => ({ ...prev, status: 'reconnecting' }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_error', handleReconnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_error', handleReconnectError);
    };
  }, []);

  return state;
}
