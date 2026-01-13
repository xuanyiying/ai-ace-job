# Implementation Plan: Smart Model Selector

## Overview

本实现计划将智能模型选择系统分解为可执行的编码任务，按照增量开发的方式逐步实现场景模型映射、增强选择策略、模型注册表和回退机制等功能。

## Tasks

- [x] 1. 创建开源模型接口和类型定义
  - 扩展现有 ModelInfo 接口，添加开源模型特有属性
  - 定义 OpenSourceModelInfo、ScenarioConfig 等类型
  - 创建模型系列枚举（Qwen、Llama、DeepSeek、Mistral）
  - _Requirements: 2.1, 2.2_

- [x] 2. 实现场景模型映射服务
  - [x] 2.1 创建 ScenarioModelMappingService 类
    - 实现 getScenarioConfig 方法
    - 实现 updateScenarioConfig 方法
    - 实现 getRecommendedModels 方法
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 创建默认场景配置
    - 配置简历解析场景（成本优化）
    - 配置简历优化场景（质量优化）
    - 配置面试题生成场景（平衡策略）
    - 配置模拟面试对话场景（延迟优化）
    - 配置其他 Agent 场景
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 2.3 编写场景配置属性测试
    - **Property 1: 场景配置完整性**
    - **Property 2: 配置权重有效性**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 3. 增强质量优化选择策略
  - [x] 3.1 重构 QualityOptimizedStrategy 类
    - 添加可配置的质量排名列表
    - 实现基于排名的模型选择逻辑
    - 添加开源模型到质量排名（Qwen2.5-72B、DeepSeek-V3、Llama-3.1-70B）
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 实现质量降级逻辑
    - 当最高质量模型不可用时自动选择次优模型
    - _Requirements: 3.4_

  - [x] 3.3 编写质量优化策略属性测试
    - **Property 6: 质量优化选择正确性**
    - **Validates: Requirements 3.2, 3.4**

- [x] 4. 增强成本优化选择策略
  - [x] 4.1 重构 CostOptimizedStrategy 类
    - 添加最低质量阈值配置
    - 实现综合成本计算方法
    - 添加低成本开源模型推荐（Qwen2.5-7B、Llama-3.2-3B、DeepSeek-V2-Lite）
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 编写成本优化策略属性测试
    - **Property 7: 成本优化选择正确性**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 5. 增强延迟优化选择策略
  - [x] 5.1 重构 LatencyOptimizedStrategy 类
    - 添加最大延迟阈值配置
    - 实现基于历史延迟数据的选择逻辑
    - 实现阈值超限时的警告日志
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 编写延迟优化策略属性测试
    - **Property 8: 延迟优化选择正确性**
    - **Property 9: 延迟阈值处理正确性**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 6. Checkpoint - 确保所有策略测试通过
  - 运行所有单元测试和属性测试
  - 如有问题请询问用户

- [x] 7. 创建开源模型注册表
  - [x] 7.1 创建 OpenSourceModelRegistry 类
    - 实现 registerModel 方法
    - 实现 getModel、getModelsByFamily 方法
    - 实现 getAvailableModels 方法
    - 实现 updateModelStatus、updateModelMetrics 方法
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.2 添加默认开源模型配置
    - 注册 Qwen 系列模型（7B/32B/72B）
    - 注册 Llama 系列模型（3B/8B/70B）
    - 注册 DeepSeek 系列模型（V2-Lite/V3）
    - 注册 Mistral 系列模型（7B）
    - _Requirements: 2.1_

  - [x] 7.3 编写模型注册表属性测试
    - **Property 4: 模型属性存储完整性**
    - **Property 5: 模型状态切换一致性**
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 8. 增强 ModelSelector 核心逻辑
  - [x] 8.1 集成场景模型映射服务
    - 修改 selectModel 方法使用场景配置
    - 实现 selectModelForScenario 方法
    - 实现 getRecommendedModels 方法
    - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.2 实现模型回退机制
    - 实现 selectWithFallback 方法
    - 实现回退链遍历逻辑
    - 添加 Ollama 作为最终回退
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.3 增强选择日志记录
    - 记录完整的选择决策信息
    - 记录回退事件
    - _Requirements: 7.1, 8.4_

  - [x] 8.4 编写 ModelSelector 属性测试
    - **Property 3: 配置更新即时生效**
    - **Property 12: 回退链正确性**
    - **Property 13: 回退事件记录正确性**
    - **Validates: Requirements 1.4, 8.1, 8.2, 8.3, 8.4**

- [x] 9. 实现统计功能增强
  - [x] 9.1 增强 getSelectionStatistics 方法
    - 添加按场景统计的模型使用分布
    - 添加按模型统计的调用次数和成功率
    - 添加时间范围过滤支持
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 9.2 编写统计功能属性测试
    - **Property 10: 选择日志完整性**
    - **Property 11: 统计数据正确性**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 10. Checkpoint - 确保所有测试通过
  - 运行完整测试套件
  - 如有问题请询问用户

- [x] 11. 集成到 AIEngineService
  - [x] 11.1 更新 AIEngineService 使用新的 ModelSelector
    - 注入 ScenarioModelMappingService
    - 注入 OpenSourceModelRegistry
    - 更新 selectBestModel 方法
    - _Requirements: 1.4, 6.1-6.6_

  - [x] 11.2 更新模型加载逻辑
    - 从 OpenSourceModelRegistry 加载模型
    - 合并数据库配置和默认配置
    - _Requirements: 2.1_

- [x] 12. 创建模块导出和依赖注入配置
  - 更新 ai-providers 模块导出
  - 配置 NestJS 依赖注入
  - _Requirements: 1.1_

- [x] 13. Final Checkpoint - 完整集成测试
  - 运行所有单元测试、属性测试
  - 验证各场景的模型选择行为
  - 如有问题请询问用户

## Notes

- 每个任务都引用了具体的需求以确保可追溯性
- Checkpoint 任务用于确保增量验证
- 属性测试使用 fast-check 库实现
- 所有测试任务均为必需，确保代码质量
