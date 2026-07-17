/**
 * 咨询 API 客户端 - 对接真实后端
 */
import apiClient from './client';
import type {
  RouteRequest,
  RouteResponse,
  InfoSubmit,
  ResultResponse,
  ClarifyAnswerRequest,
} from '@/types/api';

const CONSULT_BASE = '/consult';

export const consultApi = {
  route: async (data: RouteRequest): Promise<RouteResponse> => {
    return apiClient.post<RouteResponse>(`${CONSULT_BASE}/route`, {
      question: data.question_text,
    });
  },

  clarify: async (question: string): Promise<{ clarifyingQuestion: string }> => {
    return apiClient.post(`${CONSULT_BASE}/clarify`, { question });
  },

  submitInfo: async (data: InfoSubmit & { sessionId: string }): Promise<ResultResponse> => {
    return apiClient.post<ResultResponse>(`${CONSULT_BASE}/info`, data);
  },

  getResult: async (recordId: string): Promise<ResultResponse> => {
    return apiClient.get<ResultResponse>(`${CONSULT_BASE}/result/${recordId}`);
  },

  saveRecord: async (recordId: string): Promise<{ success: boolean }> => {
    return apiClient.post(`${CONSULT_BASE}/save`, { recordId });
  },

  getRecords: async (limit = 20, offset = 0) => {
    return apiClient.get(`${CONSULT_BASE}/records`, {
      limit: String(limit),
      offset: String(offset),
    });
  },

  deleteRecord: async (recordId: string) => {
    return apiClient.post(`${CONSULT_BASE}/records/${recordId}`, {});
  },

  submitClarifyAnswer: async (data: ClarifyAnswerRequest): Promise<RouteResponse> => {
    return apiClient.post<RouteResponse>(`${CONSULT_BASE}/clarify`, {
      question: data.question_text,
      answer: data.answer,
    });
  },
};