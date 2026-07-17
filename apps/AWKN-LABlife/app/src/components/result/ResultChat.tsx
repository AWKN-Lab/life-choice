import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ResultChatMessage } from './chat-messages';
import { TypingIndicator } from './chat-messages/TypingIndicator';
import { ZhangbanshanMessage } from './chat-messages/ZhangbanshanMessage';
import { BaziCardMessage } from './chat-messages/BaziCardMessage';
import { LiurenCardMessage } from './chat-messages/LiurenCardMessage';
import { ReportSectionMessage } from './chat-messages/ReportSectionMessage';
import { ActionListMessage } from './chat-messages/ActionListMessage';
import { RiskListMessage } from './chat-messages/RiskListMessage';
import { VipPromptMessage } from './chat-messages/VipPromptMessage';
import { ToolResultMessage } from './chat-messages/ToolResultMessage';
import { TimelineMessage } from './chat-messages/TimelineMessage';
import { CostWarningMessage } from './chat-messages/CostWarningMessage';
import { MemoryAnchorMessage } from './chat-messages/MemoryAnchorMessage';
import { FiveLayerMessage } from './chat-messages/FiveLayerMessage';
import { StepCardMessage } from './chat-messages/StepCardMessage';
import { ZhangbanshanAvatar } from '@/components/common/ZhangbanshanAvatar';
import { FollowUpQuestions } from '../question/FollowUpQuestions';
import { Icon } from './Icon';
import { consultApi } from '@/api/consult';
import { useLLMStream } from '@/hooks/useLLMStream';
import { getSocket } from '@/lib/websocket';
import { trackFunnel } from '@/utils/analytics';
import type { UnifiedResult } from './resultTypes';
import { MISSING_LAYER_PLACEHOLDER } from './resultTypes';
import { EASE_OUT_EXPO, msgVariants } from '@/lib/motion-variants';

// P1-4: 算法引子话术（三段式，与后端 agent-intro-messages.ts 保持一致）
import { AGENT_INTRO_MESSAGES } from '@/data/agent-intro-messages';

const IconComp = ({ name, size = 24, className = '' }: { name: string; size?: number; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} style={{
    fontSize: size,
    fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
  }}>{name}</span>
);


interface ResultChatProps {
  result: UnifiedResult;
  consultData: {
    question?: string;
    birthDate?: string;
    birthHour?: number;
    city?: string;
    gender?: string;
    askTime?: string;
    namingType?: string;
    originalName?: string;
    sourceEntry?: string;
  };
  isQuestionGated: boolean;
  isKlineGated: boolean;
  availableVipServices: Array<{ id: string; iconName: string }>;
  onVipClick: (moduleId: string) => void;
  onFollowUpClick: (question: string) => void;
  pendingFollowUpQuestion?: string | null;
  onPendingFollowUpHandled?: () => void;
  /** 5 层漏斗全部展示完毕后触发（用于延迟显示反馈组件） */
  onChatReady?: () => void;
}

