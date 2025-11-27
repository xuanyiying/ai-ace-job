# 多大模型厂商集成 - 需求文档

## 简介

多大模型厂商集成功能旨在扩展系统的 AI 引擎，支持接入多个大模型厂商（包括阿里千问系列、DeepSeek、Google Gemini、OpenAI ChatGPT 以及本地 Ollama 部署的模型）。系统需要提供统一的 AI 接口、灵活的模型选择机制、场景化的提示词模板管理，以及基于不同场景自动选择最优模型的能力。

## 术语表

- **AI 提供商**: 提供大语言模型服务的厂商（如 OpenAI、阿里、DeepSeek 等）
- **模型提供商**: 具体的 AI 提供商实现（Provider）
- **提示词模板**: 针对特定任务的预定义提示词结构
- **场景**: 系统中的具体使用场景（如简历解析、优化建议生成等）
- **模型配置**: 每个模型的连接参数、API 密钥、模型名称等配置信息
- **降级策略**: 当首选模型不可用时的备选方案
- **成本**: 调用 AI 的费用（按 token 计算）
- **延迟**: AI 调用的响应时间
- **阿里千问**: 阿里云提供的大语言模型系列（如 Qwen-Max、Qwen-Plus 等）
- **DeepSeek**: DeepSeek 公司提供的大语言模型
- **Gemini**: Google 提供的大语言模型
- **ChatGPT**: OpenAI 提供的大语言模型（GPT-4、GPT-3.5 等）
- **Ollama**: 本地部署的开源大语言模型运行框架
- **Token**: 模型处理的最小文本单位，用于计费和限制

## 需求

### 需求 1: 多模型提供商支持

**用户故事**: 作为系统管理员，我希望系统能够支持多个 AI 提供商，以便根据成本、性能和可用性灵活选择模型。

#### 验收标准

1. THE 系统 SHALL 支持接入阿里千问系列模型（Qwen-Max、Qwen-Plus、Qwen-Turbo）
2. THE 系统 SHALL 支持接入 DeepSeek 模型（DeepSeek-Chat、DeepSeek-Coder）
3. THE 系统 SHALL 支持接入 Google Gemini 模型（Gemini-Pro、Gemini-Vision）
4. THE 系统 SHALL 支持接入 OpenAI ChatGPT 模型（GPT-4、GPT-3.5-Turbo）
5. THE 系统 SHALL 支持接入本地 Ollama 部署的模型（Llama 2、Mistral 等）
6. WHEN 系统启动时 THEN 系统 SHALL 加载所有已配置的模型提供商
7. WHEN 模型提供商配置发生变化 THEN 系统 SHALL 动态更新可用模型列表而无需重启

### 需求 2: 统一的 AI 接口

**用户故事**: 作为开发人员，我希望有统一的 AI 接口来调用不同厂商的模型，以便简化代码实现和维护。

#### 验收标准

1. THE 系统 SHALL 定义统一的 AI 提供商接口（Provider Interface）
2. THE 系统 SHALL 为每个模型提供商实现该接口
3. WHEN 调用 AI 接口时 THEN 系统 SHALL 接受统一的请求格式（包括 prompt、temperature、max_tokens 等参数）
4. WHEN AI 返回响应时 THEN 系统 SHALL 返回统一的响应格式（包括 content、usage、model 等字段）
5. THE 系统 SHALL 在接口中支持流式响应（streaming）和非流式响应两种模式
6. THE 系统 SHALL 为每个提供商实现错误处理和异常转换，确保错误信息格式一致

### 需求 3: 模型配置管理

**用户故事**: 作为系统管理员，我希望能够集中管理所有 AI 模型的配置信息，包括 API 密钥、端点、模型名称等。

#### 验收标准

