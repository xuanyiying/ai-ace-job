# 多大模型厂商集成 - 设计文档

## 概述

多大模型厂商集成功能扩展了系统的 AI 引擎，支持接入多个大模型厂商（阿里千问、DeepSeek、Google Gemini、OpenAI ChatGPT、本地 Ollama）。系统提供统一的 AI 接口、灵活的模型选择机制、场景化的提示词模板管理，以及基于不同场景自动选择最优模型的能力。

核心功能包括：

- 多模型提供商支持（5 个主要厂商）
- 统一的 AI 提供商接口
- 模型配置管理（环境变量、YAML 配置文件）
- 场景化提示词模板管理
- 基于场景的智能模型选择
- 重试和降级机制
- 成本和使用量追踪
- 性能监控
- 本地 Ollama 支持
- 提示词版本管理
- 详细的错误处理和日志记录
- 安全的 API 密钥管理

## 架构

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application Layer)                │
│  AI Engine | Resume Service | Optimization Service | etc.   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  AI 管理层 (AI Management Layer)            │
│  Model Selector | Prompt Manager | Cost Tracker             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              统一 AI 接口层 (Unified AI Interface)          │
│                    AIProvider Interface                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            提供商实现层 (Provider Implementation Layer)       │
│  OpenAI | Qwen | DeepSeek | Gemini | Ollama Providers      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              外部服务层 (External Services Layer)             │
│  OpenAI API | Qwen API | DeepSeek API | Gemini API | Ollama │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

**后端框架**: NestJS (Node.js 18+)

**AI 客户端库**:

- OpenAI: `openai` (官方 SDK)
- 阿里千问: `@alibabacloud/openplatform20191219` 或 HTTP 客户端
- DeepSeek: HTTP 客户端 (兼容 OpenAI 接口)
- Google Gemini: `@google/generative-ai`
- Ollama: HTTP 客户端

**配置管理**: `@nestjs/config`、`yaml`

**缓存**: Redis

**数据库**: PostgreSQL (用于存储提示词版本、成本记录等)

**监控**: Prometheus、Winston Logger

## 组件和接口

### 1. 统一 AI 提供商接口

```typescript
interface AIProvider {
  // 提供商名称
  name: string;

  // 调用 AI
  call(request: AIRequest): Promise<AIResponse>;

  // 流式调用
  stream(request: AIRequest): AsyncIterable<AIStreamChunk>;

  // 检查连接可用性
  healthCheck(): Promise<boolean>;

  // 获取可用模型列表
  listModels(): Promise<string[]>;

  // 获取模型信息
  getModelInfo(modelName: string): Promise<ModelInfo>;
}

interface AIRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  metadata?: Record<string, any>;
}

interface AIStreamChunk {
  content: string;
  model: string;
  provider: string;
  finishReason?: string;
}

interface ModelInfo {
  name: string;
  provider: string;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  latency: number; // 平均延迟（毫秒）
  successRate: number; // 成功率（0-1）
  isAvailable: boolean;
}
```

### 2. 提供商实现

#### OpenAI 提供商

```typescript
class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async call(request: AIRequest): Promise<AIResponse> {
    // 实现 OpenAI 调用
  }

  async stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    // 实现流式调用
  }

  async healthCheck(): Promise<boolean> {
    // 检查 API 连接
  }

  async listModels(): Promise<string[]> {
    // 返回可用模型列表
  }
}
```

#### 阿里千问提供商

```typescript
class QwenProvider implements AIProvider {
  private config: QwenConfig;
  private httpClient: AxiosInstance;

  constructor(config: QwenConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: 'https://dashscope.aliyuncs.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
  }

  async call(request: AIRequest): Promise<AIResponse> {
    // 实现千问 API 调用
  }

  async stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    // 实现流式调用
  }

  async healthCheck(): Promise<boolean> {
    // 检查 API 连接
  }

  async listModels(): Promise<string[]> {
    // 返回可用模型列表
  }
}
```

#### DeepSeek 提供商

