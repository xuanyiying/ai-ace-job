# Interview AI Backend

NestJS backend service for the Interview AI platform.

## 📁 项目结构

```
src/
├── agent/              # AI Agent 服务 (LangChain集成)
│   ├── adapters/       # 适配器层
│   ├── agents/         # Agent 实现
│   ├── controllers/    # API 控制器
│   ├── services/       # 核心服务
│   ├── tools/          # LangChain 工具
│   └── workflows/      # 工作流定义
├── ai-providers/       # AI 模型提供商抽象层
│   ├── config/         # 配置管理
│   ├── factory/        # 提供商工厂
│   ├── providers/      # 具体提供商实现
│   ├── selector/       # 模型选择器
│   └── tracking/       # 使用量追踪
├── auth/               # 认证模块 (JWT/OAuth)
├── chat/               # WebSocket 实时通信
├── common/             # 公共模块
│   ├── decorators/     # 自定义装饰器
│   ├── middleware/     # 中间件
│   ├── validators/     # 验证器
│   └── exceptions/     # 异常处理
├── conversation/       # 对话管理
├── email/              # 邮件服务
├── health/             # 健康检查
├── interview/          # 面试模拟模块
├── invitation/         # 邀请码管理
├── job/                # 职位管理
├── logger/             # 日志系统
├── monitoring/         # 监控指标
├── payment/            # 支付集成 (Stripe/Paddle)
├── prisma/             # 数据库 ORM
├── quota/              # 配额管理
├── redis/              # 缓存服务
├── resume/             # 简历管理核心模块
├── storage/            # 文件存储 (S3/OSS/MinIO)
├── tasks/              # 后台任务
├── types/              # TypeScript 类型定义
└── user/               # 用户管理
```

## 🗄️ 数据库模型

| 模型                                  | 说明       |
| ------------------------------------- | ---------- |
| `User`                                | 用户账户   |
| `Session`/`Account`                   | OAuth 会话 |
| `Resume`                              | 简历文件   |
| `Job`                                 | 职位信息   |
| `Optimization`                        | 优化结果   |
| `InterviewSession`/`InterviewMessage` | 面试模拟   |
| `Conversation`/`Message`              | 对话历史   |
| `ModelConfig`/`PromptTemplate`        | AI 配置    |
| `UsageRecord`/`PerformanceMetrics`    | 使用统计   |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 安装

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env

# 初始化数据库
npx prisma generate
npx prisma migrate dev

# 启动开发服务
pnpm dev
```

### API 文档

启动后访问: <http://localhost:3000/api/docs>

## 🔧 核心模块说明

### AI Providers (`ai-providers/`)

多模型抽象层，支持：

- OpenAI GPT-4/3.5
- Google Gemini
- Anthropic Claude
- 自定义模型

**关键文件**:

- `ai-engine.service.ts` - 统一 AI 调用入口
- `selector/` - 场景化模型选择
- `tracking/` - 成本和用量追踪

### Agent (`agent/`)

基于 LangChain 的 AI Agent 系统：

- `services/langchain-*.ts` - LangChain 适配器
- `tools/` - 工具函数（简历分析、网页抓取等）
- `workflows/` - 复杂任务工作流

### Resume (`resume/`)

简历处理核心：

- 文件上传与解析 (PDF/DOCX)
- AI 内容分析
- 版本控制
- 去重检测 (MD5)

### Interview (`interview/`)

AI 面试模拟：

- 问题生成
- 实时对话
- 评分与反馈

## 🧪 测试

```bash
# 单元测试
pnpm test

# 测试覆盖率
pnpm test:cov

# E2E 测试
pnpm test:e2e
```

E2E 测试文件位于 `src/e2e/`：

- `complete-flow.e2e.spec.ts` - 完整用户流程
- `interview-flow.e2e.spec.ts` - 面试模块
- `security-and-errors.e2e.spec.ts` - 安全测试

## 📊 监控

- **健康检查**: `GET /api/v1/health`
- **Prometheus 指标**: `/metrics`
- **Grafana 面板**: `grafana/` 目录

## 📖 更多文档

- [简历解析指南](./docs/RESUME_PARSING_GUIDE.md)
- [AI 配置说明](./AI-config.example.yaml)
- [API 规范](./docs/)
