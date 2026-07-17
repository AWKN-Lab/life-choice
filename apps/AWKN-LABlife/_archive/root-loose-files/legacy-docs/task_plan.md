# 人生决策宗师 - 优化改进计划

**项目**: AWKN-LABlife
**创建时间**: 2026-04-25
**依据**: awkn-programmer 程序员天阶功法 v6.0 检查报告

---

## 目标

基于 awkn-programmer 51条规则，对项目进行系统性优化，建立长期可维护的技术体系。

---

## 阶段划分

| 阶段 | 名称 | 优先级 | 预计工时 |
|------|------|--------|---------|
| Phase 1 | 类型安全加固 | P0 | 4h |
| Phase 2 | 测试体系建立 | P0 | 6h |
| Phase 3 | 可维护性重构 | P0 | 8h |
| Phase 4 | 安全与规范化 | P1 | 4h |
| Phase 5 | 性能优化 | P2 | 4h |
| Phase 6 | 文档完善 | P2 | 3h |

---

## Phase 1: 类型安全加固 (P0)

### 1.1 定义完整 DTO 类型

**问题**: `consult.service.ts` 中大量使用 `any`

**文件**: `awkn-life-backend/apps/api-server/src/consult/dto/`

```typescript
// route.dto.ts
export class RouteDto {
  question?: string;
  source?: string;
  timezone?: string;
  device?: string;
}

// analyze.dto.ts
export class AnalyzeDto {
  question?: string;
  routeType?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  gender?: 'male' | 'female';
  askTime?: string;
  askLocation?: string;
}

// submit-info.dto.ts
export class SubmitInfoDto {
  sessionId?: string;
  question?: string;
  routeType?: string;
  // ... 完整字段
}
```

### 1.2 替换所有 any

**搜索模式**:
```bash
grep -rn "dto: any" awkn-life-backend/apps/api-server/src/
grep -rn ": any" awkn-life-backend/apps/api-server/src/
grep -rn "<any>" awkn-life-backend/apps/api-server/src/
```

**替换规则**:
- `dto: any` → 具体 DTO 类型
- `result: any` → 具体返回类型
- `calcResult: any` → `CalcResult` 接口

### 验收标准
- [ ] 0 个 `any` 类型（除非有 `// eslint-disable` 注释说明原因）
- [ ] 所有函数参数有明确类型

---

## Phase 2: 测试体系建立 (P0)

### 2.1 安装测试框架

```bash
cd awkn-life-backend/apps/api-server
npm install --save-dev jest @nestjs/testing ts-jest @types/jest
npm install --save-dev supertest @types/supertest
```

### 2.2 补充核心业务测试

**文件**: `awkn-life-backend/apps/api-server/src/consult/consult.service.spec.ts`

```typescript
// 测试用例清单
describe('ConsultService', () => {
  // 1. 正常流测试
  describe('route()', () => {
    it('should return route result for valid question', () => {...});
    it('should throw BadRequestException for empty question', () => {...});
    it('should throw BadRequestException for question < 2 chars', () => {...});
  });

  // 2. 异常流测试
  describe('submitInfo()', () => {
    it('should throw BadRequestException for non-existent session', () => {...});
    it('should handle LLM failure gracefully', () => {...});
  });

  // 3. 边界条件测试
  describe('boundary conditions', () => {
    it('should handle question with exactly 2 characters', () => {...});
    it('should handle question with unicode characters', () => {...});
    it('should handle missing optional fields', () => {...});
  });
});
```

### 验收标准
- [ ] 核心服务测试覆盖率 ≥ 60%
- [ ] 3 类测试用例齐全（正常/异常/边界）
- [ ] CI 配置测试门禁

---

## Phase 3: 可维护性重构 (P0)

### 3.1 拆分超长函数

**问题**: `consult.service.ts` 1549 行，多个函数超过 100 行

**拆分方案**:

```
consult.service.ts (保留主接口)
├── generators/
│   ├── kline.generator.ts      # K线数据生成 (~150行 → 3个函数)
│   ├── monthly.generator.ts   # 月运数据生成 (~90行)
│   ├── wuxing.generator.ts    # 五行分析生成 (~45行)
│   ├── dayun.generator.ts     # 大运分析生成 (~45行)
│   └── module.generator.ts    # 模块内容生成 (~80行)
└── validators/
    └── consult.validator.ts   # 输入校验逻辑 (~30行)
```

**重构原则** (QR-CODE):
- 每个函数 ≤ 30 行
- 最多 3 层嵌套
- 最多 4 个参数

### 3.2 替换 console.log → Logger