```typescript
class DeepSeekProvider implements AIProvider {
  private config: DeepSeekConfig;
  private httpClient: AxiosInstance;

  constructor(config: DeepSeekConfig) {
    this.config = config;
    // DeepSeek 兼容 OpenAI 接口
    this.httpClient = axios.create({
      baseURL: 'https://api.deepseek.com/v1',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
  }

  async call(request: AIRequest): Promise<AIResponse> {
    // 实现 DeepSeek 调用
  }

  async stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    // 实现流式调用
  }

  async healthCheck(): Promise<boolean> {
    // 检查 API 连接
  }

  async listModels(): Promise<string[]> {
    // 返回可用模型列表
  }
}
```

#### Google Gemini 提供商

```typescript
class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async call(request: AIRequest): Promise<AIResponse> {
    // 实现 Gemini 调用
  }

  async stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    // 实现流式调用
  }

  async healthCheck(): Promise<boolean> {
    // 检查 API 连接
  }

  async listModels(): Promise<string[]> {
    // 返回可用模型列表
  }
}
```

#### Ollama 提供商

```typescript
class OllamaProvider implements AIProvider {
  private config: OllamaConfig;
  private httpClient: AxiosInstance;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.baseUrl || 'http://localhost:11434',
    });
  }

  async call(request: AIRequest): Promise<AIResponse> {
    // 实现 Ollama 调用
  }

  async stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    // 实现流式调用
  }

  async healthCheck(): Promise<boolean> {
    // 检查 Ollama 连接
  }

  async listModels(): Promise<string[]> {
    // 从 Ollama 获取已安装的模型列表
  }
}
```

### 3. 模型选择器

```typescript
interface ModelSelectionStrategy {
  selectModel(
    availableModels: ModelInfo[],
    context: SelectionContext
  ): ModelInfo;
}

interface SelectionContext {
  scenario: string; // 场景名称
  inputTokens?: number;
  maxLatency?: number;
  maxCost?: number;
}

class ModelSelector {
  private strategies: Map<string, ModelSelectionStrategy>;

  selectModel(
    availableModels: ModelInfo[],
    scenario: string,
    context?: Partial<SelectionContext>
  ): ModelInfo {
    const strategy = this.strategies.get(scenario);
    if (!strategy) {
      throw new Error(`No strategy defined for scenario: ${scenario}`);
    }

    return strategy.selectModel(availableModels, {
      scenario,
      ...context,
    });
  }
}

// 具体策略实现
class CostOptimizedStrategy implements ModelSelectionStrategy {
  selectModel(availableModels: ModelInfo[]): ModelInfo {
    // 选择成本最低的模型
    return availableModels.reduce((min, current) =>
      current.costPerInputToken + current.costPerOutputToken <
      min.costPerInputToken + min.costPerOutputToken
        ? current
        : min
    );
  }
}

class QualityOptimizedStrategy implements ModelSelectionStrategy {
  selectModel(availableModels: ModelInfo[]): ModelInfo {
    // 选择质量最高的模型（通常是最新的模型）
    const qualityRanking = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    for (const model of qualityRanking) {
      const found = availableModels.find((m) => m.name.includes(model));
      if (found) return found;
    }
    return availableModels[0];
  }
}

class LatencyOptimizedStrategy implements ModelSelectionStrategy {
  selectModel(availableModels: ModelInfo[]): ModelInfo {
    // 选择延迟最低的模型
    return availableModels.reduce((min, current) =>
      current.latency < min.latency ? current : min
    );
  }
}
```

### 4. 提示词模板管理器

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  scenario: string;
  template: string;
  variables: string[];
  version: number;
  provider?: string; // 可选：特定提供商
  isEncrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class PromptTemplateManager {
  private templates: Map<string, PromptTemplate>;
  private db: Database;

  async getTemplate(
    scenario: string,
    provider?: string,
    version?: number
  ): Promise<PromptTemplate> {
    // 获取提示词模板
  }

  async renderTemplate(
    template: PromptTemplate,
    variables: Record<string, string>
  ): Promise<string> {
    // 渲染模板
    let rendered = template.template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(`{${key}}`, value);
    }
    return rendered;
  }

  async createVersion(
    scenario: string,
    template: string,
    reason: string,
    author: string
  ): Promise<PromptTemplate> {
    // 创建新版本
  }

  async listVersions(scenario: string): Promise<PromptTemplate[]> {
    // 列出所有版本
  }

  async rollback(scenario: string, version: number): Promise<PromptTemplate> {
    // 回滚到指定版本
  }
}
```

### 5. 成本和使用量追踪

```typescript
interface UsageRecord {
  id: string;
  userId: string;
  model: string;
  provider: string;
  scenario: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  success: boolean;
  timestamp: Date;
}

