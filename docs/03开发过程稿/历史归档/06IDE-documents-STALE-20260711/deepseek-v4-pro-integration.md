# DeepSeek V4 Pro 官方 API 集成计划

## 摘要

为 `awkn.cn/life/` 后端新增 DeepSeek 官方 API（`deepseek-direct`）作为 LLM provider，使用 `deepseek-v4-pro` 模型，支持 thinking 模式。KEY 仅在后端使用，前端不暴露。

## 当前状态分析

### 现有 LLM 架构
- **LlmProvidersService**（全局模块）：管理 6 个 provider（moonshot / minimax / doubao / qwen / deepseek / sensenova）
- **当前默认 provider**：`sensenova`（商汤日日新，使用 `deepseek-v4-flash` 模型）
- **现有 `deepseek` provider**：指向火山引擎 ARK API（`https://ark.cn-beijing.volces.com/api/v3`），非 DeepSeek 官方 API
- **Fallback 链**：default → sensenova → doubao → qwen → moonshot → minimax → deepseek

### DeepSeek 官方 API 信息
- **Base URL**：`https://api.deepseek.com`
- **Chat Completion 端点**：`POST https://api.deepseek.com/chat/completions`
- **可用模型**：`deepseek-chat`（V3）、`deepseek-reasoner`（R1）、`deepseek-v4-pro`、`deepseek-v4-flash`
- **认证方式**：Bearer Token
- **API 格式**：OpenAI 兼容
- **Thinking 模式**：通过 `thinking: { type: "enabled" | "disabled" }` 参数控制
- **余额查询**：`GET https://api.deepseek.com/user/balance`

### KEY 位置
- **本地开发**：`C:\Users\10919\Desktop\AWKN-Lab\.env` → `DEEPSEEK_API_KEY=sk-c20748d9833d4ef0b9bc301085d5d1eb`
- **生产环境**：`awkn-life-backend/apps/api-server/.env.prod`（需新增）

### 安全现状
- ✅ KEY 仅在后端 `.env` 文件中，前端代码不包含任何 API KEY
- ✅ 前端通过 `/api/v1/consult/*` 接口间接调用 LLM
- ✅ `LlmProvidersService` 在后端内部管理所有 provider 配置

---

## 变更方案

### 1. 修改 `LlmProvidersService` — 新增 `deepseek-direct` provider

**文件**：`awkn-life-backend/apps/api-server/src/llm-providers/llm-providers.service.ts`

**变更内容**：

#### 1.1 扩展 `LlmProviderType`
```typescript
export type LlmProviderType = 'moonshot' | 'minimax' | 'doubao' | 'qwen' | 'deepseek' | 'sensenova' | 'deepseek-direct';
```

#### 1.2 扩展 `LlmOptions` — 增加 thinking 支持
```typescript
export interface LlmOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  jsonMode?: boolean;
  thinking?: boolean;  // 新增：是否启用思考模式
}
```

#### 1.3 扩展 `LlmResponse` — 增加 reasoning_content
```typescript
export interface LlmResponse {
  content: string;
  provider: string;
  model: string;
  durationMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  reasoningContent?: string;  // 新增：思考链内容
}
```

#### 1.4 在 `providers` 对象中新增 `deepseek-direct`
```typescript
'deepseek-direct': {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-pro',
  endpoint: '/chat/completions',
},
```

#### 1.5 在构造函数中读取环境变量
```typescript
// DeepSeek 官方 API 配置
this.providers['deepseek-direct'].apiKey =
  process.env.DEEPSEEK_DIRECT_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  '';
this.providers['deepseek-direct'].baseUrl =
  process.env.DEEPSEEK_DIRECT_BASE_URL ||
  'https://api.deepseek.com';
this.providers['deepseek-direct'].model =
  process.env.DEEPSEEK_DIRECT_MODEL ||
  'deepseek-v4-pro';
```

#### 1.6 在 `chat()` 方法中增加 thinking 模式支持
- 当 provider 为 `deepseek-direct` 且 `options.thinking === true` 时，在请求 body 中加入 `thinking: { type: "enabled" }`
- 解析响应中的 `reasoning_content` 字段，存入 `LlmResponse.reasoningContent`
- 更新 `cleanAssistantContent` 方法，确保 thinking 内容的 `<think/>` 标签被正确处理

#### 1.7 更新 `chatWithFallback()` 的 fallback 链
```typescript
const providers = Array.from(new Set<LlmProviderType>([
  this.defaultProvider,
  'deepseek-direct',    // 新增：DeepSeek 官方 API
  'sensenova',
  'doubao',
  'qwen',
  'moonshot',
  'minimax',
  'deepseek',
])).filter((provider) => !!this.providers[provider].apiKey);
```

