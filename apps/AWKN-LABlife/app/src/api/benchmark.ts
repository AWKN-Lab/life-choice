import { apiClient } from '@/api/client';

export interface BenchmarkRunConfig {
  year?: number;
  sampleSize: number;
  useCot: boolean;
  useAstro: boolean;
  shuffleOptions: boolean;
  provider: string;
  maxWorkers?: number;
}

export interface BenchmarkRunSummary {
  total: number;
  correct: number;
  accuracy: number;
  avgDurationMs: number;
  totalTokens?: number;
}

export interface BenchmarkResultItem {
  id: string;
  question: string;
  category: string;
  correctAnswer: string;
  predictedAnswer: string | null;
  isCorrect: boolean;
  llmContent: string;
  llmReasoning?: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  baziPillars?: string;
  optionMap?: Record<string, string>;
}

export interface BenchmarkRunResult {
  runId: string;
  timestamp: string;
  config: BenchmarkRunConfig;
  summary: BenchmarkRunSummary;
  categoryBreakdown: Record<string, { total: number; correct: number; accuracy: number }>;
  results: BenchmarkResultItem[];
}

export interface RunBenchmarkParams {
  year?: number;
  sampleSize?: number;
  useCot?: boolean;
  useAstro?: boolean;
  shuffleOptions?: boolean;
  provider?: string;
  maxWorkers?: number;
}

export async function runBenchmark(params: RunBenchmarkParams): Promise<BenchmarkRunResult> {
  return apiClient.post<BenchmarkRunResult>('/mingli-bench/run', params);
}

export async function getBenchmarkHistory(): Promise<BenchmarkRunResult[]> {
  return apiClient.get<BenchmarkRunResult[]>('/mingli-bench/history');
}

export async function getBenchmarkRunById(runId: string): Promise<BenchmarkRunResult> {
  return apiClient.get<BenchmarkRunResult>(`/mingli-bench/history/${runId}`);
}

export async function exportBenchmarkRunById(runId: string): Promise<BenchmarkRunResult> {
  return apiClient.get<BenchmarkRunResult>(`/mingli-bench/history/${runId}/export`);
}

export async function getBenchmarkCategories(): Promise<string[]> {
  return apiClient.get<string[]>('/mingli-bench/categories');
}