class UsageTracker {
  private db: Database;

  async recordUsage(record: UsageRecord): Promise<void> {
    // 记录使用情况
  }

  async getCostByModel(
    startDate: Date,
    endDate: Date,
    model?: string
  ): Promise<Map<string, number>> {
    // 按模型统计成本
  }

  async getCostByScenario(
    startDate: Date,
    endDate: Date,
    scenario?: string
  ): Promise<Map<string, number>> {
    // 按场景统计成本
  }

  async getCostByUser(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Map<string, number>> {
    // 按用户统计成本
  }

  async generateCostReport(
    startDate: Date,
    endDate: Date,
    groupBy: 'model' | 'scenario' | 'user'
  ): Promise<CostReport> {
    // 生成成本报告
  }
}
```

### 6. 性能监控

```typescript
interface PerformanceMetrics {
  model: string;
  provider: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  successRate: number;
  failureRate: number;
  lastUpdated: Date;
}

class PerformanceMonitor {
  private db: Database;

  async recordMetrics(
    model: string,
    provider: string,
    latency: number,
    success: boolean
  ): Promise<void> {
    // 记录性能指标
  }

  async getMetrics(
    model: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics> {
    // 获取性能指标
  }

  async checkAlerts(): Promise<Alert[]> {
    // 检查是否需要发送告警
  }
}
```

### 7. 错误处理和重试

```typescript
enum AIErrorCode {
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    public message: string,
    public originalError?: Error,
    public retryable: boolean = true
  ) {
    super(message);
  }
}

class RetryHandler {
  private maxRetries: number = 3;
  private initialDelayMs: number = 1000;
  private maxDelayMs: number = 10000;
  private backoffMultiplier: number = 2;

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    errorHandler?: (error: Error, attempt: number) => boolean
  ): Promise<T> {
    // 实现重试逻辑
  }

  private isRetryable(error: Error): boolean {
    // 判断错误是否可重试
  }

