import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PromptTemplate,
  PromptTemplateVersion,
  PromptScenario,
  TemplateRenderContext,
} from '../interfaces/prompt-template.interface';

/**
 * Prompt Template Manager
 * Manages prompt templates for different scenarios
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
@Injectable()
export class PromptTemplateManager {
  private readonly logger = new Logger(PromptTemplateManager.name);
  private templateCache: Map<string, PromptTemplate> = new Map();

  constructor(private prisma: PrismaService) {
    this.initializePredefinedTemplates();
  }

  /**
   * Initialize predefined templates for all scenarios
   * Property 16: Predefined templates exist
   * Validates: Requirements 4.2
   */
  private async initializePredefinedTemplates(): Promise<void> {
    const predefinedTemplates = this.getPredefinedTemplates();

    for (const template of predefinedTemplates) {
      try {
        const existing = await this.prisma.promptTemplate.findUnique({
          where: { name: template.name },
        });

        if (!existing) {
          await this.prisma.promptTemplate.create({
            data: {
              name: template.name,
              scenario: template.scenario,
              template: template.template,
              variables: template.variables,
              provider: template.provider,
              isEncrypted: template.isEncrypted,
              isActive: true,
            },
          });
          this.logger.log(`Created predefined template: ${template.name}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to initialize template ${template.name}:`,
          error
        );
      }
    }
  }

  /**
   * Get predefined templates for all scenarios
   */
  private getPredefinedTemplates(): Array<{
    name: string;
    scenario: string;
    template: string;
    variables: string[];
    provider?: string;
    isEncrypted: boolean;
  }> {
    return [
      {
        name: 'resume_parsing_default',
        scenario: PromptScenario.RESUME_PARSING,
        template: `Please parse the following resume and extract the key information in JSON format:

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

Return the result as valid JSON.`,
        variables: ['resume_content'],
        isEncrypted: false,
      },
      {
        name: 'job_description_parsing_default',
        scenario: PromptScenario.JOB_DESCRIPTION_PARSING,
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
    ];
  }

  /**
   * Get a template by scenario and optional provider
   * Property 15: Multiple template support
   * Validates: Requirements 4.1
   */
  async getTemplate(
    scenario: string,
    provider?: string,
    version?: number
  ): Promise<PromptTemplate | null> {
    try {
      // Try to get provider-specific template first
      if (provider) {
        const cacheKey = `${scenario}:${provider}:${version || 'latest'}`;
        if (this.templateCache.has(cacheKey)) {
          return this.templateCache.get(cacheKey) || null;
        }

        const template = await this.prisma.promptTemplate.findFirst({
          where: {
            scenario,
            provider,
            isActive: true,
          },
        });

        if (template) {
          this.templateCache.set(cacheKey, template as PromptTemplate);
          return template as PromptTemplate;
        }
      }

      // Fall back to generic template
      const cacheKey = `${scenario}:generic:${version || 'latest'}`;
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey) || null;
      }

      const template = await this.prisma.promptTemplate.findFirst({
        where: {
          scenario,
          provider: null,
          isActive: true,
        },
      });

      if (template) {
        this.templateCache.set(cacheKey, template as PromptTemplate);
        return template as PromptTemplate;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get template for scenario ${scenario}:`,
        error
      );
      return null;
    }
  }

  /**
   * Render a template with provided variables
   * Property 18: Template rendering correctness (round-trip property)
   * Validates: Requirements 4.4
   */
  async renderTemplate(
    template: PromptTemplate,
    variables: TemplateRenderContext
  ): Promise<string> {
    try {
      let rendered = template.template;

      // Replace all variables in the template
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        const stringValue = String(value);
        // Use a function to avoid regex special character issues
        rendered = rendered.split(placeholder).join(stringValue);
      }

      // Check if all required variables were provided
      const unreplacedPlaceholders = rendered.match(/{[^}]+}/g);
      if (unreplacedPlaceholders && unreplacedPlaceholders.length > 0) {
        this.logger.warn(
          `Template rendering left unreplaced placeholders: ${unreplacedPlaceholders.join(', ')}`
        );
      }

      return rendered;
    } catch (error) {
      this.logger.error('Failed to render template:', error);
      throw error;
    }
  }

  /**
   * Create a new version of a template
   * Property 53: Prompt template version creation
   * Validates: Requirements 10.1
   */
  async createVersion(
    scenario: string,
    templateContent: string,
    reason: string,
    author: string,
    provider?: string
  ): Promise<PromptTemplateVersion> {
    try {
      // Get or create the base template
      let template = await this.prisma.promptTemplate.findFirst({
        where: {
          scenario,
          provider: provider || null,
        },
      });

      if (!template) {
        template = await this.prisma.promptTemplate.create({
          data: {
            name: `${scenario}_${provider || 'generic'}_${Date.now()}`,
            scenario,
            template: templateContent,
            variables: this.extractVariables(templateContent),
            provider,
            isEncrypted: false,
            isActive: true,
          },
        });
      }

      // Get the next version number
      const lastVersion = await this.prisma.promptTemplateVersion.findFirst({
        where: { templateId: template.id },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (lastVersion?.version || 0) + 1;

      // Create new version
      const version = await this.prisma.promptTemplateVersion.create({
        data: {
          templateId: template.id,
          version: nextVersion,
          content: templateContent,
          variables: this.extractVariables(templateContent),
          author,
          reason,
          isActive: false,
        },
      });

      // Update the main template
      await this.prisma.promptTemplate.update({
        where: { id: template.id },
        data: {
          template: templateContent,
          variables: this.extractVariables(templateContent),
          version: nextVersion,
        },
      });

      // Clear cache
      this.templateCache.clear();

      this.logger.log(
        `Created version ${nextVersion} for template ${scenario}`
      );

      return version as PromptTemplateVersion;
    } catch (error) {
      this.logger.error('Failed to create template version:', error);
      throw error;
    }
  }

  /**
   * List all versions of a template
   * Property 54: Version metadata recording
   * Validates: Requirements 10.2
   */
  async listVersions(scenario: string): Promise<PromptTemplateVersion[]> {
    try {
      const template = await this.prisma.promptTemplate.findFirst({
        where: { scenario },
      });

      if (!template) {
        return [];
      }

      const versions = await this.prisma.promptTemplateVersion.findMany({
        where: { templateId: template.id },
        orderBy: { version: 'desc' },
      });

      return versions as PromptTemplateVersion[];
    } catch (error) {
      this.logger.error(
        `Failed to list versions for scenario ${scenario}:`,
        error
      );
      return [];
    }
  }

  /**
   * Rollback to a specific version
   * Property 57: Version rollback
   * Validates: Requirements 10.5
   */
  async rollback(
    scenario: string,
    version: number
  ): Promise<PromptTemplate | null> {
    try {
      const template = await this.prisma.promptTemplate.findFirst({
        where: { scenario },
      });

      if (!template) {
        this.logger.warn(`Template not found for scenario ${scenario}`);
        return null;
      }

      const targetVersion = await this.prisma.promptTemplateVersion.findUnique({
        where: {
          templateId_version: {
            templateId: template.id,
            version,
          },
        },
      });

      if (!targetVersion) {
        this.logger.warn(
          `Version ${version} not found for template ${scenario}`
        );
        return null;
      }

      // Update the main template to use this version
      const updated = await this.prisma.promptTemplate.update({
        where: { id: template.id },
        data: {
          template: targetVersion.content,
          variables: targetVersion.variables,
          version,
        },
      });

      // Clear cache
      this.templateCache.clear();

      this.logger.log(`Rolled back template ${scenario} to version ${version}`);

      return updated as PromptTemplate;
    } catch (error) {
      this.logger.error(
        `Failed to rollback template ${scenario} to version ${version}:`,
        error
      );
      return null;
    }
  }

  /**
   * Extract variables from a template string
   * Finds all {variable_name} patterns
   */
  private extractVariables(template: string): string[] {
    const matches = template.match(/{([^}]+)}/g);
    if (!matches) {
      return [];
    }

    const uniqueVars = new Set(matches.map((m) => m.slice(1, -1)));
    return Array.from(uniqueVars);
  }

  /**
   * Clear the template cache
   * Property 20: Dynamic template loading
   * Validates: Requirements 4.6
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }

  /**
   * Reload all templates from database
   */
  async reloadTemplates(): Promise<void> {
    try {
      this.clearCache();
      await this.initializePredefinedTemplates();
      this.logger.log('Templates reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to reload templates:', error);
    }
  }

  /**
   * Get all templates
   * Property 15: Multiple template support
   * Validates: Requirements 4.1
   */
  async getAllTemplates(): Promise<PromptTemplate[]> {
    try {
      const templates = await this.prisma.promptTemplate.findMany({
        where: { isActive: true },
        orderBy: { scenario: 'asc' },
      });

      return templates as PromptTemplate[];
    } catch (error) {
      this.logger.error('Failed to get all templates:', error);
      return [];
    }
  }

  /**
   * Create a new template
   * Property 15: Multiple template support
   * Validates: Requirements 4.1
   */
  async createTemplate(data: {
    name: string;
    scenario: string;
    template: string;
    variables: string[];
    provider?: string;
    isEncrypted?: boolean;
  }): Promise<PromptTemplate> {
    try {
      const created = await this.prisma.promptTemplate.create({
        data: {
          name: data.name,
          scenario: data.scenario,
          template: data.template,
          variables: data.variables,
          provider: data.provider,
          isEncrypted: data.isEncrypted || false,
          isActive: true,
        },
      });

      // Clear cache
      this.templateCache.clear();

      this.logger.log(`Created template: ${data.name}`);

      return created as PromptTemplate;
    } catch (error) {
      this.logger.error('Failed to create template:', error);
      throw error;
    }
  }
}
