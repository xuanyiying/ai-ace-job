/**
 * YAML Configuration Loader
 * Loads AI provider configurations from YAML files
 * Requirements: 3.2
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ProviderConfigMap } from '../interfaces';

export interface YamlConfigFile {
  providers?: {
    openai?: Record<string, any>;
    qwen?: Record<string, any>;
    deepseek?: Record<string, any>;
    gemini?: Record<string, any>;
    ollama?: Record<string, any>;
  };
}

@Injectable()
export class YamlConfigLoader {
  private readonly logger = new Logger(YamlConfigLoader.name);

  /**
   * Load configuration from YAML file
   */
  loadFromFile(filePath: string): YamlConfigFile | null {
    try {
      const absolutePath = path.resolve(filePath);

      if (!fs.existsSync(absolutePath)) {
        this.logger.warn(`YAML config file not found: ${absolutePath}`);
        return null;
      }

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const config = yaml.load(fileContent) as YamlConfigFile;

      this.logger.log(`Loaded YAML configuration from: ${absolutePath}`);
      return config;
    } catch (error) {
      this.logger.error(
        `Failed to load YAML configuration: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Validate YAML configuration structure
   */
  validateConfig(config: YamlConfigFile): boolean {
    if (!config || !config.providers) {
      this.logger.warn('Invalid YAML configuration: missing providers section');
      return false;
    }

    return true;
  }

  /**
   * Convert YAML config to ProviderConfigMap
   */
  convertToProviderConfigMap(
    config: YamlConfigFile
  ): Partial<ProviderConfigMap> {
    const result: Partial<ProviderConfigMap> = {};

    if (!config.providers) {
      return result;
    }

    if (config.providers.openai) {
      result.openai = {
        apiKey: config.providers.openai.apiKey || '',
        endpoint: config.providers.openai.endpoint,
        organization: config.providers.openai.organization,
        defaultTemperature: config.providers.openai.defaultTemperature ?? 0.7,
        defaultMaxTokens: config.providers.openai.defaultMaxTokens ?? 2000,
        timeout: config.providers.openai.timeout ?? 30000,
        isActive: config.providers.openai.isActive ?? true,
      };
    }

    if (config.providers.qwen) {
      result.qwen = {
        apiKey: config.providers.qwen.apiKey || '',
        endpoint:
          config.providers.qwen.endpoint ||
          'https://dashscope.aliyuncs.com/api/v1',
        defaultTemperature: config.providers.qwen.defaultTemperature ?? 0.7,
        defaultMaxTokens: config.providers.qwen.defaultMaxTokens ?? 2000,
        timeout: config.providers.qwen.timeout ?? 30000,
        isActive: config.providers.qwen.isActive ?? true,
      };
    }

    if (config.providers.deepseek) {
      result.deepseek = {
        apiKey: config.providers.deepseek.apiKey || '',
        endpoint:
          config.providers.deepseek.endpoint || 'https://api.deepseek.com/v1',
        defaultTemperature: config.providers.deepseek.defaultTemperature ?? 0.7,
        defaultMaxTokens: config.providers.deepseek.defaultMaxTokens ?? 2000,
        timeout: config.providers.deepseek.timeout ?? 30000,
        isActive: config.providers.deepseek.isActive ?? true,
      };
    }

    if (config.providers.gemini) {
      result.gemini = {
        apiKey: config.providers.gemini.apiKey || '',
        endpoint: config.providers.gemini.endpoint,
        defaultTemperature: config.providers.gemini.defaultTemperature ?? 0.7,
        defaultMaxTokens: config.providers.gemini.defaultMaxTokens ?? 2000,
        timeout: config.providers.gemini.timeout ?? 30000,
        isActive: config.providers.gemini.isActive ?? true,
      };
    }

    if (config.providers.ollama) {
      result.ollama = {
        apiKey: '',
        baseUrl: config.providers.ollama.baseUrl || 'http://localhost:11434',
        defaultTemperature: config.providers.ollama.defaultTemperature ?? 0.7,
        defaultMaxTokens: config.providers.ollama.defaultMaxTokens ?? 2000,
        timeout: config.providers.ollama.timeout ?? 60000,
        isActive: config.providers.ollama.isActive ?? true,
      };
    }

    return result;
  }
}
