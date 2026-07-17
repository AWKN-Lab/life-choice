/**
 * P2-2: 专家标注闭环 — 前端反馈组件
 * - 结果展示 3 秒后浮出
 * - 1-5 星评分 + 可选文字 + 提交
 * - 调用 POST /api/v1/feedback
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/result/Icon';
import { feedbackApi } from '@/api/feedback';

interface FeedbackWidgetProps {
  recordId: string;
  /** 结果展示后延迟浮出的毫秒数，默认 3000 */
  delayMs?: number;
}

const CALIBRATION_TAGS = [
  { value: 'scenario_misclass', label: '场景判断有误' },
  { value: 'agent_unfit', label: '专家不匹配' },
  { value: 'tone_off', label: '语气不当' },
  { value: 'evidence_insufficient', label: '证据不足' },
  { value: 'cost_missing', label: '缺少代价提醒' },
] as const;

export function FeedbackWidget({ recordId, delayMs = 3000 }: FeedbackWidgetProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
  };

  if (dismissed) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      await feedbackApi.submit({
        recordId,
        rating,
        comment: comment.trim() || undefined,
        calibrationTag: selectedTags.length > 0 ? selectedTags[0] : undefined,
        accuracy: rating >= 4 ? 5 : rating >= 3 ? 3 : 1,
        helpfulness: rating >= 4 ? 5 : rating >= 3 ? 3 : 1,
        tone: rating >= 4 ? 5 : 4,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 10, height: 0 }}
          className="mx-4 mb-2 overflow-hidden"
        >
          <div className="bg-surface-container-low/80 backdrop-blur-sm rounded-xl border border-outline/5 p-4">
            {/* 关闭按钮 — 用户可以随时关闭 / 跳过，不强制评价 */}
            <button
              onClick={handleDismiss}
              aria-label="关闭反馈"
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-on-surface/40 hover:text-on-surface/80 hover:bg-on-surface/10 transition-colors"
            >
              <Icon name="close" size={16} />
            </button>

            {submitted ? (
              <div className="text-center py-2">
                <Icon name="check_circle" size={20} className="text-primary mx-auto mb-1" />
                <p className="text-sm text-on-surface/70">感谢反馈，帮助我们变得更好</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-on-surface/70 mb-3 pr-6">这次咨询对你有帮助吗？</p>

                {/* 星级评分 */}
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 transition-transform active:scale-90"
                    >
                      <Icon
                        name="star"
                        size={24}
                        filled={star <= (hoverRating || rating)}
                        className={
                          star <= (hoverRating || rating)
                            ? 'text-amber-400'
                            : 'text-on-surface/20'
                        }
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="text-xs text-on-surface/40 ml-2">
                      {['', '很差', '较差', '一般', '不错', '很好'][rating]}
                    </span>
                  )}
                </div>

                {/* 校准标签（评分 ≤ 3 时显示） */}
                {rating > 0 && rating <= 3 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {CALIBRATION_TAGS.map((tag) => (
                      <button
                        key={tag.value}
                        onClick={() => toggleTag(tag.value)}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                          selectedTags.includes(tag.value)
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-on-surface/5 text-on-surface/50 border border-outline/5 hover:bg-on-surface/10'
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* 文字反馈 */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="有什么想说的？（可选）"
                  rows={2}
                  className="w-full bg-on-surface/5 rounded-lg px-3 py-2 text-sm text-on-surface/80 placeholder:text-on-surface/30 border border-outline/5 focus:border-primary/30 focus:outline-none resize-none mb-3"
                />

                {/* 提交按钮 */}
                <div className="flex items-center justify-between">
                  {error && <p className="text-xs text-error">{error}</p>}
                  <div className="flex-1" />
                  <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || submitting}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      rating === 0 || submitting
                        ? 'bg-on-surface/5 text-on-surface/30 cursor-not-allowed'
                        : 'bg-primary/20 text-primary hover:bg-primary/30 active:bg-primary/40'
                    }`}
                  >
                    {submitting ? '提交中...' : '提交反馈'}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
