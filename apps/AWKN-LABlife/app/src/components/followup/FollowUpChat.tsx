import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZhangbanshanAvatar } from '@/components/common/ZhangbanshanAvatar';
import { getSocket } from '@/lib/websocket';
import { consultApi } from '@/api/consult';

interface FollowUpChatProps {
  followUpId: string;
  recordId: string;
  question: string;
  onComplete: () => void;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

type ChatPhase = 'greeting' | 'waiting_reply' | 'reviewing' | 'done';

const PHASE_MESSAGES: Record<ChatPhase, string> = {
  greeting: '上次你问的那个事，后来怎么样了？',
  waiting_reply: '',
  reviewing: '',
  done: '',
};

export function FollowUpChat({ followUpId, recordId, question, onComplete }: FollowUpChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<ChatPhase>('greeting');
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Step 1: 发送 follow_up_start，张半山问开场白
  useEffect(() => {
    const socket = getSocket();
    socket.emit('follow_up_start', { followUpId, recordId });

    setMessages([{ role: 'system', content: PHASE_MESSAGES.greeting }]);
    setPhase('waiting_reply');
  }, [followUpId, recordId]);

  // 监听 WS 回复（张半山的复盘评论）
  useEffect(() => {
    const socket = getSocket();

    const handleReview = (data: { content: string; done?: boolean }) => {
      if (data.done) {
        setIsStreaming(false);
        setPhase('done');
        return;
      }
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'system' && phase === 'reviewing') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: last.content + (data.content || '') } : m
          );
        }
        return [...prev, { role: 'system', content: data.content || '' }];
      });
    };

    socket.on('follow_up_review', handleReview);
    return () => { socket.off('follow_up_review', handleReview); };
  }, [phase]);

  // Step 2: 用户回复实际结果
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || phase !== 'waiting_reply') return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInputValue('');
    setPhase('reviewing');
    setIsStreaming(true);

    // 添加空的系统消息占位（流式填充）
    setMessages(prev => [...prev, { role: 'system', content: '' }]);

    try {
      // 调用 API 完成回访
      await consultApi.followup({
        recordId,
        question: text,
      });
    } catch (err) {
      console.error('[FollowUpChat] completeFollowUp failed:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'system',
          content: '抱歉，回访提交失败，请稍后重试。',
        };
        return updated;
      });
      setIsStreaming(false);
      setPhase('done');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline/10">
        <ZhangbanshanAvatar size="sm" />
        <div>
          <p className="text-sm font-medium text-on-surface">张半山</p>
          <p className="text-xs text-on-surface/40">回访对话</p>
        </div>
        {phase === 'done' && (
          <button
            onClick={onComplete}
            className="ml-auto px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
          >
            完成
          </button>
        )}
      </div>

      {/* 原始问题提示 */}
      <div className="px-4 py-2 bg-surface-container-low/30 border-b border-outline/5">
        <p className="text-xs text-on-surface/50">
          原始问题：{question}
        </p>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'system' && <ZhangbanshanAvatar size="sm" />}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary/15 text-on-surface rounded-tr-sm'
                    : 'bg-surface-container-low/60 text-on-surface/90 rounded-tl-sm'
                }`}
              >
                {msg.content || (
                  <span className="inline-block w-2 h-4 bg-on-surface/30 animate-pulse rounded-sm" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isStreaming && !messages[messages.length - 1]?.content && (
          <div className="flex gap-2.5">
            <ZhangbanshanAvatar size="sm" />
            <div className="bg-surface-container-low/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-on-surface/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-on-surface/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-on-surface/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 输入框 */}
      {phase === 'waiting_reply' && (
        <div className="px-4 py-3 border-t border-outline/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说说后来怎么样了..."
              className="flex-1 rounded-xl bg-surface-container-low/50 border border-outline/15 px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:border-primary/40 transition-colors"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