```typescript
// Before
console.log(`[ConsultService] 算法计算完成，耗时: ${calcDuration}ms`);

// After
private readonly logger = new Logger(ConsultService.name);
this.logger.log(`算法计算完成，耗时: ${calcDuration}ms`);
```

**验收标准**
- [ ] 0 个 `console.log` / `console.error`
- [ ] 所有日志使用 `Logger` 或结构化日志

---

## Phase 4: 安全与规范化 (P1)

### 4.1 启用 ValidationPipe

**文件**: `awkn-life-backend/apps/api-server/src/main.ts`

```typescript
// 恢复 ValidationPipe
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
);
```

### 4.2 CORS 环境变量化

```typescript
// main.ts
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173'];
```

**.env.example**:
```
CORS_ORIGINS=http://localhost:5173,https://awkn.cn,https://www.awkn.cn
```

### 4.3 补充 API 文档

```typescript
/**
 * 路由接口 - POST /api/v1/consult/route
 *
 * @description 根据用户问题判断咨询类型（命理推演/断事六爻/其他）
 *
 * @param dto - 路由请求参数
 * @param dto.question - 用户问题（必填，最少2字符）
 * @param dto.source - 来源渠道（可选）
 * @param dto.timezone - 用户时区（可选）
 *
 * @returns 路由结果
 * @returns.record_id - 咨询记录ID
 * @returns.route_type - 路由类型 (liuren/ziping/quming/clarify)
 * @returns.need_clarify - 是否需要澄清
 *
 * @throws {BadRequestException} 当问题内容少于2字符时
 *
 * @example
 * ```ts
 * const result = await consultService.route({ question: '要不要跳槽' });
 * console.log(result.route_type); // 'liuren'
 * ```
 */
async route(dto: RouteDto) {...}
```

**验收标准**
- [ ] 所有 public 方法有完整 JSDoc
- [ ] ValidationPipe 启用
- [ ] CORS 从环境变量读取

---

## Phase 5: 性能优化 (P2)

### 5.1 添加缓存层

**建议缓存内容**:
- K线数据（基于 birthDate + birthTime + gender）
- 月运数据（同用户 1 小时内不变）
- 五行分析结果

```typescript
// 缓存服务
@Injectable()
export class CacheService {
  private cache = new Map<string, { data: any; expire: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expire) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data,
      expire: Date.now() + ttlSeconds * 1000,
    });
  }
}
```

### 5.2 确定性随机数

**问题**: `Math.random()` 用于命理计算，相同输入产生不同输出

**修复**: 使用基于输入的哈希：
```typescript
private deterministicRandom(seed: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash % range);
}
```

---

## Phase 6: 文档完善 (P2)

### 6.1 README 补充

- 架构图
- 环境配置说明
- 快速开始
- API 文档链接
- 部署流程

### 6.2 补充关键类注释

- `CalcEngineService` - 计算引擎
- `LlmGatewayService` - LLM 网关
- `ConsultService` - 咨询服务

---

## 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 重构影响现有功能 | 高 | 每个 Phase 后进行功能验证 |
| 测试破坏性大 | 中 | TDD 模式，小步提交 |
| 缓存引入内存泄漏 | 低 | 设置 TTL，定期清理 |

---

## 执行记录

| 日期 | 阶段 | 状态 | 完成内容 |
|------|------|------|---------|
| 2026-04-25 | - | ✅ | 完成 awkn-programmer 检查 |
| - | Phase 1 | ⏳ | 待开始 |
| - | Phase 2 | ⏳ | 待开始 |
| - | Phase 3 | ⏳ | 待开始 |
| - | Phase 4 | ⏳ | 待开始 |
| - | Phase 5 | ⏳ | 待开始 |
| - | Phase 6 | ⏳ | 待开始 |

---

## 验收检查清单

### Phase 1 完成条件
- [ ] `consult.service.ts` 中 `any` 类型 ≤ 3 处
- [ ] 所有 DTO 有完整类型定义
- [ ] TypeScript strict 模式无报错

### Phase 2 完成条件
- [ ] `consult.service.spec.ts` 存在且覆盖核心逻辑
- [ ] 测试用例 ≥ 20 个
- [ ] `npm test` 通过

### Phase 3 完成条件
- [ ] `consult.service.ts` < 500 行
- [ ] 新增 generator 模块
- [ ] 0 个 `console.log`

### Phase 4 完成条件
- [ ] ValidationPipe 启用
- [ ] CORS 从环境变量读取
- [ ] JSDoc 完整率 ≥ 80%

### Phase 5 完成条件
- [ ] 缓存服务实现
- [ ] 确定性随机数替换
- [ ] 性能测试通过

### Phase 6 完成条件
- [ ] README 更新
- [ ] 核心类注释完整
