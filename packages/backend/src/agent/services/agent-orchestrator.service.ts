import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { JDAnalyzerTool } from '../tools/jd-analyzer.tool';
import { ResumeParserTool } from '../tools/resume-parser.tool';
import { KeywordMatcherTool } from '../tools/keyword-matcher.tool';
import { RAGRetrievalTool } from '../tools/rag-retrieval.tool';
import { RedisService } from '../../redis/redis.service';
import { CustomMemory } from '../adapters/custom-memory.adapter';

/**
 * Agent Orchestrator
 * Upgrades dynamic routing using createAgent from LangChain
 */
@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);

  constructor(
    private jdAnalyzer: JDAnalyzerTool,
    private resumeParser: ResumeParserTool,
    private keywordMatcher: KeywordMatcherTool,
    private ragRetrieval: RAGRetrievalTool,
    private redisService: RedisService
  ) {}

  /**
   * Execute a task using dynamic tool routing
   */
  async executeTask(
    task: string,
    userId: string,
    sessionId: string
  ): Promise<string> {
    this.logger.log(
      `Executing dynamic task for user ${userId} in session ${sessionId}: ${task}`
    );

    // 1. Initialize memory
    const memory = new CustomMemory(this.redisService, sessionId);
    const { chatHistory } = await memory.loadMemoryVariables();

    // 2. Prepare tools
    const tools: any[] = [
      this.jdAnalyzer,
      this.resumeParser,
      this.keywordMatcher,
      this.ragRetrieval,
    ];

    // 3. Initialize LLM
    const llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0,
    });

    // 4. Create agent
    const agent = createAgent({
      model: llm,
      tools,
      systemPrompt:
        'You are a professional career coach and resume optimizer. Use the available tools to help the user. Keep track of previous conversation context.',
    });

    // 5. Run task with conversation history
    const result = await agent.invoke({
      messages: [...chatHistory, new HumanMessage(task)],
    });

    // 6. Extract output from the last message
    const lastMessage = result.messages[result.messages.length - 1];
    const output =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // 7. Save to memory
    await memory.saveContext({ input: task }, { output });

    return output;
  }
}
