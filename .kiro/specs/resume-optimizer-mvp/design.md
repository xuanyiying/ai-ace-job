# 简历优化 AI 应用 - 设计文档（MVP 阶段）

## 概述

简历优化 AI 应用是一款基于 AI 技术的智能简历优化 SaaS 平台，采用对话式交互界面设计。用户通过自然语言与 AI 助手对话，完成简历优化、面试准备等任务。本设计文档定义了 MVP 阶段的技术架构、组件设计、数据模型和正确性属性。

系统核心功能包括：

- 对话式用户界面（类似 ChatGPT/千问）
- 用户认证与授权
- 历史会话管理
- 简历文件上传与智能解析（通过对话）
- 职位描述分析（通过对话）
- AI 驱动的简历优化建议（通过对话）
- 专业 PDF 简历生成（通过对话）
- 面试问题预测与准备（通过对话）

## 架构

### 系统架构

系统采用分层架构设计，包含以下层次：

```
┌─────────────────────────────────────────┐
│         前端层 (Frontend)                │
└─────────────────────────────────────────┘
                  ↓ HTTPS
┌─────────────────────────────────────────┐
│       API 网关层 (API Gateway)           │
│    认证 | 限流 | 日志 | 路由             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│        业务服务层 (Services)             │
│  User | Resume | Job | Optimize         │
│  Generate | Interview                   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         AI 引擎层 (AI Engine)            │
│  解析 | 匹配 | 优化 | 问题生成          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          数据层 (Data Layer)             │
│  PostgreSQL | Redis | 对象存储          │
└─────────────────────────────────────────┘
```

### 技术栈选型

**前端**:

- 框架: React 18 + TypeScript
- 状态管理: Zustand
- UI 组件库: Ant Design 6.0 + Ant Design X 2.0（对话组件）
- 对话组件: Bubble、Sender、Prompts（来自 @ant-design/x）
- HTTP 客户端: Axios
- 构建工具: Vite
- 路由: React Router DOM 6

**后端**:

- 框架: NestJS (Node.js 18+)
- 认证: JWT
- 任务队列: Bull + Redis
- ORM: Prisma
- API 文档: OpenAPI/Swagger

**AI/ML**:

- AI 模型: OpenAI GPT-4 API
- 文档解析: pdf-parse, mammoth (DOCX)
- Prompt 管理: LangChain

**数据存储**:

- 关系数据库: PostgreSQL 15+
- 缓存: Redis 7+
- 对象存储: AWS S3 / 阿里云 OSS

**PDF 生成**:

- 库: Puppeteer
- 模板引擎: Handlebars

## 组件和接口

### 前端组件

#### 1. 对话页面 (ChatPage)

对话式交互的主界面，用户通过此页面与 AI 助手交互。

**功能**:

- 显示对话历史（用户消息和 AI 回复）
- 消息输入和发送
- 文件上传（简历文件）
- 快捷操作按钮（简历优化、面试解忧、自我介绍）
- 智能提示卡片（引导用户使用）
- 加载状态显示

**使用的组件**:

- `Bubble.List`: 显示对话气泡列表
- `Sender`: 消息输入框和发送按钮
- `Prompts`: 智能提示卡片
- `Upload`: 文件上传组件

#### 2. 应用布局 (AppLayout)

应用的主布局组件，包含侧边栏和内容区域。

**功能**:

- 左侧边栏：
  - 新对话按钮
  - 历史会话列表
  - 会话重命名和删除
  - 用户头像和菜单
- 右侧内容区域：显示当前页面内容

#### 3. 登录页面 (LoginPage)

现代化的登录界面，采用渐变背景设计。

**功能**:

- 邮箱密码登录
- 表单验证
- 记住我选项
- 社交登录入口（Google、GitHub）
- 跳转到注册页面

#### 4. 注册页面 (RegisterPage)

用户注册界面，与登录页面风格一致。

**功能**:

- 用户名、邮箱、密码注册
- 密码确认验证
- 社交注册入口
- 跳转到登录页面

#### 5. 个人中心页面 (ProfilePage)

用户个人信息管理页面。

**功能**:

- 查看和编辑个人信息
- 查看订阅状态
- 查看使用配额