1. THE 系统 SHALL 支持通过环境变量配置 AI 提供商的 API 密钥和端点
2. THE 系统 SHALL 支持通过配置文件（如 YAML）定义模型配置
3. WHEN 系统启动时 THEN 系统 SHALL 验证所有已配置模型的连接可用性
4. WHEN 模型连接失败时 THEN 系统 SHALL 记录详细错误信息并将该模型标记为不可用
5. THE 系统 SHALL 支持为每个模型配置默认参数（如 temperature、max_tokens、top_p 等）
6. THE 系统 SHALL 支持为每个模型配置成本参数（输入 token 价格、输出 token 价格）
7. THE 系统 SHALL 支持为每个模型配置速率限制（每分钟请求数、每天请求数）

### 需求 4: 场景化提示词模板管理

**用户故事**: 作为开发人员，我希望能够为不同场景定义和管理提示词模板，以便在调用 AI 时使用最优的提示词。

#### 验收标准

1. THE 系统 SHALL 支持定义多个提示词模板，每个模板对应一个特定场景
2. THE 系统 SHALL 为以下场景提供预定义的提示词模板：
   - 简历内容解析（Resume Parsing）
   - 职位描述解析（Job Description Parsing）
   - 简历优化建议生成（Resume Optimization）
   - 面试问题生成（Interview Question Generation）
   - 匹配度评分（Match Score Calculation）
3. WHEN 使用提示词模板时 THEN 系统 SHALL 支持使用变量占位符（如 {resume_content}、{job_description}）
4. WHEN 渲染提示词模板时 THEN 系统 SHALL 将占位符替换为实际值
5. THE 系统 SHALL 支持为不同的模型提供商定制提示词模板
6. THE 系统 SHALL 支持在运行时动态加载和更新提示词模板
7. WHEN 提示词模板包含敏感信息时 THEN 系统 SHALL 对其进行加密存储

### 需求 5: 基于场景的模型选择策略

**用户故事**: 作为系统架构师，我希望系统能够根据不同场景自动选择最优的 AI 模型，以便在成本、性能和质量之间取得平衡。

#### 验收标准

1. THE 系统 SHALL 为每个场景定义模型选择策略（如优先级、成本优先、速度优先等）
2. WHEN 执行简历解析任务时 THEN 系统 SHALL 优先选择成本最低的可用模型
3. WHEN 执行优化建议生成任务时 THEN 系统 SHALL 优先选择质量最高的可用模型（如 GPT-4）
4. WHEN 执行面试问题生成任务时 THEN 系统 SHALL 优先选择速度最快的可用模型
5. WHEN 首选模型不可用时 THEN 系统 SHALL 自动切换到备选模型
6. WHEN 所有模型都不可用时 THEN 系统 SHALL 返回降级响应或缓存的结果
7. THE 系统 SHALL 记录每次模型选择的决策过程和原因

### 需求 6: 模型调用的重试和降级机制

**用户故事**: 作为系统管理员，我希望系统具有健壮的重试和降级机制，以提高系统的可靠性和可用性。

#### 验收标准

1. WHEN AI 调用失败时 THEN 系统 SHALL 自动重试最多 3 次，使用指数退避策略
2. WHEN 重试仍然失败时 THEN 系统 SHALL 尝试使用备选模型
3. WHEN 所有模型都失败时 THEN 系统 SHALL 返回预定义的降级响应
4. THE 系统 SHALL 为不同类型的错误定义不同的重试策略（如网络错误重试，认证错误不重试）
5. THE 系统 SHALL 记录所有重试和降级事件到日志中
6. WHEN 降级响应被使用时 THEN 系统 SHALL 在响应中标记降级状态

### 需求 7: 成本和使用量追踪

**用户故事**: 作为产品经理，我希望能够追踪每个 AI 模型的使用成本和调用次数，以便进行成本优化和预算管理。

#### 验收标准

1. WHEN AI 被调用时 THEN 系统 SHALL 记录调用的模型名称、输入 token 数、输出 token 数和成本
2. THE 系统 SHALL 支持按模型、按场景、按用户统计使用成本
3. THE 系统 SHALL 支持按时间范围（日、周、月）生成成本报告
4. WHEN 成本超过预设阈值时 THEN 系统 SHALL 发送告警通知
5. THE 系统 SHALL 提供 API 端点查询成本和使用量统计数据
6. THE 系统 SHALL 支持导出成本报告为 CSV 或 JSON 格式