export function ResultChat({
  result,
  consultData,
  isQuestionGated,
  isKlineGated,
  availableVipServices,
  onVipClick,
  onFollowUpClick,
  pendingFollowUpQuestion,
  onPendingFollowUpHandled,
  onChatReady,
}: ResultChatProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);  // U-P1-3: 跳过动画用

  const [messages, setMessages] = useState<ResultChatMessage[]>([]);
  const [chatPhase, setChatPhase] = useState<'revealing' | 'revealed' | 'interacting'>('revealing');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [followupCount, setFollowupCount] = useState(0);
  const MAX_FOLLOWUP_ROUNDS = 3;

  // P1-4: 付费升级弹窗状态
  const [showPaywall, setShowPaywall] = useState(false);

  // P2-3: 代价确认环状态
  const [costConfirmationActive, setCostConfirmationActive] = useState(false);
  const [costConfirmed, setCostConfirmed] = useState(false);
  const [inputPlaceholder, setInputPlaceholder] = useState('向张半山提问...');
  const userScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 流式追问：监听 WebSocket llm_token 事件
  const [streamingRecordId, setStreamingRecordId] = useState<string | null>(null);
  const llmStream = useLLMStream(streamingRecordId);
  const seededRecordRef = useRef<string | null>(null);
  const lastExternalFollowUpRef = useRef<string | null>(null);

  const normalizeExternalFollowUpQuestion = useCallback((question: string) => {
    if (question !== 'deep_consult') return question;
    const currentQuestion = result.currentQuestion || consultData.question || '当前事项';
    return `请基于当前结果，对“${currentQuestion}”继续做更深入的推演，补充关键判断、风险拆解、时间窗口和可执行建议。`;
  }, [result.currentQuestion, consultData.question]);

  // P2-3: 监听代价确认环 WS 事件
  useEffect(() => {
    const socket = getSocket();
    const handleCostConfirmationResult = (data: { reply: string }) => {
      addMessage({
        role: 'system',
        type: 'text',
        content: data.reply,
      });
      setCostConfirmationActive(false);
    };
    socket.on('cost_confirmation_result', handleCostConfirmationResult);
    return () => { socket.off('cost_confirmation_result', handleCostConfirmationResult); };
  }, []);

  // 流式内容更新：当 llmStream.content 变化时，更新最后一条 system 消息
  useEffect(() => {
    if (!streamingRecordId || !llmStream.streaming) return;
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.role === 'system' && lastMsg.type === 'text' && lastMsg.metadata?.isFollowup) {
        return prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: llmStream.content } : m
        );
      }
      return prev;
    });
  }, [llmStream.content, llmStream.streaming, streamingRecordId]);

  // 流式完成：当 llmStream.done 变为 true 时
  useEffect(() => {
    if (!streamingRecordId || !llmStream.done) return;
    setIsTyping(false);
    setStreamingRecordId(null);
    if (llmStream.error) {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.metadata?.isFollowup) {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: llmStream.content || '追问服务暂时不可用，请稍后重试。' }
              : m
          );
        }
        return prev;
      });
    }
  }, [llmStream.done, llmStream.error, llmStream.content, streamingRecordId]);

  const addMessage = useCallback((msg: Omit<ResultChatMessage, 'id'>) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setMessages(prev => [...prev, { ...msg, id }]);
  }, []);

  // 自动滚动到底部（仅在用户未手动滚动时）
  useEffect(() => {
    if (!isUserScrolling && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (!isUserScrolling) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isUserScrolling]);

  // 监听滚动事件，检测用户是否手动滚动
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    setIsUserScrolling(true);
    if (userScrollTimeout.current) {
      clearTimeout(userScrollTimeout.current);
    }
    userScrollTimeout.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000);
  }, []);

  const scrollToBottom = useCallback(() => {
    setIsUserScrolling(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  // 5层漏斗编排
  useEffect(() => {
    if (!result?.record_id) return;
    if (seededRecordRef.current === result.record_id) return;
    seededRecordRef.current = result.record_id;
    setMessages([]);
    setChatPhase('revealing');

    const timers: ReturnType<typeof setTimeout>[] = [];
    timersRef.current = timers;  // U-P1-3: 同步到 ref，供 skipAnimation 使用

    const reportSections = [
      { title: '排盘验证', content: result.paiPanVerification },
      { title: '命居骨架', content: result.mingjuGuJia },
      { title: '性格画像', content: result.character_portrait },
      { title: '大运主题', content: result.daYunTheme },
      { title: '流年关键象', content: result.keyYearPhenomenon },
      { title: '经典依据', content: result.classicAnalysis },
    ].filter(s => s.content);

    // Layer 1: 大运基调 (0-2s)
    timers.push(setTimeout(() => {
      addMessage({ role: 'system', type: 'text', content: '正在为您推演...' });
    }, 300));

    timers.push(setTimeout(() => {
      const initialQuestion = consultData.question || result.currentQuestion;
      const userContent = initialQuestion ? `问：${initialQuestion}` : null;
      if (userContent) {
        addMessage({ role: 'user', type: 'text', content: userContent });
      }
    }, 600));

    timers.push(setTimeout(() => {
      addMessage({ role: 'system', type: 'text', content: result.summary_line });
    }, 1000));

    const zbOutput = result.zhangbanshan_output;
    if (zbOutput) {
      // P3-2: 记忆锚点（在算法引子之前展示）
      if (zbOutput.memoryAnchor) {
        const anchorText = zbOutput.memoryAnchor;
        timers.push(setTimeout(() => {
          addMessage({
            role: 'system',
            type: 'memory-anchor',
            content: anchorText,
            metadata: { anchorText: anchorText },
          });
        }, 800));
      }

      // P1-4: 算法引子话术（三段式：opening → process → setup）
      const agentType = zbOutput.primary_agent || result.route_type;
      const introStages = AGENT_INTRO_MESSAGES[agentType as keyof typeof AGENT_INTRO_MESSAGES];
      if (introStages) {
        timers.push(setTimeout(() => {
          addMessage({
            role: 'system',
            type: 'text',
            content: introStages.opening,
          });
        }, 1800));
        timers.push(setTimeout(() => {
          addMessage({
            role: 'system',
            type: 'text',
            content: introStages.process,
          });
        }, 1900));
        timers.push(setTimeout(() => {
          addMessage({
            role: 'system',
            type: 'text',
            content: introStages.setup,
          });
        }, 2000));
      }

      timers.push(setTimeout(() => {
        addMessage({
          role: 'system',
          type: 'zhangbanshan',
          content: '张半山三段式输出',
          metadata: zbOutput,
        });
      }, 2000));

      // P2-2: 蛐蛐代价提醒（在三段式输出后展示）
      if (zbOutput.costWarnings?.length) {
        timers.push(setTimeout(() => {
          addMessage({
            role: 'system',
            type: 'cost-warning',
            content: '代价提醒',
            metadata: { warnings: zbOutput.costWarnings },
          });
        }, 2200));
      }

      // P2-3: 代价确认环（重大决策时触发）
      if (zbOutput.costConfirmationRequired) {
        timers.push(setTimeout(() => {
          addMessage({
            role: 'system',
            type: 'text',
            content: '我说清楚了吗？你用自己的话说一下，你这次选择真正要承担的是什么？',
          });
          setCostConfirmationActive(true);
          setInputPlaceholder('写出你理解的最坏情况...');
        }, 2400));
      }
    }

    // 注：八字排盘已由右侧 BaziSidePanel 展示，chat 内不再推送 bazi-card 避免重复

    // P1-2: 5 层输出渲染（在三段式输出后展示）
    if (result.fiveLayers) {
      timers.push(setTimeout(() => {
        addMessage({
          role: 'system',
          type: 'five-layer',
          content: '五层推演',
          metadata: {
            layers: result.fiveLayers,
            // P1-6: 付费分层标记
            gatedLayers: result.gatedLayers || [],
          },
        });
      }, 2200));
    }

    // Layer 2: 流年吉凶 (2.5-3.5s)
    timers.push(setTimeout(() => {
      addMessage({ role: 'system', type: 'text', content: '── 流年吉凶 ──', metadata: { layer: 2 } });
    }, 2500));

    // 前2个report-section作为流年分析
    const layer2Sections = reportSections.slice(0, 2);
    layer2Sections.forEach((section, i) => {
      timers.push(setTimeout(() => {
        addMessage({ role: 'system', type: 'report-section', content: section.title, metadata: section });
      }, 2800 + i * 400));
    });

    // Layer 3: 宫位交叉 (3.5-4.5s)
    timers.push(setTimeout(() => {
      addMessage({ role: 'system', type: 'text', content: '── 多体系交叉验证 ──', metadata: { layer: 3 } });
    }, 3500));

    if (result.toolResults && result.toolResults.length > 0) {
      timers.push(setTimeout(() => {
        addMessage({
          role: 'system',
          type: 'tool-result',
          content: '工具调用分析',
          metadata: { tools: result.toolResults },
        });
      }, 3800));
    }

    // Layer 3 末尾：六壬路由时推送 liuren-card
    if (result.route_type === 'liuren' && result.engine_data) {
      timers.push(setTimeout(() => {
        addMessage({
          role: 'system',
          type: 'liuren-card',
          content: '大六壬课盘',
          metadata: { engineData: result.engine_data, question: consultData.question, askTime: consultData.askTime, city: consultData.city },
        });
      }, 4000));
    }

    // Layer 4: 具体要素 (4.5-6s)
    timers.push(setTimeout(() => {
      addMessage({ role: 'system', type: 'text', content: '── 具体分析 ──', metadata: { layer: 4 } });
    }, 4500));

    // 后4个report-section作为具体要素
    const layer4Sections = reportSections.slice(2);
    layer4Sections.forEach((section, i) => {
      timers.push(setTimeout(() => {
        addMessage({ role: 'system', type: 'report-section', content: section.title, metadata: section });
      }, 4800 + i * 400));
    });

    // Layer 5: 总结收束 (6-7s)
    const layer5Base = 6000 + layer4Sections.length * 400;

    timers.push(setTimeout(() => {
      addMessage({ role: 'system', type: 'text', content: '── 总结与建议 ──', metadata: { layer: 5 } });
    }, layer5Base));

    if (result.timelineEvents && result.timelineEvents.length > 0) {
      timers.push(setTimeout(() => {
        addMessage({
          role: 'system',
          type: 'timeline',
          content: '人生关键节点',
          metadata: { events: result.timelineEvents },
        });
      }, layer5Base + 200));
    }

    if (result.actions && result.actions.length > 0) {
      timers.push(setTimeout(() => {
        addMessage({
          role: 'system',
          type: 'action-list',
          content: '行动建议',
          metadata: { actions: result.actions },
        });
      }, layer5Base + 500));
    }

    if (result.risks && result.risks.length > 0) {
      timers.push(setTimeout(() => {
        addMessage({
          role: 'system',
          type: 'risk-list',
          content: '风险提醒',
          metadata: {
            risks: isQuestionGated ? result.risks.slice(0, 1) : result.risks,
            isGated: isQuestionGated,
            totalCount: result.risks.length,
          },
        });
      }, layer5Base + 800));
    }

    if (availableVipServices.length > 0) {
      timers.push(setTimeout(() => {
        const services = availableVipServices.map(s => ({
          id: s.id,
          iconName: s.iconName,
          title: t(`resultPage.vipServices.${s.id}.title`),
          subtitle: t(`resultPage.vipServices.${s.id}.subtitle`),
          desc: t(`resultPage.vipServices.${s.id}.desc`),
        }));
        addMessage({
          role: 'system',
          type: 'vip-prompt',
          content: 'VIP深度服务',
          metadata: { services },
        });
      }, layer5Base + 1200));
    }

    // 2026-06-15 修复：仅在 5 层输出完整且非降级时触发反馈组件
    // 判断标准：fiveLayers 存在且 5 层都有非空内容，且 zhangbanshan_output.judgment 非空（说明 LLM 真的分析了）
    const hasFiveLayers = !!(
      result.fiveLayers &&
      result.fiveLayers.clause?.trim() &&
      result.fiveLayers.halfMountain?.trim() &&
      result.fiveLayers.detail?.trim() &&
      result.fiveLayers.cost?.trim() &&
      result.fiveLayers.nextAction?.trim()
    );
    const isDegraded = !result.zhangbanshan_output?.judgment?.trim() || !result.fiveLayers;
    const shouldShowFeedback = hasFiveLayers && !isDegraded;

    timers.push(setTimeout(() => {
      addMessage({
        role: 'system',
        type: 'text',
        content: '你对哪方面还想深入了解？可以直接问我，或点击下方推荐问题。',
      });
      setChatPhase('interacting');
      if (shouldShowFeedback) {
        onChatReady?.();
      }
    }, layer5Base + 1600));

    timers.push(setTimeout(() => {
      setChatPhase('revealed');
    }, layer5Base + 1800));

    return () => timers.forEach(clearTimeout);
  }, [result?.record_id, addMessage, t]);

  // U-P1-3: 跳过动画 — 清除所有未触发的 timers，立即进入交互状态
  const skipAnimation = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    setChatPhase('revealed');
  }, []);

  const getRouteLabel = useCallback((routeType: string) => {
    const labels: Record<string, string> = {
      ziping: '八字命盘',
      liuren: '六壬课盘',
      quming: '取名分析',
      qimen: '奇门遁甲',
      liuyao: '六爻卦象',
      ziwei: '紫微斗数',
    };
    return labels[routeType] || '命理分析';
  }, []);

  const handleFollowUpInChat = async (question: string) => {
    if (followupCount >= MAX_FOLLOWUP_ROUNDS) {
      addMessage({ role: 'user', type: 'text', content: question });
      addMessage({
        role: 'system',
        type: 'text',
        content: '本次咨询追问次数已用完。如需继续深入，建议开启新的咨询。',
      });
      setShowPaywall(true);
      trackFunnel('funnel_followup_to_pay', { trigger: 'followup_limit', followupCount });
      return;
    }

    trackFunnel('funnel_complete_to_followup', { followupCount: followupCount + 1, source: 'suggestion' });

    addMessage({ role: 'user', type: 'text', content: question });
    setIsTyping(true);

    // 先添加一条空的 system 消息，用于流式填充
    addMessage({
      role: 'system',
      type: 'text',
      content: '',
      metadata: { isFollowup: true },
    });

    try {
      const response = await consultApi.followup({
        recordId: result.record_id,
        question,
        context: messages
          .filter(m => m.role === 'user' || (m.role === 'system' && m.metadata?.isFollowup))
          .slice(-6)
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
      });

      setFollowupCount(response.followupCount);

      // P1-4: 第 3 次追问触发付费提示
      if (response.paywallTriggered) {
        setShowPaywall(true);
      }

      // 如果后端直接返回了完整内容（非流式或追问次数用完），直接填充
      if (response.content && !llmStream.streaming) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.metadata?.isFollowup) {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: response.content } : m
            );
          }
          return prev;
        });
        setIsTyping(false);
      }

      // 设置 streamingRecordId 以接收 WebSocket 流式 token
      if (response.done && response.followupCount <= MAX_FOLLOWUP_ROUNDS) {
        setStreamingRecordId(result.record_id);
      }
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.metadata?.isFollowup) {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: '追问服务暂时不可用，请稍后重试。' }
              : m
          );
        }
        return prev;
      });
    }
  };

  useEffect(() => {
    if (!pendingFollowUpQuestion) return;
    if (chatPhase !== 'interacting') return;
    if (isTyping) return;
    if (lastExternalFollowUpRef.current === pendingFollowUpQuestion) return;

    lastExternalFollowUpRef.current = pendingFollowUpQuestion;
    void handleFollowUpInChat(normalizeExternalFollowUpQuestion(pendingFollowUpQuestion));
    onPendingFollowUpHandled?.();
  }, [
    pendingFollowUpQuestion,
    chatPhase,
    isTyping,
    handleFollowUpInChat,
    normalizeExternalFollowUpQuestion,
    onPendingFollowUpHandled,
  ]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const question = inputValue.trim();
    setInputValue('');

    // P2-3: 代价确认环处理（通过 WS 事件与后端交互）
    if (costConfirmationActive && !costConfirmed) {
      addMessage({ role: 'user', type: 'text', content: question });
      // 通过 WebSocket 发送用户复述，等待后端 cost_confirmation_result 事件
      const socket = getSocket();
      socket.emit('cost_confirmation_reply', {
        recordId: result.record_id,
        userRestatedCost: question,
      });
      setCostConfirmed(true);
      setInputPlaceholder('向张半山提问...');
      return;
    }

    if (followupCount >= MAX_FOLLOWUP_ROUNDS) {
      addMessage({ role: 'user', type: 'text', content: question });
      addMessage({
        role: 'system',
        type: 'text',
        content: '本次咨询追问次数已用完。如需继续深入，建议开启新的咨询。',
      });
      setShowPaywall(true);
      trackFunnel('funnel_followup_to_pay', { trigger: 'followup_limit', followupCount });
      return;
    }

    trackFunnel('funnel_complete_to_followup', { followupCount: followupCount + 1, source: 'input' });

    addMessage({ role: 'user', type: 'text', content: question });
    setIsTyping(true);

    // 先添加一条空的 system 消息，用于流式填充
    addMessage({
      role: 'system',
      type: 'text',
      content: '',
      metadata: { isFollowup: true },
    });

    try {
      const response = await consultApi.followup({
        recordId: result.record_id,
        question,
        context: messages
          .filter(m => m.role === 'user' || (m.role === 'system' && m.metadata?.isFollowup))
          .slice(-6)
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
      });

      setFollowupCount(response.followupCount);

      // P1-4: 第 3 次追问触发付费提示
      if (response.paywallTriggered) {
        setShowPaywall(true);
      }

      // 如果后端直接返回了完整内容（非流式或追问次数用完），直接填充
      if (response.content && !llmStream.streaming) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.metadata?.isFollowup) {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: response.content } : m
            );
          }
          return prev;
        });
        setIsTyping(false);
      }

      // 设置 streamingRecordId 以接收 WebSocket 流式 token
      if (response.done && response.followupCount <= MAX_FOLLOWUP_ROUNDS) {
        setStreamingRecordId(result.record_id);
      }
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.metadata?.isFollowup) {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: '追问服务暂时不可用，请稍后重试。' }
              : m
          );
        }
        return prev;
      });
    }
  };

  const renderMessageContent = (msg: ResultChatMessage) => {
    // Layer 分隔线渲染
    if (msg.metadata?.layer) {
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-on-surface/10" />
          <span className="text-xs text-primary/60 whitespace-nowrap">{msg.content}</span>
          <div className="flex-1 h-px bg-on-surface/10" />
        </div>
      );
    }

    switch (msg.type) {
      case 'text':
        return <p className="text-sm leading-relaxed">{msg.content}</p>;
      case 'zhangbanshan':
        return <ZhangbanshanMessage data={msg.metadata as any} />;
      case 'bazi-card':
        return <BaziCardMessage calcResult={msg.metadata?.calcResult} birthDate={msg.metadata?.birthDate} compact />;
      case 'liuren-card':
        return <LiurenCardMessage engineData={msg.metadata?.engineData} question={msg.metadata?.question} askTime={msg.metadata?.askTime} city={msg.metadata?.city} />;
      case 'report-section':
        return <ReportSectionMessage data={msg.metadata as any} />;
      case 'action-list':
        return <ActionListMessage actions={msg.metadata?.actions || []} />;
      case 'risk-list':
        return (
          <RiskListMessage
            risks={msg.metadata?.risks || []}
            isGated={msg.metadata?.isGated}
            totalCount={msg.metadata?.totalCount}
          />
        );
      case 'vip-prompt':
        return (
          <VipPromptMessage
            services={msg.metadata?.services || []}
            onUnlock={onVipClick}
          />
        );
      case 'tool-result':
        return <ToolResultMessage tools={msg.metadata?.tools || []} />;
      case 'timeline':
        return <TimelineMessage events={msg.metadata?.events || []} />;
      case 'cost-warning':
        return <CostWarningMessage warnings={msg.metadata?.warnings || []} />;
      case 'memory-anchor':
        return <MemoryAnchorMessage anchorText={msg.metadata?.anchorText || msg.content} lastQuestion={msg.metadata?.lastQuestion} />;
      case 'five-layer':
        return <FiveLayerMessage layers={msg.metadata?.layers || { clause: MISSING_LAYER_PLACEHOLDER, halfMountain: MISSING_LAYER_PLACEHOLDER, detail: MISSING_LAYER_PLACEHOLDER, cost: MISSING_LAYER_PLACEHOLDER, nextAction: MISSING_LAYER_PLACEHOLDER }} gatedLayers={msg.metadata?.gatedLayers} onUnlock={() => onVipClick('breakthrough')} />;
      case 'step-card':
        return <StepCardMessage data={msg.metadata?.stepCard || { title: msg.content, items: [] }} />;
      default:
        return <p className="text-sm leading-relaxed">{msg.content}</p>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* U-P1-3: 跳过动画按钮 — revealing 阶段显示，点击立即展示全部消息 */}
      <AnimatePresence>
        {chatPhase === 'revealing' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-0 z-20 flex justify-end px-3 sm:px-4 py-2 bg-surface/80 backdrop-blur-sm"
          >
            <button
              onClick={skipAnimation}
              className="rounded-full bg-primary/20 px-3 py-1.5 text-xs text-primary hover:bg-primary/30 transition-colors"
            >
              跳过动画 »
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 消息列表区域 */}
      <div
        className="flex-1 overflow-y-auto space-y-1 px-3 sm:px-4 py-4 scrollbar-thin"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={msgVariants[msg.role].initial}
              animate={msgVariants[msg.role].animate}
              transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
            >
              {msg.role === 'system' && !msg.metadata?.layer && (
                <ZhangbanshanAvatar size="sm" className="mr-2 mt-0.5" />
              )}
              <div className={`${
                msg.metadata?.layer
                  ? 'max-w-[95%] sm:max-w-[90%]'
                  : 'max-w-[92%] sm:max-w-[85%]'
              } ${
                msg.metadata?.layer
                  ? 'text-on-surface-variant/80'
                  : msg.role === 'user'
                    ? 'rounded-2xl rounded-br-md border border-primary/20 bg-primary/12 px-3 py-2.5 text-on-surface sm:px-4 sm:py-3'
                    : `rounded-2xl rounded-bl-md border px-3 py-2.5 sm:px-4 sm:py-3 border-outline/20 bg-surface-container text-on-surface shadow-sm`
              }`}>
                {msg.role === 'system' && !msg.metadata?.layer && msg.type !== 'text' && (
                  <span className="inline-flex items-center gap-1.5 mb-2 text-xs text-primary/70">
                    <ZhangbanshanAvatar size="sm" />
                    张半山
                  </span>
                )}
                {renderMessageContent(msg)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && <TypingIndicator />}

        {/* 追问推荐 */}
        {chatPhase === 'interacting' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-1 py-2"
          >
            <FollowUpQuestions
              result={result}
              onFollowUpClick={handleFollowUpInChat}
            />
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 滚动到底部按钮 */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/20 text-primary shadow-lg backdrop-blur-sm transition-colors hover:bg-primary/30"
          >
            <IconComp name="keyboard_arrow_down" size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 输入区域 */}
      {chatPhase === 'interacting' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-safe-bottom shrink-0 border-t border-border/40 bg-surface-container/85 px-3 py-3 backdrop-blur-sm sm:px-4"
        >
          {/* 输入框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={inputPlaceholder}
              className="min-w-0 flex-1 rounded-xl border border-border/50 bg-surface-base px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-colors focus:border-primary/40 focus:outline-none sm:px-4"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="flex-shrink-0 rounded-xl border border-primary/30 bg-primary/12 px-3 py-2.5 text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4"
            >
              <IconComp name="send" size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* P1-4: 付费升级弹窗 — 第 3 次追问触发 */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPaywall(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="mx-4 max-w-[calc(100%-2rem)] sm:max-w-lg w-full rounded-2xl border border-primary/20 bg-surface-container p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <IconComp name="auto_awesome" size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">追问次数已用完</h3>
                  <p className="text-xs text-on-surface-variant/60">本次咨询免费追问已达上限</p>
                </div>
              </div>

              <p className="text-sm text-on-surface-variant mb-5 leading-relaxed">
                你已经问了 3 个追问，张半山已经为你做了深入解读。如需继续深入探讨，可以升级为 VIP 会员，享受无限追问和更多深度服务。
              </p>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <IconComp name="check_circle" size={16} className="text-primary" />
                  无限追问次数
                </div>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <IconComp name="check_circle" size={16} className="text-primary" />
                  多体系交叉验证
                </div>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <IconComp name="check_circle" size={16} className="text-primary" />
                  命运K线深度解读
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaywall(false)}
                  className="flex-1 rounded-xl border border-border/50 px-4 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  以后再说
                </button>
                <button
                  onClick={() => {
                    setShowPaywall(false);
                    trackFunnel('funnel_followup_to_pay', { trigger: 'paywall_vip_button', followupCount });
                    onVipClick('breakthrough');
                  }}
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                >
                  升级 VIP
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