#### 6. 设置页面 (SettingsPage)

系统设置页面。

**功能**:

- 账户设置
- 隐私设置
- 通知设置

### 后端组件

#### 7. 对话服务 (ConversationService)

管理用户的对话会话和消息历史。

**接口**:

```typescript
interface ConversationService {
  createConversation(userId: string, title?: string): Promise<Conversation>;
  getConversation(conversationId: string): Promise<Conversation>;
  listConversations(userId: string): Promise<Conversation[]>;
  updateConversation(
    conversationId: string,
    data: Partial<Conversation>
  ): Promise<Conversation>;
  deleteConversation(conversationId: string): Promise<void>;
  addMessage(conversationId: string, message: Message): Promise<Conversation>;
  getMessages(conversationId: string): Promise<Message[]>;
}
```

#### 8. 用户服务 (UserService)

负责用户认证、授权和账户管理。

**接口**:

```typescript
interface UserService {
  register(email: string, password: string, username?: string): Promise<User>;
  login(email: string, password: string): Promise<AuthToken>;
  verifyToken(token: string): Promise<User>;
  deleteAccount(userId: string): Promise<void>;
  updateSubscription(userId: string, tier: SubscriptionTier): Promise<User>;
}
```

#### 9. 简历服务 (ResumeService)

处理简历上传、解析和版本管理。

**接口**:

```typescript
interface ResumeService {
  uploadResume(userId: string, file: File, title?: string): Promise<Resume>;
  parseResume(resumeId: string): Promise<ParsedResumeData>;
  getResume(resumeId: string): Promise<Resume>;
  listResumes(userId: string): Promise<Resume[]>;
  updateResume(
    resumeId: string,
    data: Partial<ParsedResumeData>
  ): Promise<Resume>;
  deleteResume(resumeId: string): Promise<void>;
  setPrimaryResume(resumeId: string): Promise<void>;
}
```

#### 10. 职位服务 (JobService)

管理职位信息和 JD 解析。

**接口**:

```typescript
interface JobService {
  createJob(userId: string, jobData: JobInput): Promise<Job>;
  parseJobDescription(description: string): Promise<ParsedJobData>;
  fetchJobFromUrl(url: string): Promise<JobInput>;
  getJob(jobId: string): Promise<Job>;
  listJobs(userId: string): Promise<Job[]>;
  updateJob(jobId: string, data: Partial<JobInput>): Promise<Job>;
  deleteJob(jobId: string): Promise<void>;
}
```

#### 11. 优化服务 (OptimizationService)

执行简历与职位匹配分析和优化建议生成。

**接口**:

```typescript
interface OptimizationService {
  createOptimization(
    resumeId: string,
    jobId: string,
    options: OptimizationOptions
  ): Promise<Optimization>;
  getOptimization(optimizationId: string): Promise<Optimization>;
  calculateMatchScore(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): Promise<MatchScore>;
  generateSuggestions(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): Promise<Suggestion[]>;
  applySuggestion(
    optimizationId: string,
    suggestionId: string
  ): Promise<Optimization>;
  rejectSuggestion(
    optimizationId: string,
    suggestionId: string
  ): Promise<Optimization>;
}
```

#### 12. PDF 生成服务 (GenerateService)

生成专业格式的 PDF 简历。

**接口**:

```typescript
interface GenerateService {
  generatePDF(
    optimizationId: string,
    templateId: string,
    options: PDFOptions
  ): Promise<GeneratedPDF>;
  getTemplate(templateId: string): Promise<Template>;
  listTemplates(): Promise<Template[]>;
  previewPDF(optimizationId: string, templateId: string): Promise<string>;
}
```

#### 13. 面试服务 (InterviewService)

生成面试问题和答案建议。

**接口**:

```typescript
interface InterviewService {
  generateQuestions(
    optimizationId: string,
    count: number
  ): Promise<InterviewQuestion[]>;
  getQuestions(optimizationId: string): Promise<InterviewQuestion[]>;
  exportInterviewPrep(optimizationId: string): Promise<string>;
}
```

#### 14. AI 引擎 (AIEngine)

封装 AI 模型调用和 Prompt 管理。

**接口**:

```typescript
interface AIEngine {
  parseResumeContent(
    content: string,
    fileType: string
  ): Promise<ParsedResumeData>;
  parseJobDescription(description: string): Promise<ParsedJobData>;
  optimizeResume(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): Promise<OptimizationResult>;
  generateInterviewQuestions(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData,
    count: number
  ): Promise<InterviewQuestion[]>;
}
```

## 数据模型

### 对话会话 (Conversation)

```typescript
interface Conversation {
  id: string; // UUID
  userId: string; // 用户 ID
  title: string; // 会话标题
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
  lastMessageAt?: Date; // 最后消息时间
  messageCount: number; // 消息数量
  isActive: boolean; // 是否激活
}
```

### 消息 (Message)

```typescript
interface Message {
  id: string; // UUID
  conversationId: string; // 会话 ID
  role: MessageRole; // 消息角色
  content: string; // 消息内容
  attachments?: Attachment[]; // 附件（如上传的简历文件）
  metadata?: Record<string, any>; // 元数据（如匹配度评分、优化建议等）
  createdAt: Date; // 创建时间
}

enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}
```

### 用户 (User)

```typescript
interface User {
  id: string; // UUID
  email: string; // 唯一邮箱
  passwordHash: string; // bcrypt 哈希
  username?: string; // 用户名
  phone?: string; // 电话
  avatarUrl?: string; // 头像 URL
  subscriptionTier: SubscriptionTier; // 订阅层级
  subscriptionExpiresAt?: Date; // 订阅过期时间
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
  lastLoginAt?: Date; // 最后登录时间
  isActive: boolean; // 账户是否激活
  emailVerified: boolean; // 邮箱是否验证
}

enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}
```

### 简历 (Resume)

```typescript
interface Resume {
  id: string; // UUID
  userId: string; // 用户 ID
  title: string; // 简历标题
  originalFilename?: string; // 原始文件名
  fileUrl?: string; // 文件存储 URL
  fileType?: string; // 文件类型 (pdf/docx/txt)
  fileSize?: number; // 文件大小（字节）
  parsedData?: ParsedResumeData; // 解析后的数据
  version: number; // 版本号
  isPrimary: boolean; // 是否为主简历
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
  parseStatus: ParseStatus; // 解析状态
}

enum ParseStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

interface ParsedResumeData {
  personalInfo: PersonalInfo;
  summary?: string;
  education: Education[];
  experience: Experience[];
  skills: string[];
  projects: Project[];
  certifications?: Certification[];
  languages?: Language[];
}

interface PersonalInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  achievements?: string[];
}

interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  location?: string;
  description: string[];
  achievements?: string[];
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  highlights: string[];
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

interface Language {
  name: string;
  proficiency: string;
}
```

### 职位 (Job)

```typescript
interface Job {
  id: string; // UUID
  userId: string; // 用户 ID
  title: string; // 职位名称
  company: string; // 公司名称
  location?: string; // 工作地点
  jobType?: string; // 工作类型
  salaryRange?: string; // 薪资范围
  jobDescription: string; // 职位描述
  requirements: string; // 任职要求
  parsedRequirements?: ParsedJobData; // 解析后的数据
  sourceUrl?: string; // 来源 URL
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

interface ParsedJobData {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears?: number;
  educationLevel?: string;
  responsibilities: string[];
  keywords: string[];
}
```

### 优化记录 (Optimization)

```typescript
interface Optimization {
  id: string; // UUID
  userId: string; // 用户 ID
  resumeId: string; // 简历 ID
  jobId: string; // 职位 ID
  matchScore?: MatchScore; // 匹配度评分
  suggestions: Suggestion[]; // 优化建议
  optimizedContent?: ParsedResumeData; // 优化后的内容
  status: OptimizationStatus; // 状态
  createdAt: Date; // 创建时间
  completedAt?: Date; // 完成时间
}

enum OptimizationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

interface MatchScore {
  overall: number; // 总体匹配度 (0-100)
  skiAIatch: number; // 技能匹配度
  experienceMatch: number; // 经验匹配度
  educationMatch: number; // 教育匹配度
  keywordCoverage: number; // 关键词覆盖率
  strengths: string[]; // 优势
  weaknesses: string[]; // 劣势
  missingKeywords: string[]; // 缺失关键词
}

interface Suggestion {
  id: string; // 建议 ID
  type: SuggestionType; // 建议类型
  section: string; // 所属部分
  itemIndex?: number; // 项目索引
  original: string; // 原始内容
  optimized: string; // 优化后内容
  reason: string; // 优化理由
  status: SuggestionStatus; // 状态
}

enum SuggestionType {
  CONTENT = 'content',
  KEYWORD = 'keyword',
  STRUCTURE = 'structure',
  QUANTIFICATION = 'quantification',
}

enum SuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
```

