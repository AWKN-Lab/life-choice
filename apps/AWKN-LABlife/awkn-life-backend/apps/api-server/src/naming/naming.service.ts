// ============================================================
// P03: 取名三表服务（Phase 7）
// 管理 NamingProject / NamingCandidate / NamingIteration
// 支持创建项目、添加候选名、收藏/淘汰候选名
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ==================== 类型定义 ====================

export type NamingType = 'baby' | 'brand' | 'adult';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type CandidateStatus = 'pending' | 'favorited' | 'eliminated' | 'selected';

export interface CreateProjectInput {
  userId: string;
  namingType: NamingType;
  surname?: string;
  stylePreference?: string[];
  industry?: string;
  targetAudience?: string;
  originalName?: string;
  customDescription?: string;
}

export interface AddCandidateInput {
  projectId: string;
  name: string;
  score?: number;
  analysis?: Record<string, unknown>;
}

export interface RecordIterationInput {
  projectId: string;
  promptSnapshot?: string;
  modelUsed?: string;
}

// ==================== 服务实现 ====================

@Injectable()
export class NamingService {
  private readonly logger = new Logger(NamingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建取名项目
   */
  async createProject(input: CreateProjectInput) {
    const project = await this.prisma.namingProject.create({
      data: {
        userId: input.userId,
        namingType: input.namingType,
        surname: input.surname || null,
        stylePreference: input.stylePreference ? JSON.stringify(input.stylePreference) : null,
        industry: input.industry || null,
        targetAudience: input.targetAudience || null,
        originalName: input.originalName || null,
        customDescription: input.customDescription || null,
        status: 'active',
      },
    });
    this.logger.log(`[createProject] 用户 ${input.userId} 创建取名项目 ${project.id} (type=${input.namingType})`);
    return project;
  }

  /**
   * 批量添加候选名
   */
  async addCandidates(projectId: string, candidates: AddCandidateInput[]) {
    // 校验项目存在
    const project = await this.prisma.namingProject.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`取名项目 ${projectId} 不存在`);
    }

    const data = candidates.map((c) => ({
      projectId,
      name: c.name,
      score: c.score ?? 0,
      analysis: c.analysis ? JSON.stringify(c.analysis) : null,
      status: 'pending' as CandidateStatus,
      candidateVersion: 1,
    }));

    const result = await this.prisma.namingCandidate.createMany({ data });
    this.logger.log(`[addCandidates] 项目 ${projectId} 添加 ${result.count} 个候选名`);
    return { count: result.count };
  }

  /**
   * 收藏候选名
   * 状态机：pending/favorited → favorited
   */
  async favoriteCandidate(candidateId: string, userId: string) {
    const candidate = await this._getCandidateOwnedByUser(candidateId, userId);
    if (!candidate) {
      throw new NotFoundException(`候选名 ${candidateId} 不存在或无权操作`);
    }

    const updated = await this.prisma.namingCandidate.update({
      where: { id: candidateId },
      data: { status: 'favorited' },
    });
    this.logger.log(`[favoriteCandidate] 用户 ${userId} 收藏候选名 ${candidateId} (${candidate.name})`);
    return { id: updated.id, status: updated.status };
  }

  /**
   * 淘汰候选名
   * 状态机：pending/favorited → eliminated
   */
  async eliminateCandidate(candidateId: string, userId: string) {
    const candidate = await this._getCandidateOwnedByUser(candidateId, userId);
    if (!candidate) {
      throw new NotFoundException(`候选名 ${candidateId} 不存在或无权操作`);
    }

    const updated = await this.prisma.namingCandidate.update({
      where: { id: candidateId },
      data: { status: 'eliminated' },
    });
    this.logger.log(`[eliminateCandidate] 用户 ${userId} 淘汰候选名 ${candidateId} (${candidate.name})`);
    return { id: updated.id, status: updated.status };
  }

  /**
   * 列出项目的候选名（可按状态过滤）
   */
  async listCandidates(projectId: string, status?: CandidateStatus) {
    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;

    const candidates = await this.prisma.namingCandidate.findMany({
      where,
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
    });

    // 解析 analysis JSON
    return candidates.map((c: any) => ({
      ...c,
      analysis: c.analysis ? this._safeParseJson(c.analysis) : null,
    }));
  }

  /**
   * 列出用户的所有取名项目
   */
  async listProjects(userId: string, status?: ProjectStatus) {
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    return this.prisma.namingProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            candidates: true,
            iterations: true,
          },
        },
      },
    });
  }

  /**
   * 获取项目详情（含候选名）
   */
  async getProjectDetail(projectId: string, userId: string) {
    const project = await this.prisma.namingProject.findFirst({
      where: { id: projectId, userId },
      include: {
        candidates: {
          orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
        },
        iterations: {
          orderBy: { iterationNo: 'desc' },
        },
      },
    });
    if (!project) {
      throw new NotFoundException(`取名项目 ${projectId} 不存在或无权访问`);
    }
    return project;
  }

  /**
   * 记录一次迭代（LLM 调用）
   */
  async recordIteration(input: RecordIterationInput) {
    const project = await this.prisma.namingProject.findUnique({ where: { id: input.projectId } });
    if (!project) {
      throw new NotFoundException(`取名项目 ${input.projectId} 不存在`);
    }

    // 计算下一轮迭代号
    const lastIteration = await this.prisma.namingIteration.findFirst({
      where: { projectId: input.projectId },
      orderBy: { iterationNo: 'desc' },
    });
    const nextNo = (lastIteration?.iterationNo ?? 0) + 1;

    const iteration = await this.prisma.namingIteration.create({
      data: {
        projectId: input.projectId,
        iterationNo: nextNo,
        promptSnapshot: input.promptSnapshot || null,
        modelUsed: input.modelUsed || null,
      },
    });
    this.logger.log(`[recordIteration] 项目 ${input.projectId} 记录第 ${nextNo} 轮迭代`);
    return iteration;
  }

  /**
   * 归档项目（标记为已完成或归档）
   */
  async updateProjectStatus(projectId: string, userId: string, status: ProjectStatus) {
    const project = await this.prisma.namingProject.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      throw new NotFoundException(`取名项目 ${projectId} 不存在或无权操作`);
    }

    return this.prisma.namingProject.update({
      where: { id: projectId },
      data: { status },
    });
  }

  // ==================== 内部方法 ====================

  /** 获取候选名并校验所有权（通过 project.userId） */
  private async _getCandidateOwnedByUser(candidateId: string, userId: string) {
    const candidate = await this.prisma.namingCandidate.findUnique({
      where: { id: candidateId },
      include: { project: { select: { userId: true } } },
    });
    if (!candidate) return null;
    if (candidate.project.userId !== userId) return null;
    return candidate;
  }

  /** 安全解析 JSON */
  private _safeParseJson(json: string): unknown {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
