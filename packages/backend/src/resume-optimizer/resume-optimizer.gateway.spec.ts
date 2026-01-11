/**
 * Resume Optimizer Gateway Tests
 * Tests for WebSocket gateway handling resume optimization streaming
 * **Feature: resume-chat-optimizer, Property 4: 流式输出完整性**
 * **Validates: Requirements 2.2**
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ResumeOptimizerGateway } from './resume-optimizer.gateway';
import { AIEngineService } from '@/ai-providers/ai-engine.service';
import { AIStreamChunk } from '@/ai-providers/interfaces';
import { Logger } from '@nestjs/common';

// Mock Socket.IO
const mockSocket = {
  id: 'test-socket-id',
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
};

describe('ResumeOptimizerGateway', () => {
  let gateway: ResumeOptimizerGateway;
  let aiEngineService: jest.Mocked<AIEngineService>;

  beforeEach(async () => {
    const mockAIEngineService = {
      stream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeOptimizerGateway,
        {
          provide: AIEngineService,
          useValue: mockAIEngineService,
        },
      ],
    }).compile();

    gateway = module.get<ResumeOptimizerGateway>(ResumeOptimizerGateway);
    aiEngineService = module.get(AIEngineService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Gateway Initialization', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should have required methods', () => {
      expect(gateway.handleConnection).toBeDefined();
      expect(gateway.handleDisconnect).toBeDefined();
      expect(gateway.handleOptimize).toBeDefined();
      expect(gateway.handleCancel).toBeDefined();
    });
  });

  describe('Connection Handling', () => {
    it('should handle client connection', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');

      gateway.handleConnection(mockSocket as any);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Client connected: ${mockSocket.id}`
      );
    });

    it('should handle client disconnection', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');

      gateway.handleDisconnect(mockSocket as any);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Client disconnected: ${mockSocket.id}`
      );
    });
  });

  describe('Resume Optimization', () => {
    const validOptimizeMessage = {
      content: '# 个人简历\n\n## 基本信息\n姓名：张三\n电话：123456789',
      userId: 'test-user-123',
    };

    it('should handle valid optimization request', async () => {
      // Mock AI engine stream response
      const mockStreamChunks: AIStreamChunk[] = [
        {
          content: '# 优化后的简历\n\n',
          model: 'test-model',
          provider: 'test',
        },
        { content: '## 个人信息\n', model: 'test-model', provider: 'test' },
        { content: '**姓名：** 张三\n', model: 'test-model', provider: 'test' },
        {
          content: '**联系电话：** 123456789',
          model: 'test-model',
          provider: 'test',
        },
      ];

      aiEngineService.stream.mockImplementation(async function* () {
        for (const chunk of mockStreamChunks) {
          yield chunk;
        }
      });

      await gateway.handleOptimize(validOptimizeMessage, mockSocket as any);

      // Verify AI engine was called with correct parameters
      expect(aiEngineService.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: '',
          prompt: expect.stringContaining('请优化以下简历内容'),
          temperature: 0.7,
          maxTokens: 4000,
        }),
        'test-user-123',
        'resume-optimization'
      );

      // Verify chunks were emitted
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'chunk',
        expect.objectContaining({
          type: 'chunk',
          content: expect.any(String),
          timestamp: expect.any(Number),
        })
      );

      // Verify completion was emitted
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'done',
        expect.objectContaining({
          type: 'done',
          complete: true,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should handle empty content error', async () => {
      const invalidMessage = {
        content: '',
        userId: 'test-user-123',
      };

      await gateway.handleOptimize(invalidMessage, mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          type: 'error',
          message: 'Resume content is required',
          timestamp: expect.any(Number),
        })
      );

      expect(aiEngineService.stream).not.toHaveBeenCalled();
    });

    it('should handle missing userId error', async () => {
      const invalidMessage = {
        content: 'Some resume content',
        userId: '',
      };

      await gateway.handleOptimize(invalidMessage, mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          type: 'error',
          message: 'User ID is required',
          timestamp: expect.any(Number),
        })
      );

      expect(aiEngineService.stream).not.toHaveBeenCalled();
    });

    it('should handle AI engine errors', async () => {
      const errorMessage = 'AI service unavailable';
      aiEngineService.stream.mockImplementation(async function* () {
        throw new Error(errorMessage);
      });

      await gateway.handleOptimize(validOptimizeMessage, mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          type: 'error',
          message: errorMessage,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should chunk content at semantic boundaries', async () => {
      // Create a long content that will trigger chunking
      const longContent =
        '# 优化后的简历\n\n## 个人信息\n这是一段很长的文本内容，用来测试语义分割功能。'.repeat(
          10
        );

      const mockStreamChunks: AIStreamChunk[] = [
        { content: longContent, model: 'test-model', provider: 'test' },
      ];

      aiEngineService.stream.mockImplementation(async function* () {
        for (const chunk of mockStreamChunks) {
          yield chunk;
        }
      });

      await gateway.handleOptimize(validOptimizeMessage, mockSocket as any);

      // Verify multiple chunks were emitted due to content length
      const chunkCalls = mockSocket.emit.mock.calls.filter(
        (call) => call[0] === 'chunk'
      );
      expect(chunkCalls.length).toBeGreaterThan(1);
    });
  });

  describe('Cancellation Handling', () => {
    it('should handle cancellation request', () => {
      gateway.handleCancel(mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'cancelled',
        expect.objectContaining({
          type: 'cancelled',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should stop active stream when cancelled', async () => {
      const validOptimizeMessage = {
        content: 'Test resume content',
        userId: 'test-user-123',
      };

      // Mock a long-running stream
      aiEngineService.stream.mockImplementation(async function* () {
        yield { content: 'First chunk', model: 'test-model', provider: 'test' };
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield {
          content: 'Second chunk',
          model: 'test-model',
          provider: 'test',
        };
      });

      // Start optimization
      const optimizePromise = gateway.handleOptimize(
        validOptimizeMessage,
        mockSocket as any
      );

      // Cancel immediately
      gateway.handleCancel(mockSocket as any);

      await optimizePromise;

      // Verify cancellation was emitted
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'cancelled',
        expect.objectContaining({
          type: 'cancelled',
        })
      );
    });
  });

  describe('Semantic Break Point Detection', () => {
    it('should find paragraph breaks', () => {
      const text = 'First paragraph.\n\nSecond paragraph starts here.';
      const breakPoint = (gateway as any).findSemanticBreakPoint(text, 10);

      expect(breakPoint).toBe(text.indexOf('\n\n') + 2);
    });

    it('should find line breaks when no paragraph breaks', () => {
      const text = 'First line.\nSecond line starts here.';
      const breakPoint = (gateway as any).findSemanticBreakPoint(text, 5);

      expect(breakPoint).toBe(text.indexOf('\n') + 1);
    });

    it('should find sentence endings', () => {
      const text = 'This is a sentence. This is another sentence.';
      const breakPoint = (gateway as any).findSemanticBreakPoint(text, 10);

      expect(breakPoint).toBe(text.indexOf('.') + 1);
    });

    it('should fallback to minimum length', () => {
      const text = 'NoBreaksInThisTextAtAll';
      const minLength = 10;
      const breakPoint = (gateway as any).findSemanticBreakPoint(
        text,
        minLength
      );

      expect(breakPoint).toBe(minLength);
    });
  });

  describe('Prompt Building', () => {
    it('should build optimization prompt with content', () => {
      const content = 'Test resume content';
      const prompt = (gateway as any).buildOptimizationPrompt(content);

      expect(prompt).toContain(content);
      expect(prompt).toContain('请优化以下简历内容');
      expect(prompt).toContain('Markdown 格式');
      expect(prompt).toContain('保留所有关键信息');
    });

    it('should include all required optimization instructions', () => {
      const content = 'Test resume content';
      const prompt = (gateway as any).buildOptimizationPrompt(content);

      const requiredInstructions = [
        '保留所有关键信息',
        '使用专业的表达方式',
        '突出成就和量化结果',
        '使用清晰的 Markdown 格式',
        '适当使用项目符号和标题层级',
        '确保内容结构清晰',
      ];

      requiredInstructions.forEach((instruction) => {
        expect(prompt).toContain(instruction);
      });
    });
  });
});
