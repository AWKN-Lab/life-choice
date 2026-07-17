/**
 * P03 取名三表 API 客户端（Phase 7）
 * 与现有 consultApi.saveNamingBehavior / saveBehaviorEvent 并存（Q7=c）
 * 仅支持 favorite / eliminate 两个交互（Q5=b）
 *
 * 后端接口（apps/api-server/src/naming/naming.controller.ts）：
 *   POST   /api/v1/naming/projects                    创建项目
 *   GET    /api/v1/naming/projects                     列出我的项目
 *   GET    /api/v1/naming/projects/:id                 项目详情
 *   POST   /api/v1/naming/projects/:id/candidates      批量添加候选名
 *   GET    /api/v1/naming/projects/:id/candidates      列出候选名
 *   POST   /api/v1/naming/candidates/:id/favorite      收藏
 *   POST   /api/v1/naming/candidates/:id/eliminate     淘汰
 *   PATCH  /api/v1/naming/projects/:id/status          更新项目状态
 */
import apiClient from './client';

const NAMING_BASE = '/naming';

/** 取名项目 */
export interface NamingProject {
  id: string;
  userId: string;
  namingType: string;
  surname: string | null;
  stylePreference: string | null;
  industry: string | null;
  targetAudience: string | null;
  originalName: string | null;
  customDescription: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { candidates: number; iterations: number };
}

/** 候选名 */
export interface NamingCandidate {
  id: string;
  projectId: string;
  name: string;
  score: number;
  analysis: string | null;
  status: 'pending' | 'favorited' | 'eliminated' | 'selected';
  candidateVersion: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建项目请求 */
export interface CreateProjectInput {
  namingType: 'baby' | 'brand' | 'adult';
  surname?: string;
  stylePreference?: string[];
  industry?: string;
  targetAudience?: string;
  originalName?: string;
  customDescription?: string;
}

/** 添加候选名请求 */
export interface AddCandidatesInput {
  candidates: Array<{
    name: string;
    score?: number;
    analysis?: string;
  }>;
}

/** 更新项目状态请求 */
export interface UpdateProjectStatusInput {
  status: 'active' | 'completed' | 'archived';
}

// === 缓存层（避免重复创建 project / candidate）===
// recordId -> projectId
const projectIdCache = new Map<string, string>();
// recordId -> (name -> candidateId)
const candidateIdCache = new Map<string, Map<string, string>>();

function getCandidateId(recordId: string, name: string): string | undefined {
  return candidateIdCache.get(recordId)?.get(name);
}

function setCandidateId(recordId: string, name: string, candidateId: string): void {
  if (!candidateIdCache.has(recordId)) candidateIdCache.set(recordId, new Map());
  candidateIdCache.get(recordId)!.set(name, candidateId);
}

export const namingApi = {
  /** 创建取名项目 */
  createProject: async (data: CreateProjectInput): Promise<NamingProject> => {
    return apiClient.post<NamingProject>(`${NAMING_BASE}/projects`, data);
  },

  /** 列出我的取名项目 */
  listProjects: async (): Promise<NamingProject[]> => {
    return apiClient.get<NamingProject[]>(`${NAMING_BASE}/projects`);
  },

  /** 获取项目详情 */
  getProjectDetail: async (projectId: string): Promise<NamingProject & { candidates: NamingCandidate[] }> => {
    return apiClient.get(`${NAMING_BASE}/projects/${projectId}`);
  },

  /** 批量添加候选名 */
  addCandidates: async (projectId: string, data: AddCandidatesInput): Promise<NamingCandidate[]> => {
    return apiClient.post<NamingCandidate[]>(`${NAMING_BASE}/projects/${projectId}/candidates`, data);
  },

  /** 列出候选名 */
  listCandidates: async (projectId: string): Promise<NamingCandidate[]> => {
    return apiClient.get<NamingCandidate[]>(`${NAMING_BASE}/projects/${projectId}/candidates`);
  },

  /** 收藏候选名 */
  favoriteCandidate: async (candidateId: string): Promise<NamingCandidate> => {
    return apiClient.post<NamingCandidate>(`${NAMING_BASE}/candidates/${candidateId}/favorite`);
  },

  /** 淘汰候选名 */
  eliminateCandidate: async (candidateId: string): Promise<NamingCandidate> => {
    return apiClient.post<NamingCandidate>(`${NAMING_BASE}/candidates/${candidateId}/eliminate`);
  },

  /** 更新项目状态 */
  updateProjectStatus: async (projectId: string, data: UpdateProjectStatusInput): Promise<NamingProject> => {
    return apiClient.patch<NamingProject>(`${NAMING_BASE}/projects/${projectId}/status`, data);
  },

  // === 高层函数：与现有事件溯源并存 ===

  /**
   * 确保项目已创建（按 recordId 缓存）
   * @param recordId 咨询记录 ID（用作缓存 key）
   * @param namingType 取名类型
   */
  ensureProject: async (recordId: string, namingType: 'baby' | 'brand' | 'adult' = 'baby'): Promise<string> => {
    const cached = projectIdCache.get(recordId);
    if (cached) return cached;

    const project = await namingApi.createProject({ namingType });
    projectIdCache.set(recordId, project.id);
    return project.id;
  },

  /**
   * 确保候选名已添加（按 recordId + name 缓存）
   */
  ensureCandidate: async (
    recordId: string,
    projectId: string,
    name: string,
    score?: number,
    analysis?: string,
  ): Promise<string> => {
    const cached = getCandidateId(recordId, name);
    if (cached) return cached;

    const candidates = await namingApi.addCandidates(projectId, {
      candidates: [{ name, score, analysis }],
    });
    const candidateId = candidates[0]?.id;
    if (!candidateId) throw new Error('Failed to add candidate');
    setCandidateId(recordId, name, candidateId);
    return candidateId;
  },

  /**
   * 同步收藏操作到新三表（与 saveNamingBehavior 并存，Q7=c）
   * 失败时静默（不阻塞 UI，现有事件溯源仍可工作）
   */
  syncFavorite: async (
    recordId: string,
    name: string,
    options?: { namingType?: 'baby' | 'brand' | 'adult'; score?: number; analysis?: string },
  ): Promise<void> => {
    try {
      const projectId = await namingApi.ensureProject(recordId, options?.namingType || 'baby');
      const candidateId = await namingApi.ensureCandidate(
        recordId,
        projectId,
        name,
        options?.score,
        options?.analysis,
      );
      await namingApi.favoriteCandidate(candidateId);
    } catch (err) {
      // 静默失败：不阻塞 UI，现有事件溯源仍可工作
      console.warn('[namingApi.syncFavorite] failed (non-blocking):', err);
    }
  },

  /**
   * 同步淘汰操作到新三表（与 saveNamingBehavior 并存，Q7=c）
   * 失败时静默（不阻塞 UI）
   */
  syncEliminate: async (
    recordId: string,
    name: string,
    options?: { namingType?: 'baby' | 'brand' | 'adult'; score?: number; analysis?: string },
  ): Promise<void> => {
    try {
      const projectId = await namingApi.ensureProject(recordId, options?.namingType || 'baby');
      const candidateId = await namingApi.ensureCandidate(
        recordId,
        projectId,
        name,
        options?.score,
        options?.analysis,
      );
      await namingApi.eliminateCandidate(candidateId);
    } catch (err) {
      console.warn('[namingApi.syncEliminate] failed (non-blocking):', err);
    }
  },
};
