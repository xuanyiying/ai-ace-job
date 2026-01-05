/**
 * Model Configuration Service
 * Manages model configurations from environment variables, YAML files, and database
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ModelConfig as PrismaModelConfig } from '@prisma/client';
import { EncryptionService } from '../utils/encryption.service';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  endpoint?: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ModelConfigService implements OnModuleInit {
  private readonly logger = new Logger(ModelConfigService.name);
  private configCache: Map<string, ModelConfig> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadConfigurations();
  }

  /**
   * Load configurations from database
   * All configurations are now stored in database for dynamic management
   */
  private async loadConfigurations(): Promise<void> {
    this.logger.log('Loading model configurations from database...');

    try {
      await this.loadFromDatabase();
      this.logger.log(`Loaded ${this.configCache.size} model configurations`);
    } catch (error) {
      this.logger.error(
        `Failed to load configurations: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load configurations from database
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      const configs = await this.prisma.modelConfig.findMany({
        where: { isActive: true },
      });

      for (const config of configs) {
        const decryptedConfig = this.decryptConfig(config);
        this.configCache.set(config.name, decryptedConfig);
        this.cacheTimestamps.set(config.name, Date.now());
      }

      this.logger.log(`Loaded ${configs.length} configurations from database`);
    } catch (error) {
      this.logger.warn(
        `Failed to load configurations from database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get model configuration by name
   */
  async getModelConfig(name: string): Promise<ModelConfig | null> {
    // Check cache first
    const cached = this.configCache.get(name);
    if (cached && this.isCacheValid(name)) {
      return cached;
    }

    // Load from database
    try {
      const config = await this.prisma.modelConfig.findUnique({
        where: { name },
      });

      if (config) {
        const decrypted = this.decryptConfig(config);
        this.configCache.set(name, decrypted);
        this.cacheTimestamps.set(name, Date.now());
        return decrypted;
      }
    } catch (error) {
      this.logger.error(
        `Failed to get model config by name: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return null;
  }

  /**
   * Get model configuration by ID
   */
  async getModelConfigById(id: string): Promise<ModelConfig | null> {
    try {
      const config = await this.prisma.modelConfig.findUnique({
        where: { id },
      });

      if (config) {
        return this.decryptConfig(config);
      }
    } catch (error) {
      this.logger.error(
        `Failed to get model config by ID: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return null;
  }

  /**
   * Get all model configurations
   */
  async getAllModelConfigs(): Promise<ModelConfig[]> {
    try {
      const configs = await this.prisma.modelConfig.findMany();
      return configs.map((config) => this.decryptConfig(config));
    } catch (error) {
      this.logger.error(
        `Failed to get all model configs: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get configurations by provider
   */
  async getConfigsByProvider(provider: string): Promise<ModelConfig[]> {
    try {
      const configs = await this.prisma.modelConfig.findMany({
        where: { provider },
      });
      return configs.map((config) => this.decryptConfig(config));
    } catch (error) {
      this.logger.error(
        `Failed to get configs by provider: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Create or update model configuration
   */
  async upsertModelConfig(config: ModelConfig): Promise<ModelConfig> {
    try {
      // Validate configuration
      this.validateModelConfig(config);

      // Encrypt API key before storing
      const encryptedConfig = this.encryptConfig(config);

      const result = await this.prisma.modelConfig.upsert({
        where: { name: config.name },
        update: {
          provider: config.provider,
          apiKey: encryptedConfig.apiKey,
          endpoint: config.endpoint,
          defaultTemperature: config.defaultTemperature,
          defaultMaxTokens: config.defaultMaxTokens,
          costPerInputToken: config.costPerInputToken,
          costPerOutputToken: config.costPerOutputToken,
          rateLimitPerMinute: config.rateLimitPerMinute,
          rateLimitPerDay: config.rateLimitPerDay,
          isActive: config.isActive,
          updatedAt: new Date(),
        },
        create: {
          name: config.name,
          provider: config.provider,
          apiKey: encryptedConfig.apiKey,
          endpoint: config.endpoint,
          defaultTemperature: config.defaultTemperature,
          defaultMaxTokens: config.defaultMaxTokens,
          costPerInputToken: config.costPerInputToken,
          costPerOutputToken: config.costPerOutputToken,
          rateLimitPerMinute: config.rateLimitPerMinute,
          rateLimitPerDay: config.rateLimitPerDay,
          isActive: config.isActive,
        },
      });

      const decrypted = this.decryptConfig(result);
      this.configCache.set(config.name, decrypted);
      this.cacheTimestamps.set(config.name, Date.now());

      this.logger.log(`Upserted model configuration: ${config.name}`);
      return decrypted;
    } catch (error) {
      this.logger.error(
        `Failed to upsert model config: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Update model configuration by ID
   */
  async updateModelConfig(
    id: string,
    updates: Partial<ModelConfig>
  ): Promise<ModelConfig> {
    try {
      const existing = await this.prisma.modelConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error(`Model config with ID ${id} not found`);
      }

      // If apiKey is provided, encrypt it
      const dataToUpdate: any = { ...updates };
      if (updates.apiKey) {
        dataToUpdate.apiKey = this.encrypt(updates.apiKey);
      }

      // Remove fields that shouldn't be updated directly via this method or are handled separately
      delete dataToUpdate.id;
      delete dataToUpdate.createdAt;
      dataToUpdate.updatedAt = new Date();

      const result = await this.prisma.modelConfig.update({
        where: { id },
        data: dataToUpdate,
      });

      const decrypted = this.decryptConfig(result);

      // Update cache
      if (existing.name !== decrypted.name) {
        this.configCache.delete(existing.name);
        this.cacheTimestamps.delete(existing.name);
      }
      this.configCache.set(decrypted.name, decrypted);
      this.cacheTimestamps.set(decrypted.name, Date.now());

      this.logger.log(
        `Updated model configuration: ${decrypted.name} (ID: ${id})`
      );
      return decrypted;
    } catch (error) {
      this.logger.error(
        `Failed to update model config: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Delete model configuration by ID
   */
  async deleteModelConfig(id: string): Promise<void> {
    try {
      // Find the config first to get the name for cache removal
      const config = await this.prisma.modelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        this.logger.warn(
          `Attempted to delete non-existent model config: ${id}`
        );
        return;
      }

      await this.prisma.modelConfig.delete({
        where: { id },
      });

      // Remove from cache
      this.configCache.delete(config.name);
      this.cacheTimestamps.delete(config.name);

      this.logger.log(
        `Deleted model configuration: ${config.name} (ID: ${id})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete model config: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Disable model configuration by ID
   */
  async disableModelConfig(id: string): Promise<void> {
    try {
      const existing = await this.prisma.modelConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        this.logger.warn(
          `Attempted to disable non-existent model config: ${id}`
        );
        return;
      }

      const config = await this.prisma.modelConfig.update({
        where: { id },
        data: { isActive: false },
      });

      // Update cache if present
      const cached = this.configCache.get(config.name);
      if (cached) {
        cached.isActive = false;
      }

      this.logger.log(
        `Disabled model configuration: ${config.name} (ID: ${id})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to disable model config: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Enable model configuration by ID
   */
  async enableModelConfig(id: string): Promise<void> {
    try {
      const existing = await this.prisma.modelConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        this.logger.warn(
          `Attempted to enable non-existent model config: ${id}`
        );
        return;
      }

      const config = await this.prisma.modelConfig.update({
        where: { id },
        data: { isActive: true },
      });

      // Update cache if present
      const cached = this.configCache.get(config.name);
      if (cached) {
        cached.isActive = true;
      }

      this.logger.log(
        `Enabled model configuration: ${config.name} (ID: ${id})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to enable model config: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Refresh configuration cache
   */
  async refreshCache(): Promise<void> {
    this.logger.log('Refreshing configuration cache...');
    this.configCache.clear();
    this.cacheTimestamps.clear();
    await this.loadConfigurations();
  }

  /**
   * Validate model configuration
   */
  private validateModelConfig(config: ModelConfig): void {
    if (!config.name || !config.name.trim()) {
      throw new Error('Model name is required');
    }

    if (!config.provider || !config.provider.trim()) {
      throw new Error('Provider is required');
    }

    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error('API key is required');
    }

    if (config.defaultTemperature < 0 || config.defaultTemperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (config.defaultMaxTokens < 1) {
      throw new Error('Max tokens must be at least 1');
    }

    if (config.costPerInputToken < 0 || config.costPerOutputToken < 0) {
      throw new Error('Cost parameters must be non-negative');
    }

    if (config.rateLimitPerMinute < 0 || config.rateLimitPerDay < 0) {
      throw new Error('Rate limit parameters must be non-negative');
    }
  }

  /**
   * Encrypt API key
   */
  private encryptConfig(config: ModelConfig): ModelConfig {
    const encrypted = { ...config };
    encrypted.apiKey = this.encryptionService.encrypt(config.apiKey);
    return encrypted;
  }

  /**
   * Decrypt API key
   */
  private decryptConfig(config: PrismaModelConfig): ModelConfig {
    return {
      id: config.id,
      name: config.name,
      provider: config.provider,
      apiKey: this.encryptionService.decrypt(config.apiKey),
      endpoint: config.endpoint || undefined,
      defaultTemperature: config.defaultTemperature,
      defaultMaxTokens: config.defaultMaxTokens,
      costPerInputToken: config.costPerInputToken,
      costPerOutputToken: config.costPerOutputToken,
      rateLimitPerMinute: config.rateLimitPerMinute,
      rateLimitPerDay: config.rateLimitPerDay,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Update data with encryption
   */
  private encrypt(text: string): string {
    return this.encryptionService.encrypt(text);
  }

  /**
   * Update data with decryption
   */
  private decrypt(text: string): string {
    return this.encryptionService.decrypt(text);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(name: string): boolean {
    const timestamp = this.cacheTimestamps.get(name);
    if (!timestamp) {
      return false;
    }

    return Date.now() - timestamp < this.CACHE_TTL;
  }
}
