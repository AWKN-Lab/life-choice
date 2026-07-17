import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../result/Icon';
import type { UnifiedResult } from '../result/resultTypes';
import { consultApi } from '../../api/consult';

interface FollowUpQuestionsProps {
  result: UnifiedResult;
  suggestedQuestions?: string[];
  onFollowUpClick?: (question: string) => void;
}

interface QAPair {
  question: string;
  answer: string;
  isLoading?: boolean;
}

function generateSuggestedQuestions(result: UnifiedResult, t: ReturnType<typeof useTranslation>['t']): string[] {
  const routeType = result.route_type;
  const question = result.currentQuestion || '';

  if (routeType === 'liuren' || routeType === 'liuyao' || routeType === 'qimen') {
    return [
      t('resultPage.questionAnnual.followUp.suggestedQ1', { defaultValue: '这件事的关键转折点在什么时候？' }),
      t('resultPage.questionAnnual.followUp.suggestedQ2', { defaultValue: '如果我现在不做，最坏的结果是什么？' }),
      t('resultPage.questionAnnual.followUp.suggestedQ3', { defaultValue: '有什么我忽略的风险需要特别注意？' }),
    ];
  }

  if (routeType === 'ziping') {
    return [
      t('resultPage.questionAnnual.followUp.suggestedQ4', { defaultValue: '我当前大运对这件事的影响有多大？' }),
      t('resultPage.questionAnnual.followUp.suggestedQ5', { defaultValue: '今年和明年哪个更适合行动？' }),
      t('resultPage.questionAnnual.followUp.suggestedQ6', { defaultValue: '我命局中最大的优势和短板分别是什么？' }),
    ];
  }

  return [
    t('resultPage.questionAnnual.followUp.suggestedQ1', { defaultValue: '这件事的关键转折点在什么时候？' }),
    t('resultPage.questionAnnual.followUp.suggestedQ2', { defaultValue: '如果我现在不做，最坏的结果是什么？' }),
    t('resultPage.questionAnnual.followUp.suggestedQ3', { defaultValue: '有什么我忽略的风险需要特别注意？' }),
  ];
}

export function FollowUpQuestions({ result, suggestedQuestions: aiSuggested, onFollowUpClick }: FollowUpQuestionsProps) {
  const { t } = useTranslation();
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedQuestions = aiSuggested && aiSuggested.length > 0
    ? aiSuggested
    : generateSuggestedQuestions(result, t);

  const handleSubmitQuestion = async (question: string) => {
    if (!question.trim() || isSubmitting) return;

    if (onFollowUpClick && suggestedQuestions.includes(question)) {
      onFollowUpClick(question);
      return;
    }

    const newQA: QAPair = { question: question.trim(), answer: '', isLoading: true };
    setQaHistory((prev) => [...prev, newQA]);
    setCustomQuestion('');
    setIsSubmitting(true);

    // 构建多轮上下文：将之前的追问历史作为对话 context 传给后端
    const context = qaHistory.map((qa) => [
      { role: 'user', content: qa.question },
      { role: 'assistant', content: qa.answer },
    ]).flat();

    try {
      const res = await consultApi.followup({
        recordId: result.record_id,
        question: question.trim(),
        context: context.length > 0 ? context : undefined,
      });

      const answer = res.paywallTriggered
        ? t('resultPage.questionAnnual.followUp.paywallHint', { defaultValue: '追问次数已达上限，开启更多深度解读请升级服务。' })
        : res.content || t('resultPage.questionAnnual.followUp.emptyAnswer', { defaultValue: '暂时无法获取回答，请稍后重试。' });

      setQaHistory((prev) =>
        prev.map((qa, i) =>
          i === prev.length - 1 ? { ...qa, answer, isLoading: false } : qa
        )
      );
    } catch {
      // API 失败 → 降级为本地 mock 回答，保证 UI 不崩
      const fallbackAnswer = t('resultPage.questionAnnual.followUp.mockAnswer', {
        defaultValue: '基于当前推演结果，这是一个值得深入探讨的方向。结合您命局和大运的综合判断，建议在关键时间窗口内审慎决策。',
      });
      setQaHistory((prev) =>
        prev.map((qa, i) =>
          i === prev.length - 1 ? { ...qa, answer: fallbackAnswer, isLoading: false } : qa
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-on-surface/40 text-xs mb-2">{t('resultPage.questionAnnual.followUp.suggestedLabel')}</p>
        <div className="space-y-1.5">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSubmitQuestion(q)}
              disabled={isSubmitting}
              className="w-full text-left rounded-lg border border-outline/[0.06] bg-on-surface/[0.02] px-3 py-2 text-sm text-on-surface/60 hover:bg-on-surface/[0.05] hover:text-on-surface/80 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Icon name="help_outline" size={14} className="text-primary/60 shrink-0" />
                <span>{q}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {qaHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 max-h-64 overflow-y-auto"
          >
            {qaHistory.map((qa, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="person" size={12} className="text-primary" />
                  </div>
                  <p className="text-on-surface/80 text-sm">{qa.question}</p>
                </div>
                {qa.isLoading ? (
                  <div className="flex items-start gap-2 ml-7">
                    <span className="inline-block w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    <span className="text-on-surface/40 text-xs">{t('resultPage.questionAnnual.followUp.analyzing')}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 ml-7">
                    <div className="w-5 h-5 rounded-full bg-on-surface/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon name="auto_awesome" size={10} className="text-primary" />
                    </div>
                    <p className="text-on-surface/60 text-sm leading-relaxed">{qa.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitQuestion(customQuestion);
          }}
          placeholder={t('resultPage.questionAnnual.followUp.inputPlaceholder')}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-outline/10 bg-on-surface/[0.04] px-3 py-2 text-sm text-on-surface/80 placeholder:text-on-surface/30 focus:outline-none focus:border-primary/40 disabled:opacity-50"
        />
        <button
          onClick={() => handleSubmitQuestion(customQuestion)}
          disabled={isSubmitting || !customQuestion.trim()}
          className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-40"
        >
          {t('resultPage.questionAnnual.followUp.askButton')}
        </button>
      </div>
    </div>
  );
}
