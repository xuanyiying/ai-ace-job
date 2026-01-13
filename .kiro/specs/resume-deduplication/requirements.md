# Requirements Document

## Introduction

本功能旨在实现会话和消息的持久化存储，以及简历上传的去重机制。系统需要将用户的聊天会话和消息持久化到 PostgreSQL 数据库，同时在用户上传简历时通过 MD5 哈希值进行去重检测，避免重复上传相同文件，并能够自动获取用户最新的简历内容进行优化。

## Glossary

- **Resume_Service**: 简历服务，负责简历的上传、解析、存储和去重检测
- **Conversation_Service**: 会话服务，负责会话和消息的创建、存储和检索
- **MD5_Hash**: 文件的 MD5 哈希值，用于唯一标识文件内容
- **Parsed_Content**: 简历解析后的结构化内容，包含个人信息、工作经历、教育背景等
- **Deduplication_System**: 去重系统，通过 MD5 比对检测重复文件

## Requirements

### Requirement 1: 简历 MD5 去重检测

**User Story:** As a user, I want the system to detect duplicate resume uploads, so that I don't waste time and resources uploading the same file multiple times.

#### Acceptance Criteria

1. WHEN a user uploads a resume file, THE Resume_Service SHALL calculate the MD5 hash of the file content
2. WHEN the MD5 hash matches an existing resume for the same user, THE Resume_Service SHALL return the existing resume record instead of creating a new one
3. WHEN the MD5 hash matches an existing resume, THE Resume_Service SHALL return a flag indicating the resume was deduplicated
4. WHEN the MD5 hash does not match any existing resume for the user, THE Resume_Service SHALL create a new resume record with the calculated MD5 hash
5. THE Resume model SHALL include a fileMd5 field to store the MD5 hash value

### Requirement 2: 获取用户最新简历内容

**User Story:** As a user, I want the system to automatically use my latest resume content for optimization, so that I don't need to re-upload my resume every time.

#### Acceptance Criteria

1. WHEN a user requests resume optimization without uploading a new file, THE Resume_Service SHALL retrieve the user's most recent resume with parsed content
2. WHEN retrieving the latest resume, THE Resume_Service SHALL prioritize resumes marked as primary
3. IF no primary resume exists, THEN THE Resume_Service SHALL return the most recently updated resume with completed parsing status
4. WHEN no parsed resume exists for the user, THE Resume_Service SHALL return an appropriate error message

### Requirement 3: 简历解析内容持久化

**User Story:** As a user, I want my parsed resume content to be saved, so that I can reuse it without re-parsing.

#### Acceptance Criteria

1. WHEN a resume is successfully parsed, THE Resume_Service SHALL persist the parsed content to the database
2. WHEN a duplicate resume is detected, THE Resume_Service SHALL return the previously parsed content if available
3. THE Resume_Service SHALL store the original extracted text along with the structured parsed data
4. WHEN updating parsed content, THE Resume_Service SHALL increment the version number

### Requirement 4: 会话持久化

**User Story:** As a user, I want my chat conversations to be saved to the database, so that I can access them across sessions and devices.

#### Acceptance Criteria

1. WHEN a user starts a new conversation, THE Conversation_Service SHALL create and persist a conversation record to PostgreSQL immediately
2. WHEN a conversation is created, THE Conversation_Service SHALL store the userId, title, creation timestamp, and active status
3. WHEN a user returns to the application, THE Conversation_Service SHALL retrieve all active conversations for that user
4. WHEN a conversation is updated (title change, new message), THE Conversation_Service SHALL persist the changes immediately
5. WHEN a conversation is deleted, THE Conversation_Service SHALL mark it as inactive (soft delete) in the database

### Requirement 5: 消息持久化

**User Story:** As a user, I want all my chat messages to be reliably saved, so that I can view my complete conversation history.

#### Acceptance Criteria

1. WHEN a new message is added to a conversation, THE Conversation_Service SHALL persist it to the PostgreSQL database immediately
2. WHEN a message is created, THE Conversation_Service SHALL store the conversationId, userId, role, content, and timestamp
3. WHEN a user loads a conversation, THE Conversation_Service SHALL retrieve all messages in chronological order
4. THE Message model SHALL support storing attachments metadata including resume references
5. WHEN a resume optimization result is generated, THE Conversation_Service SHALL store it as a message with appropriate metadata
6. WHEN messages are persisted, THE Conversation_Service SHALL update the parent conversation's lastMessageAt and messageCount fields

### Requirement 6: 简历与会话关联

**User Story:** As a user, I want my resume optimization results to be linked to my conversations, so that I can track the context of each optimization.

#### Acceptance Criteria

1. WHEN a resume is uploaded during a conversation, THE Resume_Service SHALL record the conversation ID in the resume metadata
2. WHEN optimization results are generated, THE Conversation_Service SHALL create a message linking to the resume and optimization records
3. THE Message metadata SHALL include references to resumeId and optimizationId when applicable
4. WHEN a user views a conversation, THE Conversation_Service SHALL be able to retrieve associated resume and optimization details
