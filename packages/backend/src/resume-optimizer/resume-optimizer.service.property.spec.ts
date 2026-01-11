/**
 * Property-based tests for ResumeOptimizerService
 * Tests streaming functionality with various inputs
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ResumeOptimizerService } from './resume-optimizer.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AIEngineService } from '@/ai-providers/ai-engine.service';
import { QuotaService } from '@/quota/quota.service';
import { PromptScenario } from '@/ai-providers/interfaces/prompt-template.interface';
import * as fc from 'fast-check';

describe('ResumeOptimizerService Property Tests', () => {
  let service: ResumeOptimizerService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiEngineService: jest.Mocked<AIEngineService>;
  let quotaService: jest.Mocked<QuotaService>;

  // Mock implementations
  const mockPrismaService = {
    optimization: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    resume: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    job: {
      findUnique: jest.fn(),
    },
  };

  const mockAIEngineService = {
    stream: jest.fn(),
  };

  const mockQuotaService = {
    enforceOptimizationQuota: jest.fn(),
    incrementOptimizationCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeOptimizerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AIEngineService, useValue: mockAIEngineService },
        { provide: QuotaService, useValue: mockQuotaService },
      ],
    }).compile();

    service = module.get<ResumeOptimizerService>(ResumeOptimizerService);
    prismaService = module.get(PrismaService);
    aiEngineService = module.get(AIEngineService);
    quotaService = module.get(QuotaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  // Arbitrary generators
  const arbitraryResumeContent = (): fc.Arbitrary<string> => {
    return fc.string({ minLength: 10, maxLength: 1000 });
  };

  const arbitraryUserId = (): fc.Arbitrary<string> => {
    return fc.uuid();
  };

  const arbitraryStreamChunks = (): fc.Arbitrary<
    Array<{ content: string }>
  > => {
    return fc.array(
      fc.record({
        content: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      { minLength: 1, maxLength: 10 }
    );
  };

  // Generate language codes
  const arbitraryLanguage = (): fc.Arbitrary<string> => {
    return fc.constantFrom('zh-CN', 'en-US', 'en', 'zh');
  };

  describe('optimizeResume streaming', () => {
    it('should stream content in semantic chunks', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryResumeContent(),
          arbitraryUserId(),
          arbitraryLanguage(),
          arbitraryStreamChunks(),
          async (resumeContent, userId, language, streamChunks) => {
            // Mock AI engine to return the provided chunks
            aiEngineService.stream.mockImplementation(async function* () {
              for (const chunk of streamChunks) {
                yield {
                  content: chunk.content,
                  model: 'test-model',
                  provider: 'test-provider',
                };
              }
            });

            // Collect all output chunks
            const outputChunks: string[] = [];
            const stream = service.optimizeResume(resumeContent, userId, {
              language,
            });

            for await (const chunk of stream) {
              if (chunk.type === 'chunk' && chunk.content) {
                outputChunks.push(chunk.content);
              }
            }

            // Calculate expected total content
            const expectedContent = streamChunks
              .map((chunk) => chunk.content)
              .join('');

            // Verify total content matches
            const actualContent = outputChunks.join('');
            expect(actualContent).toBe(expectedContent);

            // Verify AI engine was called with correct parameters
            expect(aiEngineService.stream).toHaveBeenCalledWith(
              expect.objectContaining({
                prompt: expect.stringContaining(resumeContent),
                temperature: 0.7,
                maxTokens: 4000,
              }),
              userId,
              PromptScenario.RESUME_CONTENT_OPTIMIZATION,
              language
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle empty content gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\n\n', '\t\t'),
          arbitraryUserId(),
          arbitraryLanguage(),
          async (emptyContent, userId, language) => {
            // Collect all output chunks
            const allChunks: any[] = [];
            const stream = service.optimizeResume(emptyContent, userId, {
              language,
            });

            for await (const chunk of stream) {
              allChunks.push(chunk);
            }

            // Should have at least one error chunk
            const errorChunks = allChunks.filter(
              (chunk) => chunk.type === 'error'
            );
            expect(errorChunks.length).toBeGreaterThan(0);
            expect(errorChunks[0].message).toBe('Resume content is required');

            // AI engine should not be called
            expect(aiEngineService.stream).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle empty userId gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryResumeContent(),
          fc.constantFrom('', '   ', '\n'),
          arbitraryLanguage(),
          async (resumeContent, emptyUserId, language) => {
            // Collect all output chunks
            const allChunks: any[] = [];
            const stream = service.optimizeResume(resumeContent, emptyUserId, {
              language,
            });

            for await (const chunk of stream) {
              allChunks.push(chunk);
            }

            // Should have at least one error chunk
            const errorChunks = allChunks.filter(
              (chunk) => chunk.type === 'error'
            );
            expect(errorChunks.length).toBeGreaterThan(0);
            expect(errorChunks[0].message).toBe('User ID is required');

            // AI engine should not be called
            expect(aiEngineService.stream).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle large content with proper chunking', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryResumeContent(),
          arbitraryUserId(),
          arbitraryLanguage(),
          // Generate meaningful long content that will trigger chunking
          fc.array(
            fc.string({ minLength: 50, maxLength: 200 }).map((s) => ({
              content: s + '\n\n',
            })),
            { minLength: 3, maxLength: 8 }
          ),
          async (resumeContent, userId, language, longContentParts) => {
            // Create meaningful content with paragraph breaks
            const longContent = longContentParts
              .map((part) => part.content)
              .join('');

            // Mock AI engine to return long content
            aiEngineService.stream.mockImplementation(async function* () {
              yield {
                content: longContent,
                model: 'test-model',
                provider: 'test-provider',
              };
            });

            // Collect all output chunks
            const outputChunks: string[] = [];
            const stream = service.optimizeResume(resumeContent, userId, {
              language,
            });

            for await (const chunk of stream) {
              if (chunk.type === 'chunk' && chunk.content) {
                outputChunks.push(chunk.content);
              }
            }

            // Verify content is properly chunked (should have multiple chunks for long content)
            if (longContent.length > 300) {
              expect(outputChunks.length).toBeGreaterThan(1);
            }

            // Verify total content matches
            const actualContent = outputChunks.join('');
            expect(actualContent).toBe(longContent);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should handle AI engine errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryResumeContent(),
          arbitraryUserId(),
          arbitraryLanguage(),
          fc.string({ minLength: 5, maxLength: 100 }),
          async (resumeContent, userId, language, errorMessage) => {
            // Mock AI engine to throw error
            aiEngineService.stream.mockImplementation(async function* () {
              throw new Error(errorMessage);
            });

            // Collect all output chunks
            const allChunks: any[] = [];
            const stream = service.optimizeResume(resumeContent, userId, {
              language,
            });

            for await (const chunk of stream) {
              allChunks.push(chunk);
            }

            // Should have at least one error chunk
            const errorChunks = allChunks.filter(
              (chunk) => chunk.type === 'error'
            );
            expect(errorChunks.length).toBeGreaterThan(0);
            expect(errorChunks[0].message).toBe(errorMessage);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve Chinese characters and formatting', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 10 }),
            phone: fc.string({ minLength: 8, maxLength: 15 }),
            company: fc.string({ minLength: 3, maxLength: 20 }),
          }),
          arbitraryUserId(),
          arbitraryLanguage(),
          async (data, userId, language) => {
            const originalContent = `姓名: ${data.name}\n电话: ${data.phone}\n公司: ${data.company}`;

            // Mock AI engine to return content with Chinese characters
            aiEngineService.stream.mockImplementation(async function* () {
              yield {
                content: `优化后的${originalContent}`,
                model: 'test-model',
                provider: 'test-provider',
              };
            });

            // Collect all output chunks
            const outputChunks: string[] = [];
            const stream = service.optimizeResume(originalContent, userId, {
              language,
            });

            for await (const chunk of stream) {
              if (chunk.type === 'chunk' && chunk.content) {
                outputChunks.push(chunk.content);
              }
            }

            // Verify Chinese characters are preserved
            const actualContent = outputChunks.join('');
            expect(actualContent).toContain('优化后的');
            expect(actualContent).toContain(data.name);
            expect(actualContent).toContain(data.phone);
            expect(actualContent).toContain(data.company);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
