import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIEngine } from '../ai/ai.engine';
import { QuotaService } from '../quota/quota.service';
import { Optimization, OptimizationStatus } from '@prisma/client';
import { ParsedJobData, ParsedResumeData } from '@/types';

export interface MatchScore {
  overall: number;
  skiAIatch: number;
  experienceMatch: number;
  educationMatch: number;
  keywordCoverage: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
}

export enum SuggestionType {
  CONTENT = 'content',
  KEYWORD = 'keyword',
  STRUCTURE = 'structure',
  QUANTIFICATION = 'quantification',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  section: string;
  itemIndex?: number;
  original: string;
  optimized: string;
  reason: string;
  status: SuggestionStatus;
}

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);

  constructor(
    private prisma: PrismaService,
    private aiEngine: AIEngine,
    private quotaService: QuotaService
  ) {}

  /**
   * Create a new optimization record
   * Initiates the matching and suggestion generation process
   * Requirement 11.1, 11.3: Check quota before creating optimization
   */
  async createOptimization(
    userId: string,
    resumeId: string,
    jobId: string
  ): Promise<Optimization> {
    // Check quota before creating optimization
    // Requirement 11.1: Free users limited to 10 optimizations per hour
    // Requirement 11.3: Pro users have unlimited optimizations
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
   * Get an optimization record by ID
   * Ensures user owns the optimization
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
   * Returns optimization history for viewing and management
   */
  async listOptimizations(userId: string): Promise<Optimization[]> {
    return this.prisma.optimization.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List optimization records for a specific resume
   * Returns optimization history for a particular resume
   */
  async listOptimizationsByResume(
    userId: string,
    resumeId: string
  ): Promise<Optimization[]> {
    // Verify user owns the resume
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume || resume.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this resume'
      );
    }

    return this.prisma.optimization.findMany({
      where: { userId, resumeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List optimization records for a specific job
   * Returns optimization history for a particular job
   */
  async listOptimizationsByJob(
    userId: string,
    jobId: string
  ): Promise<Optimization[]> {
    // Verify user owns the job
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this job'
      );
    }

    return this.prisma.optimization.findMany({
      where: { userId, jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Calculate match score between resume and job
   * Analyzes skill match, experience match, education match, and keyword coverage
   */
  calculateMatchScore(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData
  ): MatchScore {
    const skiAIatch = this.calculateSkiAIatch(resumeData.skills, jobData);
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
      skiAIatch * 0.4 +
        experienceMatch * 0.3 +
        educationMatch * 0.15 +
        keywordCoverage * 0.15
    );

    // Ensure overall score is within 0-100 range
    const boundedOverall = Math.max(0, Math.min(100, overall));

    // Identify strengths and weaknesses
    const strengths = this.identifyStrengths(
      skiAIatch,
      experienceMatch,
      educationMatch,
      keywordCoverage
    );
    const weaknesses = this.identifyWeaknesses(
      skiAIatch,
      experienceMatch,
      educationMatch,
      keywordCoverage
    );

    // Identify missing keywords
    const missingKeywords = this.identifyMissingKeywords(resumeData, jobData);

    return {
      overall: boundedOverall,
      skiAIatch: Math.max(0, Math.min(100, skiAIatch)),
      experienceMatch: Math.max(0, Math.min(100, experienceMatch)),
      educationMatch: Math.max(0, Math.min(100, educationMatch)),
      keywordCoverage: Math.max(0, Math.min(100, keywordCoverage)),
      strengths,
      weaknesses,
      missingKeywords,
    };
  }

  /**
   * Calculate skill match percentage
   * Compares resume skills with required and preferred skills
   */
  private calculateSkiAIatch(
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
   * Compares resume experience with job requirements
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
   * Compares resume education with job requirements
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
   * Measures how many job keywords are present in resume
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
    skiAIatch: number,
    experienceMatch: number,
    educationMatch: number,
    keywordCoverage: number
  ): string[] {
    const strengths: string[] = [];

    if (skiAIatch >= 80) {
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
    skiAIatch: number,
    experienceMatch: number,
    educationMatch: number,
    keywordCoverage: number
  ): string[] {
    const weaknesses: string[] = [];

    if (skiAIatch < 60) {
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
   * Generate optimization suggestions
   * Uses AI engine to create specific improvement recommendations
   * Implements STAR method, quantification, and keyword insertion
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
      try {
        const aiSuggestions =
          await this.aiEngine.generateOptimizationSuggestions(
            resumeData,
            JSON.stringify(jobData)
          );

        if (aiSuggestions && Array.isArray(aiSuggestions)) {
          // Convert AI suggestions to our format
          const convertedAISuggestions = aiSuggestions.map(
            (s: any, index: number) => ({
              id: `ai-${index}`,
              type: s.type || SuggestionType.CONTENT,
              section: s.section || 'general',
              itemIndex: s.itemIndex,
              original: s.original || '',
              optimized: s.optimized || '',
              reason: s.reason || '',
              status: SuggestionStatus.PENDING,
            })
          );

          suggestions.push(...convertedAISuggestions);
        }
      } catch (aiError) {
        this.logger.warn(
          'AI suggestion generation failed, using rule-based suggestions only',
          aiError
        );
      }

      // Ensure we have at least 10 suggestions (requirement 5.1)
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
      // Return empty array if all fails
      return [];
    }
  }

  /**
   * Generate STAR method suggestions for experience descriptions
   * STAR = Situation, Task, Action, Result
   */
  private generateSTARSuggestions(
    experience: ParsedResumeData['experience'],
    jobData: ParsedJobData
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
    experience: ParsedResumeData['experience'][0]
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
   * Identifies achievements that could benefit from metrics
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
   * Identifies missing keywords from job description
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
   * Provides generic but valuable suggestions
   * Always generates enough suggestions to meet the minimum requirement
   */
  private generateDefaultSuggestions(
    resumeData: ParsedResumeData,
    jobData: ParsedJobData,
    count: number
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Suggestion 1: Add summary if missing
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

    // Suggestion 2: Improve skills section
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
      } else {
        suggestions.push({
          id: 'default-skills-expand',
          type: SuggestionType.STRUCTURE,
          section: 'skills',
          original: `Current skills: ${resumeData.skills.join(', ')}`,
          optimized:
            'Expand skills section with proficiency levels and related technologies',
          reason:
            'Detailed skills information helps recruiters better understand your capabilities',
          status: SuggestionStatus.PENDING,
        });
      }
    }

    // Suggestion 3: Enhance experience descriptions
    if (count > suggestions.length) {
      if (resumeData.experience.length > 0) {
        suggestions.push({
          id: 'default-experience',
          type: SuggestionType.CONTENT,
          section: 'experience',
          original: 'Current experience descriptions',
          optimized:
            'Rewrite experience using action verbs and quantifiable results',
          reason:
            'Strong action verbs and metrics make your experience more compelling to recruiters',
          status: SuggestionStatus.PENDING,
        });
      } else {
        suggestions.push({
          id: 'default-experience-add',
          type: SuggestionType.STRUCTURE,
          section: 'experience',
          original: 'No experience listed',
          optimized: 'Add relevant work experience or volunteer positions',
          reason:
            'Experience section is crucial for demonstrating your qualifications',
          status: SuggestionStatus.PENDING,
        });
      }
    }

    // Suggestion 4: Add projects if available
    if (count > suggestions.length) {
      if (resumeData.projects.length > 0) {
        suggestions.push({
          id: 'default-projects',
          type: SuggestionType.STRUCTURE,
          section: 'projects',
          original: 'Current projects section',
          optimized:
            'Highlight projects that demonstrate relevant skills for this role',
          reason:
            'Projects that align with job requirements strengthen your candidacy',
          status: SuggestionStatus.PENDING,
        });
      } else {
        suggestions.push({
          id: 'default-projects-add',
          type: SuggestionType.STRUCTURE,
          section: 'projects',
          original: 'No projects listed',
          optimized:
            'Add relevant projects that showcase your technical skills',
          reason:
            'Projects provide concrete evidence of your abilities and experience',
          status: SuggestionStatus.PENDING,
        });
      }
    }

    // Suggestion 5: Improve education section
    if (count > suggestions.length) {
      if (resumeData.education.length > 0) {
        suggestions.push({
          id: 'default-education',
          type: SuggestionType.STRUCTURE,
          section: 'education',
          original: 'Current education section',
          optimized: 'Add relevant coursework or achievements if applicable',
          reason:
            'Additional education details can strengthen your profile for specialized roles',
          status: SuggestionStatus.PENDING,
        });
      } else {
        suggestions.push({
          id: 'default-education-add',
          type: SuggestionType.STRUCTURE,
          section: 'education',
          original: 'No education listed',
          optimized: 'Add your educational background and qualifications',
          reason:
            'Education section helps recruiters understand your academic foundation',
          status: SuggestionStatus.PENDING,
        });
      }
    }

    // Suggestion 6: Add certifications
    if (count > suggestions.length) {
      suggestions.push({
        id: 'default-certifications',
        type: SuggestionType.STRUCTURE,
        section: 'certifications',
        original: 'Current certifications section',
        optimized:
          'Add relevant certifications and licenses that match job requirements',
        reason:
          'Certifications demonstrate specialized expertise and commitment to professional development',
        status: SuggestionStatus.PENDING,
      });
    }

    // Suggestion 7: Improve formatting and structure
    if (count > suggestions.length) {
      suggestions.push({
        id: 'default-formatting',
        type: SuggestionType.STRUCTURE,
        section: 'general',
        original: 'Current resume formatting',
        optimized:
          'Ensure consistent formatting, clear section headers, and proper spacing',
        reason:
          'Professional formatting improves readability and ATS compatibility',
        status: SuggestionStatus.PENDING,
      });
    }

    // Suggestion 8: Add metrics and numbers
    if (count > suggestions.length) {
      suggestions.push({
        id: 'default-metrics',
        type: SuggestionType.QUANTIFICATION,
        section: 'experience',
        original: 'Achievements without metrics',
        optimized:
          'Add specific numbers, percentages, or dollar amounts to achievements',
        reason:
          'Quantifiable results are more impressive and memorable to hiring managers',
        status: SuggestionStatus.PENDING,
      });
    }

    // Suggestion 9: Tailor to job description
    if (count > suggestions.length) {
      suggestions.push({
        id: 'default-tailoring',
        type: SuggestionType.KEYWORD,
        section: 'general',
        original: 'Generic resume content',
        optimized:
          'Customize resume to match specific job description language and requirements',
        reason:
          'Tailored resumes have higher match scores and pass ATS filters more effectively',
        status: SuggestionStatus.PENDING,
      });
    }

    // Suggestion 10: Highlight relevant achievements
    if (count > suggestions.length) {
      suggestions.push({
        id: 'default-achievements',
        type: SuggestionType.CONTENT,
        section: 'experience',
        original: 'Current achievement descriptions',
        optimized:
          'Prioritize and highlight achievements most relevant to the target role',
        reason:
          'Relevant achievements immediately demonstrate your fit for the position',
        status: SuggestionStatus.PENDING,
      });
    }

    return suggestions.slice(0, count);
  }

  /**
   * Apply a suggestion to the optimization
   * Updates the optimization record with accepted suggestion
   * Creates a new resume version with the optimized content
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

    suggestions[suggestionIndex].status = 'ACCEPTED';

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
   * Updates all accepted suggestions and creates a new resume version
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

      suggestions[suggestionIndex].status = 'ACCEPTED';

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
   * Apply a single suggestion to resume data
   * Updates the specific section and field based on suggestion type
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

      case 'education':
        if (itemIndex !== undefined && updated.education[itemIndex]) {
          const edu = updated.education[itemIndex];
          // Update education field if it matches
          if (edu.institution === original) {
            edu.institution = optimized;
          } else if (edu.degree === original) {
            edu.degree = optimized;
          } else if (edu.field === original) {
            edu.field = optimized;
          }
        }
        break;

      case 'summary':
        updated.summary = optimized;
        break;

      case 'projects':
        if (itemIndex !== undefined && updated.projects[itemIndex]) {
          const proj = updated.projects[itemIndex];
          if (proj.description === original) {
            proj.description = optimized;
          }
        }
        break;

      case 'general':
        // For general suggestions, we might update summary or add to skills
        if (!updated.summary) {
          updated.summary = optimized;
        }
        break;

      default:
        // Try to find and replace the original text anywhere in the resume
        this.replaceTextInResume(updated, original, optimized);
    }

    return updated;
  }

  /**
   * Replace text in resume data recursively
   * Used for general suggestions where section is not specific
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

  /**
   * Reject a suggestion
   * Updates the optimization record with rejected suggestion
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

    suggestions[suggestionIndex].status = 'REJECTED';

    // Update optimization
    return this.prisma.optimization.update({
      where: { id: optimizationId },
      data: {
        suggestions: suggestions as any,
      },
    });
  }
}