### 生成的 PDF (GeneratedPDF)

```typescript
interface GeneratedPDF {
  id: string; // UUID
  userId: string; // 用户 ID
  optimizationId: string; // 优化记录 ID
  templateId: string; // 模板 ID
  fileUrl: string; // PDF 文件 URL
  fileSize: number; // 文件大小
  downloadCount: number; // 下载次数
  createdAt: Date; // 创建时间
  expiresAt?: Date; // 过期时间
}

interface Template {
  id: string; // 模板 ID
  name: string; // 模板名称
  category: string; // 分类
  description: string; // 描述
  previewUrl: string; // 预览图 URL
  isPremium: boolean; // 是否为高级模板
  isActive: boolean; // 是否激活
  configuration: TemplateConfig; // 配置
}

interface TemplateConfig {
  defaultFontSize: number;
  defaultColorTheme: string;
  supportedSections: string[];
  customizableOptions: string[];
}

interface PDFOptions {
  fontSize: number;
  colorTheme: string;
  includePhoto: boolean;
  margin: 'normal' | 'compact' | 'wide';
  visibleSections: string[];
}
```

### 面试问题 (InterviewQuestion)

```typescript
interface InterviewQuestion {
  id: string; // UUID
  optimizationId: string; // 优化记录 ID
  questionType: QuestionType; // 问题类型
  question: string; // 问题内容
  suggestedAnswer: string; // 建议答案
  tips: string[]; // 回答要点
  difficulty: Difficulty; // 难度
  createdAt: Date; // 创建时间
}

enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  SITUATIONAL = 'situational',
  RESUME_BASED = 'resume_based',
}

enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}
```

## 正确性属性

_属性是系统在所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。_

### 属性 1: 消息显示完整性

*对于任意*用户发送的消息，该消息应该立即出现在对话界面中，并且 AI 助手的回复也应该在处理完成后出现在对话界面中。

**验证: 需求 1.2**

### 属性 2: 文件上传确认

*对于任意*有效的简历文件上传，系统应该在对话中显示文件接收确认消息。

**验证: 需求 1.3**

### 属性 3: 智能提示显示条件

*对于任意*对话会话，当消息数量少于等于 1 时，系统应该显示智能提示卡片。

**验证: 需求 1.5**

### 属性 4: 会话历史加载

*对于任意*历史会话，当用户点击该会话时，系统应该加载并显示该会话的所有消息。

**验证: 需求 1.7**

### 属性 5: 会话删除一致性

*对于任意*对话会话，当用户删除该会话后，该会话不应该再出现在历史会话列表中。

**验证: 需求 1.9**

### 属性 6: 加载状态显示

*对于任意*AI 处理请求，在处理期间系统应该显示加载状态指示器。

**验证: 需求 1.10**

### 属性 7: 用户注册唯一性

*对于任意*两次用户注册请求，如果使用相同的邮箱地址，则第二次注册应该失败并返回明确的错误信息。

**验证: 需求 2.1**

### 属性 8: 密码加密存储

*对于任意*用户注册或密码更新操作，系统存储的密码字段应该是 bcrypt 哈希值，而不是明文密码。

**验证: 需求 2.5**

### 属性 9: 认证令牌过期

*对于任意*过期的认证令牌，当用户使用该令牌访问受保护资源时，系统应该拒绝访问并返回 401 未授权错误。

**验证: 需求 2.3**

### 属性 10: 文件上传格式验证

*对于任意*文件上传请求，如果文件格式不是 PDF、DOCX 或 TXT，或文件大小超过 10MB，则系统应该在对话中返回明确的错误提示。

**验证: 需求 3.1, 3.2**

