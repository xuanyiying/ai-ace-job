# Implementation Plan: Resume Deduplication and Conversation Persistence

## Overview

本实现计划将简历去重和会话持久化功能分解为可执行的编码任务。实现将基于现有的 NestJS 后端架构，使用 Prisma ORM 和 PostgreSQL 数据库。

## Tasks

- [ ] 1. 数据库模型扩展
  - [ ] 1.1 更新 Resume 模型添加去重相关字段
    - 在 `packages/backend/prisma/schema.prisma` 中添加 `fileMd5`、`extractedText`、`conversationId` 字段
    - 添加 `@@index([userId, fileMd5])` 索引用于去重查询
    - _Requirements: 1.5_
  - [ ] 1.2 生成并运行数据库迁移
    - 运行 `npx prisma migrate dev --name add_resume_deduplication_fields`
    - 验证迁移成功应用
    - _Requirements: 1.5_

- [ ] 2. 实现简历 MD5 去重功能
  - [ ] 2.1 实现 MD5 计算和去重检测方法
    - 在 `ResumeService` 中添加 `calculateFileMd5(buffer: Buffer): string` 方法
    - 添加 `findByUserIdAndMd5(userId: string, md5: string): Promise<Resume | null>` 方法
    - _Requirements: 1.1, 1.2_
  - [ ] 2.2 修改 uploadResume 方法支持去重
    - 在上传前计算 MD5 并检查是否存在
    - 返回 `ResumeUploadResult` 包含 `isDuplicate` 标志
    - 如果重复，返回已存在的记录和已解析内容
    - _Requirements: 1.2, 1.3, 1.4, 3.2_
  - [ ]\* 2.3 编写 MD5 去重属性测试
    - **Property 1: MD5 Hash Consistency**
    - **Property 2: Deduplication Correctness**
    - **Property 3: New Resume Creation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 3. 实现获取最新简历功能
  - [ ] 3.1 实现 getLatestResume 方法
    - 优先返回 `isPrimary=true` 的简历
    - 其次返回 `parseStatus=COMPLETED` 且最近更新的简历
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 3.2 实现 getLatestParsedContent 方法
    - 获取最新简历的解析内容
    - 如果没有已解析简历，返回 null 或抛出适当错误
    - _Requirements: 2.1, 2.4_
  - [ ]\* 3.3 编写最新简历获取属性测试
    - **Property 4: Latest Resume Priority**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 4. 增强简历解析内容持久化
  - [ ] 4.1 修改 parseResume 方法保存提取文本
    - 将 `extractedText` 保存到 Resume 记录
    - 确保 `parsedData` 和 `extractedText` 都被持久化
    - _Requirements: 3.1, 3.3_
  - [ ] 4.2 实现版本号递增逻辑
    - 更新解析内容时自动递增 `version` 字段
    - _Requirements: 3.4_
  - [ ]\* 4.3 编写解析内容持久化属性测试
    - **Property 5: Parsed Content Persistence**
    - **Property 6: Duplicate Returns Cached Content**
    - **Property 7: Version Increment on Update**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ] 5. Checkpoint - 简历功能验证
  - 确保所有简历相关测试通过
  - 验证去重功能正常工作
  - 如有问题请询问用户

- [ ] 6. 增强会话持久化功能
  - [ ] 6.1 验证现有会话持久化实现
    - 检查 `ConversationService.createConversation` 是否正确持久化所有字段
    - 确保 `userId`、`title`、`createdAt`、`isActive` 都被保存
    - _Requirements: 4.1, 4.2_
  - [ ] 6.2 增强会话检索功能
    - 确保 `listConversations` 返回所有活跃会话
    - 验证软删除逻辑正确工作
    - _Requirements: 4.3, 4.5_
  - [ ]\* 6.3 编写会话持久化属性测试
    - **Property 8: Conversation Persistence**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 7. 增强消息持久化功能
  - [ ] 7.1 验证消息持久化实现
    - 检查 `addMessage` 是否正确保存所有字段
    - 确保 `conversationId`、`userId`、`role`、`content`、`createdAt` 都被保存
    - _Requirements: 5.1, 5.2_
  - [ ] 7.2 验证消息检索排序
    - 确保 `getMessages` 按 `createdAt` 升序返回
    - _Requirements: 5.3_
  - [ ] 7.3 验证会话元数据更新
    - 确保添加消息时更新 `lastMessageAt` 和 `messageCount`
    - _Requirements: 5.6_
  - [ ]\* 7.4 编写消息持久化属性测试
    - **Property 9: Message Persistence and Order**
    - **Property 10: Conversation Metadata Update**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.6**

- [ ] 8. 实现简历与会话关联
  - [ ] 8.1 修改 uploadResume 支持 conversationId 参数
    - 将 `conversationId` 保存到 Resume 记录
    - _Requirements: 6.1_
  - [ ] 8.2 实现 addOptimizationResultMessage 方法
    - 创建包含 `resumeId` 和 `optimizationId` 的消息
    - 在 `metadata` 中存储关联信息
    - _Requirements: 6.2, 6.3_
  - [ ] 8.3 实现 getConversationWithRelations 方法
    - 获取会话及其关联的简历和优化记录
    - _Requirements: 6.4_
  - [ ]\* 8.4 编写简历-会话关联属性测试
    - **Property 11: Resume-Conversation Association**
    - **Property 12: Optimization Message Linking**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 9. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 验证端到端流程正常工作
  - 如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- 现有的 `ConversationService` 和 `ChatGateway` 已实现基本的持久化功能，主要需要验证和增强
