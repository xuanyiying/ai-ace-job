import { Injectable, Logger } from '@nestjs/common';
import {
  createAgent,
  piiMiddleware,
  summarizationMiddleware,
  modelRetryMiddleware,
} from 'langchain';
import { AIEngineService } from '../../ai-providers/ai-engine.service';
import { ChatProjectAI } from '../../ai-providers/langchain-adapter.service';
import { HumanMessage } from '@langchain/core/messages';
import { ProjectCallbackHandler } from './langchain-callbacks.service';
import { UsageTrackerService } from '../../ai-providers/tracking/usage-tracker.service';
import { PerformanceMonitorService } from '../../ai-providers/monitoring/performance-monitor.service';

import { JDAnalyzerTool } from '../tools/jd-analyzer.tool';
import { RAGRetrievalTool } from '../tools/rag-retrieval.tool';
import { ResumeParserTool } from '../tools/resume-parser.tool';

@Injectable()
export class AgenticService {
  private readonly logger = new Logger(AgenticService.name);

  constructor(
    private readonly aiEngineService: AIEngineService,
    private readonly usageTracker: UsageTrackerService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly jdAnalyzerTool: JDAnalyzerTool,
    private readonly ragRetrievalTool: RAGRetrievalTool,
    private readonly resumeParserTool: ResumeParserTool
  ) {}

  /**
   * Run a protected agent with multiple middlewares
   * This pushes LangChain to the extreme by combining:
   * 1. Custom ChatModel adapter
   * 2. PII Redaction (Privacy)
   * 3. Auto-Summarization (Memory efficiency)
   * 4. Auto-Retries (Reliability)
   * 5. Detailed Audit (Callbacks)
   */
  async runProtectedQuery(query: string, userId: string, sessionId: string) {
    try {
      this.logger.log(
        `Running industrial-grade protected agent query for user ${userId}`
      );

      // 1. Initialize our custom adapter as the LLM
      const model = new ChatProjectAI(this.aiEngineService, {
        userId,
        scenario: 'agentic-protected',
        temperature: 0.1, // Set lower for tool using stability
      });

      // 2. Define Tools list
      const tools = [
        this.jdAnalyzerTool,
        this.ragRetrievalTool,
        this.resumeParserTool,
      ];

      // 3. Create the agent with Extreme Middleware stack
      const agent = createAgent({
        model: model,
        tools,
        systemPrompt: `You are a high-end career consultant AI. 
                You have access to tools for analyzing Job Descriptions and retrieving info from a Knowledge Base.
                Always redaction PII and provide professional, actionable advice.`,
        middleware: [
          piiMiddleware('email', { strategy: 'redact' }),
          piiMiddleware('credit_card', { strategy: 'redact' }),

          summarizationMiddleware({
            model: model,
            trigger: { messages: 10 },
            keep: { messages: 3 },
          }),

          modelRetryMiddleware({
            maxRetries: 3,
          }),
        ],
      });

      // 4. Define Callbacks for LangChain level monitoring
      const callbacks = [
        new ProjectCallbackHandler(
          userId,
          'agentic-protected',
          this.usageTracker,
          this.performanceMonitor,
          { sessionId, agentType: 'protected-career-consultant' }
        ),
      ];

      // 5. Invoke the agent
      const result = await agent.invoke(
        {
          messages: [new HumanMessage(query)],
        },
        {
          configurable: {
            sessionId,
            userId,
          },
          callbacks,
        }
      );

      const lastMessage = result.messages[result.messages.length - 1];

      return {
        content:
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage.content),
        history: result.messages,
        metadata: {
          sessionId,
          userId,
          status: 'success',
        },
      };
    } catch (error: any) {
      this.logger.error(`Agent failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
