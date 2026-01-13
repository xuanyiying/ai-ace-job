/**
 * Unified Resume Optimizer Service
 * Handles both streaming and batch resume optimization using AI
 * Combines functionality from optimization and resume-optimizer modules
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AIEngineService } from '@/ai-providers/ai-engine.service';
import { QuotaService } from '@/quota/quota.service';
import { AIRequest } from '@/ai-providers/interfaces';
import { PromptScenario } from '@/ai-providers/interfaces/prompt-template.interface';
import { Optimization, OptimizationStatus } from '@prisma/client';
import {
  ParsedResumeData,
  ParsedJobData,
  MatchScore,
  Suggestion,
  SuggestionType,
  SuggestionStatus,
  StreamChunk,
  OptimizationOptions,
} from '@/types';

@Injectable()
export class ResumeOptimizerService {
  private readonly logger = new Logger(ResumeOptimizerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngineService: AIEngineService,
    private readonly quotaService: QuotaService
  ) {}

  /**
   * Create a new optimization record
   * Initiates the matching and suggestion generation process
   */
  async createOptimization(
    userId: string,
    resumeId: string,
    jobId: string
  ): Promise<Optimization> {
    // Check quota before creating optimization
    await this.quotaService.enforceOptimizationQuota(userId);

    // Verify user owns both resume and job
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume || resume.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this resume'
      );
    }

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this job'
      );
    }
    // Create optimization record
    const optimization = await this.prisma.optimization.create({
      data: {
        userId,
        resumeId,
        jobId,
        status: OptimizationStatus.PENDING,
      },
    });

    // Increment optimization counter for quota tracking
    await this.quotaService.incrementOptimizationCount(userId);

    return optimization;
  }

  /**
   * Optimize resume content with streaming output
   * Uses semantic segmentation for better user experience
   */
  async *optimizeResume(
    content: string,
    userId: string,
    options: OptimizationOptions = {}
  ): AsyncGenerator<StreamChunk> {
    try {
      const { language = 'zh-CN' } = options;

      this.logger.debug(
        `Starting resume optimization for user ${userId} in language ${language}`
      );

      // Validate input
      if (!content || !content.trim()) {
        yield {
          type: 'error',
          message: 'Resume content is required',
          timestamp: Date.now(),
        };
        return;
      }

      if (!userId || !userId.trim()) {
        yield {
          type: 'error',
          message: 'User ID is required',
          timestamp: Date.now(),
        };
        return;
      }

      // Build optimization prompt
      const optimizationPrompt = this.buildOptimizationPrompt(content);

      // Yield an initial empty chunk to signal start and keep connection alive
      // This provides immediate feedback and helps prevent early timeouts
      yield {
        type: 'chunk',
        content: '',
        timestamp: Date.now(),
      };

      // Create AI request
      const aiRequest: AIRequest = {
        model: '', // Will be selected by AI engine based on scenario
        prompt: optimizationPrompt,
        temperature: 0.7,
        maxTokens: 4000,
      };

      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            this.logger.warn(
              `Retrying resume optimization for user ${userId}, attempt ${attempt}`
            );
            // Exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
          }

          // Start streaming optimization
          const stream = this.aiEngineService.stream(
            aiRequest,
            userId,
            PromptScenario.RESUME_CONTENT_OPTIMIZATION,
            language
          );

          let buffer = '';
          const CHUNK_SIZE = 300; // Characters per chunk for optimal streaming

          // Process stream chunks with semantic segmentation
          for await (const chunk of stream) {
            buffer += chunk.content;

            // Send chunks when buffer reaches threshold using semantic breaks
            while (buffer.length >= CHUNK_SIZE) {
              const breakPoint = this.findSemanticBreakPoint(
                buffer,
                CHUNK_SIZE
              );
              const segment = buffer.slice(0, breakPoint);
              buffer = buffer.slice(breakPoint);

              yield {
                type: 'chunk',
                content: segment,
                timestamp: Date.now(),
              };
            }
          }

          // Send remaining content if any
          if (buffer.length > 0) {
            yield {
              type: 'chunk',
              content: buffer,
              timestamp: Date.now(),
            };
          }

          // Send completion signal
          yield {
            type: 'done',
            complete: true,
            timestamp: Date.now(),
          };

          this.logger.debug(`Resume optimization completed for user ${userId}`);
          return; // Success, exit the retry loop
        } catch (error) {
          lastError = error;
          this.logger.error(
            `Resume optimization attempt ${attempt} failed for user ${userId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          if (attempt === maxRetries) {
            throw error;
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Resume optimization failed for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
  /**
   * Get an optimization record by ID
   */
  async getOptimization(
    optimizationId: string,
    userId: string
  ): Promise<Optimization> {
    const optimization = await this.prisma.optimization.findUnique({
      where: { id: optimizationId },
    });

    if (!optimization) {
      throw new NotFoundException(
        `Optimization with ID ${optimizationId} not found`
      );
    }

    if (optimization.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this optimization'
      );
    }

    return optimization;
  }

  /**
   * List all optimization records for a user
   */
  async listOptimizations(userId: string): Promise<Optimization[]> {
    return this.prisma.optimization.findMany({
      where: { userId },
      include: {
        job: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Calculate match score between resume and job
   */
  calculateMatchScore(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): MatchScore {
    const skillMatch = this.calculateSkillMatch(resumeData.skills, jobData);
    const experienceMatch = this.calculateExperienceMatch(
      resumeData.experience,
      jobData
    );
    const educationMatch = this.calculateEducationMatch(
      resumeData.education,
      jobData
    );
    const keywordCoverage = this.calculateKeywordCoverage(resumeData, jobData);

    // Calculate overall score as weighted average
    const overall = Math.round(
      skillMatch * 0.4 +
        experienceMatch * 0.3 +
        educationMatch * 0.15 +
        keywordCoverage * 0.15
    );

    // Ensure overall score is within 0-100 range
    const boundedOverall = Math.max(0, Math.min(100, overall));

    // Identify strengths and weaknesses
    const strengths = this.identifyStrengths(
      skillMatch,
      experienceMatch,
      educationMatch,
      keywordCoverage
    );
    const weaknesses = this.identifyWeaknesses(
      skillMatch,
      experienceMatch,
      educationMatch,
      keywordCoverage
    );

    // Identify missing keywords
    const missingKeywords = this.identifyMissingKeywords(resumeData, jobData);

    return {
      overall: boundedOverall,
      skillMatch: Math.max(0, Math.min(100, skillMatch)),
      experienceMatch: Math.max(0, Math.min(100, experienceMatch)),
      educationMatch: Math.max(0, Math.min(100, educationMatch)),
      keywordCoverage: Math.max(0, Math.min(100, keywordCoverage)),
      strengths,
      weaknesses,
      missingKeywords,
    };
  }
  /**
   * Generate optimization suggestions
   */
  async generateSuggestions(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): Promise<Suggestion[]> {
    try {
      const suggestions: Suggestion[] = [];

      // Generate STAR method suggestions for experience
      const starSuggestions = this.generateSTARSuggestions(
        resumeData.experience,
        jobData
      );
      suggestions.push(...starSuggestions);

      // Generate quantification suggestions
      const quantificationSuggestions = this.generateQuantificationSuggestions(
        resumeData.experience
      );
      suggestions.push(...quantificationSuggestions);

      // Generate keyword insertion suggestions
      const keywordSuggestions = this.generateKeywordSuggestions(
        resumeData,
        jobData
      );
      suggestions.push(...keywordSuggestions);

      // Try to get AI-enhanced suggestions if available
      // Note: This feature is not yet implemented
      // try {
      //   const aiSuggestions = await this.aiEngineService.generateOptimizationSuggestions?.(
      //     resumeData,
      //     JSON.stringify(jobData)
      //   );
      //   if (aiSuggestions && Array.isArray(aiSuggestions)) {
      //     // Convert AI suggestions to our format
      //     const convertedAISuggestions = aiSuggestions.map(
      //       (s: any, index: number) => ({
      //         id: `ai-${index}`,
      //         type: s.type || SuggestionType.CONTENT,
      //         section: s.section || 'general',
      //         itemIndex: s.itemIndex,
      //         original: s.original || '',
      //         optimized: s.optimized || '',
      //         reason: s.reason || '',
      //         status: SuggestionStatus.PENDING,
      //       })
      //     );
      //     suggestions.push(...convertedAISuggestions);
      //   }
      // } catch (aiError) {
      //   this.logger.warn(
      //     'AI suggestion generation failed, using rule-based suggestions only',
      //     aiError
      //   );
      // }

      // Ensure we have at least 10 suggestions
      if (suggestions.length < 10) {
        const additionalSuggestions = this.generateDefaultSuggestions(
          resumeData,
          jobData,
          10 - suggestions.length
        );
        suggestions.push(...additionalSuggestions);
      }

      // Assign unique IDs if not already assigned
      return suggestions.map((s, index) => ({
        ...s,
        id: s.id || `suggestion-${index}`,
        status: s.status || SuggestionStatus.PENDING,
      }));
    } catch (error) {
      this.logger.error('Error generating suggestions:', error);
      return [];
    }
  }
  /**
   * Apply a suggestion to the optimization
   */
  async applySuggestion(
    optimizationId: string,
    userId: string,
    suggestionId: string
  ): Promise<Optimization> {
    const optimization = await this.getOptimization(optimizationId, userId);

    // Find and update the suggestion
    const suggestions = (optimization.suggestions || []) as any[];
    const suggestionIndex = suggestions.findIndex((s) => s.id === suggestionId);

    if (suggestionIndex === -1) {
      throw new NotFoundException(
        `Suggestion with ID ${suggestionId} not found`
      );
    }

    suggestions[suggestionIndex].status = SuggestionStatus.ACCEPTED;

    // Get the resume to update its content
    const resume = await this.prisma.resume.findUnique({
      where: { id: optimization.resumeId },
    });

    if (!resume) {
      throw new NotFoundException(
        `Resume with ID ${optimization.resumeId} not found`
      );
    }

    // Apply the suggestion to the resume's parsed data
    const updatedParsedData = this.applySuggestionToResumeData(
      resume.parsedData as unknown as ParsedResumeData,
      suggestions[suggestionIndex]
    );

    // Create a new resume version with the updated content
    const newVersion = resume.version + 1;
    await this.prisma.resume.update({
      where: { id: optimization.resumeId },
      data: {
        parsedData: updatedParsedData as any,
        version: newVersion,
      },
    });

    // Update optimization with the accepted suggestion
    return this.prisma.optimization.update({
      where: { id: optimizationId },
      data: {
        suggestions: suggestions as any,
      },
    });
  }

  /**
   * Apply multiple suggestions in batch
   */
  async applyBatchSuggestions(
    optimizationId: string,
    userId: string,
    suggestionIds: string[]
  ): Promise<Optimization> {
    const optimization = await this.getOptimization(optimizationId, userId);

    // Get the resume
    const resume = await this.prisma.resume.findUnique({
      where: { id: optimization.resumeId },
    });

    if (!resume) {
      throw new NotFoundException(
        `Resume with ID ${optimization.resumeId} not found`
      );
    }

    // Find and update all suggestions
    const suggestions = (optimization.suggestions || []) as any[];
    let updatedParsedData = resume.parsedData as unknown as ParsedResumeData;

    for (const suggestionId of suggestionIds) {
      const suggestionIndex = suggestions.findIndex(
        (s) => s.id === suggestionId
      );

      if (suggestionIndex === -1) {
        throw new NotFoundException(
          `Suggestion with ID ${suggestionId} not found`
        );
      }

      suggestions[suggestionIndex].status = SuggestionStatus.ACCEPTED;

      // Apply the suggestion to the resume data
      updatedParsedData = this.applySuggestionToResumeData(
        updatedParsedData,
        suggestions[suggestionIndex]
      );
    }

    // Create a new resume version with all applied suggestions
    const newVersion = resume.version + 1;
    await this.prisma.resume.update({
      where: { id: optimization.resumeId },
      data: {
        parsedData: updatedParsedData as any,
        version: newVersion,
      },
    });

    // Update optimization with all accepted suggestions
    return this.prisma.optimization.update({
      where: { id: optimizationId },
      data: {
        suggestions: suggestions as any,
      },
    });
  }
  /**
   * Reject a suggestion
   */
  async rejectSuggestion(
    optimizationId: string,
    userId: string,
    suggestionId: string
  ): Promise<Optimization> {
    const optimization = await this.getOptimization(optimizationId, userId);

    // Find and update the suggestion
    const suggestions = (optimization.suggestions || []) as any[];
    const suggestionIndex = suggestions.findIndex((s) => s.id === suggestionId);

    if (suggestionIndex === -1) {
      throw new NotFoundException(
        `Suggestion with ID ${suggestionId} not found`
      );
    }

    suggestions[suggestionIndex].status = SuggestionStatus.REJECTED;

    // Update optimization
    return this.prisma.optimization.update({
      where: { id: optimizationId },
      data: {
        suggestions: suggestions as any,
      },
    });
  }

  // Private helper methods

  /**
   * Build optimization prompt for resume content
   */
  private buildOptimizationPrompt(content: string): string {
    return `请优化以下简历内容，保持核心信息不变，优化表达方式和格式，以 Markdown 格式输出：

${content}

要求：
1. 保留所有关键信息（姓名、联系方式、工作经历、教育背景等）
2. 使用专业的表达方式
3. 突出成就和量化结果
4. 使用清晰的 Markdown 格式
5. 适当使用项目符号和标题层级
6. 确保内容结构清晰，易于阅读

请直接输出优化后的简历内容，不需要额外的说明文字。`;
  }

  /**
   * Find semantic break point for content chunking
   */
  private findSemanticBreakPoint(text: string, minLength: number): number {
    // Priority 1: Paragraph breaks (double newlines)
    const paragraphEnd = text.indexOf('\n\n', minLength);
    if (paragraphEnd !== -1 && paragraphEnd < minLength + 200) {
      return paragraphEnd + 2;
    }

    // Priority 2: Single line breaks
    const lineEnd = text.indexOf('\n', minLength);
    if (lineEnd !== -1 && lineEnd < minLength + 100) {
      return lineEnd + 1;
    }

    // Priority 3: Sentence endings (Chinese and English)
    const sentenceEnds = ['。', '！', '？', '.', '!', '?'];
    for (const end of sentenceEnds) {
      const pos = text.indexOf(end, minLength);
      if (pos !== -1 && pos < minLength + 100) {
        return pos + 1;
      }
    }

    // Priority 4: Word boundaries (spaces)
    const spacePos = text.indexOf(' ', minLength);
    if (spacePos !== -1 && spacePos < minLength + 50) {
      return spacePos + 1;
    }

    // Priority 5: Comma boundaries
    const commaPos = text.indexOf('，', minLength);
    if (commaPos !== -1 && commaPos < minLength + 50) {
      return commaPos + 1;
    }

    const englishCommaPos = text.indexOf(',', minLength);
    if (englishCommaPos !== -1 && englishCommaPos < minLength + 50) {
      return englishCommaPos + 1;
    }

    // Fallback: Use minimum length to avoid breaking characters
    return Math.min(minLength, text.length);
  }
  /**
   * Calculate skill match percentage
   */
  private calculateSkillMatch(
    resumeSkills: string[],
    jobData: ParsedJobData
  ): number {
    if (jobData.requiredSkills.length === 0) {
      return 100;
    }

    const resumeSkillsLower = resumeSkills.map((s) => s.toLowerCase());
    const requiredSkillsLower = jobData.requiredSkills.map((s) =>
      s.toLowerCase()
    );
    const preferredSkillsLower = jobData.preferredSkills.map((s) =>
      s.toLowerCase()
    );

    // Count matched required skills
    const matchedRequired = requiredSkillsLower.filter((skill) =>
      resumeSkillsLower.some(
        (resumeSkill) =>
          resumeSkill.includes(skill) || skill.includes(resumeSkill)
      )
    ).length;

    // Count matched preferred skills
    const matchedPreferred = preferredSkillsLower.filter((skill) =>
      resumeSkillsLower.some(
        (resumeSkill) =>
          resumeSkill.includes(skill) || skill.includes(resumeSkill)
      )
    ).length;

    // Calculate score: required skills are more important
    const requiredScore = (matchedRequired / requiredSkillsLower.length) * 100;
    const preferredScore =
      preferredSkillsLower.length > 0
        ? (matchedPreferred / preferredSkillsLower.length) * 100
        : 100;

    return requiredScore * 0.7 + preferredScore * 0.3;
  }

  /**
   * Calculate experience match percentage
   */
  private calculateExperienceMatch(
    resumeExperience: ParsedResumeData['experience'],
    jobData: ParsedJobData
  ): number {
    if (!jobData.experienceYears) {
      return 100;
    }

    // Calculate total years of experience
    const totalYears = this.calculateTotalExperienceYears(resumeExperience);

    // If resume has more experience than required, it's a perfect match
    if (totalYears >= jobData.experienceYears) {
      return 100;
    }

    // Calculate percentage match
    const match = (totalYears / jobData.experienceYears) * 100;
    return Math.min(100, match);
  }

  /**
   * Calculate total years of experience from resume
   */
  private calculateTotalExperienceYears(
    experience: ParsedResumeData['experience']
  ): number {
    let totalYears = 0;

    for (const job of experience) {
      const startYear = this.extractYear(job.startDate);
      const endYear = job.endDate
        ? this.extractYear(job.endDate)
        : new Date().getFullYear();

      if (startYear && endYear) {
        totalYears += endYear - startYear;
      }
    }

    return totalYears;
  }

  /**
   * Extract year from date string
   */
  private extractYear(dateStr: string): number | null {
    if (!dateStr) return null;

    // Try to match YYYY format
    const yearMatch = dateStr.match(/\d{4}/);
    if (yearMatch) {
      return parseInt(yearMatch[0], 10);
    }

    return null;
  }
  /**
   * Calculate education match percentage
   */
  private calculateEducationMatch(
    resumeEducation: ParsedResumeData['education'],
    jobData: ParsedJobData
  ): number {
    if (!jobData.educationLevel) {
      return 100;
    }

    const educationHierarchy: Record<string, number> = {
      'high school': 1,
      diploma: 1,
      associate: 2,
      bachelor: 3,
      master: 4,
      phd: 5,
    };

    const requiredLevel =
      educationHierarchy[jobData.educationLevel.toLowerCase()] || 0;

    // Check if resume has matching or higher education level
    for (const edu of resumeEducation) {
      const degree = edu.degree.toLowerCase();
      for (const [level, hierarchy] of Object.entries(educationHierarchy)) {
        if (degree.includes(level) && hierarchy >= requiredLevel) {
          return 100;
        }
      }
    }

    // If no matching education found, return 50% (partial match)
    return resumeEducation.length > 0 ? 50 : 0;
  }

  /**
   * Calculate keyword coverage percentage
   */
  private calculateKeywordCoverage(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): number {
    if (jobData.keywords.length === 0) {
      return 100;
    }

    // Combine all resume text
    const resumeText = this.combineResumeText(resumeData).toLowerCase();

    // Count matched keywords
    const matchedKeywords = jobData.keywords.filter((keyword) =>
      resumeText.includes(keyword.toLowerCase())
    ).length;

    return (matchedKeywords / jobData.keywords.length) * 100;
  }

  /**
   * Combine all resume text for keyword matching
   */
  private combineResumeText(resumeData: ParsedResumeData): string {
    const parts: string[] = [];

    if (resumeData.personalInfo) {
      parts.push(resumeData.personalInfo.name);
      parts.push(resumeData.personalInfo.email);
    }

    if (resumeData.summary) {
      parts.push(resumeData.summary);
    }

    resumeData.education.forEach((edu) => {
      parts.push(edu.institution, edu.degree, edu.field);
    });

    resumeData.experience.forEach((exp) => {
      parts.push(exp.company, exp.position);
      parts.push(...exp.description);
      if (exp.achievements) {
        parts.push(...exp.achievements);
      }
    });

    parts.push(...resumeData.skills);

    resumeData.projects.forEach((proj) => {
      parts.push(proj.name, proj.description);
      parts.push(...proj.technologies);
      parts.push(...proj.highlights);
    });

    if (resumeData.certifications) {
      resumeData.certifications.forEach((cert) => {
        parts.push(cert.name, cert.issuer);
      });
    }

    if (resumeData.languages) {
      resumeData.languages.forEach((lang) => {
        parts.push(lang.name, lang.proficiency);
      });
    }

    return parts.join(' ');
  }
  /**
   * Identify strengths based on match scores
   */
  private identifyStrengths(
    skillMatch: number,
    experienceMatch: number,
    educationMatch: number,
    keywordCoverage: number
  ): string[] {
    const strengths: string[] = [];

    if (skillMatch >= 80) {
      strengths.push('Strong skill match with job requirements');
    }

    if (experienceMatch >= 80) {
      strengths.push('Sufficient experience level for the position');
    }

    if (educationMatch >= 80) {
      strengths.push('Education background meets requirements');
    }

    if (keywordCoverage >= 80) {
      strengths.push('Good keyword coverage from job description');
    }

    return strengths.length > 0
      ? strengths
      : ['Resume has some relevant qualifications'];
  }

  /**
   * Identify weaknesses based on match scores
   */
  private identifyWeaknesses(
    skillMatch: number,
    experienceMatch: number,
    educationMatch: number,
    keywordCoverage: number
  ): string[] {
    const weaknesses: string[] = [];

    if (skillMatch < 60) {
      weaknesses.push('Missing several required skills');
    }

    if (experienceMatch < 60) {
      weaknesses.push('Experience level below job requirements');
    }

    if (educationMatch < 60) {
      weaknesses.push('Education background does not meet requirements');
    }

    if (keywordCoverage < 60) {
      weaknesses.push('Low keyword coverage from job description');
    }

    return weaknesses.length > 0
      ? weaknesses
      : ['Consider adding more relevant details'];
  }

  /**
   * Identify keywords from job that are missing in resume
   */
  private identifyMissingKeywords(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): string[] {
    const resumeText = this.combineResumeText(resumeData).toLowerCase();

    return jobData.keywords.filter(
      (keyword) => !resumeText.includes(keyword.toLowerCase())
    );
  }
  /**
   * Generate STAR method suggestions for experience descriptions
   */
  private generateSTARSuggestions(
    experience: ParsedResumeData['experience'],
    _jobData: ParsedJobData
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    experience.forEach((exp, expIndex) => {
      exp.description.forEach((desc, descIndex) => {
        // Check if description lacks STAR structure
        if (!this.hasSTARStructure(desc)) {
          const starOptimized = this.optimizeWithSTAR(desc, exp);

          suggestions.push({
            id: `star-${expIndex}-${descIndex}`,
            type: SuggestionType.CONTENT,
            section: 'experience',
            itemIndex: expIndex,
            original: desc,
            optimized: starOptimized,
            reason:
              'Rewritten using STAR method (Situation, Task, Action, Result) to better demonstrate impact and achievements',
            status: SuggestionStatus.PENDING,
          });
        }
      });
    });

    return suggestions;
  }

  /**
   * Check if a description has STAR structure
   */
  private hasSTARStructure(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    // Look for indicators of STAR structure
    const starIndicators = [
      /situation|task|action|result/i,
      /led|managed|developed|implemented|created|built/i,
      /achieved|improved|increased|reduced|delivered/i,
      /\d+%|\$\d+|x\d+/i, // Quantifiable metrics
    ];

    const matchCount = starIndicators.filter((indicator) =>
      indicator.test(lowerDesc)
    ).length;

    return matchCount >= 2;
  }

  /**
   * Optimize a description using STAR method
   */
  private optimizeWithSTAR(
    description: string,
    _experience: ParsedResumeData['experience'][0]
  ): string {
    // Extract key information
    const actionVerbs = [
      'led',
      'managed',
      'developed',
      'implemented',
      'created',
      'built',
      'designed',
      'architected',
      'engineered',
      'optimized',
      'improved',
      'enhanced',
      'streamlined',
    ];

    const hasActionVerb = actionVerbs.some((verb) =>
      description.toLowerCase().includes(verb)
    );

    if (!hasActionVerb) {
      // Add action verb if missing
      return `Developed and ${description.charAt(0).toLowerCase()}${description.slice(1)}`;
    }

    // If description lacks result/impact, add placeholder
    if (!this.hasQuantifiableMetrics(description)) {
      return `${description} resulting in measurable improvements (Situation: context, Task: objective, Action: what you did, Result: outcome)`;
    }

    return description;
  }

  /**
   * Check if description has quantifiable metrics
   */
  private hasQuantifiableMetrics(description: string): boolean {
    return /\d+%|\$\d+|x\d+|\d+\s*(hours|days|weeks|months|years|users|customers|transactions)/.test(
      description
    );
  }
  /**
   * Generate quantification suggestions
   */
  private generateQuantificationSuggestions(
    experience: ParsedResumeData['experience']
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    experience.forEach((exp, expIndex) => {
      exp.achievements?.forEach((achievement, achIndex) => {
        if (!this.hasQuantifiableMetrics(achievement)) {
          const quantified = this.addQuantificationPlaceholder(achievement);

          suggestions.push({
            id: `quant-${expIndex}-${achIndex}`,
            type: SuggestionType.QUANTIFICATION,
            section: 'experience',
            itemIndex: expIndex,
            original: achievement,
            optimized: quantified,
            reason:
              'Add quantifiable metrics (percentages, numbers, or timeframes) to demonstrate measurable impact',
            status: SuggestionStatus.PENDING,
          });
        }
      });
    });

    return suggestions;
  }

  /**
   * Add quantification placeholder to achievement
   */
  private addQuantificationPlaceholder(achievement: string): string {
    const quantificationPatterns = [
      { pattern: /improved|enhanced|optimized/i, metric: 'by X%' },
      { pattern: /reduced|decreased|cut/i, metric: 'by X%' },
      { pattern: /increased|grew|expanded/i, metric: 'by X%' },
      { pattern: /saved|generated|earned/i, metric: '$X' },
      { pattern: /served|helped|supported/i, metric: 'X users/customers' },
      { pattern: /completed|delivered|shipped/i, metric: 'X projects' },
    ];

    for (const { pattern, metric } of quantificationPatterns) {
      if (pattern.test(achievement)) {
        return `${achievement} ${metric}`;
      }
    }

    return `${achievement} - add specific metrics`;
  }

  /**
   * Generate keyword insertion suggestions
   */
  private generateKeywordSuggestions(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const resumeText = this.combineResumeText(resumeData).toLowerCase();

    // Find missing required skills
    const missingSkills = jobData.requiredSkills.filter(
      (skill) => !resumeText.includes(skill.toLowerCase())
    );

    // Find missing keywords
    const missingKeywords = jobData.keywords.filter(
      (keyword) => !resumeText.includes(keyword.toLowerCase())
    );

    // Create suggestions for missing skills
    missingSkills.slice(0, 3).forEach((skill, index) => {
      suggestions.push({
        id: `keyword-skill-${index}`,
        type: SuggestionType.KEYWORD,
        section: 'skills',
        original: 'Current skills section',
        optimized: `Add "${skill}" to skills section`,
        reason: `"${skill}" is a required skill in the job description and is missing from your resume`,
        status: SuggestionStatus.PENDING,
      });
    });

    // Create suggestions for missing keywords
    missingKeywords.slice(0, 3).forEach((keyword, index) => {
      suggestions.push({
        id: `keyword-general-${index}`,
        type: SuggestionType.KEYWORD,
        section: 'experience',
        original: 'Current experience descriptions',
        optimized: `Incorporate "${keyword}" in relevant experience descriptions`,
        reason: `"${keyword}" appears in the job description and should be highlighted in your resume`,
        status: SuggestionStatus.PENDING,
      });
    });

    return suggestions;
  }
  /**
   * Generate default suggestions when AI is unavailable
   */
  private generateDefaultSuggestions(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData,
    count: number
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Add summary suggestion
    if (count > suggestions.length) {
      if (!resumeData.summary) {
        suggestions.push({
          id: 'default-summary',
          type: SuggestionType.STRUCTURE,
          section: 'summary',
          original: 'No professional summary',
          optimized:
            'Add a professional summary highlighting key qualifications',
          reason:
            'A professional summary helps recruiters quickly understand your fit for the role',
          status: SuggestionStatus.PENDING,
        });
      } else {
        suggestions.push({
          id: 'default-summary-improve',
          type: SuggestionType.CONTENT,
          section: 'summary',
          original: resumeData.summary,
          optimized:
            'Enhance summary to emphasize alignment with job requirements',
          reason:
            'A stronger summary increases the likelihood of passing initial screening',
          status: SuggestionStatus.PENDING,
        });
      }
    }

    // Add skills suggestion
    if (count > suggestions.length) {
      const missingSkillCount = jobData.requiredSkills.filter(
        (skill) =>
          !resumeData.skills.some((rs) =>
            rs.toLowerCase().includes(skill.toLowerCase())
          )
      ).length;

      if (missingSkillCount > 0) {
        suggestions.push({
          id: 'default-skills',
          type: SuggestionType.KEYWORD,
          section: 'skills',
          original: `Current skills: ${resumeData.skills.join(', ') || 'None listed'}`,
          optimized: `Add missing required skills from job description`,
          reason: `You are missing ${missingSkillCount} required skills. Adding them will improve your match score`,
          status: SuggestionStatus.PENDING,
        });
      }
    }

    // Add more default suggestions as needed
    while (suggestions.length < count) {
      suggestions.push({
        id: `default-${suggestions.length}`,
        type: SuggestionType.CONTENT,
        section: 'general',
        original: 'Current resume content',
        optimized:
          'Consider enhancing content with more specific details and achievements',
        reason: 'More detailed content helps demonstrate your qualifications',
        status: SuggestionStatus.PENDING,
      });
    }

    return suggestions.slice(0, count);
  }

  /**
   * Apply a single suggestion to resume data
   */
  private applySuggestionToResumeData(
    resumeData: ParsedResumeData,
    suggestion: any
  ): ParsedResumeData {
    const updated = JSON.parse(JSON.stringify(resumeData)); // Deep copy

    const { section, itemIndex, original, optimized } = suggestion;

    switch (section) {
      case 'experience':
        if (itemIndex !== undefined && updated.experience[itemIndex]) {
          const exp = updated.experience[itemIndex];
          // Replace the original description with optimized one
          const descIndex = exp.description.findIndex(
            (d: string) => d === original
          );
          if (descIndex !== -1) {
            exp.description[descIndex] = optimized;
          }
          // Also check achievements
          if (exp.achievements) {
            const achIndex = exp.achievements.findIndex(
              (a: string) => a === original
            );
            if (achIndex !== -1) {
              exp.achievements[achIndex] = optimized;
            }
          }
        }
        break;

      case 'skills':
        // Add skill if it's a keyword suggestion
        if (
          suggestion.type === 'keyword' &&
          !updated.skills.includes(optimized)
        ) {
          updated.skills.push(optimized);
        }
        break;

      case 'summary':
        updated.summary = optimized;
        break;

      default:
        // Try to find and replace the original text anywhere in the resume
        this.replaceTextInResume(updated, original, optimized);
    }

    return updated;
  }

  /**
   * Replace text in resume data recursively
   */
  private replaceTextInResume(
    data: any,
    original: string,
    optimized: string
  ): void {
    if (typeof data === 'string') {
      return;
    }

    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        if (typeof data[i] === 'string' && data[i] === original) {
          data[i] = optimized;
        } else if (typeof data[i] === 'object') {
          this.replaceTextInResume(data[i], original, optimized);
        }
      }
    } else if (typeof data === 'object') {
      for (const key in data) {
        if (typeof data[key] === 'string' && data[key] === original) {
          data[key] = optimized;
        } else if (typeof data[key] === 'object') {
          this.replaceTextInResume(data[key], original, optimized);
        }
      }
    }
  }
}
