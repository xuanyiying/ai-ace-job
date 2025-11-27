import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIEngine } from '../ai/ai.engine';

import { Sanitizer } from '../common/utils/sanitizer';
import { Job } from '@prisma/client';
import axios from 'axios';
import cheerio from 'cheerio';
import { JobInput, ParsedJobData } from '@/types';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private prisma: PrismaService,
    private aiEngine: AIEngine
  ) {}

  /**
   * Create a new job record
   * Accepts job description and requirements text
   * Parses the job description to extract structured data
   */
  async createJob(userId: string, jobData: JobInput): Promise<Job> {
    // Validate required fields
    if (!jobData.title || !jobData.company || !jobData.jobDescription) {
      throw new BadRequestException(
        'Title, company, and job description are required'
      );
    }

    try {
      // Sanitize inputs
      const sanitizedTitle = Sanitizer.sanitizeString(jobData.title);
      const sanitizedCompany = Sanitizer.sanitizeString(jobData.company);
      const sanitizedLocation = jobData.location
        ? Sanitizer.sanitizeString(jobData.location)
        : undefined;
      const sanitizedJobType = jobData.jobType
        ? Sanitizer.sanitizeString(jobData.jobType)
        : undefined;
      const sanitizedSalaryRange = jobData.salaryRange
        ? Sanitizer.sanitizeString(jobData.salaryRange)
        : undefined;
      const sanitizedJobDescription = Sanitizer.sanitizeString(
        jobData.jobDescription
      );
      const sanitizedRequirements = jobData.requirements
        ? Sanitizer.sanitizeString(jobData.requirements)
        : '';
      const sanitizedSourceUrl = jobData.sourceUrl
        ? Sanitizer.sanitizeUrl(jobData.sourceUrl)
        : undefined;

      // Parse job description to extract structured data
      const parsedRequirements = await this.parseJobDescription(
        sanitizedJobDescription
      );

      // Create job record in database
      const job = await this.prisma.job.create({
        data: {
          userId,
          title: sanitizedTitle,
          company: sanitizedCompany,
          location: sanitizedLocation,
          jobType: sanitizedJobType,
          salaryRange: sanitizedSalaryRange,
          jobDescription: sanitizedJobDescription,
          requirements: sanitizedRequirements,
          parsedRequirements: (parsedRequirements as any) || undefined,
          sourceUrl: sanitizedSourceUrl,
        },
      });

      return job;
    } catch (error) {
      this.logger.error(`Error creating job:`, error);
      throw new BadRequestException(
        `Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse job description text to extract structured data
   * Extracts required skills, responsibilities, keywords, etc.
   */
  async parseJobDescription(description: string): Promise<ParsedJobData> {
    if (!description || description.trim().length === 0) {
      throw new BadRequestException('Job description cannot be empty');
    }

    try {
      // Use new AI engine adapter to parse job description with multi-provider support
      return await this.aiEngine.parseJobDescription(description);
    } catch (error) {
      this.logger.error('Error parsing job description:', error);
      // Fall back to rule-based parsing
      return this.parseJobDescriptionWithRules(description);
    }
  }

  /**
   * Parse job description using rule-based extraction
   */
  private parseJobDescriptionWithRules(description: string): ParsedJobData {
    const lines = description
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    const result: ParsedJobData = {
      requiredSkills: this.extractSkills(description, true),
      preferredSkills: this.extractSkills(description, false),
      experienceYears: this.extractExperienceYears(description),
      educationLevel: this.extractEducationLevel(description),
      responsibilities: this.extractResponsibilities(lines),
      keywords: this.extractKeywords(description),
    };

    return result;
  }

  /**
   * Extract skills from job description
   */
  private extractSkills(description: string, _required: boolean): string[] {
    const skills: string[] = [];
    const commonSkills = [
      'javascript',
      'typescript',
      'python',
      'java',
      'c++',
      'c#',
      'go',
      'rust',
      'php',
      'ruby',
      'swift',
      'kotlin',
      'react',
      'vue',
      'angular',
      'node.js',
      'express',
      'django',
      'flask',
      'spring',
      'fastapi',
      'postgresql',
      'mysql',
      'mongodb',
      'redis',
      'elasticsearch',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
      'git',
      'ci/cd',
      'jenkins',
      'gitlab',
      'github',
      'rest api',
      'graphql',
      'sql',
      'nosql',
      'html',
      'css',
      'sass',
      'webpack',
      'vite',
      'jest',
      'mocha',
      'pytest',
      'junit',
      'agile',
      'scrum',
      'jira',
      'linux',
      'windows',
      'macos',
      'bash',
      'shell',
      'vim',
      'vscode',
      'intellij',
      'xcode',
      'visual studio',
      'figma',
      'sketch',
      'adobe xd',
      'photoshop',
      'illustrator',
      'blender',
      'unity',
      'unreal engine',
      'machine learning',
      'deep learning',
      'tensorflow',
      'pytorch',
      'scikit-learn',
      'pandas',
      'numpy',
      'data analysis',
      'data visualization',
      'tableau',
      'power bi',
      'excel',
      'sql server',
      'oracle',
      'salesforce',
      'sap',
      'erp',
      'crm',
      'communication',
      'leadership',
      'project management',
      'problem solving',
      'teamwork',
      'collaboration',
    ];

    const lowerDescription = description.toLowerCase();

    for (const skill of commonSkills) {
      if (lowerDescription.includes(skill)) {
        skills.push(skill);
      }
    }

    return [...new Set(skills)]; // Remove duplicates
  }

  /**
   * Extract years of experience requirement
   */
  private extractExperienceYears(description: string): number | undefined {
    const patterns = [
      /(\d+)\+?\s*years?\s*of\s*experience/i,
      /(\d+)\+?\s*years?\s*experience/i,
      /experience:\s*(\d+)\+?\s*years?/i,
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Extract education level requirement
   */
  private extractEducationLevel(description: string): string | undefined {
    const educationLevels = [
      'phd',
      'master',
      'bachelor',
      'associate',
      'high school',
      'diploma',
    ];
    const lowerDescription = description.toLowerCase();

    for (const level of educationLevels) {
      if (lowerDescription.includes(level)) {
        return level;
      }
    }

    return undefined;
  }

  /**
   * Extract responsibilities from job description
   */
  private extractResponsibilities(lines: string[]): string[] {
    const responsibilities: string[] = [];
    const responsibilityKeywords = [
      'responsibilities',
      'duties',
      'key responsibilities',
      'what you will do',
      'you will',
    ];

    let inResponsibilitiesSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check if we're entering responsibilities section
      if (
        responsibilityKeywords.some((keyword) => lowerLine.includes(keyword))
      ) {
        inResponsibilitiesSection = true;
        continue;
      }

      // Check if we're leaving responsibilities section
      if (
        inResponsibilitiesSection &&
        (lowerLine.includes('requirements') ||
          lowerLine.includes('qualifications') ||
          lowerLine.includes('benefits') ||
          lowerLine.includes('about us'))
      ) {
        inResponsibilitiesSection = false;
      }

      // Collect responsibility lines
      if (
        inResponsibilitiesSection &&
        (line.startsWith('-') ||
          line.startsWith('•') ||
          line.startsWith('*') ||
          /^\d+\./.test(line))
      ) {
        const responsibility = line.replace(/^[-•*\d.]\s*/, '').trim();
        if (responsibility.length > 0) {
          responsibilities.push(responsibility);
        }
      }
    }

    return responsibilities;
  }

  /**
   * Extract keywords from job description
   */
  private extractKeywords(description: string): string[] {
    const keywords: string[] = [];
    // Extract words that are capitalized or in quotes
    const capitalizedWords =
      description.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const quotedWords = description.match(/"([^"]+)"/g) || [];

    keywords.push(...capitalizedWords);
    keywords.push(...quotedWords.map((w) => w.replace(/"/g, '')));

    return [...new Set(keywords)].slice(0, 20); // Return top 20 unique keywords
  }

  /**
   * Fetch job information from a URL
   * Scrapes the webpage and extracts job details
   */
  async fetchJobFromUrl(url: string): Promise<JobInput> {
    if (!url || !this.isValidUrl(url)) {
      throw new BadRequestException('Invalid URL provided');
    }

    if (!cheerio) {
      throw new BadRequestException(
        'URL fetching is not available. Please ensure cheerio is installed.'
      );
    }

    try {
      // Sanitize URL
      const sanitizedUrl = Sanitizer.sanitizeUrl(url);

      // Fetch the webpage
      const response = await axios.get(sanitizedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract job information from common HTML patterns
      const jobData = this.extractJobDataFromHTML($);

      return jobData;
    } catch (error) {
      this.logger.error(`Error fetching job from URL ${url}:`, error);
      throw new BadRequestException(
        `Failed to fetch job information from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract job data from HTML using common patterns
   */
  private extractJobDataFromHTML($: any): JobInput {
    // Try to extract common job posting elements
    const title =
      $('h1').first().text() ||
      $('[data-testid="jobTitle"]').text() ||
      $('.job-title').text() ||
      '';

    const company =
      $('[data-testid="companyName"]').text() ||
      $('.company-name').text() ||
      $('[itemprop="hiringOrganization"]').text() ||
      '';

    const location =
      $('[data-testid="jobLocation"]').text() ||
      $('.job-location').text() ||
      $('[itemprop="jobLocation"]').text() ||
      '';

    // Extract job description - try multiple selectors
    let jobDescription =
      $('[data-testid="jobDescription"]').text() ||
      $('.job-description').text() ||
      $('[itemprop="description"]').text() ||
      $('main').text() ||
      $('article').text() ||
      '';

    // Extract requirements section
    let requirements = '';
    const requirementsSection = $('h2, h3')
      .filter((_i: number, el: any) => {
        const text = $(el).text().toLowerCase();
        return (
          text.includes('requirement') ||
          text.includes('qualification') ||
          text.includes('skills')
        );
      })
      .first();

    if (requirementsSection.length > 0) {
      let current = requirementsSection.next();
      while (current.length > 0 && !current.is('h2, h3')) {
        requirements += current.text() + '\n';
        current = current.next();
      }
    }

    // If requirements not found, use job description
    if (!requirements) {
      requirements = jobDescription;
    }

    // Clean up text
    jobDescription = jobDescription.replace(/\s+/g, ' ').trim();
    requirements = requirements.replace(/\s+/g, ' ').trim();

    if (!jobDescription || jobDescription.length < 50) {
      throw new BadRequestException(
        'Could not extract sufficient job information from the provided URL'
      );
    }

    return {
      title: title.trim() || 'Job Title',
      company: company.trim() || 'Company Name',
      location: location.trim() || undefined,
      jobDescription,
      requirements,
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a job by ID
   * Ensures user owns the job
   */
  async getJob(jobId: string, userId: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this job'
      );
    }

    return job;
  }

  /**
   * List all jobs for a user
   */
  async listJobs(userId: string): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a job
   */
  async updateJob(
    jobId: string,
    userId: string,
    data: Partial<JobInput>
  ): Promise<Job> {
    const job = await this.getJob(jobId, userId);

    // If job description is updated, re-parse it
    let parsedRequirements = job.parsedRequirements;
    if (data.jobDescription) {
      parsedRequirements = (await this.parseJobDescription(
        data.jobDescription
      )) as any;
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        title: data.title || job.title,
        company: data.company || job.company,
        location: data.location || job.location,
        jobType: data.jobType || job.jobType,
        salaryRange: data.salaryRange || job.salaryRange,
        jobDescription: data.jobDescription || job.jobDescription,
        requirements: data.requirements || job.requirements,
        parsedRequirements: (parsedRequirements as any) || undefined,
      },
    });
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string, userId: string): Promise<void> {
    await this.getJob(jobId, userId);

    await this.prisma.job.delete({
      where: { id: jobId },
    });
  }
}