### 需求 8: 模型性能监控

**用户故事**: 作为系统管理员，我希望能够监控每个 AI 模型的性能指标，以便及时发现和解决问题。

#### 验收标准

1. WHEN AI 被调用时 THEN 系统 SHALL 记录调用的响应时间（延迟）
2. THE 系统 SHALL 计算每个模型的平均响应时间、最大响应时间和最小响应时间
3. THE 系统 SHALL 计算每个模型的成功率和失败率
4. WHEN 模型的失败率超过 10% 时 THEN 系统 SHALL 发送告警通知
5. WHEN 模型的平均响应时间超过 30 秒时 THEN 系统 SHALL 发送告警通知
6. THE 系统 SHALL 提供仪表板展示各模型的性能指标
7. THE 系统 SHALL 支持按时间范围查询性能指标

### 需求 9: 本地 Ollama 模型支持

**用户故事**: 作为开发人员，我希望系统能够支持本地部署的 Ollama 模型，以便在离线环境或成本受限的场景下使用。

#### 验收标准

1. THE 系统 SHALL 支持连接到本地 Ollama 服务（默认地址 http://localhost:11434）
2. WHEN 系统启动时 THEN 系统 SHALL 自动发现 Ollama 上已安装的模型列表
3. WHEN 调用 Ollama 模型时 THEN 系统 SHALL 使用与其他提供商相同的统一接口
4. THE 系统 SHALL 支持配置 Ollama 服务的自定义地址和端口
5. WHEN Ollama 服务不可用时 THEN 系统 SHALL 将其标记为不可用并尝试使用其他模型
6. THE 系统 SHALL 支持在 Ollama 上运行的任何开源模型（Llama 2、Mistral、Neural Chat 等）

### 需求 10: 提示词版本管理

**用户故事**: 作为开发人员，我希望能够管理提示词模板的版本，以便追踪提示词的演变和进行 A/B 测试。

#### 验收标准

1. WHEN 提示词模板被修改时 THEN 系统 SHALL 创建新版本并保留历史版本
2. THE 系统 SHALL 为每个提示词版本记录修改时间、修改者和修改原因
3. WHEN 调用 AI 时 THEN 系统 SHALL 支持指定使用特定版本的提示词
4. THE 系统 SHALL 支持在不同版本的提示词之间进行 A/B 测试
5. THE 系统 SHALL 支持回滚到之前的提示词版本

### 需求 11: 错误处理和日志记录

**用户故事**: 作为开发人员，我希望系统能够提供详细的错误信息和日志，以便快速定位和解决问题。

#### 验收标准

1. WHEN AI 调用失败时 THEN 系统 SHALL 记录详细的错误信息，包括错误代码、错误消息、堆栈跟踪等
2. THE 系统 SHALL 为不同的错误类型定义特定的错误代码（如 PROVIDER_UNAVAILABLE、RATE_LIMIT_EXCEEDED 等）
3. THE 系统 SHALL 记录所有 AI 调用的详细日志，包括请求参数、响应内容、耗时等
4. WHEN 日志级别为 DEBUG 时 THEN 系统 SHALL 记录完整的请求和响应内容
5. THE 系统 SHALL 支持按模型、按场景、按时间范围查询日志
6. THE 系统 SHALL 定期清理过期的日志文件

### 需求 12: 安全性和访问控制

**用户故事**: 作为系统管理员，我希望系统能够安全地管理 AI 提供商的 API 密钥，并控制对 AI 功能的访问。

#### 验收标准

1. THE 系统 SHALL 使用加密方式存储所有 AI 提供商的 API 密钥
2. THE 系统 SHALL 不在日志中记录 API 密钥或敏感信息
3. THE 系统 SHALL 支持定期轮换 API 密钥
4. THE 系统 SHALL 支持为不同用户设置不同的 AI 模型访问权限
5. WHEN 用户尝试调用未授权的模型时 THEN 系统 SHALL 拒绝请求并记录安全事件
6. THE 系统 SHALL 支持审计日志，记录所有 API 密钥的访问和修改操作
