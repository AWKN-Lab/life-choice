import { Controller, Get, Head, HttpException, HttpStatus } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers/llm-providers.service';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly llmProviders: LlmProvidersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async check() {
    // P2-13: 主健康端点增加 DB 状态（轻量级 ping）
    // liveness probe：DB 异常时返回 503（满足 checklist P0 验收要求）
    let database: 'connected' | 'disconnected' = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch (err) {
      throw new HttpException({
        code: 1,
        message: 'database unreachable',
        service: 'awkn-life-backend',
        database: 'disconnected',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      code: 0,
      message: 'ok',
      service: 'awkn-life-backend',
      database,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('llm')
  llmHealth() {
    return this.llmProviders.getLlmHealth();
  }

  @Get('db')
  async dbInfo() {
    const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
    const nodeEnv = process.env.NODE_ENV || 'NOT_SET';

    // 推断 provider 类型（不暴露路径）
    let provider = 'unknown';
    if (dbUrl.startsWith('file:')) provider = 'sqlite';
    else if (dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:')) provider = 'postgresql';
    else if (dbUrl.startsWith('mysql:')) provider = 'mysql';

    // Task 7.2: 真实 DB 连接状态 + 响应时间
    let db: 'connected' | 'disconnected' = 'disconnected';
    let responseTimeMs: number | null = null;
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      responseTimeMs = Date.now() - start;
      db = 'connected';
    } catch {
      // DB 不可达
    }

    return {
      db,
      responseTimeMs,
      provider,
      nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    // Task 7.3: 就绪探针（检查 DB + 关键依赖）
    // P0-3 Step5 (2026-06-26): 强化 /health/ready
    //   - 修复 llmProvider 检查：按 DEFAULT_LLM_PROVIDER 动态校验对应 API Key（原硬编码 DOUBAO/OPENAI 是 BUG）
    //   - 新增 assets/pythonCli/knowledgeService 检查项（读 preflight-check.js 在启动时设置的 DEGRADED_* 标志位）
    //   - 暴露 degradations[] 数组供前端读取
    //   - 新增 'degraded' 中间态：fail=503，degraded=200（可接流量但功能受限），ok=200
    const checks: Record<string, { status: 'ok' | 'fail' | 'degraded'; responseTimeMs?: number; error?: string }> = {};
    const degradations: string[] = [];

    // DB 检查
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', responseTimeMs: Date.now() - start };
    } catch (err) {
      checks.database = { status: 'fail', error: err instanceof Error ? err.message : String(err) };
    }

    // LLM Provider 配置检查（按 DEFAULT_LLM_PROVIDER 动态校验对应 API Key）
    const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || '';
    const providerKeyMap: Record<string, string> = {
      'deepseek-direct': 'DEEPSEEK_DIRECT_API_KEY',
      'sensenova': 'SENSENOVA_API_KEY',
      'doubao': 'DOUBAO_API_KEY',
      'minimax': 'MINIMAX_API_KEY',
      'deepseek': 'DEEPSEEK_API_KEY',
      'spark': 'SPARK_API_KEY',
    };
    const expectedKey = providerKeyMap[defaultProvider];
    if (expectedKey) {
      const llmApiKey = process.env[expectedKey];
      checks.llmProvider = { status: llmApiKey ? 'ok' : 'fail' };
      if (!llmApiKey) {
        checks.llmProvider.error = `DEFAULT_LLM_PROVIDER=${defaultProvider} but ${expectedKey} is empty`;
      }
    } else {
      // 未知 provider：回退到检查任意已配置的 LLM key
      const anyKey = process.env.DEEPSEEK_DIRECT_API_KEY
        || process.env.SENSENOVA_API_KEY
        || process.env.DOUBAO_API_KEY
        || process.env.OPENAI_API_KEY;
      checks.llmProvider = { status: anyKey ? 'ok' : 'fail' };
      if (!anyKey) {
        checks.llmProvider.error = `DEFAULT_LLM_PROVIDER="${defaultProvider}" unknown and no LLM API key configured`;
      }
    }

    // JWT Secret 配置检查
    checks.jwtSecret = { status: process.env.JWT_SECRET ? 'ok' : 'fail' };

    // P0-3 Step5: Assets 检查 —— 扫描 preflight 设置的 DEGRADED_* 标志位
    // 排除 PYTHONCLI/KNOWLEDGE_SERVICE（它们有独立检查项）
    const degradedAssetKeys = Object.keys(process.env).filter(
      k => k.startsWith('DEGRADED_')
        && k !== 'DEGRADED_PYTHONCLI'
        && k !== 'DEGRADED_KNOWLEDGE_SERVICE'
        && process.env[k] === 'true',
    );
    if (degradedAssetKeys.length > 0) {
      const missing = degradedAssetKeys.map(k => k.replace('DEGRADED_', '').toLowerCase()).join(', ');
      checks.assets = { status: 'degraded', error: `optional assets missing: ${missing}` };
      degradations.push('assets');
    } else {
      checks.assets = { status: 'ok' };
    }

    // Python CLI 检查（缺失则 ziwei-agent 降级到 iztro JS 库，非致命）
    if (process.env.DEGRADED_PYTHONCLI === 'true') {
      checks.pythonCli = {
        status: 'degraded',
        error: 'ZIWEI_CLI_PATH not set or invalid; ziwei-agent will fall back to iztro JS library',
      };
      degradations.push('pythonCli');
    } else {
      checks.pythonCli = { status: 'ok' };
    }

    // knowledge-service 检查（缺失则知识库检索降级，非致命）
    if (process.env.DEGRADED_KNOWLEDGE_SERVICE === 'true') {
      checks.knowledgeService = {
        status: 'degraded',
        error: 'knowledge-service at 127.0.0.1:8701 unreachable; knowledge search will fall back',
      };
      degradations.push('knowledgeService');
    } else {
      checks.knowledgeService = { status: 'ok' };
    }

    // 综合判定：fail → down(503)；degraded → degraded(200)；全 ok → ok(200)
    const hasFail = Object.values(checks).some(c => c.status === 'fail');
    const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');
    const overallStatus: 'ok' | 'degraded' | 'down' = hasFail ? 'down' : (hasDegraded ? 'degraded' : 'ok');

    // 就绪探针：仅 fail 时返回 503，负载均衡器据此拒绝接流量
    // degraded 仍返回 200（服务可接流量，但前端应读 degradations[] 提示用户部分功能降级）
    if (hasFail) {
      throw new HttpException({
        ready: false,
        status: 'down',
        checks,
        degradations,
        timestamp: new Date().toISOString(),
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      ready: true,
      status: overallStatus,
      checks,
      degradations,
      timestamp: new Date().toISOString(),
    };
  }

  @Head()
  head() {
    return undefined;
  }
}
