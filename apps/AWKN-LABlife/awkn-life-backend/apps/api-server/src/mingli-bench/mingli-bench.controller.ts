import { Controller, Get, Post, Body, Param, Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { MingliBenchService, BenchmarkRunResult } from './mingli-bench.service';
import { RunBenchmarkDto } from './dto';

export interface ComparisonResult {
  baseline: BenchmarkRunResult;
  enhanced: BenchmarkRunResult;
  comparison: {
    accuracyDelta: number;
    trimmedAccuracyDelta: number;
    categoryDeltas: Record<string, number>;
  };
}

export interface VotingResult {
  singleRound: BenchmarkRunResult;
  fiveRound: BenchmarkRunResult;
  votingAnalysis: {
    varianceReduction: number;
    agreementRate: number;
    perQuestionVariance: Array<{ id: string; category: string; variance: number }>;
  };
}

export interface CategoryAnalysisResult {
  categoryStats: Record<string, { total: number; correct: number; accuracy: number; weakness: boolean }>;
  weakCategories: string[];
  strongCategories: string[];
  overallAccuracy: number;
}

@Controller('mingli-bench')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MingliBenchController {
  constructor(@Inject(MingliBenchService) private readonly benchService: MingliBenchService) {}

  @Get('categories')
  getCategories(): string[] {
    return this.benchService.getCategories();
  }

  @Post('run')
  async run(@Body() dto: RunBenchmarkDto): Promise<BenchmarkRunResult> {
    return this.benchService.runBenchmark({
      year: dto.year,
      sampleSize: dto.sampleSize,
      useCot: dto.useCot,
      useAstro: dto.useAstro,
      shuffleOptions: dto.shuffleOptions,
      provider: dto.provider,
      maxWorkers: dto.maxWorkers,
      rounds: dto.rounds,
      categories: dto.categories,
    });
  }

  @Post('run-comparison')
  async runComparison(@Body() dto: RunBenchmarkDto): Promise<ComparisonResult> {
    return this.benchService.runComparisonTest({
      sampleSize: dto.sampleSize,
      categories: dto.categories,
      provider: dto.provider,
      rounds: dto.rounds,
    });
  }

  @Post('run-voting')
  async runVoting(@Body() dto: RunBenchmarkDto): Promise<VotingResult> {
    return this.benchService.runVotingTest({
      sampleSize: dto.sampleSize,
      categories: dto.categories,
      provider: dto.provider,
    });
  }

  @Post('run-subagent')
  async runSubAgent(@Body() dto: RunBenchmarkDto): Promise<BenchmarkRunResult> {
    return this.benchService.runSubAgentBenchmark({
      sampleSize: dto.sampleSize,
      categories: dto.categories,
      provider: dto.provider,
    });
  }

  @Post('analyze-categories')
  async analyzeCategories(@Body() dto: RunBenchmarkDto): Promise<CategoryAnalysisResult> {
    return this.benchService.analyzeCategoryPerformance({
      sampleSize: dto.sampleSize || 5,
      provider: dto.provider,
      useCot: dto.useCot ?? true,
      useAstro: dto.useAstro ?? true,
    });
  }

  @Get('history')
  async getHistory(): Promise<BenchmarkRunResult[]> {
    return this.benchService.getHistory();
  }

  @Get('history/:runId')
  async getHistoryById(@Param('runId') runId: string): Promise<BenchmarkRunResult | undefined> {
    return this.benchService.getHistoryById(runId);
  }

  @Get('history/:runId/export')
  async exportHistoryById(@Param('runId') runId: string): Promise<BenchmarkRunResult | undefined> {
    return this.benchService.getHistoryById(runId);
  }
}