### 属性 11: 简历解析性能

*对于任意*有效的简历文件，系统应该在 5 秒内完成解析并返回结构化数据。

**验证: 需求 3.3**

### 属性 12: 解析数据结构完整性

*对于任意*成功解析的简历，返回的 JSON 数据应该包含 personalInfo、education、experience 和 skills 字段。

**验证: 需求 3.4**

### 属性 13: 职位信息提取

*对于任意*有效的职位描述文本，系统应该提取并返回职位名称、岗位职责和任职要求字段。

**验证: 需求 4.3**

### 属性 14: 匹配度评分范围

*对于任意*简历和职位的匹配分析，返回的匹配度评分应该在 0 到 100 之间（包含边界值）。

**验证: 需求 5.1**

### 属性 15: 匹配度子项完整性

*对于任意*匹配度分析结果，应该包含技能匹配度、经验匹配度、教育背景匹配度和关键词覆盖率四个子项评分。

**验证: 需求 5.2**

### 属性 16: 优化建议数量

*对于任意*优化请求，当匹配度低于 60 分时，系统应该在对话中生成至少 5 条优化建议。

**验证: 需求 5.4**

### 属性 17: 优化建议格式

*对于任意*生成的优化建议，每条建议应该包含原文、优化后文本和优化理由三个字段。

**验证: 需求 6.5**

### 属性 18: STAR 法则应用

*对于任意*工作经历描述的优化建议，优化后的文本应该遵循 STAR 法则结构（情境、任务、行动、结果）。

**验证: 需求 6.2**

### 属性 19: 关键词插入建议

*对于任意*简历优化，如果职位描述中的关键词未出现在简历中，系统应该在对话中生成包含这些关键词的插入建议。

**验证: 需求 6.4**

### 属性 20: 建议接受后内容更新

*对于任意*被接受的优化建议，简历内容应该立即更新为优化后的文本，并创建新版本。

**验证: 需求 6.7**

### 属性 21: 简历版本唯一性

*对于任意*简历的修改操作，系统应该为新版本分配唯一的版本号，且版本号应该递增。

**验证: 需求 7.1, 7.2**

### 属性 22: 历史版本可访问性

*对于任意*简历的历史版本，用户应该能够通过对话查看、恢复或基于该版本创建新简历。

**验证: 需求 7.4**

### 属性 23: PDF 生成性能

*对于任意*有效的简历数据和模板选择，系统应该在 10 秒内生成 PDF 文件。

**验证: 需求 8.1**

### 属性 24: PDF 文件大小限制

*对于任意*生成的 PDF 文件，文件大小应该不超过 2MB。

**验证: 需求 8.4**

### 属性 25: ATS 友好格式

*对于任意*生成的 PDF 文件，应该使用 ATS 友好的格式，确保文本可被机器提取和解析。

**验证: 需求 8.5**

### 属性 26: 面试问题数量

*对于任意*面试准备请求，系统应该在对话中生成 10 到 15 个面试问题。

**验证: 需求 9.1**

### 属性 27: 面试问题类型分布

*对于任意*生成的面试问题集合，应该包含行为面试问题、技术面试问题和情景面试问题三种类型。

**验证: 需求 9.2**

### 属性 28: 面试问题元数据完整性

*对于任意*生成的面试问题，应该包含问题类型、难度等级、参考答案框架和回答要点。

**验证: 需求 9.3, 9.4, 9.5**

### 属性 29: HTTPS 传输加密

*对于任意*客户端与服务器之间的数据传输，应该使用 HTTPS/TLS 1.3 协议进行加密。

**验证: 需求 10.1**

### 属性 30: 敏感信息加密存储

*对于任意*用户的敏感个人信息，在数据库中应该以 AES-256 加密形式存储。

**验证: 需求 10.2**

### 属性 31: 文件存储加密

*对于任意*上传的简历文件和对话历史，应该存储在具有服务端加密的对象存储服务中。

**验证: 需求 10.3**

### 属性 32: 自动文件清理

*对于任意*超过 90 天未被访问的简历文件，系统应该自动删除该文件。

**验证: 需求 10.6**

### 属性 33: API 响应时间

*对于任意*API 请求，系统应该在 2 秒内返回响应。

