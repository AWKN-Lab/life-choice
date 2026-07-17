import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useWebSocketStatus } from '@/hooks/useWebSocketStatus';

// U-P2-3: WebSocket 应用层断连重连 UI 指示器
// - connected: 不显示
// - disconnected: 红色横幅"连接已断开，正在重连..."
// - reconnecting: 琥珀色横幅"正在重连...（第 N 次）"
export default function ConnectionIndicator() {
  const { status, reconnectAttempts } = useWebSocketStatus();
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  const visible = status !== 'connected';

  const config = status === 'disconnected'
    ? {
        bg: 'bg-red-500/90',
        icon: 'cloud_off',
        text: isEnglish ? 'Connection lost. Reconnecting…' : '连接已断开，正在重连…',
      }
    : {
        bg: 'bg-amber-500/90',
        icon: 'sync',
        text: isEnglish
          ? `Reconnecting… (attempt ${reconnectAttempts})`
          : `正在重连…（第 ${reconnectAttempts} 次）`,
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed top-0 left-0 right-0 z-[400] ${config.bg} backdrop-blur-sm shadow-md`}
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-white text-sm">
            <span
              className={`material-symbols-outlined ${status === 'reconnecting' ? 'animate-spin' : ''}`}
              style={{ fontSize: 16 }}
            >
              {config.icon}
            </span>
            <span>{config.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