#### 1.8 更新 `isConfigured()` 和 `getStatus()` 方法
- `isConfigured()` 增加 `this.providers['deepseek-direct'].apiKey` 检查
- `getStatus()` 增加 `deepseek-direct` 字段
- 构造函数日志增加 `deepseek-direct` 状态

#### 1.9 更新 `defaultProvider` 的合法值检查
在构造函数中，将 `'deepseek-direct'` 加入合法 provider 类型检查。

### 2. 更新生产环境配置

**文件**：`awkn-life-backend/apps/api-server/.env.prod`

新增：
```env
# DeepSeek 官方 API — V4 Pro
DEEPSEEK_DIRECT_API_KEY=sk-c20748d9833d4ef0b9bc301085d5d1eb
DEEPSEEK_DIRECT_BASE_URL=https://api.deepseek.com
DEEPSEEK_DIRECT_MODEL=deepseek-v4-pro
```

### 3. 测试 DeepSeek V4 Pro 可用性

在实施前，先用 curl 测试 API Key 和模型可用性：
```bash
curl -L -X POST 'https://api.deepseek.com/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer sk-c20748d9833d4ef0b9bc301085d5d1eb' \
  --data-raw '{
    "messages": [
      {"content": "You are a helpful assistant", "role": "system"},
      {"content": "你好，请用一句话介绍自己", "role": "user"}
    ],
    "model": "deepseek-v4-pro",
    "max_tokens": 100
  }'
```

同时查询余额：
```bash
curl -L 'https://api.deepseek.com/user/balance' \
  -H 'Authorization: Bearer sk-c20748d9833d4ef0b9bc301085d5d1eb'
```

### 4. 部署

按照 `awkn-部署` 技能的流程：
1. 备份当前版本（git commit）
2. 构建后端
3. 部署到阿里云服务器
4. 健康检查
5. 验证 DeepSeek V4 Pro 调用

---

## 假设与决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| Provider 命名 | `deepseek-direct` | 与现有 `deepseek`（火山引擎）区分 |
| 默认模型 | `deepseek-v4-pro` | 用户明确要求 |
| 环境变量前缀 | `DEEPSEEK_DIRECT_` | 与现有 `DEEPSEEK_` 前缀区分 |
| Thinking 模式 | 默认关闭，按需启用 | Thinking 模式响应更慢、成本更高 |
| Fallback 位置 | 紧跟 defaultProvider 之后 | DeepSeek V4 Pro 质量高，应优先 fallback |
| 现有 `deepseek` provider | 保留不变 | 避免影响现有火山引擎路由 |

---

## 验证步骤

### Step 1：API Key 可用性测试
- [ ] 调用 DeepSeek 余额 API，确认 Key 有效且有余额
- [ ] 调用 Chat Completion API，确认 `deepseek-v4-pro` 模型可用
- [ ] 调用 Chat Completion API，确认 thinking 模式可用

### Step 2：代码集成验证
- [ ] TypeScript 编译无错误
- [ ] `LlmProvidersService` 正确初始化 `deepseek-direct` provider
- [ ] `getStatus()` 返回 `deepseek-direct: true`
- [ ] `chat()` 方法能成功调用 DeepSeek V4 Pro
- [ ] `chat()` 方法 thinking 模式返回 `reasoningContent`
- [ ] `chatWithFallback()` 包含 `deepseek-direct` 在 fallback 链中

### Step 3：端到端验证
- [ ] 通过 `/api/v1/consult/analyze` 接口触发 LLM 调用
- [ ] 确认响应中 `provider` 字段为 `deepseek-direct`
- [ ] 确认响应中 `model` 字段为 `deepseek-v4-pro`
- [ ] 确认前端页面正常显示分析结果

### Step 4：安全验证
- [ ] 前端代码不包含任何 API KEY
- [ ] 浏览器 Network 面板不暴露 API KEY
- [ ] 后端日志不打印完整 API KEY

---

## 不做的事

- ❌ 不修改现有 `deepseek` provider（火山引擎）的配置
- ❌ 不修改前端代码（前端通过后端 API 间接调用，无需改动）
- ❌ 不将 `deepseek-direct` 设为默认 provider（除非用户后续决定）
- ❌ 不实现流式响应（SSE），当前项目未使用流式
- ❌ 不实现 DeepSeek 的 FIM（Fill-in-the-Middle）功能
- ❌ 不实现 DeepSeek 的 Tool Calls 功能（当前项目未使用）