**验证: 需求 11.1**

### 属性 34: 优化处理时间

*对于任意*简历优化请求，系统应该在 30 秒内返回优化结果。

**验证: 需求 11.3**

### 属性 35: 免费用户限流

*对于任意*免费用户，在一小时内发起超过 10 次优化请求时，系统应该拒绝额外请求并在对话中返回限流提示。

**验证: 需求 12.1**

### 属性 36: 配额显示

*对于任意*用户，在个人中心应该显示当前使用量和剩余配额。

**验证: 需求 12.5**

### 属性 37: 错误响应标准化

*对于任意*系统错误，在对话中返回的错误消息应该用户友好且包含错误信息。

**验证: 需求 13.1**

### 属性 38: AI 调用重试机制

*对于任意*AI 模型调用失败，系统应该重试最多 3 次，如果仍然失败则在对话中返回降级响应。

**验证: 需求 13.2**

### 属性 39: 结构化日志记录

*对于任意*API 请求，系统应该记录包含时间戳、用户标识、会话标识、请求路径和响应状态码的结构化日志。

**验证: 需求 13.5**

## 错误处理

### 错误分类

系统定义以下错误类别：

1. **认证错误** (401): 未授权访问、令牌无效或过期
2. **授权错误** (403): 权限不足、配额超限
3. **验证错误** (400): 输入数据格式错误、参数缺失
4. **资源错误** (404): 资源不存在
5. **业务逻辑错误** (422): 业务规则违反
6. **服务器错误** (500): 内部服务器错误
7. **外部服务错误** (502): AI API 调用失败、第三方服务不可用

### 错误响应格式

所有错误响应遵循统一格式：

```typescript
interface ErrorResponse {
  error: {
    code: string; // 错误代码
    message: string; // 用户友好的错误消息
    details?: any; // 详细错误信息（可选）
    timestamp: string; // 错误发生时间
    requestId: string; // 请求 ID（用于追踪）
  };
}
```

### 重试策略

- **AI 模型调用**: 失败后重试最多 3 次，使用指数退避策略
- **数据库操作**: 事务失败重试最多 2 次
- **文件上传**: 网络错误重试最多 3 次

### 降级策略

当 AI 服务不可用时：

- 简历解析: 使用基于规则的解析器作为降级方案
- 优化建议: 返回预定义的通用优化建议
- 面试问题: 返回基于职位类型的标准问题库

## 测试策略

### 单元测试

使用 Jest 框架进行单元测试，覆盖：

- 所有服务类的公共方法
- 数据验证逻辑
- 工具函数
- 错误处理逻辑

目标覆盖率: 80%+

### 属性测试

使用 fast-check 库进行属性测试，每个属性测试运行至少 100 次迭代。

属性测试应该：

- 为每个正确性属性编写对应的属性测试
- 使用智能生成器生成测试数据
- 验证属性在所有生成的输入下都成立
- 在测试代码中使用注释标记对应的设计文档属性编号

示例：

```typescript
// **Feature: resume-optimizer-mvp, Property 8: 匹配度评分范围**
it('should return match score between 0 and 100', () => {
  fc.assert(
    fc.property(
      resumeDataArbitrary(),
      jobDataArbitrary(),
      async (resumeData, jobData) => {
        const score = await optimizationService.calculateMatchScore(
          resumeData,
          jobData
        );
        expect(score.overall).toBeGreaterThanOrEqual(0);
        expect(score.overall).toBeLessThanOrEqual(100);
      }
    ),
    { numRuns: 100 }
  );
});
```

### 集成测试

测试组件之间的交互：

- API 端点测试
- 数据库操作测试
- AI 引擎集成测试
- 文件上传和存储测试

### E2E 测试

使用 Playwright 进行端到端测试，覆盖：

- 用户注册和登录流程
- 简历上传和解析流程
- 完整的优化流程
- PDF 生成和下载流程

### 性能测试

使用 k6 进行负载测试：

- API 响应时间测试
- 并发用户测试
- 简历解析性能测试
- PDF 生成性能测试

### 安全测试

- SQL 注入测试
- XSS 攻击测试
- CSRF 保护测试
- 认证和授权测试
- 文件上传安全测试
