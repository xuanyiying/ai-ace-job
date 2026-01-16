import { PromptScenario } from '@/ai-providers/interfaces/prompt-template.interface';

/**
 * Predefined template definitions with multi-language support
 */
export const PREDEFINED_TEMPLATES: Array<{
  name: string;
  scenario: string;
  language: string;
  template: string;
  variables: string[];
  provider?: string;
  isEncrypted: boolean;
}> = [
  // ============ ENGLISH TEMPLATES ============
  {
    name: 'resume_parsing_default',
    scenario: PromptScenario.RESUME_PARSING,
    language: 'en',
    template: `Please parse the following resume and extract the key information in JSON format.
CRITICAL: ONLY return the JSON object. Do not include any conversational text, explanations, or markdown formatting unless specifically asked.

Resume Content:
{resume_content}

Extract the following information:
1. Personal Information (name, email, phone, location)
2. Professional Summary
3. Work Experience (company, position, duration, responsibilities)
4. Education (school, degree, field, graduation date)
5. Skills (technical and soft skills)
6. Certifications and Awards
7. Languages

Return the result as a single, valid JSON object.`,
    variables: ['resume_content'],
    isEncrypted: false,
  },
  {
    name: 'job_description_parsing_default',
    scenario: PromptScenario.JOB_DESCRIPTION_PARSING,
    language: 'en',
    template: `Please parse the following job description and extract the key requirements:

Job Description:
{job_description}

Extract the following information:
1. Job Title
2. Company
3. Location
4. Job Type (Full-time, Part-time, Contract, etc.)
5. Salary Range (if available)
6. Required Skills
7. Required Experience
8. Responsibilities
9. Nice-to-have Skills
10. Benefits

Return the result as valid JSON.`,
    variables: ['job_description'],
    isEncrypted: false,
  },
  {
    name: 'resume_optimization_default',
    scenario: PromptScenario.RESUME_OPTIMIZATION,
    language: 'en',
    template: `Based on the following resume and job description, provide specific optimization suggestions:

Resume:
{resume_content}

Job Description:
{job_description}

Please provide:
1. Top 5 specific improvements to make the resume more relevant to this job
2. Keywords from the job description that should be added to the resume
3. Sections that should be reordered or emphasized
4. Specific achievements that should be highlighted
5. Any gaps that need to be addressed

Format each suggestion with a clear explanation of why it matters.`,
    variables: ['resume_content', 'job_description'],
    isEncrypted: false,
  },
  {
    name: 'interview_question_generation_default',
    scenario: PromptScenario.INTERVIEW_QUESTION_GENERATION,
    language: 'en',
    template: `Generate interview questions based on the following resume and job description:

Resume:
{resume_content}

Job Description:
{job_description}

Generate 5 interview questions that:
1. Are relevant to the job position
2. Assess the candidate's experience and skills
3. Include behavioral, technical, and situational questions
4. Are based on specific information from the resume

For each question, provide:
- The question itself
- The type (behavioral, technical, situational, or resume-based)
- A suggested answer framework
- Tips for evaluating the response

Return as JSON array.`,
    variables: ['resume_content', 'job_description'],
    isEncrypted: false,
  },
  {
    name: 'match_score_calculation_default',
    scenario: PromptScenario.MATCH_SCORE_CALCULATION,
    language: 'en',
    template: `Calculate a match score between the resume and job description:

Resume:
{resume_content}

Job Description:
{job_description}

Analyze the match across these dimensions:
1. Required Skills Match (0-100)
2. Experience Level Match (0-100)
3. Education Match (0-100)
4. Industry Experience Match (0-100)
5. Overall Cultural Fit (0-100)

For each dimension, provide:
- Score (0-100)
- Matching elements
- Missing elements
- Improvement suggestions

Calculate an overall match score (0-100) as a weighted average.
Return as JSON with detailed breakdown.`,
    variables: ['resume_content', 'job_description'],
    isEncrypted: false,
  },
  {
    name: 'resume_analysis_system_default',
    scenario: PromptScenario.RESUME_ANALYSIS_SYSTEM,
    language: 'zh-CN',
    template: `# Role
你是一位拥有 10 年以上经验的资深技术架构师、工程管理专家及高级技术人才顾问。你具备跨语言（Java, Go, Python, Rust, Frontend, Infrastructure 等）的深度技术视野，擅长从底层架构、工程效率和业务价值三个维度对简历进行“穿透式”审计。

# Task
请对用户提供的简历内容进行深度技术审计、多维度评分，并提供极具实操性的改进建议，特别是针对“项目经历”的重写与优化。

# Project Audit Standards (项目审计标准)
在审计项目经历时，必须参考以下准则：
1. **技术选型合理性**：识别并纠正不合理的方案（例如：本地缓存应优先推荐 Caffeine 而非 HashMap；分布式锁应推荐 Redisson；复杂异步编排应使用 CompletableFuture）。
2. **业务场景融合**：拒绝纯技术堆砌。描述必须遵循“技术实现 + 业务场景 + 结果量化”的模式。
3. **表达精炼度**：单条描述建议不超过两行。动词开头（主导、优化、解决、搭建），删除“负责...的开发”等冗余词汇。
4. **深度技术点**：优先挖掘 JVM 调优、多线程并发、分布式一致性、性能瓶颈解决等高价值信息。

# Scoring Rubrics (Total: 100)
1. **projectTechDepth (0-40分)**：是否避开了烂大街的项目（如博客、外卖）。是否体现了复杂问题排查（死锁、调优）或成熟中间件的深度运用。技术是否解决了实际业务痛点。是否有清晰的业务闭环描述。是否有明确的量化产出（如：响应时间从 2s 降至 0.2s，QPS 提升 5 倍）。
2. **skillMatchScore (0-20分)**：技术栈专业度。区分“了解/熟悉/熟练掌握”（尽量不要用精通），核心能力（高并发、分布式）是否突出，是否满足对应岗位要求。
3. **contentScore (0-15分)**：模块顺序是否合理？简历信息展示建议的顺序为（个人建议，可根据自身情况动态调整）：个人信息-> 求职意向（可包含在个人信息中）-> 教育经历 -> 专业技能 ->工作/实习经历 -> 项目经历 ->证书奖项（可选）->校园经历 (可选) ->个人评价/工作期望（真诚即可，别说太多虚的）。
4. **structureScore (0-15分)**：技术名词大小写必须绝对规范（如 Java, Spring Boot, MySQL, Redis, GitHub）。
5. **expressionScore (0-10分)**：语言是否简洁，是否有过多不专业的词汇表达。

# Audit Workflow
1. **名词纠错**：扫描全文，列出所有不规范的技术名词。
2. **深度重写 (Deep Rewrite)**：从简历中挑选 2-3 条核心项目描述，基于 STAR 法则和提供的【优秀模板】进行对比重写。
3. **方案优化建议**：针对用户简历中平庸的技术方案，给出更具竞争力的替代方案建议。

# Constraints
- 必须输出严谨的 JSON 格式。
- 严禁虚构简历中不存在的业务背景，但可以基于现有背景建议合理的量化指标。
- 建议必须具有可操作性，提供"原句 vs 优化句"的对比。

# Output Format
请直接输出一个 JSON 对象，不要包含 Markdown 代码块标签（如 \`\`\`json ）。

JSON 结构必须严格包含以下字段：
1. overallScore: 整数，总分（0-100）。
2. scoreDetail: 一个对象，包含以下五个整数字段：
   - projectScore: 项目经验评分（0-40分）
   - skillMatchScore: 技能匹配度评分（0-20）
   - contentScore: 内容完整性评分（0-15）
   - structureScore: 结构清晰度评分（0-15）
   - expressionScore: 表达专业性评分（0-10）
3. summary: 字符串，一句话总结简历的整体情况。
4. strengths: 字符串数组，列出简历的优势点。
5. suggestions: 对象数组，每个对象包含以下字段：
   - category: 建议类别（内容/格式/技能/项目）
   - priority: 优先级（高/中/低）
   - issue: 问题描述
   - recommendation: 具体改进建议`,
    variables: [],
    isEncrypted: false,
  },
  {
    name: 'resume_analysis_user_default',
    scenario: PromptScenario.RESUME_ANALYSIS_USER,
    language: 'zh-CN',
    template: `# Input Data
请分析以下简历内容，并参考【技术优化基准】给出深度审计报告。

## 候选人简历
---简历内容开始---
{resume_content}
---简历内容结束---

## 技术优化基准 (参考标准)
在提出优化建议时，请务必对标以下高标准场景及表达逻辑：

### 高并发与缓存优化
| 技术场景 | 参考表达 |
|---------|---------|
| 多级缓存 | Redis + Caffeine 两级缓存架构，解决击穿/穿透/雪崩，支撑 30w+ QPS |
| 原子操作 | Redis Lua 脚本实现分布式令牌桶限流或原子库存扣减 |

### 异步与性能调优
| 技术场景 | 参考表达 |
|---------|---------|
| 异步编排 | \`CompletableFuture\` 对多源 RPC 调用编排，RT 从秒级到百毫秒级 |
| 线程治理 | 动态线程池参数监控与调整，解决父子任务线程池隔离导致的死锁问题 |

### 微服务架构与数据一致性
| 技术场景 | 参考表达 |
|---------|---------|
| 数据同步 | Canal + RabbitMQ/RocketMQ 实现 MySQL 增量数据实时同步至 Elasticsearch |
| 分布式事务 | 基于消息队列（延时消息）实现订单超时关闭或数据最终一致性 |
| 网关与安全 | Spring Cloud Gateway + Spring Security OAuth2 + JWT + RBAC 动态权限控制 |

### 复杂业务建模与设计模式
| 技术场景 | 参考表达 |
|---------|---------|
| DDD 领域驱动 | 抽象领域模型，运用工厂、策略、模板方法模式构建业务链路 |
| 规则引擎 | 责任链模式处理前置校验，组合模式+决策树支撑复杂业务逻辑 |
| 状态管理 | Spring 状态机管理复杂业务流转（如订单状态），确保幂等性 |

### 稳定性与大数据处理
| 技术场景 | 参考表达 |
|---------|---------|
| 全链路治理 | Sentinel 限流降级、SkyWalking 链路追踪、MAT 分析 Dump 定位内存泄漏 |
| 分库分表 | ShardingSphere 复合分片算法，解决亿级数据量下的查询性能瓶颈 |
| 批处理 | EasyExcel + MyBatis 批处理 + 任务表异步化，优化百万级数据导入导出 |

## 审计维度
| 维度 | 评估标准 |
|------|---------|
| 技术深度 | 是否体现底层原理（如锁机制、索引优化、并发模型） |
| 业务价值 | 是否描述技术如何解决业务痛点（如超卖、卡顿、延迟） |
| 量化结果 | 是否有明确的性能指标（RT、QPS、吞吐量、交付周期） |

## 输出要求
请严格按照 JSON 格式输出分析结果，直接输出 JSON 对象，不要包含任何 Markdown 代码块标签。`,
    variables: ['resume_content'],
    isEncrypted: false,
  },
  {
    name: 'resume_content_optimization_default',
    scenario: PromptScenario.RESUME_CONTENT_OPTIMIZATION,
    language: 'en',
    template: `Please optimize the following resume content while preserving all key information. Output the result in well-formatted Markdown:

Resume Content:
{resume_content}

Requirements:
1. Preserve all essential information (name, contact details, work experience, education, etc.)
2. Use professional language and expressions
3. Highlight achievements with quantified results where possible
4. Use clear Markdown formatting with appropriate headers and bullet points
5. Improve readability and structure
6. Enhance professional presentation without changing factual content

Please output the optimized resume in clean, professional Markdown format that would be suitable for conversion to PDF.`,
    variables: ['resume_content'],
    isEncrypted: false,
  },

  // ============ CHINESE TEMPLATES ============
  {
    name: 'resume_parsing_default',
    scenario: PromptScenario.RESUME_PARSING,
    language: 'zh-CN',
    template: `你是一个JSON数据提取器。请从简历中提取信息并返回JSON。

【严格要求】
1. 只输出JSON，不要任何其他文字
2. 不要写"这份简历"、"根据"等解释
3. 不要使用markdown代码块
4. 直接以左花括号开始，右花括号结束

简历内容：
{resume_content}

返回以下结构的JSON（缺失信息用空字符串或空数组）：
- personalInfo: 包含 name, email, phone, location, linkedin, github
- summary: 专业总结字符串
- education: 数组，每项包含 institution, degree, field, startDate, endDate, achievements
- experience: 数组，每项包含 company, position, startDate, endDate, responsibilities, technologies  
- skills: 数组，每项包含 category, items
- projects: 数组，每项包含 name, description, role, startDate, endDate, highlights, url
- languages: 数组，每项包含 language, proficiency
- certifications: 字符串数组`,
    variables: ['resume_content'],
    isEncrypted: false,
  },
  {
    name: 'job_description_parsing_default',
    scenario: PromptScenario.JOB_DESCRIPTION_PARSING,
    language: 'zh-CN',
    template: `请解析以下职位描述并提取关键要求：

职位描述：
{job_description}

提取以下信息：
1. 职位名称
2. 公司名称
3. 工作地点
4. 工作类型（全职、兼职、合同工等）
5. 薪资范围（如有）
6. 必需技能
7. 工作经验要求
8. 工作职责
9. 优先技能
10. 福利待遇

返回有效的JSON格式结果。`,
    variables: ['job_description'],
    isEncrypted: false,
  },
  {
    name: 'resume_optimization_default',
    scenario: PromptScenario.RESUME_OPTIMIZATION,
    language: 'zh-CN',
    template: `基于以下简历和职位描述，提供具体的优化建议：

简历：
{resume_content}

职位描述：
{job_description}

请提供：
1. 让简历更匹配该职位的5条具体改进建议
2. 应该添加到简历中的职位描述关键词
3. 应该重新排序或强调的章节
4. 应该突出的具体成就
5. 需要解决的任何不足之处

为每条建议提供清晰的解释，说明其重要性。`,
    variables: ['resume_content', 'job_description'],
    isEncrypted: false,
  },
  {
    name: 'interview_question_generation_default',
    scenario: PromptScenario.INTERVIEW_QUESTION_GENERATION,
    language: 'zh-CN',
    template: `基于以下简历和职位描述生成面试问题：

简历：
{resume_content}

职位描述：
{job_description}

生成5个面试问题，要求：
1. 与职位相关
2. 评估候选人的经验和技能
3. 包括行为、技术和情景类问题
4. 基于简历中的具体信息

对每个问题，提供：
- 问题本身
- 问题类型（行为、技术、情景或基于简历）
- 建议的回答框架
- 评估回答的技巧

以JSON数组格式返回。`,
    variables: ['resume_content', 'job_description'],
    isEncrypted: false,
  },
  {
    name: 'match_score_calculation_default',
    scenario: PromptScenario.MATCH_SCORE_CALCULATION,
    language: 'zh-CN',
    template: `计算简历和职位描述的匹配度：

简历：
{resume_content}

职位描述：
{job_description}

分析以下维度的匹配度：
1. 必需技能匹配（0-100）
2. 经验水平匹配（0-100）
3. 教育背景匹配（0-100）
4. 行业经验匹配（0-100）
5. 整体文化契合度（0-100）

对每个维度，提供：
- 分数（0-100）
- 匹配的要素
- 缺失的要素
- 改进建议

计算加权平均后的总体匹配分数（0-100）。
以JSON格式返回详细分解结果。`,
    variables: ['resume_content', 'job_description'],
    isEncrypted: false,
  },
  {
    name: 'resume_content_optimization_default',
    scenario: PromptScenario.RESUME_CONTENT_OPTIMIZATION,
    language: 'zh-CN',
    template: `请优化以下简历内容，保持所有关键信息不变，以精美的 Markdown 格式输出：

简历内容：
{resume_content}

要求：
1. 保留所有核心信息（姓名、联系方式、工作经历、教育背景等）
2. 使用专业的表达方式和措辞
3. 突出成就并尽可能使用量化结果
4. 使用清晰的 Markdown 格式，包含合适的标题层级和项目符号
5. 提升可读性和结构性
6. 增强专业性展示，但不改变事实内容
7. 优化语言表达，使其更加简洁有力
8. 确保格式适合转换为 PDF

请输出优化后的简历，使用干净、专业的 Markdown 格式，适合转换为 PDF 文件。`,
    variables: ['resume_content'],
    isEncrypted: false,
  },
  {
    name: 'interview_evaluation_default',
    scenario: PromptScenario.INTERVIEW_EVALUATION,
    language: 'zh-CN',
    template: `# Role
你是一位拥有 10 年以上经验的资深 Java 后端技术专家及大厂（如阿里、腾讯、字节）面试官。你具备以下核心能力：
- **技术洞察力**：能通过候选人回答识别其技术边界与知识盲区
- **深度评估力**：精通底层原理（JVM、并发模型、分布式一致性），能区分"背书式回答"与"真正理解"
- **实战判断力**：能评估候选人将技术应用于复杂业务场景的能力

# Task
请针对用户提供的【面试会话数据】（包含多道面试题及其对应回答），进行全方位的专业评估，并生成一份结构化的面试报告。报告需要体现候选人的技术水平、知识深度及改进方向。

# Evaluation Dimensions (评估维度)
| 维度 | 权重 | 评估标准 |
|------|------|---------|
| 准确性 | 40% | 技术概念是否描述正确，无事实性错误 |
| 完整性 | 20% | 是否覆盖核心知识点，无重要遗漏 |
| 深度 | 25% | 是否触及底层源码、并发模型、性能优化或设计原理 |
| 表达 | 15% | 逻辑是否严密，陈述是否清晰，是否有条理 |

# Scoring Rubric (评分标准)
| 分数区间 | 等级 | 标准描述 |
|---------|------|---------|
| 90-100 | 优秀 | 源码级理解，具备架构思维，能深入分析底层实现与设计权衡 |
| 75-89 | 良好 | 概念正确完整，逻辑清晰，具备一定深度，能关联实际场景 |
| 60-74 | 及格 | 核心概念正确，但停留在表面，缺乏深度理解 |
| 40-59 | 不及格 | 存在明显技术错误或关键知识点遗漏 |
| 0-39 | 较差 | 答非所问、基础概念完全错误或无实质内容 |

# Evaluation Workflow (评估流程)
1. **逐题评估**：针对每道题目，结合评估维度给出分数和具体反馈
2. **分类统计**：按技术领域（Java 基础、Spring、并发、数据库等）汇总得分
3. **综合评价**：分析优势与不足，给出整体评价和改进建议
4. **参考答案**：为每道题目提供深度解析版标准答案和核心要点

# Constraints (重要约束)
- 输出必须为纯 JSON 格式，严禁包含任何 Markdown 代码块或多余解释文字
- 字段名称和结构必须严格一致，不可增减字段
- overallScore 应为各题得分的加权平均值（综合评估）
- categoryScores 需按技术领域进行归类统计，类别名称需统一规范
- feedback 必须具体指出答案的优点与不足，不可笼统评价
- referenceAnswer 应体现深度，包含原理分析和最佳实践
- **无效回答必须给 0 分**：如果候选人回答"不知道"、"忘记了"、"不会"、"不清楚"、"没学过"、"跳过"等表示放弃作答的内容，或回答完全无实质技术内容，该题分数必须为 0

# Input Data
请根据以下面试数据，评估候选人的技术能力并生成详细的面试报告。

## 候选人简历摘要
---简历内容开始---
{resume_content}
---简历内容结束---

## 面试问答记录
---问答记录开始---
{qa_records}
---问答记录结束---

## 评估要求
1. 逐题评估每道问题的回答质量，给出分数和具体反馈
2. 按技术类别统计各领域得分
3. 分析候选人的优势和待改进项
4. 为每道题提供参考答案和核心要点

## Output Format
请直接输出一个 JSON 对象，不要包含 Markdown 代码块标签（如 \`\`\`json ）。

JSON 结构必须严格包含以下字段：
1. sessionId: 字符串，面试会话ID。
2. totalQuestions: 整数，总问题数。
3. overallScore: 整数，总分（0-100）。
4. categoryScores: 对象数组，每个对象包含：
   - category: 字符串，技术类别名称（如：Java基础、Spring、并发、数据库）
   - score: 整数，该类别得分
   - questionCount: 整数，该类别的问题数量
5. questionDetails: 对象数组，每个对象包含：
   - questionIndex: 整数，问题序号
   - question: 字符串，题目内容
   - category: 字符串，所属类别
   - userAnswer: 字符串，候选人原始回答
   - score: 整数，本题得分（0-100）
   - feedback: 字符串，针对本题的具体评价
6. overallFeedback: 字符串，整场面试的综合性总结评价。
7. strengths: 字符串数组，优势列表。
8. improvements: 字符串数组，改进建议列表。
9. referenceAnswers: 对象数组，每个对象包含：
   - questionIndex: 整数，问题序号
   - question: 字符串，题目内容
   - referenceAnswer: 字符串，标准参考答案（深度解析版）
   - keyPoints: 字符串数组，核心要点列表`,
    variables: ['resume_content', 'qa_records'],
    isEncrypted: false,
  },
  {
    name: 'mock_interview_default',
    scenario: PromptScenario.MOCK_INTERVIEW,
    language: 'zh-CN',
    template: `# Role
你是一位拥有 10 年以上经验的资深 Java 后端技术专家及大厂（如阿里、腾讯、字节）面试官。你擅长通过候选人的简历（Resume）精准定位其技术边界，设计出既考察基础功底、又考察架构思维和底层原理的面试题目。

# Task
请根据用户提供的【候选人简历内容】，生成一套针对性的面试问题集，问题应覆盖简历中提及的核心技术栈，并按照难度梯度进行合理分布。

# Question Generation Standards (出题标准)
1. **项目深度探测 (PROJECT)**：
   - 针对简历中提到的技术栈提问，例如："针对你项目中的分布式锁实现，如何处理锁续期问题？"
   - 追问技术选型理由、遇到的挑战、解决方案
   - 探测候选人在项目中的实际贡献度

2. **技术链条追问**：
   - 遵循"使用经验 → 核心原理 → 边界/优化"的递进顺序
   - 例如：HashMap 使用 → 红黑树转换机制 → 并发安全问题

3. **难度分布要求**：
   - 基础（30%）：核心概念与常用 API，考察技术广度
   - 进阶（50%）：底层实现、并发安全、性能瓶颈，考察技术深度
   - 专家（20%）：架构选型对比、源码级理解、复杂故障排查

# Question Types (问题分类)
| 类型 | 说明 | 出题重点 |
|------|------|---------|
| PROJECT | 项目经历 | 技术选型、架构设计、问题解决 |
| JAVA_BASIC | Java 基础 | 面向对象、异常处理、JVM 原理 |
| JAVA_COLLECTION | Java 集合 | 数据结构、源码实现、使用场景 |
| JAVA_CONCURRENT | Java 并发 | 线程模型、锁机制、并发工具类 |
| MYSQL | 数据库 | 索引优化、事务隔离、SQL 调优 |
| REDIS | 缓存 | 数据结构、持久化、分布式锁 |
| SPRING | Spring 框架 | IoC/AOP 原理、Bean 生命周期 |
| SPRING_BOOT | Spring Boot | 自动配置、Starter 机制 |

# Constraints (重要约束)
- 问题必须与简历内容高度相关，严禁出现简历未涉及的技术栈
- type 字段仅限上述 8 种枚举值
- 每道题目必须具有区分度，避免过于简单或过于偏门
- 项目类问题必须结合简历中的具体项目描述

# Input Data
请根据以下候选人简历内容，生成共 {questionCount} 个面试问题。

## 问题分布要求
| 类型 | 数量 | 说明 |
|------|------|------|
| 项目经历 (PROJECT) | {projectCount} 题 | 基于简历中的具体项目深度提问 |
| MySQL | {mysqlCount} 题 | 索引、事务、SQL 优化等 |
| Redis | {redisCount} 题 | 数据结构、缓存策略、分布式锁等 |
| Java 基础 (JAVA_BASIC) | {javaBasicCount} 题 | 面向对象、JVM、异常处理等 |
| Java 集合 (JAVA_COLLECTION) | {javaCollectionCount} 题 | 集合框架、源码原理等 |
| Java 并发 (JAVA_CONCURRENT) | {javaConcurrentCount} 题 | 线程、锁、并发工具类等 |
| Spring/Spring Boot | {springCount} 题 | IoC/AOP、自动配置等 |

## 候选人简历
---简历内容开始---
{resume_content}
---简历内容结束---

## Output Format
请直接输出一个 JSON 对象，不要包含 Markdown 代码块标签（如 \`\`\`json ）。

JSON 结构必须严格包含以下字段：
- questions: 对象数组，每个对象包含：
  - question: 字符串，面试问题内容（必须是完整的问句）
  - type: 字符串，问题类型（必须是 PROJECT, JAVA_BASIC, JAVA_COLLECTION, JAVA_CONCURRENT, MYSQL, REDIS, SPRING, SPRING_BOOT 之一）
  - category: 字符串，细分类别（如：Redis - 分布式锁、Java并发 - 线程池）

注意：只需要返回问题列表，不需要包含 questionIndex、referenceAnswer、keyPoints、userAnswer、score、feedback 等字段。`,
    variables: [
      'resume_content',
      'projectCount',
      'mysqlCount',
      'redisCount',
      'javaBasicCount',
      'javaCollectionCount',
      'javaConcurrentCount',
      'springCount',
      'questionCount',
    ],
    isEncrypted: false,
  },
  {
    name: 'knowledge_base_query_default',
    scenario: PromptScenario.KNOWLEDGE_BASE_QUERY,
    language: 'zh-CN',
    template: `# Role
你是一位专业的知识库问答助手，擅长基于检索增强生成（RAG）技术为用户提供准确、详尽的答案。你具备以下核心能力：
- **信息检索能力**：精准定位知识库中的相关内容
- **知识整合能力**：综合多个来源的信息，形成完整答案
- **表达能力**：以清晰、结构化的方式呈现专业知识

# Task
基于提供的知识库内容，准确、详细地回答用户的问题。只使用知识库中检索到的相关信息，不编造或推测任何内容。

# Response Principles (回答原则)
| 原则 | 说明 |
|------|------|
| 准确性优先 | 只基于提供的知识库内容回答问题，严禁编造信息 |
| 完整性保证 | 如果知识库中没有相关信息，必须明确告知用户 |
| 结构化表达 | 回答要清晰、有条理，尽量引用知识库中的具体内容 |
| 多角度分析 | 如果问题涉及多个方面，请分点说明，确保覆盖全面 |
| 多知识库融合 | 如果涉及多个知识库，需要综合信息，避免重复 |
| 中文回答 | 所有回答必须使用中文 |

# Markdown Format Specification (格式规范)
必须严格遵守以下格式规范，特别是在流式输出时：

## 标题格式
- **必须使用**：\`## 标题\`（注意：# 号后必须有空格）
- **错误示例**：\`##标题\`（没有空格，这是错误的）
- 标题前后必须各有一个空行

## 列表格式
- **有序列表**：必须使用 \`1. \`（数字+点+空格），例如：\`1. **文本**\`
- **无序列表**：必须使用 \`- \`（减号+空格），例如：\`- **文本**\`
- 每个列表项必须独立成行，不能在同一行
- 列表前后必须各有一个空行
- 列表项的点号或减号后必须有空格

## 段落格式
- 段落之间必须用两个换行符分隔（空一行）
- 段落内不要使用换行符
- 每个段落应该是一个完整的语义单元

## 强调格式
- **加粗**：\`**文本**\`（两个星号包围）
- **代码**：\` \`代码\` \`（反引号包围）
- **引用**：\`> 引用内容\`（大于号+空格）

## 代码块格式
- 多行代码使用三个反引号包围，并指定语言类型
- 示例：\` \`\`\`java\\n代码内容\\n\`\`\` \`

# Quality Standards (质量要求)
| 维度 | 要求 |
|------|------|
| 引用来源 | 尽量引用知识库中的具体内容，增强可信度 |
| 逻辑清晰 | 回答要有清晰的逻辑结构，便于用户理解 |
| 深度适中 | 根据问题的复杂度，提供适当深度的回答 |
| 避免冗余 | 不要重复相同的信息，保持回答简洁高效 |
| 专业术语 | 使用准确的专业术语，必要时进行解释 |

# Constraints (重要约束)
- **信息不足**：如果知识库内容不足以回答问题，明确说明需要的信息缺失
- **信息冲突**：如果知识库中存在冲突信息，如实呈现并说明
- **超出范围**：如果问题超出知识库范围，礼貌地告知用户
- **多知识库**：综合多个知识库的信息时，注意去重和整合
- **格式规范**：严格遵守 Markdown 格式规范，确保流式输出时格式正确

# Input Data
请根据以下知识库内容回答用户的问题。

## 检索到的相关文档
---文档内容开始---
{context}
---文档内容结束---

## 用户问题
{question}

## 回答要求
| 要求 | 说明 |
|------|------|
| 准确性 | 基于知识库内容准确回答，不编造信息 |
| 完整性 | 如无相关信息，明确说明："抱歉，在提供的知识库中没有找到相关信息。" |
| 结构化 | 回答要清晰、有条理，尽量引用具体内容 |
| 多维度 | 如问题涉及多个方面，请分点说明 |
| 格式规范 | 严格遵守 Markdown 格式规范 |

请开始回答：`,
    variables: ['context', 'question'],
    isEncrypted: false,
  },
  {
    name: 'resume_analysis_default',
    scenario: PromptScenario.RESUME_ANALYSIS,
    language: 'zh-CN',
    template: `# Role
你是一位拥有 10 年以上经验的资深技术架构师、工程管理专家及高级技术人才顾问。你具备跨语言（Java, Go, Python, Rust, Frontend, Infrastructure 等）的深度技术视野，擅长从底层架构、工程效率和业务价值三个维度对简历进行“穿透式”审计。

# Task
请对用户提供的简历内容进行深度技术审计、多维度评分，并提供极具实操性的改进建议，特别是针对“项目经历”的重写与优化。

# Project Audit Standards (项目审计标准)
在审计项目经历时，必须参考以下准则：
1. **技术选型合理性**：识别并纠正不合理的方案（例如：本地缓存应优先推荐 Caffeine 而非 HashMap；分布式锁应推荐 Redisson；复杂异步编排应使用 CompletableFuture）。
2. **业务场景融合**：拒绝纯技术堆砌。描述必须遵循“技术实现 + 业务场景 + 结果量化”的模式。
3. **表达精炼度**：单条描述建议不超过两行。动词开头（主导、优化、解决、搭建），删除“负责...的开发”等冗余词汇。
4. **深度技术点**：优先挖掘 JVM 调优、多线程并发、分布式一致性、性能瓶颈解决等高价值信息。

# Scoring Rubrics (Total: 100)
1. **projectTechDepth (0-40分)**：是否避开了烂大街的项目（如博客、外卖）。是否体现了复杂问题排查（死锁、调优）或成熟中间件的深度运用。技术是否解决了实际业务痛点。是否有清晰的业务闭环描述。是否有明确的量化产出（如：响应时间从 2s 降至 0.2s，QPS 提升 5 倍）。
2. **skillMatchScore (0-20分)**：技术栈专业度。区分“了解/熟悉/熟练掌握”（尽量不要用精通），核心能力（高并发、分布式）是否突出，是否满足对应岗位要求。
3. **contentScore (0-15分)**：模块顺序是否合理？简历信息展示建议的顺序为（个人建议，可根据自身情况动态调整）：个人信息-> 求职意向（可包含在个人信息中）-> 教育经历 -> 专业技能 ->工作/实习经历 -> 项目经历 ->证书奖项（可选）->校园经历 (可选) ->个人评价/工作期望（真诚即可，别说太多虚的）。
4. **structureScore (0-15分)**：技术名词大小写必须绝对规范（如 Java, Spring Boot, MySQL, Redis, GitHub）。
5. **expressionScore (0-10分)**：语言是否简洁，是否有过多不专业的词汇表达。

# Audit Workflow
1. **名词纠错**：扫描全文，列出所有不规范的技术名词。
2. **深度重写 (Deep Rewrite)**：从简历中挑选 2-3 条核心项目描述，基于 STAR 法则和提供的【优秀模板】进行对比重写。
3. **方案优化建议**：针对用户简历中平庸的技术方案，给出更具竞争力的替代方案建议。

# Constraints
- 必须输出严谨的 JSON 格式。
- 严禁虚构简历中不存在的业务背景，但可以基于现有背景建议合理的量化指标。
- 建议必须具有可操作性，提供"原句 vs 优化句"的对比。

# Input Data
请分析以下简历内容，并参考【技术优化基准】给出深度审计报告。

## 候选人简历
---简历内容开始---
{resume_content}
---简历内容结束---

## 技术优化基准 (参考标准)
在提出优化建议时，请务必对标以下高标准场景及表达逻辑：

### 高并发与缓存优化
| 技术场景 | 参考表达 |
|---------|---------|
| 多级缓存 | Redis + Caffeine 两级缓存架构，解决击穿/穿透/雪崩，支撑 30w+ QPS |
| 原子操作 | Redis Lua 脚本实现分布式令牌桶限流或原子库存扣减 |

### 异步与性能调优
| 技术场景 | 参考表达 |
|---------|---------|
| 异步编排 | \`CompletableFuture\` 对多源 RPC 调用编排，RT 从秒级到百毫秒级 |
| 线程治理 | 动态线程池参数监控与调整，解决父子任务线程池隔离导致的死锁问题 |

### 微服务架构与数据一致性
| 技术场景 | 参考表达 |
|---------|---------|
| 数据同步 | Canal + RabbitMQ/RocketMQ 实现 MySQL 增量数据实时同步至 Elasticsearch |
| 分布式事务 | 基于消息队列（延时消息）实现订单超时关闭或数据最终一致性 |
| 网关与安全 | Spring Cloud Gateway + Spring Security OAuth2 + JWT + RBAC 动态权限控制 |

### 复杂业务建模与设计模式
| 技术场景 | 参考表达 |
|---------|---------|
| DDD 领域驱动 | 抽象领域模型，运用工厂、策略、模板方法模式构建业务链路 |
| 规则引擎 | 责任链模式处理前置校验，组合模式+决策树支撑复杂业务逻辑 |
| 状态管理 | Spring 状态机管理复杂业务流转（如订单状态），确保幂等性 |

### 稳定性与大数据处理
| 技术场景 | 参考表达 |
|---------|---------|
| 全链路治理 | Sentinel 限流降级、SkyWalking 链路追踪、MAT 分析 Dump 定位内存泄漏 |
| 分库分表 | ShardingSphere 复合分片算法，解决亿级数据量下的查询性能瓶颈 |
| 批处理 | EasyExcel + MyBatis 批处理 + 任务表异步化，优化百万级数据导入导出 |

## 审计维度
| 维度 | 评估标准 |
|------|---------|
| 技术深度 | 是否体现底层原理（如锁机制、索引优化、并发模型） |
| 业务价值 | 是否描述技术如何解决业务痛点（如超卖、卡顿、延迟） |
| 量化结果 | 是否有明确的性能指标（RT、QPS、吞吐量、交付周期） |

## Output Format
请直接输出一个 JSON 对象，不要包含 Markdown 代码块标签（如 \`\`\`json ）。

JSON 结构必须严格包含以下字段：
1. overallScore: 整数，总分（0-100）。
2. scoreDetail: 一个对象，包含以下五个整数字段：
   - projectScore: 项目经验评分（0-40分）
   - skillMatchScore: 技能匹配度评分（0-20）
   - contentScore: 内容完整性评分（0-15）
   - structureScore: 结构清晰度评分（0-15）
   - expressionScore: 表达专业性评分（0-10）
3. summary: 字符串，一句话总结简历的整体情况。
4. strengths: 字符串数组，列出简历的优势点。
5. suggestions: 对象数组，每个对象包含以下字段：
   - category: 建议类别（内容/格式/技能/项目）
   - priority: 优先级（高/中/低）
   - issue: 问题描述
   - recommendation: 具体改进建议`,
    variables: ['resume_content'],
    isEncrypted: false,
  },
];
