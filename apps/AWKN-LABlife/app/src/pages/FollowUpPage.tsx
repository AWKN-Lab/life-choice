/**
 * FollowUpPage — 回访对话页面（P3-1）
 * 包装 FollowUpChat 组件，只从路径参数读取 followUpId
 *
 * 路由：/followup/:followUpId
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FollowUpChat } from '@/components/followup/FollowUpChat';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PageHeader } from '@/components/layout/PageHeader';
import { consultApi } from '@/api/consult';

export default function FollowUpPage() {
  const { followUpId } = useParams<{ followUpId: string }>();
  const navigate = useNavigate();

  const [recordId, setRecordId] = useState('');
  const [question, setQuestion] = useState('');
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!followUpId) {
      setQuestionLoadError('回访信息不完整');
      setIsLoadingQuestion(false);
      return;
    }

    let cancelled = false;
    setIsLoadingQuestion(true);
    setQuestionLoadError(null);

    consultApi.getFollowUpContext(followUpId)
      .then((followUp) => {
        if (cancelled) return;
        const resolvedQuestion = followUp.question || '';
        const resolvedRecordId = followUp.recordId || '';
        if (!resolvedRecordId) {
          setQuestionLoadError('回访事项缺少记录主键');
          return;
        }
        if (!resolvedQuestion) {
          setQuestionLoadError('未找到原始问题');
          return;
        }
        setRecordId(resolvedRecordId);
        setQuestion(resolvedQuestion);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[FollowUpPage] load follow-up context failed:', { followUpId, error });
        setQuestionLoadError('回访事项加载失败');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingQuestion(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [followUpId]);

  const handleComplete = () => {
    navigate('/history');
  };

  if (!followUpId) {
    return <ErrorState message="回访信息不完整" onHome={() => navigate('/history')} className="bg-surface-base" />;
  }

  if (isLoadingQuestion) {
    return (
      <div className="min-h-screen bg-surface-base">
        <PageHeader title="回访" onBack={() => navigate(-1)} className="border-b border-outline/10" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingState label="正在加载回访事项..." />
        </div>
      </div>
    );
  }

  if (questionLoadError || !recordId || !question) {
    return (
      <ErrorState
        message={questionLoadError || '回访事项加载失败'}
        onHome={() => navigate('/history')}
        className="bg-surface-base"
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <PageHeader title="回访" onBack={() => navigate(-1)} className="border-b border-outline/10" />
      <FollowUpChat
        followUpId={followUpId}
        recordId={recordId}
        question={question}
        onComplete={handleComplete}
      />
    </div>
  );
}
