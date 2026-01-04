/**
 * AI Engine - Refactored Version
 * Now uses AIEngineService for multi-provider support
 * This class serves as a facade providing backward compatibility
 * and file extraction utilities
 */

import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { AIEngineService } from '../ai-providers/ai-engine.service';
import { AIRequest } from '../ai-providers/interfaces';
import {
  ParsedResumeData,
  ParsedJobDescription,
  OptimizationSuggestion,
  InterviewQuestion,
} from '@/types';

@Injectable()
export class AIEngine {
  private readonly logger = new Logger(AIEngine.name);

  constructor(private aiEngineService: AIEngineService) {}

  /**
   * Extract text content from a file buffer based on file type
   */
  async extractTextFromFile(
    fileBuffer: Buffer,
    fileType: string
  ): Promise<string> {
    try {
      this.logger.log(`Extracting text from ${fileType} file (${fileBuffer.length} bytes)`);
      
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
    } catch (error) {
      // Don't log here if it's an expected rethrow, let the caller handle logging
      throw error;
    }
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
    try {
      this.logger.debug('Parsing resume content using AI engine service');

      const request: AIRequest = {
        model: '', // Will be auto-selected based on scenario
        prompt: content,
        metadata: {
          templateName: 'parse_resume',
          templateVariables: {
            resume_content: content,
          },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        'resume-parsing'
      );

      let jsonContent = response.content;

      // Clean up markdown code blocks if present
      if (jsonContent.includes('```')) {
        const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      try {
        const parsedData: ParsedResumeData = JSON.parse(jsonContent);
        this.logger.debug('Resume parsing completed successfully');
        return parsedData;
      } catch (parseError: any) {
        this.logger.warn(
          `Failed to parse JSON directly: ${parseError.message}. Attempting recovery...`
        );

        // Try to find the first '{' and last '}'
        const firstBrace = jsonContent.indexOf('{');
        const lastBrace = jsonContent.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            const recoveredContent = jsonContent.substring(
              firstBrace,
              lastBrace + 1
            );
            const parsedData: ParsedResumeData = JSON.parse(recoveredContent);
            this.logger.log('Recovered JSON parsing successfully');
            return parsedData;
          } catch (recoveryError: any) {
            this.logger.error(`Recovery failed: ${recoveryError.message}`);
          }
        }

        throw parseError;
      }
    } catch (error: any) {
      this.logger.error(`Failed to parse resume content: ${error.message}`);
      // Return a basic structure on error
      return this.createEmptyResumeData();
    }
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
        prompt: description,
        metadata: {
          templateName: 'parse_job_description',
          templateVariables: {
            job_description: description,
          },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        'job-description-parsing'
      );

      const parsedData: ParsedJobDescription = JSON.parse(response.content);
      this.logger.debug('Job description parsing completed successfully');

      return parsedData;
    } catch (error) {
      this.logger.error('Failed to parse job description:', error);
      // Return a basic structure on error
      return {
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
          templateName: 'generate_suggestions',
          templateVariables: {
            resume_data: JSON.stringify(resumeData, null, 2),
            job_description: jobDescription,
          },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        'resume-optimization'
      );

      const suggestions: OptimizationSuggestion[] = JSON.parse(
        response.content
      );
      this.logger.debug(
        `Generated ${suggestions.length} optimization suggestions`
      );

      return suggestions;
    } catch (error) {
      this.logger.error('Failed to generate optimization suggestions:', error);
      return [];
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
          templateName: 'generate_interview_questions',
          templateVariables: {
            resume_data: JSON.stringify(resumeData, null, 2),
            job_description: jobDescription,
          },
        },
      };

      const response = await this.aiEngineService.call(
        request,
        'system',
        'interview-question-generation'
      );

      const questions: InterviewQuestion[] = JSON.parse(response.content);
      this.logger.debug(`Generated ${questions.length} interview questions`);

      return questions;
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
