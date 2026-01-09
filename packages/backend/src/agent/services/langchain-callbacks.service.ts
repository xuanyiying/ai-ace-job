import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { Logger } from '@nestjs/common';
import { UsageTrackerService } from '@/ai-providers/tracking/usage-tracker.service';
import { PerformanceMonitorService } from '@/ai-providers/monitoring/performance-monitor.service';
import { LLMResult } from '@langchain/core/outputs';
import { Serialized } from '@langchain/core/load/serializable';

/**
 * Advanced LangChain Callback Handler (Middleware)
 * Extends LangChain lifecycle to project-specific services:
 * - Real-time usage tracking (tokens/cost)
 * - Performance monitoring (latency)
 * - Structured auditing
 */
export class ProjectCallbackHandler extends BaseCallbackHandler {
  name = 'project_callback_handler';
  private readonly logger = new Logger('LangChainMiddleware');
  private readonly runStartTimes: Map<string, number> = new Map();

  constructor(
    private readonly userId: string,
    private readonly scenario: string,
    private readonly usageTracker: UsageTrackerService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly metadata?: Record<string, any>
  ) {
    super();
  }

  /**
   * Called when an LLM starts running
   */
  async handleLLMStart(
    _llm: Serialized,
    _prompts: string[],
    runId: string,
    _parentRunId?: string,
    _extraParams?: Record<string, any>,
    _tags?: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    this.runStartTimes.set(runId, Date.now());
    this.logger.debug(
      `[LLM Start] RunID: ${runId}, Model: ${metadata?.model_name || 'unknown'}`
    );
  }

  /**
   * Called when an LLM finishes running
   */
  async handleLLMEnd(
    output: LLMResult,
    runId: string,
    _parentRunId?: string,
    _tags?: string[]
  ): Promise<void> {
    const startTime = this.runStartTimes.get(runId) || Date.now();
    const duration = Date.now() - startTime;
    this.runStartTimes.delete(runId);

    const { llmOutput } = output;

    // Capture token usage if available in the LLM response
    const tokenUsage = llmOutput?.tokenUsage || llmOutput?.usage || {};
    const modelName =
      llmOutput?.model_name || this.metadata?.modelName || 'langchain-model';

    this.logger.log(
      `[LLM End] RunID: ${runId}, Duration: ${duration}ms, Tokens: ${tokenUsage.totalTokens || 0}`
    );

    // Track usage in our project services
    if (tokenUsage.totalTokens) {
      try {
        await this.usageTracker.recordUsage({
          userId: this.userId,
          model: modelName,
          provider: 'langchain-adapter',
          scenario: this.scenario,
          inputTokens: tokenUsage.promptTokens || 0,
          outputTokens: tokenUsage.completionTokens || 0,
          cost: 0, // In a real scenario, we'd calculate this based on model tier
          latency: duration,
          success: true,
          agentType: this.metadata?.agentType || null,
          workflowStep: runId,
          errorCode: null,
        });

        await this.performanceMonitor.recordMetrics(
          modelName,
          'langchain',
          duration,
          true
        );
      } catch (error) {
        this.logger.error(`Failed to record usage in middleware: ${error}`);
      }
    }
  }

  /**
   * Called when an LLM errors
   */
  async handleLLMError(
    err: Error,
    runId: string,
    _parentRunId?: string,
    _tags?: string[]
  ): Promise<void> {
    const startTime = this.runStartTimes.get(runId) || Date.now();
    const duration = Date.now() - startTime;
    this.runStartTimes.delete(runId);

    this.logger.error(`[LLM Error] RunID: ${runId}, Error: ${err.message}`);

    await this.performanceMonitor.recordMetrics(
      'langchain-model',
      'langchain',
      duration,
      false
    );
  }

  /**
   * Called when a chain starts
   */
  async handleChainStart(
    _chain: Serialized,
    _inputs: Record<string, any>,
    runId: string
  ): Promise<void> {
    this.logger.debug(`[Chain Start] RunID: ${runId}`);
  }

  /**
   * Called when a chain ends
   */
  async handleChainEnd(
    _outputs: Record<string, any>,
    runId: string
  ): Promise<void> {
    this.logger.debug(`[Chain End] RunID: ${runId}`);
  }

  /**
   * Called when a tool starts running
   */
  async handleToolStart(
    tool: Serialized,
    _input: string,
    runId: string
  ): Promise<void> {
    this.runStartTimes.set(runId, Date.now());
    this.logger.debug(
      `[Tool Start] Tool: ${tool.id?.[tool.id.length - 1] || 'unknown'}, RunID: ${runId}`
    );
  }

  /**
   * Called when a tool ends running
   */
  async handleToolEnd(_output: string, runId: string): Promise<void> {
    const startTime = this.runStartTimes.get(runId) || Date.now();
    const duration = Date.now() - startTime;
    this.runStartTimes.delete(runId);

    this.logger.debug(`[Tool End] RunID: ${runId}, Duration: ${duration}ms`);

    try {
      await this.performanceMonitor.recordMetrics(
        'tool-execution',
        'langchain',
        duration,
        true
      );
    } catch (error) {
      this.logger.error(`Failed to record tool performance: ${error}`);
    }
  }

  /**
   * Called when a tool errors
   */
  async handleToolError(err: Error, runId: string): Promise<void> {
    const startTime = this.runStartTimes.get(runId) || Date.now();
    const duration = Date.now() - startTime;
    this.runStartTimes.delete(runId);

    this.logger.error(`[Tool Error] RunID: ${runId}, Error: ${err.message}`);

    try {
      await this.performanceMonitor.recordMetrics(
        'tool-execution',
        'langchain',
        duration,
        false
      );
    } catch (error) {
      this.logger.error(`Failed to record tool error performance: ${error}`);
    }
  }

  /**
   * Called when an agent action is received
   */
  async handleAgentAction(action: any, runId: string): Promise<void> {
    this.logger.log(`[Agent Action] Tool: ${action.tool}, RunID: ${runId}`);
    // We could track specific tool usage counts here if needed via UsageTrackerService
  }

  /**
   * Called when an agent finishes
   */
  async handleAgentEnd(_finish: any, runId: string): Promise<void> {
    // For agent end, we don't necessarily have a start time stored by handleAgentStart (which LangChain doesn't usually provide in the same way as LLM/Tool)
    // unless we track the whole agent lifecycle. But for now, let's assume we want to track something.
    // If we want to track duration, we'd need handleChainStart or similar to store the root RunID.
    this.logger.log(`[Agent End] RunID: ${runId}`);

    try {
      // Record usage for the final agent result
      await this.usageTracker.recordUsage({
        userId: this.userId,
        model: 'agent-orchestrator',
        provider: 'langchain-adapter',
        scenario: this.scenario,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        latency: 0, // Unknown without root tracking
        success: true,
        agentType: this.metadata?.agentType || null,
        workflowStep: 'agent-complete',
        errorCode: null,
      });
    } catch (error) {
      this.logger.error(`Failed to record agent end usage: ${error}`);
    }
  }
}
