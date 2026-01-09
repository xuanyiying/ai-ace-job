import {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import {
  BaseMessage,
  AIMessage,
  AIMessageChunk,
} from '@langchain/core/messages';
import { ChatResult, ChatGenerationChunk } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { AIEngineService } from './ai-engine.service';
import { AIRequest } from './interfaces';

export interface ProjectChatParams extends BaseChatModelParams {
  userId: string;
  scenario?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Project AI Adapter for LangChain
 * Allows AIEngineService to be used as a native LangChain ChatModel.
 * This enables the use of LCEL, native Callbacks, and Agent loops.
 */
export class ChatProjectAI extends BaseChatModel {
  private userId: string;
  private scenario: string;
  private model?: string;
  private temperature?: number;
  private maxTokens?: number;

  constructor(
    private aiEngine: AIEngineService,
    params: ProjectChatParams
  ) {
    super(params);
    this.userId = params.userId;
    this.scenario = params.scenario || 'general';
    this.model = params.model;
    this.temperature = params.temperature;
    this.maxTokens = params.maxTokens;
  }

  _llmType(): string {
    return 'project-ai';
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const systemPrompt = messages.find((m) => m._getType() === 'system')
      ?.content as string;
    const history = messages
      .filter((m) => m._getType() !== 'system')
      .map((m) => ({
        role: this.getRole(m._getType()),
        content: m.content as string,
      }));

    const lastMessage = messages[messages.length - 1].content as string;
    const request: AIRequest = {
      model: this.model || '',
      prompt: lastMessage,
      messages: history as any,
      systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      stopSequences: options.stop,
    };

    const stream = this.aiEngine.stream(request, this.userId, this.scenario);

    for await (const chunk of stream) {
      const delta = chunk.content;
      yield new ChatGenerationChunk({
        message: new AIMessageChunk({ content: delta }),
        text: delta,
      });
      await runManager?.handleLLMNewToken(delta);
    }
  }

  /**
   * Main execution method for LangChain
   */
  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    // 1. Convert LangChain messages to Project AI messages
    const systemPrompt = messages.find((m) => m._getType() === 'system')
      ?.content as string;
    const history = messages
      .filter((m) => m._getType() !== 'system')
      .map((m) => ({
        role: this.getRole(m._getType()),
        content: m.content as string,
      }));

    // 2. Prepare Project AI Request
    const lastMessage = messages[messages.length - 1].content as string;
    const request: AIRequest = {
      model: this.model || '',
      prompt: lastMessage,
      messages: history as any,
      systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      stopSequences: options.stop,
    };

    // 3. Call current AI Engine
    const response = await this.aiEngine.call(
      request,
      this.userId,
      this.scenario
    );

    // 4. Wrap response in LangChain format
    return {
      generations: [
        {
          text: response.content,
          message: new AIMessage(response.content),
        },
      ],
      llmOutput: {
        tokenUsage: {
          promptTokens: response.usage.inputTokens,
          completionTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
        },
        model_name: response.model,
        provider: response.provider,
      },
    };
  }

  private getRole(type: string): 'user' | 'assistant' | 'system' {
    switch (type) {
      case 'human':
        return 'user';
      case 'ai':
        return 'assistant';
      case 'system':
        return 'system';
      default:
        return 'user';
    }
  }
}
