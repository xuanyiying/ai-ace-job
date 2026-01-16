/**
 * AI Engine - Refactored Version
 * Now uses AIEngineService for multi-provider support
 * This class serves as a facade providing backward compatibility
 * and file extraction utilities
 */

import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { AIEngineService } from '@/ai-providers/ai-engine.service';
import { PromptTemplateManager } from '@/ai-providers/config';
import { AIRequest } from '@/ai-providers';
import { PromptScenario } from '@/ai-providers/interfaces/prompt-template.interface';
import { ScenarioType } from '@/ai-providers/interfaces/model.interface';
import {
  ParsedResumeData,
  ParsedJobDescription,
  OptimizationSuggestion,
  InterviewQuestion,
} from '@/types';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import OpenAI from 'openai';

// Define Zod schema for ParsedResumeData for validation and potential fixing
const ParsedResumeDataSchema = z.object({
  personalInfo: z.object({
    name: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    website: z.string().optional(),
  }),
  summary: z.string().optional(),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string(),
        field: z.string().optional().default(''),
        startDate: z.string().optional().default(''),
        endDate: z.string().optional(),
        gpa: z.string().optional(),
        achievements: z.array(z.string()).optional(),
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string(),
        position: z.string(),
        startDate: z.string().optional().default(''),
        endDate: z.string().optional(),
        location: z.string().optional(),
        description: z.array(z.string()).default([]),
        achievements: z.array(z.string()).optional(),
      })
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        technologies: z.array(z.string()).default([]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        url: z.string().optional(),
        highlights: z.array(z.string()).default([]),
      })
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        date: z.string(),
        expiryDate: z.string().optional(),
        credentialId: z.string().optional(),
      })
    )
    .optional(),
  languages: z
    .array(
      z.object({
        name: z.string(),
        proficiency: z.string(),
      })
    )
    .optional(),
  markdown: z.string().optional(),
});

@Injectable()
export class AIEngine {
  private readonly logger = new Logger(AIEngine.name);

  constructor(
    private aiEngineService: AIEngineService,
    private promptTemplateManager: PromptTemplateManager,
  ) {}

  /**
   * Extract text content from a file buffer based on file type
   */
  async extractTextFromFile(
    fileBuffer: Buffer,
    fileType: string
  ): Promise<string> {
    this.logger.log(
      `Extracting text from ${fileType} file (${fileBuffer.length} bytes)`
    );

    let text = '';
    switch (fileType.toLowerCase()) {
      case 'pdf':
        text = await this.extractTextFromPDF(fileBuffer);
        break;
      case 'docx':
        text = await this.extractTextFromDOCX(fileBuffer);
        break;
      case 'txt':
      case 'md':
      case 'markdown':
        text = fileBuffer.toString('utf-8');
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!text || text.trim().length === 0) {
      this.logger.warn(`Extracted text is empty for ${fileType} file`);
    }

    return text;
  }