  private calculateDelay(attempt: number): number {
    // 计算退避延迟
  }
}
```

## 数据模型

### 提示词模板版本

```typescript
interface PromptTemplateVersion {
  id: string;
  templateId: string;
  scenario: string;
  version: number;
  template: string;
  variables: string[];
  provider?: string;
  author: string;
  reason: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 使用记录

```typescript
interface UsageRecord {
  id: string;
  userId: string;
  model: string;
  provider: string;
  scenario: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  success: boolean;
  errorCode?: string;
  timestamp: Date;
}
```

### 模型配置

```typescript
interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string; // 加密存储
  endpoint?: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## 正确性属性

_属性是系统在所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。_

### 属性 1: 多提供商支持

*对于任意*已配置的 AI 提供商（Qwen、DeepSeek、Gemini、OpenAI、Ollama），系统应该能够成功实例化该提供商的实现类。

**验证: 需求 1.1, 1.2, 1.3, 1.4, 1.5**

### 属性 2: 提供商初始化

*对于任意*系统启动，所有已配置的模型提供商应该被加载并可用。

**验证: 需求 1.6**

### 属性 3: 动态配置更新

*对于任意*模型提供商配置的变化，系统应该在不重启的情况下更新可用模型列表。

**验证: 需求 1.7**

### 属性 4: 提供商接口实现

*对于任意*AI 提供商实现，应该实现统一的 AIProvider 接口，包括 call、stream、healthCheck、listModels 方法。

**验证: 需求 2.1, 2.2**

### 属性 5: 统一请求格式

*对于任意*AI 调用请求，系统应该接受包含 model、prompt、temperature、maxTokens 等参数的统一格式。

**验证: 需求 2.3**

### 属性 6: 统一响应格式

*对于任意*AI 响应，系统应该返回包含 content、model、provider、usage 等字段的统一格式。

**验证: 需求 2.4**

### 属性 7: 流式和非流式支持

*对于任意*AI 提供商，系统应该支持流式响应（streaming）和非流式响应两种模式。

**验证: 需求 2.5**

### 属性 8: 错误格式一致性

*对于任意*来自不同提供商的错误，系统应该将其转换为统一的错误格式。

**验证: 需求 2.6**

### 属性 9: 环境变量配置

*对于任意*通过环境变量配置的 AI 提供商，系统应该能够正确读取并使用这些配置。

**验证: 需求 3.1**

### 属性 10: YAML 配置文件支持

*对于任意*有效的 YAML 配置文件，系统应该能够正确解析并加载模型配置。

**验证: 需求 3.2**

### 属性 11: 连接验证

*对于任意*系统启动，所有已配置模型的连接应该被验证，不可用的模型应该被标记。

**验证: 需求 3.3, 3.4**

### 属性 12: 默认参数应用

*对于任意*模型调用，如果未指定参数，系统应该应用该模型的默认参数。

**验证: 需求 3.5**

### 属性 13: 成本参数配置

*对于任意*模型，系统应该能够存储和检索其输入和输出 token 的成本参数。

**验证: 需求 3.6**

### 属性 14: 速率限制配置

*对于任意*模型，系统应该能够配置并强制执行每分钟和每天的请求限制。

**验证: 需求 3.7**

### 属性 15: 多模板支持

*对于任意*场景，系统应该能够定义和检索多个提示词模板。

**验证: 需求 4.1**

### 属性 16: 预定义模板存在

*对于任意*预定义的场景（简历解析、职位解析、优化建议、面试问题、匹配度评分），系统应该提供相应的提示词模板。

**验证: 需求 4.2**

### 属性 17: 模板变量支持

*对于任意*提示词模板，系统应该支持使用 {variable_name} 格式的变量占位符。

**验证: 需求 4.3**

### 属性 18: 模板渲染正确性

*对于任意*提示词模板和变量映射，渲染后的模板应该将所有占位符替换为对应的值。这是一个往返属性。

**验证: 需求 4.4**

### 属性 19: 提供商特定模板

*对于任意*模型提供商，系统应该支持定义该提供商特定的提示词模板。

**验证: 需求 4.5**

### 属性 20: 动态模板加载

*对于任意*提示词模板的修改，系统应该在运行时动态加载和更新，无需重启。

**验证: 需求 4.6**

### 属性 21: 敏感信息加密

*对于任意*包含敏感信息的提示词模板，系统应该以加密形式存储。

**验证: 需求 4.7**

### 属性 22: 场景选择策略定义

*对于任意*场景，系统应该定义相应的模型选择策略（成本优先、质量优先、速度优先等）。

**验证: 需求 5.1**

### 属性 23: 简历解析成本优化

*对于任意*简历解析任务，系统应该选择成本最低的可用模型。

**验证: 需求 5.2**

### 属性 24: 优化建议质量优化

*对于任意*优化建议生成任务，系统应该选择质量最高的可用模型（如 GPT-4）。

**验证: 需求 5.3**

### 属性 25: 面试问题速度优化

*对于任意*面试问题生成任务，系统应该选择速度最快的可用模型。

**验证: 需求 5.4**

### 属性 26: 模型自动切换

*对于任意*首选模型不可用的情况，系统应该自动切换到备选模型。

**验证: 需求 5.5**

### 属性 27: 降级响应

*对于任意*所有模型都不可用的情况，系统应该返回降级响应或缓存的结果。

**验证: 需求 5.6**

### 属性 28: 模型选择日志

*对于任意*模型选择决策，系统应该记录决策过程和原因。

**验证: 需求 5.7**

### 属性 29: 重试机制

*对于任意*AI 调用失败，系统应该自动重试最多 3 次，使用指数退避策略。

**验证: 需求 6.1**

### 属性 30: 重试后备选模型

*对于任意*重试仍然失败的情况，系统应该尝试使用备选模型。

**验证: 需求 6.2**

### 属性 31: 全部失败降级

*对于任意*所有模型都失败的情况，系统应该返回预定义的降级响应。

**验证: 需求 6.3**

### 属性 32: 错误特定重试策略

*对于任意*不同类型的错误，系统应该应用不同的重试策略（网络错误重试，认证错误不重试）。

**验证: 需求 6.4**

### 属性 33: 重试事件日志

*对于任意*重试和降级事件，系统应该记录到日志中。

**验证: 需求 6.5**

### 属性 34: 降级状态标记

*对于任意*使用的降级响应，系统应该在响应中标记降级状态。

**验证: 需求 6.6**

### 属性 35: 使用量记录完整性

*对于任意*AI 调用，系统应该记录模型名称、输入 token 数、输出 token 数和成本。

**验证: 需求 7.1**

### 属性 36: 成本聚合

*对于任意*时间范围和聚合维度（模型、场景、用户），系统应该能够计算总成本。

**验证: 需求 7.2**

### 属性 37: 成本报告生成

*对于任意*时间范围（日、周、月），系统应该能够生成成本报告。

**验证: 需求 7.3**

### 属性 38: 成本告警

*对于任意*成本超过预设阈值的情况，系统应该发送告警通知。

**验证: 需求 7.4**

### 属性 39: 成本查询 API

*对于任意*成本查询请求，系统应该提供 API 端点返回正确的统计数据。

**验证: 需求 7.5**

### 属性 40: 成本报告导出

*对于任意*成本报告，系统应该支持导出为 CSV 或 JSON 格式。

**验证: 需求 7.6**

### 属性 41: 响应时间记录

*对于任意*AI 调用，系统应该记录响应时间（延迟）。

**验证: 需求 8.1**

### 属性 42: 性能指标计算

*对于任意*模型，系统应该计算平均、最大和最小响应时间。

**验证: 需求 8.2**

### 属性 43: 成功率计算

*对于任意*模型，系统应该计算成功率和失败率。

**验证: 需求 8.3**

### 属性 44: 失败率告警

*对于任意*模型失败率超过 10% 的情况，系统应该发送告警通知。

**验证: 需求 8.4**

### 属性 45: 响应时间告警

*对于任意*模型平均响应时间超过 30 秒的情况，系统应该发送告警通知。

**验证: 需求 8.5**

### 属性 46: 性能指标查询

*对于任意*时间范围，系统应该能够查询模型的性能指标。

**验证: 需求 8.7**

### 属性 47: Ollama 连接

*对于任意*本地 Ollama 服务，系统应该能够连接到默认地址 http://localhost:11434。

**验证: 需求 9.1**

### 属性 48: Ollama 模型发现

*对于任意*系统启动，系统应该自动发现 Ollama 上已安装的模型列表。

**验证: 需求 9.2**

### 属性 49: Ollama 统一接口

*对于任意*Ollama 模型调用，系统应该使用与其他提供商相同的统一接口。

**验证: 需求 9.3**

### 属性 50: Ollama 自定义配置

*对于任意*自定义的 Ollama 地址和端口，系统应该能够正确连接。

**验证: 需求 9.4**

### 属性 51: Ollama 不可用处理

*对于任意*Ollama 服务不可用的情况，系统应该将其标记为不可用并使用其他模型。

**验证: 需求 9.5**

### 属性 52: Ollama 开源模型支持

*对于任意*在 Ollama 上运行的开源模型，系统应该能够使用。

**验证: 需求 9.6**

### 属性 53: 提示词版本创建

*对于任意*提示词模板的修改，系统应该创建新版本并保留历史版本。

**验证: 需求 10.1**

### 属性 54: 版本元数据记录

*对于任意*提示词版本，系统应该记录修改时间、修改者和修改原因。

**验证: 需求 10.2**

### 属性 55: 版本选择

*对于任意*AI 调用，系统应该支持指定使用特定版本的提示词。

**验证: 需求 10.3**

### 属性 56: A/B 测试支持

*对于任意*不同版本的提示词，系统应该支持进行 A/B 测试。

**验证: 需求 10.4**

### 属性 57: 版本回滚

*对于任意*之前的提示词版本，系统应该能够回滚到该版本。

**验证: 需求 10.5**

### 属性 58: 错误日志记录

*对于任意*AI 调用失败，系统应该记录详细的错误信息，包括错误代码、消息和堆栈跟踪。

**验证: 需求 11.1**

### 属性 59: 错误代码定义

*对于任意*错误类型，系统应该定义特定的错误代码（PROVIDER_UNAVAILABLE、RATE_LIMIT_EXCEEDED 等）。

**验证: 需求 11.2**

### 属性 60: 详细调用日志

*对于任意*AI 调用，系统应该记录请求参数、响应内容和耗时。

**验证: 需求 11.3**

### 属性 61: 调试级别日志

*对于任意*日志级别为 DEBUG 的情况，系统应该记录完整的请求和响应内容。

**验证: 需求 11.4**

### 属性 62: 日志查询

*对于任意*日志查询请求，系统应该支持按模型、场景、时间范围查询。

**验证: 需求 11.5**

### 属性 63: 日志清理

*对于任意*过期的日志文件，系统应该定期清理。

**验证: 需求 11.6**

### 属性 64: API 密钥加密

*对于任意*AI 提供商的 API 密钥，系统应该以加密形式存储。

**验证: 需求 12.1**

### 属性 65: 敏感信息不记录

*对于任意*系统日志，不应该包含 API 密钥或其他敏感信息。

**验证: 需求 12.2**

### 属性 66: 密钥轮换支持

*对于任意*API 密钥，系统应该支持定期轮换。

**验证: 需求 12.3**

### 属性 67: 用户访问控制

*对于任意*用户，系统应该支持设置不同的 AI 模型访问权限。

**验证: 需求 12.4**

### 属性 68: 未授权访问拒绝

*对于任意*未授权的模型访问请求，系统应该拒绝并记录安全事件。

**验证: 需求 12.5**

### 属性 69: 审计日志

*对于任意*API 密钥的访问和修改操作，系统应该记录到审计日志中。

**验证: 需求 12.6**

## 错误处理

### 错误分类

1. **提供商错误** (PROVIDER_UNAVAILABLE): 提供商服务不可用
2. **认证错误** (AUTHENTICATION_FAILED): API 密钥无效或过期
3. **速率限制** (RATE_LIMIT_EXCEEDED): 超过 API 速率限制
4. **请求错误** (INVALID_REQUEST): 请求格式或参数错误
5. **超时错误** (TIMEOUT): 请求超时
6. **未知错误** (UNKNOWN_ERROR): 其他未知错误

### 重试策略

- **网络错误**: 重试 3 次，指数退避
- **速率限制**: 重试 3 次，指数退避
- **认证错误**: 不重试，立即失败
- **请求错误**: 不重试，立即失败
- **超时错误**: 重试 2 次，指数退避

### 降级策略

- 使用缓存的结果（如果可用）
- 使用预定义的通用响应
- 返回错误信息，提示用户稍后重试

## 测试策略

### 单元测试

使用 Jest 框架进行单元测试，覆盖：

- 每个提供商实现的 call、stream、healthCheck、listModels 方法
- 模型选择器的选择逻辑
- 提示词模板的渲染逻辑
- 成本和性能指标的计算
- 错误处理和重试逻辑

目标覆盖率: 85%+

### 属性测试

使用 fast-check 库进行属性测试，每个属性测试运行至少 100 次迭代。

属性测试应该：

- 为每个正确性属性编写对应的属性测试
- 使用智能生成器生成测试数据
- 验证属性在所有生成的输入下都成立
- 在测试代码中使用注释标记对应的设计文档属性编号

### 集成测试

测试组件之间的交互：

- 提供商与模型选择器的集成
- 模型选择器与提示词管理器的集成
- 成本追踪与使用记录的集成
- 性能监控与告警的集成

### 端到端测试

使用 Playwright 进行端到端测试，覆盖：

- 完整的 AI 调用流程（从请求到响应）
- 模型选择和切换流程
- 重试和降级流程
- 成本和性能报告生成流程

### 性能测试

使用 k6 进行负载测试：

- 并发 AI 调用测试
- 模型选择性能测试
- 提示词渲染性能测试
- 成本计算性能测试

### 安全测试

- API 密钥加密测试
- 敏感信息不记录测试
- 访问控制测试
- 审计日志测试
