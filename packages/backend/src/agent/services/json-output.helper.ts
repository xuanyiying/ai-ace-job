/**
 * JSON Output Helper
 * Provides utilities for structured JSON output from LLM calls
 * Requirements: 6.3, 6.4
 */

import { Injectable, Logger } from '@nestjs/common';
import { StructuredOutputService } from './structured-output.service';

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
}

export interface StructuredOutputRequest {
  prompt: string;
  schema: JSONSchema;
  userId: string;
  scenario?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StructuredOutputResponse<T = unknown> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  raw: string;
}

@Injectable()
export class JSONOutputHelper {
  private readonly logger = new Logger(JSONOutputHelper.name);

  constructor(private structuredOutputService: StructuredOutputService) {}

  /**
   * Call LLM with JSON output constraint using the improved StructuredOutputService
   */
  async callWithJSONOutput<T = unknown>(
    request: StructuredOutputRequest
  ): Promise<StructuredOutputResponse<T>> {
    try {
      this.logger.debug(
        'Calling LLM with JSON output via StructuredOutputService'
      );

      const zodSchema = this.structuredOutputService.translateToZod(
        request.schema
      );
      const data = await this.structuredOutputService.callWithZod<T>(
        request.prompt,
        zodSchema as any,
        request.userId,
        request.scenario
      );

      return {
        data,
        inputTokens: 0, // Simplified for now
        outputTokens: 0,
        raw: JSON.stringify(data),
      };
    } catch (error) {
      this.logger.error(
        `Failed to call with JSON output: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Create a schema for common structures
   */
  static createObjectSchema(
    properties: Record<string, JSONSchema>,
    required?: string[]
  ): JSONSchema {
    return {
      type: 'object',
      properties,
      required,
    };
  }

  /**
   * Create an array schema
   */
  static createArraySchema(itemSchema: JSONSchema): JSONSchema {
    return {
      type: 'array',
      items: itemSchema,
    };
  }

  /**
   * Create a string schema
   */
  static createStringSchema(description?: string): JSONSchema {
    return {
      type: 'string',
      description,
    };
  }

  /**
   * Create a number schema
   */
  static createNumberSchema(description?: string): JSONSchema {
    return {
      type: 'number',
      description,
    };
  }

  /**
   * Create a boolean schema
   */
  static createBooleanSchema(description?: string): JSONSchema {
    return {
      type: 'boolean',
      description,
    };
  }
}