  /**
   * Extract text from PDF file
   */
  private async extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(fileBuffer);
      return data.text;
    } catch (error) {
      this.logger.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Extract text from DOCX file
   */
  private async extractTextFromDOCX(fileBuffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } catch (error) {
      this.logger.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX file');
    }
  }

  /**
   * Parse resume content using AI
   * Delegates to AIEngineService with multi-provider support
   */
  async parseResumeContent(content: string): Promise<ParsedResumeData> {
    const MAX_RETRIES = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(
          `Parsing resume content using AI engine service (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
        );

        // Use a more explicit prompt that emphasizes JSON-only output
        const jsonOnlyPrompt =
          attempt > 0
            ? `你是一个JSON生成器。你的输出必须是纯JSON，不能包含任何其他文字。
不要写"这份简历"、"根据"等任何中文解释。
不要写任何markdown标记如\`\`\`。
直接输出JSON对象，以{开头，以}结尾。

请从以下简历中提取信息，返回JSON格式：
${content}

必须返回的JSON结构：
{"personalInfo":{"name":"","email":"","phone":""},"education":[],"experience":[],"skills":[],"projects":[]}`
            : undefined;

        const request: AIRequest = {
          model: '', // Will be auto-selected based on scenario
          prompt:
            jsonOnlyPrompt ||
            `Extract structured information from the following resume and return it in valid JSON format.
CRITICAL: ONLY return the JSON object. Do not include any conversational text or markdown formatting.

Resume Content:
${content}`,
          metadata: {
            templateName:
              attempt === 0 ? PromptScenario.RESUME_PARSING : undefined,
            templateVariables: {
              resume_content: content,
            },
            // Attempt to enforce JSON if the provider supports it
            response_format: { type: 'json_object' },
          },
        };

        const response = await this.aiEngineService.call(
          request,
          'system',
          ScenarioType.RESUME_PARSING,
          'zh-CN'
        );

        this.logger.debug(`AI raw response length: ${response.content.length}`);

        // Check if response looks like conversational text instead of JSON
        const trimmedContent = response.content.trim();
        if (this.isConversationalResponse(trimmedContent)) {
          this.logger.warn(
            `AI returned conversational text instead of JSON: "${trimmedContent.substring(0, 100)}..."`
          );
          if (attempt < MAX_RETRIES) {
            this.logger.log(`Retrying with more explicit JSON-only prompt...`);
            continue;
          }
          throw new Error(
            'AI model returned conversational text instead of JSON after all retries'
          );
        }

        const jsonToParse = this.extractJson(response.content);

        if (!jsonToParse || !jsonToParse.trim().startsWith('{')) {
          this.logger.warn(
            `Could not extract valid JSON from response: "${response.content.substring(0, 100)}..."`
          );
          if (attempt < MAX_RETRIES) {
            continue;
          }
          throw new Error('Could not extract JSON from AI response');
        }

        this.logger.debug(
          `Extracted JSON to parse: ${jsonToParse.substring(0, 200)}...`
        );

        try {
          const rawParsed = JSON.parse(jsonToParse);
          // Use Zod to validate and fill in defaults
          const parsedData = ParsedResumeDataSchema.parse(rawParsed);
          this.logger.log('Resume parsing completed successfully');
          return parsedData as ParsedResumeData;
        } catch (parseError: any) {
          this.logger.warn(
            `Failed to parse or validate JSON: ${parseError.message}. Attempting recovery...`
          );

          // Try to fix common JSON issues
          const fixedJson = this.attemptJsonFix(jsonToParse);
          if (fixedJson) {
            try {
              const rawFixed = JSON.parse(fixedJson);
              const parsedData = ParsedResumeDataSchema.parse(rawFixed);
              this.logger.log(
                'Recovered JSON parsing after fixing common issues'
              );
              return parsedData as ParsedResumeData;
            } catch (fixError: any) {
              this.logger.warn(`Recovery attempt failed: ${fixError.message}`);
            }
          }

          lastError = parseError;
          if (attempt < MAX_RETRIES) {
            this.logger.log(
              `JSON parse failed, retrying with explicit prompt...`
            );
            continue;
          }

          this.logger.error(
            `Failed to parse resume content: ${parseError.message}`,
            { stack: parseError.stack }
          );
          throw parseError;
        }
      } catch (error: any) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          this.logger.warn(
            `Attempt ${attempt + 1} failed: ${error.message}. Retrying...`
          );
          continue;
        }
      }
    }

    this.logger.error(
      `Failed to parse resume content after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`
    );
    // Return a basic structure on error
    return this.createEmptyResumeData();
  }

  /**
   * Check if the response is conversational text rather than JSON
   */
  private isConversationalResponse(text: string): boolean {
    // Common patterns that indicate conversational response instead of JSON
    const conversationalPatterns = [
      /^这份简历/,
      /^根据/,
      /^以下是/,
      /^好的/,
      /^我来/,
      /^让我/,
      /^首先/,
      /^简历内容/,
      /^分析结果/,
      /^Here is/i,
      /^Based on/i,
      /^The resume/i,
      /^I will/i,
      /^Let me/i,
    ];

    const trimmed = text.trim();

    // If it starts with { or [, it's likely JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return false;
    }

    // Check for conversational patterns
    for (const pattern of conversationalPatterns) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    // If first 50 chars don't contain { or [, likely conversational
    const first50 = trimmed.substring(0, 50);
    if (!first50.includes('{') && !first50.includes('[')) {
      return true;
    }

    return false;
  }

  /**
   * Attempt to fix common JSON issues
   */
  private attemptJsonFix(jsonStr: string): string | null {
    try {
      let fixed = jsonStr
        .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F]/g, ' ') // Remove control characters
        .replace(/\n/g, '\\n') // Escape newlines in strings
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs

      // Try to fix unquoted keys (but be careful with URLs)
      fixed = fixed.replace(
        /([{,]\s*)(\w+)(\s*:)/g,
        (match, prefix, key, suffix) => {
          if (key === 'http' || key === 'https') return match;
          return `${prefix}"${key}"${suffix}`;
        }
      );

      return fixed;
    } catch {
      return null;
    }
  }

  /**
   * Helper function to extract JSON from text - more robust
   */
  private extractJson(text: string): string {
    // 1. Try to find JSON in markdown code blocks first
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      const extracted = markdownMatch[1].trim();
      this.logger.debug('Extracted JSON from markdown block');
      return extracted;
    }

    const trimmed = text.trim();

    // 2. If text starts with [ or {, it's likely already JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      // Find matching closing bracket/brace
      if (trimmed.startsWith('[')) {
        const lastBracket = trimmed.lastIndexOf(']');
        if (lastBracket !== -1) {
          return trimmed.substring(0, lastBracket + 1);
        }
      } else {
        const lastBrace = trimmed.lastIndexOf('}');
        if (lastBrace !== -1) {
          return trimmed.substring(0, lastBrace + 1);
        }
      }
    }

    // 3. Try to find the first { and last } for objects
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    // 4. Try to find the first [ and last ] for arrays
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');

    // Determine which comes first and is valid
    const hasBrace =
      firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
    const hasBracket =
      firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

    if (hasBrace && hasBracket) {
      // Both exist, use whichever comes first
      if (firstBracket < firstBrace) {
        const extracted = text.substring(firstBracket, lastBracket + 1);
        this.logger.debug('Extracted JSON array between brackets');
        return extracted;
      } else {
        const extracted = text.substring(firstBrace, lastBrace + 1);
        this.logger.debug('Extracted JSON object between braces');
        return extracted;
      }
    } else if (hasBrace) {
      const extracted = text.substring(firstBrace, lastBrace + 1);
      this.logger.debug('Extracted JSON between braces');
      return extracted;
    } else if (hasBracket) {
      const extracted = text.substring(firstBracket, lastBracket + 1);
      this.logger.debug('Extracted JSON between brackets');
      return extracted;
    }

    // 5. Handle case where AI might use full-width braces or other oddities
    const cleaned = text.replace(/[\uFF5B]/g, '{').replace(/[\uFF5D]/g, '}');
    const firstBraceClean = cleaned.indexOf('{');
    const lastBraceClean = cleaned.lastIndexOf('}');
    if (
      firstBraceClean !== -1 &&
      lastBraceClean !== -1 &&
      lastBraceClean > firstBraceClean
    ) {
      const extracted = cleaned.substring(firstBraceClean, lastBraceClean + 1);
      this.logger.debug('Extracted JSON between cleaned braces');
      return extracted;
    }

    this.logger.warn('Could not find any JSON-like structure in AI response');
    return text.trim();
  }

  /**
   * Parse job description using AI
   * Delegates to AIEngineService with multi-provider support
   */
  async parseJobDescription(
    description: string
  ): Promise<ParsedJobDescription> {
    try {
      this.logger.debug('Parsing job description using AI engine service');

      const request: AIRequest = {
        model: '', // Will be auto-selected based on scenario
        prompt: `Extract structured information from the following job description and return it in valid JSON format.
CRITICAL: ONLY return the JSON object. Do not include any conversational text or markdown formatting.

Job Description Content:
${description}`,
        metadata: {
          templateName: PromptScenario.JOB_DESCRIPTION_PARSING,
          templateVariables: {
            job_description: description,
          },
          // Attempt to enforce JSON
          response_format: { type: 'json_object' },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        ScenarioType.JOB_DESCRIPTION_PARSING,
        'zh-CN'
      );

      const jsonToParse = this.extractJson(response.content);

      try {
        const parsedData: ParsedJobDescription = JSON.parse(jsonToParse);
        this.logger.log('Job description parsing completed successfully');
        return parsedData;
      } catch (parseError: any) {
        this.logger.warn(
          `Failed to parse JSON: ${parseError.message}. Content starts with: ${jsonToParse.substring(0, 100)}...`
        );
        throw parseError;
      }
    } catch (error: any) {
      this.logger.error(`Failed to parse job description: ${error.message}`);
      return {
        title: '',
        company: '',
        requiredSkills: [],
        preferredSkills: [],
        responsibilities: [],
        keywords: [],
      };
    }
  }

  /**
   * Generate optimization suggestions using AI
   * Delegates to AIEngineService with multi-provider support
   */
  async generateOptimizationSuggestions(
    resumeData: ParsedResumeData,
    jobDescription: string
  ): Promise<OptimizationSuggestion[]> {
    try {
      this.logger.debug(
        'Generating optimization suggestions using AI engine service'
      );

      const request: AIRequest = {
        model: '', // Will be auto-selected based on scenario
        prompt: '', // Will be filled by template
        metadata: {
          templateName: PromptScenario.RESUME_OPTIMIZATION,
          templateVariables: {
            resume_data: JSON.stringify(resumeData, null, 2),
            job_description: jobDescription,
          },
          response_format: { type: 'json_object' },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        ScenarioType.RESUME_OPTIMIZATION,
        'zh-CN'
      );

      const jsonToParse = this.extractJson(response.content);

      try {
        const suggestions: OptimizationSuggestion[] = JSON.parse(jsonToParse);
        this.logger.debug(
          `Generated ${suggestions.length} optimization suggestions`
        );
        return suggestions;
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse optimization suggestions JSON: ${response.content.substring(0, 200)}...`
        );
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to generate optimization suggestions:', error);
      return [];
    }
  }

  /**
   * Analyze resume without a specific job description
   * Provides general scoring and improvement suggestions
   */
  async analyzeParsedResume(resumeData: ParsedResumeData): Promise<any> {
    try {
      this.logger.debug('Analyzing resume using AI engine service');

      // Get system prompt template
      const systemTemplate = await this.promptTemplateManager.getTemplate(
        PromptScenario.RESUME_ANALYSIS_SYSTEM,
        'zh-CN'
      );

      // Get user prompt template
      const userTemplate = await this.promptTemplateManager.getTemplate(
        PromptScenario.RESUME_ANALYSIS_USER,
        'zh-CN'
      );

      if (!systemTemplate || !userTemplate) {
        this.logger.warn(
          'Resume analysis templates not found, falling back to default single prompt'
        );
        // Fallback logic could go here, or just proceed with default
      }

      let systemPrompt = '';
      let userPrompt = '';

      if (systemTemplate) {
        systemPrompt = await this.promptTemplateManager.renderTemplate(
          systemTemplate,
          {}
        );
      }

      if (userTemplate) {
        userPrompt = await this.promptTemplateManager.renderTemplate(
          userTemplate,
          {
            resume_content: JSON.stringify(resumeData, null, 2),
          }
        );
      }

      const request: AIRequest = {
        model: '', // Will be auto-selected based on scenario
        prompt: '', // Will be filled by messages
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        metadata: {
          response_format: { type: 'json_object' },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        ScenarioType.RESUME_ANALYSIS,
        'zh-CN'
      );

      const jsonToParse = this.extractJson(response.content);

      try {
        const analysisResult = JSON.parse(jsonToParse);
        this.logger.log('Resume analysis completed successfully');
        return analysisResult;
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse analysis JSON: ${response.content.substring(0, 200)}...`
        );
        // Return raw content if parsing fails, but wrapped in an object
        return {
          raw_content: response.content,
          error: 'Failed to parse JSON response',
        };
      }
    } catch (error) {
      this.logger.error('Failed to analyze resume:', error);
      throw error;
    }
  }

  /**
   * Generate interview questions using AI
   * Delegates to AIEngineService with multi-provider support
   */
  async generateInterviewQuestions(
    resumeData: ParsedResumeData,
    jobDescription: string
  ): Promise<InterviewQuestion[]> {
    try {
      this.logger.debug(
        'Generating interview questions using AI engine service'
      );

      const request: AIRequest = {
        model: '', // Will be auto-selected based on scenario
        prompt: '', // Will be filled by template
        metadata: {
          templateName: PromptScenario.INTERVIEW_QUESTION_GENERATION,
          templateVariables: {
            resume_data: JSON.stringify(resumeData, null, 2),
            job_description: jobDescription,
          },
          response_format: { type: 'json_object' },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        ScenarioType.INTERVIEW_QUESTION_GENERATION,
        'zh-CN'
      );

      const jsonToParse = this.extractJson(response.content);

      try {
        const questions: InterviewQuestion[] = JSON.parse(jsonToParse);
        this.logger.debug(`Generated ${questions.length} interview questions`);
        return questions;
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse interview questions JSON: ${response.content.substring(0, 200)}...`
        );
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to generate interview questions:', error);
      return [];
    }
  }

  /**
   * Create empty resume data structure
   * Used as fallback when parsing fails
   */
  private createEmptyResumeData(): ParsedResumeData {
    return {
      personalInfo: {
        name: '',
        email: '',
      },
      education: [],
      experience: [],
      skills: [],
      projects: [],
    };
  }

  /**
   * Chat with interviewer persona
   * Delegates to AIEngineService with multi-provider support
   */
  async chatWithInterviewer(
    context: string,
    message: string,
    history: { role: string; content: string }[]
  ): Promise<{ content: string; audioUrl?: string }> {
    try {
      this.logger.debug(
        'Generating interviewer response using AI engine service'
      );

      const request: AIRequest = {
        model: '', // Will be auto-selected based on scenario
        prompt: message,
        messages: [
          {
            role: 'system',
            content: context,
          },
          ...history.map((h) => ({
            role: h.role as 'user' | 'assistant',
            content: h.content,
          })),
          {
            role: 'user',
            content: message,
          },
        ],
        metadata: {
          templateName: 'interviewer_chat',
          templateVariables: {
            context,
            message,
          },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'chat',
        'interview-chat'
      );

      return {
        content: response.content,
      };
    } catch (error) {
      this.logger.error('Failed to generate interviewer response:', error);
      throw error;
    }
  }

  /**
   * Generic generation method
   */
  async generate(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    try {
      const request: AIRequest = {
        model: '',
        prompt,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        metadata: {
          templateName: 'generic_generate',
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'chat',
        'generic-generation'
      );

      return response.content;
    } catch (error) {
      this.logger.error('Failed to generate content:', error);
      throw error;
    }
  }

  /**
   * Optimize resume content using AI
   * Returns optimized resume in Markdown format
   */
  async optimizeResumeContent(resumeContent: string): Promise<string> {
    try {
      this.logger.debug('Optimizing resume content using AI engine service');

      // Validate input
      if (!resumeContent || resumeContent.trim().length === 0) {
        throw new Error('Resume content is required for optimization');
      }

      // Build optimization prompt
      const prompt = `请优化以下简历内容，保持核心信息不变，优化表达方式和格式，以 Markdown 格式输出：

${resumeContent}

要求：
1. 保留所有关键信息（姓名、联系方式、工作经历、教育背景等）
2. 使用专业的表达方式
3. 突出成就和量化结果
4. 使用清晰的 Markdown 格式
5. 适当使用项目符号和标题层级
6. 确保内容结构清晰，易于阅读

请直接输出优化后的简历内容，不需要额外的说明文字。`;

      const request: AIRequest = {
        model: '',
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 4000,
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        PromptScenario.RESUME_CONTENT_OPTIMIZATION,
        'zh-CN'
      );

      this.logger.log('Resume content optimization completed successfully');
      return response.content;
    } catch (error) {
      this.logger.error('Failed to optimize resume content:', error);
      throw error;
    }
  }

  /**
   * Analyze resume content using AI
   * Delegates to AIEngineService with multi-provider support
   */
  async analyzeResume(content: string): Promise<any> {
    try {
      this.logger.debug('Analyzing resume using AI engine service');

      const request: AIRequest = {
        model: '', // Will be auto-selected based on scenario
        prompt: '', // Will be filled by template
        metadata: {
          templateName: PromptScenario.RESUME_ANALYSIS,
          templateVariables: {
            resume_content: content,
          },
          response_format: { type: 'json_object' },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        PromptScenario.RESUME_ANALYSIS,
        'zh-CN'
      );

      const jsonToParse = this.extractJson(response.content);

      try {
        const analysisResult = JSON.parse(jsonToParse);
        this.logger.debug('Resume analysis completed successfully');
        return analysisResult;
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse resume analysis JSON: ${response.content.substring(0, 200)}...`
        );
        return {
          error: 'Failed to parse analysis result',
          raw: response.content,
        };
      }
    } catch (error) {
      this.logger.error('Failed to analyze resume:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeAudio(buffer: Buffer): Promise<string> {
    try {
      this.logger.debug('Transcribing audio...');

      // Check if API key is available
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Create a temporary file
      const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
      fs.writeFileSync(tempFilePath, buffer);

      try {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
        });

        this.logger.debug('Audio transcription completed');
        return transcription.text;
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error) {
      this.logger.error('Failed to transcribe audio:', error);
      throw error;
    }
  }

  /**
   * Clear cache (delegated to AIEngineService)
   */
  async clearCache(_cacheKey: string): Promise<void> {
    this.logger.debug('Cache management is now handled by AIEngineService');
    // Cache is managed by AIEngineService via Redis
  }

  /**
   * Clear all AI engine cache (delegated to AIEngineService)
   */
  async clearAllCache(): Promise<void> {
    this.logger.log('Cache management is now handled by AIEngineService');
    // Cache is managed by AIEngineService via Redis
  }
}
