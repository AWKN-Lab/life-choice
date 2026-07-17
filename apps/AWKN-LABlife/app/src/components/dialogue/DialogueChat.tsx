import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogue } from '@/hooks/useDialogue';
import { ZhangbanshanAvatar } from '@/components/common/ZhangbanshanAvatar';
import { Icon } from '@/components/result/Icon';
import { EASE_OUT_EXPO, msgVariantsSimple as msgVariants } from '@/lib/motion-variants';

// ── Types ──────────────────────────────────────────────────────────────

type DialogueState = 'IDLE' | 'SCHEDULING' | 'CLARIFYING' | 'GENERATING' | 'RESPONDING' | 'COMPLETED';

interface DialogueChatProps {
  onClose?: () => void;
}

// ── State → UI mapping ─────────────────────────────────────────────────

const STATE_DOT: Record<DialogueState, { color: string; bg: string; label: string; pulse: boolean }> = {
  IDLE:        { color: 'bg-slate-400',     bg: 'bg-slate-400/20',     label: '待命',   pulse: false },
  SCHEDULING:  { color: 'bg-blue-400',      bg: 'bg-blue-400/20',      label: '调度中', pulse: true  },
  CLARIFYING:  { color: 'bg-amber-400',     bg: 'bg-amber-400/20',     label: '追问中', pulse: false },
  GENERATING:  { color: 'bg-purple-400',    bg: 'bg-purple-400/20',    label: '推演中', pulse: true  },
  RESPONDING:  { color: 'bg-green-400',     bg: 'bg-green-400/20',     label: '回复中', pulse: true  },
  COMPLETED:   { color: 'bg-emerald-400',   bg: 'bg-emerald-400/20',   label: '已完成', pulse: false },
};

const QUICK_REPLIES = ['想动', '想等', '说不清'] as const;

// ── Animation variants ─────────────────────────────────────────────────


// ── Component ──────────────────────────────────────────────────────────

export function DialogueChat({ onClose }: DialogueChatProps) {
  const {
    turns,
    state: dialogueState,
    clarifyingQuestion,
    streamingContent,
    startDialogue,
    replyToQuestion,
    cancelDialogue,
    reset: resetDialogue,
  } = useDialogue();

  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const state = dialogueState as DialogueState;
  const dot = STATE_DOT[state] ?? STATE_DOT.IDLE;

  // ── Auto-scroll ────────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, streamingContent, clarifyingQuestion]);

  // ── Focus input when entering CLARIFYING ───────────────────────────

  useEffect(() => {
    if (state === 'CLARIFYING' || state === 'IDLE') {
      inputRef.current?.focus();
    }
  }, [state]);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    if (state === 'IDLE') {
      startDialogue(text);
    } else if (state === 'CLARIFYING') {
      replyToQuestion(text);
    }

    setInputValue('');
  }, [inputValue, state, startDialogue, replyToQuestion]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleQuickReply = useCallback((reply: string) => {
    replyToQuestion(reply);
  }, [replyToQuestion]);

  const handleClose = useCallback(() => {
    cancelDialogue();
    onClose?.();
  }, [cancelDialogue, onClose]);

  const handleNewDialogue = useCallback(() => {
    resetDialogue();
    setInputValue('');
    inputRef.current?.focus();
  }, [resetDialogue]);

  // ── Derived ────────────────────────────────────────────────────────

  const inputDisabled = state !== 'IDLE' && state !== 'CLARIFYING';
  const placeholder = state === 'CLARIFYING'
    ? '回答张半山的追问...'
    : state === 'IDLE'
      ? '说出你的困惑...'
      : '';

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline/10 shrink-0">
        <ZhangbanshanAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">张半山对话</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-block w-2 h-2 rounded-full ${dot.color} ${dot.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-[11px] text-on-surface/50">{dot.label}</span>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-on-surface/5 transition-colors"
          aria-label="关闭对话"
        >
          <Icon name="close" size={20} className="text-on-surface/50" />
        </button>
      </div>

      {/* ── Message area ───────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin"
        ref={scrollRef}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {turns.map((turn, i) => {
            const isUser = turn.role === 'user';
            return (
              <motion.div
                key={turn.id ?? i}
                initial={msgVariants[isUser ? 'user' : 'system'].initial}
                animate={msgVariants[isUser ? 'user' : 'system'].animate}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isUser && <ZhangbanshanAvatar size="sm" className="mt-0.5 flex-shrink-0" />}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-primary/15 text-on-surface rounded-tr-sm'
                      : turn.isClarifying
                        ? 'bg-amber-400/10 text-on-surface/90 border border-amber-400/30 rounded-tl-sm'
                        : 'bg-surface-container-low/60 text-on-surface/90 rounded-tl-sm'
                  }`}
                >
                  {!isUser && turn.isClarifying && (
                    <span className="inline-flex items-center gap-1 mb-1.5 text-[11px] text-amber-400/80 font-medium">
                      <Icon name="help" size={14} className="text-amber-400" />
                      追问
                    </span>
                  )}
                  <p>{turn.content}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ── Streaming content ──────────────────────────────────────── */}
        {streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-2.5"
          >
            <ZhangbanshanAvatar size="sm" className="mt-0.5 flex-shrink-0" />
            <div className="max-w-[80%] bg-surface-container-low/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed text-on-surface/90">
              <p>{streamingContent}</p>
              <span className="inline-block w-1 h-4 bg-on-surface/30 animate-pulse rounded-sm ml-0.5 align-text-bottom" />
            </div>
          </motion.div>
        )}

        {/* ── Typing indicator (SCHEDULING / GENERATING / RESPONDING) ── */}
        {(state === 'SCHEDULING' || state === 'GENERATING' || state === 'RESPONDING') && !streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5"
          >
            <ZhangbanshanAvatar size="sm" className="mt-0.5 flex-shrink-0" />
            <div className="bg-surface-container-low/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              <span className="text-xs text-on-surface/40 mr-1">
                {state === 'SCHEDULING' ? '调度中' : state === 'GENERATING' ? '推演中' : '回复中'}
              </span>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-on-surface/30"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Clarifying question + quick replies ────────────────────── */}
        <AnimatePresence>
          {state === 'CLARIFYING' && clarifyingQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {/* Question bubble */}
              <div className="flex gap-2.5">
                <ZhangbanshanAvatar size="sm" className="mt-0.5 flex-shrink-0" />
                <div className="max-w-[80%] bg-amber-400/10 text-on-surface/90 border border-amber-400/30 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed">
                  <span className="inline-flex items-center gap-1 mb-1.5 text-[11px] text-amber-400/80 font-medium">
                    <Icon name="help" size={14} className="text-amber-400" />
                    追问
                  </span>
                  <p>{clarifyingQuestion}</p>
                </div>
              </div>

              {/* Quick reply buttons */}
              <div className="flex gap-2 pl-11">
                {QUICK_REPLIES.map((reply, i) => (
                  <motion.button
                    key={reply}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 + i * 0.06 }}
                    onClick={() => handleQuickReply(reply)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium text-amber-300 border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 active:scale-95 transition-all"
                  >
                    {reply}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-outline/10 px-4 py-3">
        {state === 'COMPLETED' ? (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleNewDialogue}
            className="w-full py-2.5 rounded-xl bg-primary/15 text-primary text-sm font-medium border border-primary/30 hover:bg-primary/25 active:scale-[0.98] transition-all"
          >
            开始新对话
          </motion.button>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={inputDisabled}
              className="flex-1 rounded-xl bg-surface-container-low/50 border border-outline/15 px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={inputDisabled || !inputValue.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex-shrink-0"
            >
              <Icon name="send" size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
