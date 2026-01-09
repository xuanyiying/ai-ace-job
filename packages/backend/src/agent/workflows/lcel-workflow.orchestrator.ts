import { Injectable, Logger } from '@nestjs/common';
import {
  RunnableSequence,
  RunnableParallel,
  RunnableConfig,
  RunnableLambda,
} from '@langchain/core/runnables';
import { AIEngineService } from '../../ai-providers/ai-engine.service';
import { RedisService } from '../../redis/redis.service';
import { UsageTrackerService } from '../../ai-providers/tracking/usage-tracker.service';
import { PerformanceMonitorService } from '../../ai-providers/monitoring/performance-monitor.service';
import {
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
} from './workflow.interfaces';
import { ProjectCallbackHandler } from '../services/langchain-callbacks.service';
import { ChatProjectAI } from '../../ai-providers/langchain-adapter.service';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * LCEL Workflow Orchestrator
 * Uses LangChain Expression Language for modular and scalable workflows
 */
@Injectable()
export class LCELWorkflowOrchestrator {
  private readonly logger = new Logger(LCELWorkflowOrchestrator.name);
  private readonly CACHE_TTL = 3600;

  constructor(
    private aiEngineService: AIEngineService,
    private redisService: RedisService,
    private usageTracker: UsageTrackerService,
    private performanceMonitor: PerformanceMonitorService
  ) {}

  /**
   * Execute a sequence of steps using LCEL
   */
  async executeChain(
    steps: WorkflowStep[],
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      if (steps.length === 0) {
        throw new Error('No steps provided for workflow');
      }

      // 1. Create runnables from steps with retry logic
      const runnables = steps.map((step) =>
        new RunnableLambda({
          func: async (input: any) => this.executeStep(step, context, input),
        })
          .withConfig({ runName: step.id })
          .withRetry({ stopAfterAttempt: 3 })
      );

      // 2. Compose the sequence
      const chain = RunnableSequence.from(runnables as any);

      // 3. Execute with configuration and custom middleware
      const callbacks = [
        new ProjectCallbackHandler(
          context.userId,
          context.scenario || 'workflow',
          this.usageTracker,
          this.performanceMonitor,
          { sessionId: context.sessionId }
        ),
      ];

      const config: RunnableConfig = {
        configurable: {
          sessionId: context.sessionId,
          userId: context.userId,
        },
        callbacks,
      };

      const finalOutput = await chain.invoke({}, config);

      const duration = Date.now() - startTime;

      return {
        success: true,
        results: [finalOutput],
        tokenUsage: {
          total: (finalOutput as any).tokenUsage || 0,
          byStep: {}, // Can be enriched if needed
        },
        duration,
      };
    } catch (error: any) {
      this.logger.error(
        `Workflow chain failed: ${error?.message || String(error)}`
      );
      return {
        success: false,
        results: [],
        tokenUsage: { total: 0, byStep: {} },
        error: error?.message || String(error),
      };
    }
  }

  /**
   * Execute steps in parallel using LCEL
   */
  async executeParallel(
    steps: WorkflowStep[],
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      const runnables: Record<string, any> = {};
      steps.forEach((step) => {
        runnables[step.id] = new RunnableLambda({
          func: async (input: any) => this.executeStep(step, context, {}),
        })
          .withConfig({ runName: step.id })
          .withRetry({ stopAfterAttempt: 3 });
      });

      const parallelChain = RunnableParallel.from(runnables);
      const callbacks = [
        new ProjectCallbackHandler(
          context.userId,
          context.scenario || 'workflow-parallel',
          this.usageTracker,
          this.performanceMonitor,
          { sessionId: context.sessionId }
        ),
      ];

      const results = await parallelChain.invoke(
        {},
        {
          configurable: {
            sessionId: context.sessionId,
            userId: context.userId,
          },
          callbacks,
        }
      );

      const duration = Date.now() - startTime;
      return {
        success: true,
        results: [results],
        tokenUsage: { total: 0, byStep: {} },
        duration,
      };
    } catch (error: any) {
      this.logger.error(`Parallel workflow failed: ${error.message}`);
      return {
        success: false,
        results: [],
        tokenUsage: { total: 0, byStep: {} },
        error: error.message,
      };
    }
  }

  /**
   * Stream workflow execution
   */
  async *executeStream(
    steps: WorkflowStep[],
    context: WorkflowContext
  ): AsyncGenerator<any> {
    const runnables = steps.map((step) =>
      new RunnableLambda({
        func: async (input: any) => this.executeStep(step, context, input),
      }).withConfig({ runName: step.id })
    );

    const chain = RunnableSequence.from(runnables as any);
    const stream = await chain.stream(
      {},
      {
        configurable: { sessionId: context.sessionId, userId: context.userId },
      }
    );

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  /**
   * Get the workflow graph for visualization
   */
  getWorkflowGraph(steps: WorkflowStep[]) {
    const runnables = steps.map((step) =>
      new RunnableLambda({
        func: async (input: any) => ({
          ...input,
          [step.id]: `simulated_${step.id}`,
        }),
      }).withConfig({ runName: step.id })
    );
    const chain = RunnableSequence.from(runnables as any);
    return chain.getGraph();
  }

  /**
   * Execute a single step with caching and monitoring
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    prevOutput: any
  ) {
    const stepStartTime = Date.now();

    // Check cache
    const cacheKey = `workflow:${context.sessionId}:step:${step.id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for LCEL step: ${step.id}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Executing LCEL step: ${step.id} (${step.name})`);

    try {
      let result: Record<string, any>;

      switch (step.type) {
        case 'llm-call':
          result = await this.executeLLMCall(step, context);
          break;
        case 'tool-use':
          result = await this.executeToolUse(step, context);
          break;
        case 'rag-retrieval':
          result = await this.executeRAGRetrieval(step, context);
          break;
        case 'compression':
          result = await this.executeCompression(step, context);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const duration = Date.now() - stepStartTime;

      // Track performance
      await this.performanceMonitor.recordMetrics(
        step.type || 'workflow-step',
        'LCEL_WORKFLOW',
        duration,
        true
      );

      // Cache result
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.CACHE_TTL
      );

      return { ...prevOutput, ...result };
    } catch (error: any) {
      this.logger.error(`LCEL step ${step.id} failed: ${error.message}`);
      if (step.fallback) {
        return { ...prevOutput, [step.id]: step.fallback };
      }
      throw error;
    }
  }

  private async executeLLMCall(step: WorkflowStep, context: WorkflowContext) {
    const { prompt, systemPrompt, temperature, maxTokens } = step.input as any;

    const model = new ChatProjectAI(this.aiEngineService, {
      userId: context.userId,
      scenario: context.scenario || step.modelTier || 'balanced',
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1000,
    });

    const messages: (SystemMessage | HumanMessage)[] = [];
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(prompt as string));

    const response = await model.invoke(messages);

    const usage = (response.additional_kwargs as any)?.tokenUsage || {};

    return {
      content: response.content,
      tokenUsage: usage.totalTokens || 0,
    };
  }

  private async executeToolUse(step: WorkflowStep, context: WorkflowContext) {
    // Tool execution logic...
    return { result: `Tool ${step.input.toolName} executed`, tokenUsage: 0 };
  }

  private async executeRAGRetrieval(
    step: WorkflowStep,
    context: WorkflowContext
  ) {
    // RAG retrieval logic...
    return { documents: [], tokenUsage: 0 };
  }

  private async executeCompression(
    step: WorkflowStep,
    context: WorkflowContext
  ) {
    // Compression logic...
    return { compressed: step.input.content, tokenUsage: 0 };
  }
}
