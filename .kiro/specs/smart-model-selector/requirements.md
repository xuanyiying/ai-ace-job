# Requirements Document

## Introduction

本文档定义了AI简历优化系统的智能模型选择功能需求。该功能旨在根据不同应用场景（简历解析、优化、职位分析、面试题预测、模拟面试、知识库构建等）自动选择最合适的开源AI模型，综合考虑成本、模型能力和响应速度。

## Glossary

- **Model_Selector**: 模型选择器，负责根据场景选择最优模型的核心服务
- **Scenario**: 应用场景，如简历解析、简历优化、面试题生成等
- **Selection_Strategy**: 选择策略，定义如何从可用模型中选择最优模型的算法
- **Model_Registry**: 模型注册表，存储所有可用模型的配置和元数据
- **Quality_Score**: 质量评分，衡量模型输出质量的指标
- **Cost_Score**: 成本评分，基于token价格计算的成本指标
- **Latency_Score**: 延迟评分，衡量模型响应速度的指标
- **Scenario_Model_Mapping**: 场景模型映射，定义每个场景推荐使用的模型列表

## Requirements

### Requirement 1: 场景模型映射配置

**User Story:** As a 系统管理员, I want to 配置每个应用场景对应的推荐模型列表, so that 系统能够根据场景自动选择合适的模型。

#### Acceptance Criteria

1. THE Model_Selector SHALL 支持配置以下应用场景的模型映射：简历解析、职位描述解析、简历优化、面试题生成、匹配度计算、模拟面试对话、STAR提取、上下文分析、知识库检索
2. WHEN 配置场景模型映射时, THE Model_Registry SHALL 存储每个场景的主推荐模型和备选模型列表
3. THE Scenario_Model_Mapping SHALL 支持为每个场景配置优先级权重（成本、质量、延迟的权重比例）
4. WHEN 场景模型映射配置更新时, THE Model_Selector SHALL 在下次选择时使用新配置

### Requirement 2: 开源模型注册与管理

**User Story:** As a 系统管理员, I want to 注册和管理主流开源模型, so that 系统能够使用这些模型进行AI任务。

#### Acceptance Criteria

1. THE Model_Registry SHALL 支持注册以下开源模型系列：Qwen2.5系列（7B/32B/72B）、Llama-3系列（3B/8B/70B）、DeepSeek系列（V2-Lite/V3）、Mistral系列（7B）
2. WHEN 注册模型时, THE Model_Registry SHALL 存储模型的以下属性：名称、提供商、上下文窗口大小、输入token成本、输出token成本、平均延迟、质量评级
3. THE Model_Registry SHALL 支持启用或禁用特定模型
4. WHEN 模型健康检查失败时, THE Model_Registry SHALL 自动标记该模型为不可用状态

### Requirement 3: 质量优化选择策略增强

**User Story:** As a 用户, I want to 在需要高质量输出的场景获得最佳模型, so that 简历优化和面试总结等关键功能输出质量有保障。

#### Acceptance Criteria

1. THE Quality_Optimized_Strategy SHALL 维护一个基于实际测试的模型质量排名列表
2. WHEN 选择质量优化模型时, THE Quality_Optimized_Strategy SHALL 优先选择质量排名最高且可用的模型
3. THE Quality_Optimized_Strategy SHALL 支持配置质量排名列表，包含开源模型：Qwen2.5-72B-Instruct、DeepSeek-V3、Llama-3.1-70B-Instruct
4. IF 最高质量模型不可用, THEN THE Quality_Optimized_Strategy SHALL 自动降级到次优模型

### Requirement 4: 成本优化选择策略增强

**User Story:** As a 系统运营者, I want to 在高频低复杂度场景使用低成本模型, so that 系统运营成本得到有效控制。

#### Acceptance Criteria

1. THE Cost_Optimized_Strategy SHALL 计算每个模型的综合成本评分（输入成本 + 输出成本）
2. WHEN 选择成本优化模型时, THE Cost_Optimized_Strategy SHALL 选择成本最低且满足最低质量要求的模型
3. THE Cost_Optimized_Strategy SHALL 支持配置最低质量阈值，防止选择质量过低的模型
4. THE Cost_Optimized_Strategy SHALL 优先推荐以下低成本开源模型：Qwen2.5-7B-Instruct、Llama-3.2-3B、DeepSeek-V2-Lite

### Requirement 5: 延迟优化选择策略增强

**User Story:** As a 用户, I want to 在实时交互场景获得快速响应, so that 模拟面试对话等功能体验流畅。

#### Acceptance Criteria

1. THE Latency_Optimized_Strategy SHALL 基于历史延迟数据选择响应最快的模型
2. WHEN 选择延迟优化模型时, THE Latency_Optimized_Strategy SHALL 优先选择平均延迟最低且可用的模型
3. THE Latency_Optimized_Strategy SHALL 支持配置最大可接受延迟阈值
4. IF 所有模型延迟超过阈值, THEN THE Latency_Optimized_Strategy SHALL 选择延迟最低的模型并记录警告日志

### Requirement 6: 场景特定模型推荐

**User Story:** As a 开发者, I want to 为每个业务场景获得最优模型推荐, so that 不同场景都能使用最合适的模型。

#### Acceptance Criteria

1. WHEN 简历解析场景调用时, THE Model_Selector SHALL 推荐成本优化模型（Qwen2.5-7B或Llama-3.2-3B）
2. WHEN 简历优化场景调用时, THE Model_Selector SHALL 推荐质量优化模型（Qwen2.5-72B或DeepSeek-V3）
3. WHEN 面试题生成场景调用时, THE Model_Selector SHALL 推荐平衡策略模型（Qwen2.5-32B或Llama-3.1-8B）
4. WHEN 模拟面试对话场景调用时, THE Model_Selector SHALL 推荐延迟优化模型（Qwen2.5-7B或Mistral-7B）
5. WHEN 匹配度计算场景调用时, THE Model_Selector SHALL 推荐平衡策略模型
6. WHEN 知识库检索场景调用时, THE Model_Selector SHALL 推荐成本优化模型

### Requirement 7: 模型选择日志与统计

**User Story:** As a 系统管理员, I want to 查看模型选择的统计数据, so that 我能够分析和优化模型配置。

#### Acceptance Criteria

1. THE Model_Selector SHALL 记录每次模型选择的决策信息：场景、选中模型、可用模型数量、使用的策略
2. THE Model_Selector SHALL 提供按场景统计的模型使用分布
3. THE Model_Selector SHALL 提供按模型统计的调用次数和成功率
4. WHEN 查询统计数据时, THE Model_Selector SHALL 支持按时间范围过滤

### Requirement 8: 模型回退机制

**User Story:** As a 用户, I want to 在首选模型不可用时自动使用备选模型, so that 系统功能不会因单个模型故障而中断。

#### Acceptance Criteria

1. WHEN 首选模型不可用时, THE Model_Selector SHALL 自动选择同场景的备选模型
2. THE Model_Selector SHALL 支持配置每个场景的回退模型链
3. IF 所有配置模型都不可用, THEN THE Model_Selector SHALL 尝试使用本地Ollama模型作为最终回退
4. WHEN 发生模型回退时, THE Model_Selector SHALL 记录回退事件并发送告警通知
