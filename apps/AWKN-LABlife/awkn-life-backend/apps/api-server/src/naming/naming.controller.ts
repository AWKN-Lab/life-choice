// ============================================================
// P03: 取名三表控制器（Phase 7）
// 接口：
//   POST   /api/v1/naming/projects              创建项目
//   GET    /api/v1/naming/projects              列出我的项目
//   GET    /api/v1/naming/projects/:id          项目详情
//   POST   /api/v1/naming/projects/:id/candidates 批量添加候选名
//   GET    /api/v1/naming/projects/:id/candidates 列出候选名
//   POST   /api/v1/naming/candidates/:id/favorite 收藏
//   POST   /api/v1/naming/candidates/:id/eliminate 淘汰
//   PATCH  /api/v1/naming/projects/:id/status   更新项目状态
// ============================================================

import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NamingService, CreateProjectInput, AddCandidateInput, ProjectStatus, CandidateStatus } from './naming.service';

@Controller('api/v1/naming')
@UseGuards(JwtAuthGuard)
export class NamingController {
  constructor(private readonly namingService: NamingService) {}

  /** 创建取名项目 */
  @Post('projects')
  async createProject(@Req() req: any, @Body() body: CreateProjectInput) {
    return this.namingService.createProject({
      ...body,
      userId: req.user?.userId || req.user?.id,
    });
  }

  /** 列出我的取名项目 */
  @Get('projects')
  async listProjects(@Req() req: any, @Query('status') status?: ProjectStatus) {
    const userId = req.user?.userId || req.user?.id;
    return this.namingService.listProjects(userId, status);
  }

  /** 获取项目详情（含候选名 + 迭代记录） */
  @Get('projects/:id')
  async getProjectDetail(@Req() req: any, @Param('id') projectId: string) {
    const userId = req.user?.userId || req.user?.id;
    return this.namingService.getProjectDetail(projectId, userId);
  }

  /** 批量添加候选名 */
  @Post('projects/:id/candidates')
  async addCandidates(@Param('id') projectId: string, @Body() body: { candidates: AddCandidateInput[] }) {
    const candidates = (body.candidates || []).map((c) => ({ ...c, projectId }));
    return this.namingService.addCandidates(projectId, candidates);
  }

  /** 列出项目的候选名（可按状态过滤） */
  @Get('projects/:id/candidates')
  async listCandidates(@Param('id') projectId: string, @Query('status') status?: CandidateStatus) {
    return this.namingService.listCandidates(projectId, status);
  }

  /** 收藏候选名 */
  @Post('candidates/:id/favorite')
  async favoriteCandidate(@Req() req: any, @Param('id') candidateId: string) {
    const userId = req.user?.userId || req.user?.id;
    return this.namingService.favoriteCandidate(candidateId, userId);
  }

  /** 淘汰候选名 */
  @Post('candidates/:id/eliminate')
  async eliminateCandidate(@Req() req: any, @Param('id') candidateId: string) {
    const userId = req.user?.userId || req.user?.id;
    return this.namingService.eliminateCandidate(candidateId, userId);
  }

  /** 更新项目状态 */
  @Patch('projects/:id/status')
  async updateProjectStatus(
    @Req() req: any,
    @Param('id') projectId: string,
    @Body() body: { status: ProjectStatus },
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.namingService.updateProjectStatus(projectId, userId, body.status);
  }
}
