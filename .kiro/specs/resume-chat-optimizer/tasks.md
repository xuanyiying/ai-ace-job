# 实现计划：简历对话优化功能

## 概述

本实现计划基于现有项目架构，复用已有的简历上传、解析和 PDF 生成功能，新增简历优化 WebSocket 流式输出和 Markdown 转 PDF 功能。

## 任务列表

- [x] 1. 实现 WebSocket Gateway
  - [x] 1.1 安装 WebSocket 依赖
    - 安装 `@nestjs/websockets` 和 `@nestjs/platform-socket.io`
    - 安装 `socket.io` 和 `@types/socket.io`
    - _Requirements: 2.2_
  - [x] 1.2 创建 ResumeOptimizerGateway
    - 创建 `packages/backend/src/resume-optimizer/resume-optimizer.gateway.ts`
    - 实现 `@SubscribeMessage('optimize')` 处理器
    - 实现 `@SubscribeMessage('cancel')` 取消处理器
    - 配置 CORS 和命名空间
    - _Requirements: 2.2_
  - [x] 1.3 编写 WebSocket Gateway 单元测试
    - 测试消息处理
    - 测试流式数据传输
    - _Requirements: 2.2_

- [x] 2. 实现简历优化服务
  - [x] 2.1 添加简历内容优化提示词模板
    - 修改 `packages/backend/src/ai-providers/config/predefined-templates.ts`
    - 添加 `resume_content_optimization` 场景的中英文模板
    - 模板用于直接优化简历内容并输出 Markdown 格式
    - 复用已有的 `resume-optimization` 场景配置
    - _Requirements: 2.1, 2.5_
  - [x] 2.2 创建 ResumeOptimizerService
    - 创建 `packages/backend/src/resume-optimizer/resume-optimizer.service.ts`
    - 实现 `optimizeResume()` 流式生成方法
    - 实现语义分割逻辑（按段落/句子分批传输）
    - 使用新添加的提示词模板
    - _Requirements: 2.1, 2.5_
  - [x] 2.3 编写属性测试：流式输出完整性
    - **Property 4: 流式输出完整性**
    - **Validates: Requirements 2.2**
  - [x] 2.4 编写属性测试：简历优化信息保持
    - **Property 3: 简历优化信息保持**
    - **Validates: Requirements 2.5**

- [-] 3. 创建 ResumeOptimizerModule
  - [x] 3.1 创建模块并注册
    - 创建 `packages/backend/src/resume-optimizer/resume-optimizer.module.ts`
    - 导入 AIEngineService 依赖
    - 注册 Gateway 和 Service
    - 注册到 AppModule
    - _Requirements: 2.1_

- [x] 4. 完善 PDF 生成功能
  - [x] 4.1 在 GenerateService 中添加 Markdown 转 PDF 方法
    - 修改 `packages/backend/src/generate/generate.service.ts`
    - 实现 `generatePDFFromMarkdown()` 方法
    - 使用 Puppeteer 渲染 Markdown 为 PDF
    - _Requirements: 3.1, 3.5_
  - [x] 4.2 在 GenerateController 中添加新端点
    - 添加 `POST /generate/pdf/from-markdown` 端点
    - 返回临时下载链接和过期时间
    - _Requirements: 3.1, 3.2_
  - [x] 4.3 编写属性测试：PDF 生成有效性
    - **Property 5: PDF 生成有效性**
    - **Validates: Requirements 3.1**
    - **Status: PASSED** - Property test validates that PDF generation from Markdown content produces valid results with correct structure and 24-hour expiration

- [ ] 5. Checkpoint - 后端功能验证
  - 确保所有后端测试通过
  - 验证 WebSocket 流式输出正常工作
  - 验证 PDF 生成功能正常
  - 如有问题请询问用户

- [x] 6. 安装前端 WebSocket 依赖
  - [x] 6.1 安装 socket.io-client
    - 安装 `socket.io-client` 包
    - _Requirements: 2.2_

- [x] 7. 实现前端 WebSocket Hook
  - [x] 7.1 创建 useStreamingOptimization Hook
    - 创建 `packages/frontend/src/hooks/useStreamingOptimization.ts`
    - 实现 WebSocket 连接管理
    - 实现流式状态管理（content, isStreaming, error）
    - 实现取消优化功能
    - _Requirements: 2.2, 2.3_
  - [x] 7.2 编写 Hook 单元测试
    - 测试流式状态管理
    - 测试错误处理
    - _Requirements: 2.2_

- [x] 8. 实现前端流式渲染组件
  - [x] 8.1 创建 StreamingMarkdownBubble 组件
    - 创建 `packages/frontend/src/components/StreamingMarkdownBubble.tsx`
    - 实现 Markdown 实时渲染
    - 实现自动滚动到最新内容
    - 添加打字指示器动画
    - _Requirements: 2.3_
  - [x] 8.2 创建 PDFDownloadCard 组件
    - 创建 `packages/frontend/src/components/PDFDownloadCard.tsx`
    - 显示下载链接和过期时间
    - 提供重试按钮
    - _Requirements: 3.2, 3.4_

- [x] 9. 集成到 ChatPage
  - [x] 9.1 添加简历优化对话流程
    - 修改 `packages/frontend/src/pages/ChatPage.tsx`
    - 集成文件上传后自动触发优化
    - 集成流式输出显示
    - 添加确认按钮和 PDF 生成流程
    - _Requirements: 1.1, 1.4, 2.4, 3.1_
  - [x] 9.2 添加前端服务调用
    - 创建 `packages/frontend/src/services/resumeOptimizerService.ts`
    - 封装 PDF 生成 API 调用
    - _Requirements: 3.1_

- [x] 10. 添加国际化支持
  - [x] 10.1 更新中文语言包
    - 修改 `packages/frontend/src/locales/zh-CN.json`
    - 添加简历优化相关文案
    - _Requirements: 1.5, 1.6, 3.3, 3.4_
  - [x] 10.2 更新英文语言包
    - 修改 `packages/frontend/src/locales/en-US.json`
    - 添加简历优化相关文案
    - _Requirements: 1.5, 1.6, 3.3, 3.4_

- [ ] 11. 实现临时文件清理
  - [ ] 11.1 添加定时清理任务
    - 在 GenerateService 中添加 `cleanupExpiredFiles()` 方法
    - 使用 NestJS Schedule 模块设置定时任务
    - 清理 24 小时后过期的临时 PDF 文件
    - _Requirements: 3.6_

- [ ] 12. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 验证完整的简历优化流程
  - 验证 PDF 生成和下载功能
  - 如有问题请询问用户

## 备注

- 所有任务都必须完成，包括测试任务
- 每个任务都引用了具体的需求条款以确保可追溯性
- 属性测试验证核心正确性属性
- Checkpoint 任务用于阶段性验证
- 使用 WebSocket (Socket.IO) 实现流式输出，支持双向通信和取消功能
