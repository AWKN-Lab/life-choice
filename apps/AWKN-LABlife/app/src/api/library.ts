/**
 * 命例库 (Library / SavedCase) API 客户端
 * 对接后端 /api/v1/cases 端点
 *
 * 字段命名与后端 Prisma 模型保持一致：
 * - 后端 DB 列：name / category / tags(STRING) / notes / snapshot(STRING) / visibility
 * - service.formatCase 已把 tags / snapshot 从字符串解析回对象
 * - 列表响应：{ items, meta: { total, limit, offset, hasMore } }
 * - controller 透传 service 返回值，不包 { data, error }
 */
import apiClient from './client';

export type Visibility = 'private' | 'public';
export type Scope = 'all' | 'private' | 'public';

export interface SavedCase {
  id: string;
  userId: string;
  recordId: string | null;
  name: string;
  category: string | null;
  tags: string[];
  notes: string | null;
  snapshot: Record<string, unknown>;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface ListCasesMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ListCasesResponse {
  items: SavedCase[];
  meta: ListCasesMeta;
}

export interface ListCasesParams {
  scope?: Scope;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCaseDto {
  name: string;
  category?: string;
  tags?: string[];
  notes?: string;
  snapshot?: Record<string, unknown>;
  visibility?: Visibility;
  recordId?: string;
}

export interface UpdateCaseDto {
  name?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  snapshot?: Record<string, unknown>;
  visibility?: Visibility;
}

function toQueryString(p: ListCasesParams | undefined): Record<string, string> | undefined {
  if (!p) return undefined;
  const out: Record<string, string> = {};
  if (p.scope) out.scope = p.scope;
  if (p.category) out.category = p.category;
  if (p.limit !== undefined) out.limit = String(p.limit);
  if (p.offset !== undefined) out.offset = String(p.offset);
  return Object.keys(out).length ? out : undefined;
}

export const libraryApi = {
  /** 列表查询 — 默认 20/页、createdAt desc、scope=all（ADR-001） */
  list: (params?: ListCasesParams): Promise<ListCasesResponse> =>
    apiClient.get<ListCasesResponse>('/cases', toQueryString(params)),

  /** 详情（自己的或公开的；别人的私有会 403） */
  get: (id: string): Promise<SavedCase> =>
    apiClient.get<SavedCase>(`/cases/${id}`),

  /** 创建 */
  create: (dto: CreateCaseDto): Promise<SavedCase> =>
    apiClient.post<SavedCase>('/cases', dto),

  /** 部分更新（PATCH） */
  update: (id: string, dto: UpdateCaseDto): Promise<SavedCase> =>
    apiClient.patch<SavedCase>(`/cases/${id}`, dto),

  /** 软删除 */
  remove: (id: string): Promise<{ id: string; deleted: true }> =>
    apiClient.delete<{ id: string; deleted: true }>(`/cases/${id}`),
};

export default libraryApi;
