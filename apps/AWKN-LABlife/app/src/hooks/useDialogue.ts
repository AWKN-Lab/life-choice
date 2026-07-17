/**
 * Multi-turn dialogue hook
 * - Manages dialogue state machine (IDLE → SCHEDULING → CLARIFYING → GENERATING → RESPONDING → COMPLETED)
 * - Listens to WebSocket events for real-time updates
 * - Supports start / reply / cancel / reset operations
 * - Unbinds all WS listeners on cleanup
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/websocket';
import { getAuthToken } from '@/lib/tokenStorage';

export type DialogueState =
  | 'IDLE'
  | 'SCHEDULING'
  | 'CLARIFYING'
  | 'GENERATING'
  | 'RESPONDING'
  | 'COMPLETED';

export interface DialogueTurn {
  id?: string;
  role: 'user' | 'zhangbanshan';
  content: string;
  timestamp: number;
  node?: number;
  isClarifying?: boolean;
}

interface UseDialogueReturn {
  dialogueId: string | null;
  state: DialogueState;
  clarifyingQuestion: string | null;
  turns: DialogueTurn[];
  streamingContent: string;
  isStreaming: boolean;
  result: any;
  error: string | null;
  startDialogue: (question: string) => Promise<void>;
  replyToQuestion: (reply: string) => Promise<void>;
  cancelDialogue: () => Promise<void>;
  reset: () => void;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string || '/api/v1');

export function useDialogue(): UseDialogueReturn {
  const [dialogueId, setDialogueId] = useState<string | null>(null);
  const [state, setState] = useState<DialogueState>('IDLE');
  const [clarifyingQuestion, setClarifyingQuestion] = useState<string | null>(null);
  const [turns, setTurns] = useState<DialogueTurn[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref to track current dialogueId, avoiding closure issues in WS handlers
  const dialogueIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    dialogueIdRef.current = dialogueId;
  }, [dialogueId]);

  // ── WS event listeners ──────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onStateChange = (payload: { dialogueId: string; state: DialogueState; node?: number }) => {
      if (!payload || payload.dialogueId !== dialogueIdRef.current) return;
      setState(payload.state);
    };

    const onClarifyingQuestion = (payload: { dialogueId: string; question: string; node?: number }) => {
      if (!payload || payload.dialogueId !== dialogueIdRef.current) return;
      setClarifyingQuestion(payload.question);
      setTurns((prev) => [
        ...prev,
        { role: 'zhangbanshan', content: payload.question, timestamp: Date.now(), node: payload.node },
      ]);
    };

    const onDialogueLlmToken = (payload: { dialogueId: string; token: string }) => {
      if (!payload || payload.dialogueId !== dialogueIdRef.current) return;
      setIsStreaming(true);
      setStreamingContent((prev) => prev + (payload.token || ''));
    };

    const onDialogueResult = (payload: { dialogueId: string; result: any; node?: number }) => {
      if (!payload || payload.dialogueId !== dialogueIdRef.current) return;
      setIsStreaming(false);
      setResult(payload.result);
      setTurns((prev) => [
        ...prev,
        { role: 'zhangbanshan', content: typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result), timestamp: Date.now(), node: payload.node },
      ]);
    };

    socket.on('state_change', onStateChange);
    socket.on('clarifying_question', onClarifyingQuestion);
    socket.on('dialogue_llm_token', onDialogueLlmToken);
    socket.on('dialogue_result', onDialogueResult);

    return () => {
      socket.off('state_change', onStateChange);
      socket.off('clarifying_question', onClarifyingQuestion);
      socket.off('dialogue_llm_token', onDialogueLlmToken);
      socket.off('dialogue_result', onDialogueResult);
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────

  const startDialogue = useCallback(async (question: string) => {
    setError(null);
    setStreamingContent('');
    setIsStreaming(false);
    setResult(null);
    setClarifyingQuestion(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/consult/dialogue/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Start dialogue failed: ${res.status}`);
      }

      const data = await res.json();
      const id: string = data.dialogueId || data.id;
      const newState: DialogueState = data.state || 'SCHEDULING';
      const questionFromServer: string | null = data.clarifyingQuestion || null;

      setDialogueId(id);
      setState(newState);
      if (questionFromServer) {
        setClarifyingQuestion(questionFromServer);
      }

      // Add user question as first turn
      setTurns([{ role: 'user', content: question, timestamp: Date.now() }]);

      // Join WS room for this dialogue
      const socket = getSocket();
      socket.emit('dialogue_join', { dialogueId: id });

      // If server already sent a clarifying question, add it as zhangbanshan turn
      if (questionFromServer) {
        setTurns((prev) => [
          ...prev,
          { role: 'zhangbanshan', content: questionFromServer, timestamp: Date.now() },
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start dialogue');
      setState('IDLE');
    }
  }, []);

  const replyToQuestion = useCallback(async (reply: string) => {
    const id = dialogueIdRef.current;
    if (!id) return;

    setError(null);

    // Add user reply to turns immediately
    setTurns((prev) => [...prev, { role: 'user', content: reply, timestamp: Date.now() }]);
    setClarifyingQuestion(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/consult/dialogue/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reply }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Reply failed: ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reply');
    }
  }, []);

  const cancelDialogue = useCallback(async () => {
    const id = dialogueIdRef.current;
    if (!id) return;

    const socket = getSocket();
    socket.emit('dialogue_cancel', { dialogueId: id });

    setState('IDLE');
    setDialogueId(null);
    setClarifyingQuestion(null);
    setStreamingContent('');
    setIsStreaming(false);
    setResult(null);
    setError(null);
    setTurns([]);
  }, []);

  const reset = useCallback(() => {
    setDialogueId(null);
    setState('IDLE');
    setClarifyingQuestion(null);
    setTurns([]);
    setStreamingContent('');
    setIsStreaming(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    dialogueId,
    state,
    clarifyingQuestion,
    turns,
    streamingContent,
    isStreaming,
    result,
    error,
    startDialogue,
    replyToQuestion,
    cancelDialogue,
    reset,
  };
}
