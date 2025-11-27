/**
 * Provider Configuration
 * Manages configuration for all AI providers
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderConfigMap } from '../interfaces';

@Injectable()
export class ProviderConfigService {
  private readonly logger = new Logger(ProviderConfigService.name);
  private providerConfigs: ProviderConfigMap = {};

  constructor(private configService: ConfigService) {
    this.loadConfigurations();
  }

  /**
   * Load configurations from environment variables
   */
  private loadConfigurations(): void {
    this.logger.log('Loading AI provider configurations...');

    // Load OpenAI configuration
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiApiKey) {
      this.providerConfigs.openai = {
        apiKey: openaiApiKey,
        endpoint: this.configService.get<string>('OPENAI_ENDPOINT'),
        organization: this.configService.get<string>('OPENAI_ORGANIZATION'),
        defaultTemperature: this.configService.get<number>(
          'OPENAI_DEFAULT_TEMPERATURE',
          0.7
        ),
        defaultMaxTokens: this.configService.get<number>(
          'OPENAI_DEFAULT_MAX_TOKENS',
          2000
        ),
        timeout: this.configService.get<number>('OPENAI_TIMEOUT', 30000),
        isActive: true,
      };
      this.logger.log('OpenAI configuration loaded');
    }

    // Load Qwen configuration
    const qwenApiKey = this.configService.get<string>('QWEN_API_KEY');
    if (qwenApiKey) {
      this.providerConfigs.qwen = {
        apiKey: qwenApiKey,
        endpoint:
          this.configService.get<string>('QWEN_ENDPOINT') ||
          'https://dashscope.aliyuncs.com/api/v1',
        defaultTemperature: this.configService.get<number>(
          'QWEN_DEFAULT_TEMPERATURE',
          0.7
        ),
        defaultMaxTokens: this.configService.get<number>(
          'QWEN_DEFAULT_MAX_TOKENS',
          2000
        ),
        timeout: this.configService.get<number>('QWEN_TIMEOUT', 30000),
        isActive: true,
      };
      this.logger.log('Qwen configuration loaded');
    }

    // Load DeepSeek configuration
    const deepseekApiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (deepseekApiKey) {
      this.providerConfigs.deepseek = {
        apiKey: deepseekApiKey,
        endpoint:
          this.configService.get<string>('DEEPSEEK_ENDPOINT') ||
          'https://api.deepseek.com/v1',
        defaultTemperature: this.configService.get<number>(
          'DEEPSEEK_DEFAULT_TEMPERATURE',
          0.7
        ),
        defaultMaxTokens: this.configService.get<number>(
          'DEEPSEEK_DEFAULT_MAX_TOKENS',
          2000
        ),
        timeout: this.configService.get<number>('DEEPSEEK_TIMEOUT', 30000),
        isActive: true,
      };
      this.logger.log('DeepSeek configuration loaded');
    }

    // Load Gemini configuration
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiApiKey) {
      this.providerConfigs.gemini = {
        apiKey: geminiApiKey,
        endpoint: this.configService.get<string>('GEMINI_ENDPOINT'),
        defaultTemperature: this.configService.get<number>(
          'GEMINI_DEFAULT_TEMPERATURE',
          0.7
        ),
        defaultMaxTokens: this.configService.get<number>(
          'GEMINI_DEFAULT_MAX_TOKENS',
          2000
        ),
        timeout: this.configService.get<number>('GEMINI_TIMEOUT', 30000),
        isActive: true,
      };
      this.logger.log('Gemini configuration loaded');
    }

    // Load Ollama configuration
    const ollamaEnabled = this.configService.get<boolean>(
      'OLLAMA_ENABLED',
      false
    );
    if (ollamaEnabled) {
      this.providerConfigs.ollama = {
        apiKey: '', // Ollama doesn't require API key for local deployment
        baseUrl:
          this.configService.get<string>('OLLAMA_BASE_URL') ||
          'http://localhost:11434',
        defaultTemperature: this.configService.get<number>(
          'OLLAMA_DEFAULT_TEMPERATURE',
          0.7
        ),
        defaultMaxTokens: this.configService.get<number>(
          'OLLAMA_DEFAULT_MAX_TOKENS',
          2000
        ),
        timeout: this.configService.get<number>('OLLAMA_TIMEOUT', 60000),
        isActive: true,
      };
      this.logger.log('Ollama configuration loaded');
    }

    this.logger.log(
      `Loaded ${Object.keys(this.providerConfigs).length} provider configurations`
    );
  }

  /**
   * Get configuration for a specific provider
   */
  getProviderConfig<T extends keyof ProviderConfigMap>(
    provider: T
  ): ProviderConfigMap[T] | undefined {
    return this.providerConfigs[provider];
  }

  /**
   * Get all provider configurations
   */
  getAllProviderConfigs(): ProviderConfigMap {
    return { ...this.providerConfigs };
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: keyof ProviderConfigMap): boolean {
    return !!this.providerConfigs[provider];
  }

  /**
   * Get list of configured provider names
   */
  getConfiguredProviders(): string[] {
    return Object.keys(this.providerConfigs);
  }

  /**
   * Update provider configuration (for dynamic updates)
   */
  updateProviderConfig<T extends keyof ProviderConfigMap>(
    provider: T,
    config: ProviderConfigMap[T]
  ): void {
    this.providerConfigs[provider] = config;
    this.logger.log(`Updated configuration for provider: ${provider}`);
  }

  /**
   * Disable a provider
   */
  disableProvider(provider: keyof ProviderConfigMap): void {
    const config = this.providerConfigs[provider];
    if (config) {
      config.isActive = false;
      this.logger.log(`Disabled provider: ${provider}`);
    }
  }

  /**
   * Enable a provider
   */
  enableProvider(provider: keyof ProviderConfigMap): void {
    const config = this.providerConfigs[provider];
    if (config) {
      config.isActive = true;
      this.logger.log(`Enabled provider: ${provider}`);
    }
  }
}
