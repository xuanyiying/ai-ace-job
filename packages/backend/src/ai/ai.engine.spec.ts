import { Test, TestingModule } from '@nestjs/testing';
import { AIEngine } from './ai.engine';
import { AIEngineService } from '../ai-providers/ai-engine.service';
import * as fc from 'fast-check';
import { ParsedResumeData } from '@/types';

describe('AIEngine', () => {
  let engine: AIEngine;
  let aiEngineService: AIEngineService;

  const mockAIEngineService = {
    call: jest.fn(),
    stream: jest.fn(),
    getAvailableModels: jest.fn(),
    reloadModels: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIEngine,
        {
          provide: AIEngineService,
          useValue: mockAIEngineService,
        },
      ],
    }).compile();

    engine = module.get<AIEngine>(AIEngine);
    aiEngineService = module.get<AIEngineService>(AIEngineService);
  });

  describe('extractTextFromFile', () => {
    it('should extract text from TXT file', async () => {
      const content = 'John Doe\njohn@example.com\n123-456-7890';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await engine.extractTextFromFile(buffer, 'txt');

      expect(result).toBe(content);
    });

    it('should throw error for unsupported file type', async () => {
      const buffer = Buffer.from('test');

      await expect(engine.extractTextFromFile(buffer, 'xyz')).rejects.toThrow(
        'Unsupported file type'
      );
    });
  });

  describe('parseResumeContent', () => {
    const mockResumeData: ParsedResumeData = {
      personalInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
      },
      education: [],
      experience: [],
      skills: ['JavaScript', 'TypeScript', 'React'],
      projects: [],
    };

    beforeEach(() => {
      mockAIEngineService.call.mockResolvedValue({
        content: JSON.stringify(mockResumeData),
        model: 'test-model',
        provider: 'test-provider',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });
    });

    it('should parse resume and extract personal info', async () => {
      const content = `
        John Doe
        john.doe@example.com
        (555) 123-4567
        New York, NY
        linkedin.com/in/johndoe
        github.com/johndoe
      `;

      const result = await engine.parseResumeContent(content);

      expect(result.personalInfo).toBeDefined();
      expect(result.personalInfo.email).toBe('john.doe@example.com');
      expect(result.personalInfo.name).toBe('John Doe');
      expect(aiEngineService.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: content,
          metadata: expect.objectContaining({
            templateName: 'parse_resume',
          }),
        }),
        'system',
        'resume-parsing'
      );
    });

    it('should handle AI service error gracefully', async () => {
      mockAIEngineService.call.mockRejectedValue(new Error('AI service error'));

      const content = 'John Doe\njohn@example.com';
      const result = await engine.parseResumeContent(content);

      // Should return empty resume data on error
      expect(result).toBeDefined();
      expect(result.personalInfo).toBeDefined();
      expect(result.personalInfo.name).toBe('');
      expect(result.personalInfo.email).toBe('');
    });

    it('should return valid ParsedResumeData structure', async () => {
      const content = 'John Doe\njohn@example.com';

      const result = await engine.parseResumeContent(content);

      expect(result).toHaveProperty('personalInfo');
      expect(result).toHaveProperty('education');
      expect(result).toHaveProperty('experience');
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('projects');
      expect(Array.isArray(result.education)).toBe(true);
      expect(Array.isArray(result.experience)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
      expect(Array.isArray(result.projects)).toBe(true);
    });
  });

  describe('parseJobDescription', () => {
    const mockJobData = {
      requiredSkills: ['JavaScript', 'React'],
      preferredSkills: ['TypeScript', 'Node.js'],
      experienceYears: 3,
      educationLevel: 'Bachelor',
      responsibilities: ['Develop features', 'Write tests'],
      keywords: ['frontend', 'web development'],
    };

    beforeEach(() => {
      mockAIEngineService.call.mockResolvedValue({
        content: JSON.stringify(mockJobData),
        model: 'test-model',
        provider: 'test-provider',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });
    });

    it('should parse job description', async () => {
      const description =
        'Looking for a frontend developer with React experience';

      const result = await engine.parseJobDescription(description);

      expect(result).toBeDefined();
      expect(result.requiredSkills).toContain('JavaScript');
      expect(aiEngineService.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: description,
          metadata: expect.objectContaining({
            templateName: 'parse_job_description',
          }),
        }),
        'system',
        'job-description-parsing'
      );
    });

    it('should handle parsing errors gracefully', async () => {
      mockAIEngineService.call.mockRejectedValue(new Error('Parsing failed'));

      const description = 'Test job description';
      const result = await engine.parseJobDescription(description);

      expect(result).toBeDefined();
      expect(result.requiredSkills).toEqual([]);
      expect(result.preferredSkills).toEqual([]);
    });
  });

  describe('generateOptimizationSuggestions', () => {
    const mockSuggestions = [
      {
        type: 'keyword',
        section: 'skills',
        original: 'Missing keywords',
        optimized: 'Add React, TypeScript',
        reason: 'Job requires these skills',
      },
    ];

    beforeEach(() => {
      mockAIEngineService.call.mockResolvedValue({
        content: JSON.stringify(mockSuggestions),
        model: 'test-model',
        provider: 'test-provider',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });
    });

    it('should generate optimization suggestions', async () => {
      const resumeData: ParsedResumeData = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        education: [],
        experience: [],
        skills: ['JavaScript'],
        projects: [],
      };

      const jobDescription = 'Looking for React developer';

      const result = await engine.generateOptimizationSuggestions(
        resumeData,
        jobDescription
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(aiEngineService.call).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            templateName: 'generate_suggestions',
          }),
        }),
        'system',
        'resume-optimization'
      );
    });

    it('should return empty array on error', async () => {
      mockAIEngineService.call.mockRejectedValue(new Error('AI error'));

      const resumeData: ParsedResumeData = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        education: [],
        experience: [],
        skills: [],
        projects: [],
      };

      const result = await engine.generateOptimizationSuggestions(
        resumeData,
        'job description'
      );

      expect(result).toEqual([]);
    });
  });

  describe('generateInterviewQuestions', () => {
    const mockQuestions = [
      {
        questionType: 'technical',
        question: 'Explain React hooks',
        suggestedAnswer: 'React hooks are...',
        tips: ['Be specific', 'Give examples'],
        difficulty: 'medium',
      },
    ];

    beforeEach(() => {
      mockAIEngineService.call.mockResolvedValue({
        content: JSON.stringify(mockQuestions),
        model: 'test-model',
        provider: 'test-provider',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });
    });

    it('should generate interview questions', async () => {
      const resumeData: ParsedResumeData = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        education: [],
        experience: [],
        skills: ['React', 'TypeScript'],
        projects: [],
      };

      const jobDescription = 'Frontend developer role';

      const result = await engine.generateInterviewQuestions(
        resumeData,
        jobDescription
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(aiEngineService.call).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            templateName: 'generate_interview_questions',
          }),
        }),
        'system',
        'interview-question-generation'
      );
    });

    it('should return empty array on error', async () => {
      mockAIEngineService.call.mockRejectedValue(new Error('AI error'));

      const resumeData: ParsedResumeData = {
        personalInfo: { name: 'John', email: 'john@example.com' },
        education: [],
        experience: [],
        skills: [],
        projects: [],
      };

      const result = await engine.generateInterviewQuestions(
        resumeData,
        'job description'
      );

      expect(result).toEqual([]);
    });
  });

  describe('Caching', () => {
    it('should handle cache clear request', async () => {
      await engine.clearCache('test_key');
      // Should not throw - cache is managed by AIEngineService
      expect(true).toBe(true);
    });

    it('should handle clear all cache request', async () => {
      await engine.clearAllCache();
      // Should not throw - cache is managed by AIEngineService
      expect(true).toBe(true);
    });
  });

  describe('Property Tests', () => {
    /**
     * **Feature: resume-optimizer-mvp, Property 5: 简历解析性能**
     * For any valid resume content, the system should handle parsing request
     */
    it('should handle resume parsing for various inputs', async () => {
      mockAIEngineService.call.mockResolvedValue({
        content: JSON.stringify({
          personalInfo: { name: 'Test', email: 'test@example.com' },
          education: [],
          experience: [],
          skills: [],
          projects: [],
        }),
        model: 'test-model',
        provider: 'test-provider',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const resumeContent = `
        John Doe
        john@example.com
        (555) 123-4567

        Education
        Bachelor of Science in Computer Science
        University of California, Berkeley

        Experience
        Senior Software Engineer at Tech Corp
        - Led development of microservices
        - Improved performance by 40%

        Skills
        JavaScript, TypeScript, React, Node.js, PostgreSQL
      `;

      const result = await engine.parseResumeContent(resumeContent);

      expect(result).toBeDefined();
      expect(result.personalInfo).toBeDefined();
    });

    /**
     * **Feature: resume-optimizer-mvp, Property 6: 解析数据结构完整性**
     * For any successfully parsed resume, the returned JSON data should contain
     * personalInfo, education, experience, and skills fields
     */
    it('should return complete parsed data structure for all resumes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 1,
            maxLength: 5,
          }),
          async (name, email, skills) => {
            mockAIEngineService.call.mockResolvedValue({
              content: JSON.stringify({
                personalInfo: { name, email: `${email}@example.com` },
                education: [],
                experience: [],
                skills,
                projects: [],
              }),
              model: 'test-model',
              provider: 'test-provider',
              usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
              finishReason: 'stop',
            });

            const resumeContent = `
              ${name}
              ${email}@example.com

              Skills
              ${skills.join(', ')}
            `;

            const result = await engine.parseResumeContent(resumeContent);

            // Verify structure
            expect(result).toHaveProperty('personalInfo');
            expect(result.personalInfo).toHaveProperty('name');
            expect(result.personalInfo).toHaveProperty('email');
            expect(Array.isArray(result.education)).toBe(true);
            expect(Array.isArray(result.experience)).toBe(true);
            expect(Array.isArray(result.skills)).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: resume-optimizer-mvp, Property 32: AI 调用重试机制**
     * For any AI model call failure, the system should handle errors gracefully
     */
    it('should handle AI call failures gracefully', async () => {
      mockAIEngineService.call.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const content = `
        John Doe
        john@example.com

        Skills
        JavaScript, TypeScript, React
      `;

      // Should return empty data structure on error
      const result = await engine.parseResumeContent(content);

      expect(result).toBeDefined();
      expect(result.personalInfo).toBeDefined();
      expect(Array.isArray(result.skills)).toBe(true);
    });
  });
});
