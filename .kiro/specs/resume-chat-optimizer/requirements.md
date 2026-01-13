# 需求文档

## 简介

简历对话优化功能是一个基于对话界面的简历优化流程，用户可以通过直接输入文本或上传文件（PDF/Word）的方式提交简历内容，系统解析后调用大模型进行优化，并以 Markdown 格式流式输出优化结果，最终支持将优化后的简历导出为 PDF 文件供用户下载。

## 术语表

- **Chat_System**: 对话系统，负责管理用户与 AI 之间的消息交互
- **Document_Parser**: 文档解析器，负责解析 PDF 和 Word 文件内容
- **Resume_Optimizer**: 简历优化器，调用大模型对简历内容进行优化
- **PDF_Generator**: PDF 生成器，将 Markdown 格式内容转换为 PDF 文件
- **Message_Bubble**: 消息气泡，对话界面中展示单条消息的 UI 组件
- **Streaming_Output**: 流式输出，AI 响应以逐字/逐段方式实时展示

## 需求

### 需求 1: 简历内容输入

**用户故事:** 作为求职者，我希望能够通过多种方式输入简历内容，以便系统能够获取我的简历信息进行优化。

#### 验收标准

1. WHEN 用户在对话输入框中直接输入文本并发送 THEN Chat_System SHALL 立即将原始文本作为用户消息展示在对话框中
2. WHEN 用户上传 PDF 格式的简历文件 THEN Document_Parser SHALL 解析文档内容并提取文本
3. WHEN 用户上传 Word（.doc/.docx）格式的简历文件 THEN Document_Parser SHALL 解析文档内容并提取文本
4. WHEN 文档解析完成 THEN Chat_System SHALL 将解析后的简历内容作为用户消息展示在对话框中
5. WHEN 文档解析过程中 THEN Chat_System SHALL 显示加载状态指示器
6. IF 文档解析失败 THEN Chat_System SHALL 在对话框中显示明确的错误提示信息

### 需求 2: 简历内容优化

**用户故事:** 作为求职者，我希望系统能够智能优化我的简历内容，以便提升简历的专业性和竞争力。

#### 验收标准

1. WHEN Chat_System 接收到简历内容 THEN Resume_Optimizer SHALL 调用大模型对简历进行优化
2. WHEN Resume_Optimizer 生成优化结果 THEN Chat_System SHALL 以 Markdown 格式流式输出优化后的简历内容
3. WHILE 流式输出进行中 THEN Chat_System SHALL 实时渲染 Markdown 内容并展示在对话框中
4. WHEN 流式输出完成 THEN Chat_System SHALL 在优化结果下方显示确认按钮
5. THE Resume_Optimizer SHALL 保持简历的核心信息不变，仅优化表达方式和格式

### 需求 3: PDF 导出

**用户故事:** 作为求职者，我希望能够将优化后的简历导出为 PDF 文件，以便用于求职申请。

#### 验收标准

1. WHEN 用户点击确认按钮 THEN PDF_Generator SHALL 将 Markdown 格式的简历内容转换为 PDF 文件
2. WHEN PDF 生成完成 THEN Chat_System SHALL 提供临时下载链接供用户下载
3. WHEN PDF 生成过程中 THEN Chat_System SHALL 显示生成进度指示器
4. IF PDF 生成失败 THEN Chat_System SHALL 在对话框中显示错误提示并允许用户重试
5. THE PDF_Generator SHALL 生成格式规范、排版美观的 PDF 文件
6. THE 临时下载链接 SHALL 在 24 小时后自动失效
