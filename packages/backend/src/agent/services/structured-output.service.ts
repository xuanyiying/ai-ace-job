import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { AIEngineService } from '../../ai-providers/ai-engine.service';

/**
 * Structured Output Service
 * Uses Zod and LangChain parsers for robust JSON validation and auto-fixing
 */
@Injectable()
export class StructuredOutputService {
  private readonly logger = new Logger(StructuredOutputService.name);

  constructor(private aiEngineService: AIEngineService) {}

  /**
   * Call LLM and parse output using Zod with auto-fixing
   */
  async callWithZod<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    userId: string,
    scenario: string = 'structured-output'
  ): Promise<T> {
    const parser = StructuredOutputParser.fromZodSchema(schema as any);
    const instructions = parser.getFormatInstructions();

    const constrainedPrompt = `${prompt}\n\n${instructions}`;

    const response = await this.aiEngineService.call(
      {
        model: '',
        prompt: constrainedPrompt,
        temperature: 0,
        maxTokens: 2000,
      },
      userId,
      scenario
    );

    return this.parseWithZod(response.content, schema);
  }

  /**
   * Parse LLM output using a Zod schema with auto-fixing capability
   */
  async parseWithZod<T>(
    content: string,
    schema: z.ZodSchema<T>,
    retryModel?: any
  ): Promise<T> {
    const parser = StructuredOutputParser.fromZodSchema(schema as any);

    try {
      const cleanedContent = this.cleanMarkdown(content);
      return (await parser.parse(cleanedContent)) as T;
    } catch (error) {
      this.logger.warn(
        `Initial parsing failed, attempting auto-fix: ${error instanceof Error ? error.message : String(error)}`
      );

      const fixModel =
        retryModel ||
        new ChatOpenAI({
          modelName: 'gpt-4o-mini',
          temperature: 0,
        });

      try {
        const instructions = parser.getFormatInstructions();
        const fixPrompt = `The following JSON failed to parse. 
        Error: ${error instanceof Error ? error.message : String(error)}
        
        Content:
        ${content}
        
        Please fix the JSON to strictly match these instructions:
        ${instructions}
        
        Return ONLY the fixed JSON.`;

        const fixedResponse = await fixModel.invoke(fixPrompt);
        const fixedContent = this.cleanMarkdown(
          typeof fixedResponse.content === 'string'
            ? fixedResponse.content
            : JSON.stringify(fixedResponse.content)
        );

        return (await parser.parse(fixedContent)) as T;
      } catch (fixError) {
        this.logger.error(
          `Auto-fix failed: ${fixError instanceof Error ? fixError.message : String(fixError)}`
        );

        // Final attempt: try to extract JSON with regex if parsing still fails
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            return (await parser.parse(jsonMatch[0])) as T;
          }
        } catch (regexError) {
          this.logger.error(
            `Regex extraction failed: ${regexError instanceof Error ? regexError.message : String(regexError)}`
          );
        }

        throw error;
      }
    }
  }

  private cleanMarkdown(content: string): string {
    return content.replace(/```json\n?|```/g, '').trim();
  }

  /**
   * Helper to create a Zod schema from the old JSONSchema format
   */
  translateToZod(schema: any): z.ZodSchema {
    if (!schema) return z.any();

    let zodSchema: z.ZodTypeAny;

    switch (schema.type) {
      case 'object':
        const shape: any = {};
        for (const [key, prop] of Object.entries(schema.properties || {})) {
          let propSchema = this.translateToZod(prop);
          if (!(schema.required || []).includes(key)) {
            propSchema = propSchema.optional();
          }
          shape[key] = propSchema;
        }
        zodSchema = z.object(shape);
        break;
      case 'array':
        zodSchema = z.array(this.translateToZod(schema.items));
        break;
      case 'string':
        if (schema.enum) {
          zodSchema = z.enum(schema.enum as [string, ...string[]]);
        } else {
          zodSchema = z.string();
        }
        break;
      case 'number':
      case 'integer':
        zodSchema = z.number();
        break;
      case 'boolean':
        zodSchema = z.boolean();
        break;
      default:
        zodSchema = z.any();
    }

    if (schema.description) {
      zodSchema = zodSchema.describe(schema.description);
    }

    return zodSchema;
  }
}
