import axios from '../config/axios';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string; // Masked in responses
  endpoint?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelConfigDto {
  name: string;
  provider: string;
  apiKey: string;
  endpoint?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  isActive?: boolean;
}

export interface ModelListResponse {
  data: ModelConfig[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const modelAdminService = {
  /**
   * List all model configurations
   */
  async listModels(params?: {
    provider?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ModelListResponse> {
    const response = await axios.get('/admin/models', {
      params,
    });
    return response.data;
  },

  /**
   * Get a specific model config by name
   */
  async getModel(name: string): Promise<ModelConfig> {
    const response = await axios.get(`/admin/models/${name}`);
    return response.data;
  },

  /**
   * Create a new model configuration
   */
  async createModel(data: CreateModelConfigDto): Promise<ModelConfig> {
    const response = await axios.post('/admin/models', data);
    return response.data;
  },

  /**
   * Update an existing model configuration
   */
  async updateModel(
    name: string,
    data: Partial<CreateModelConfigDto>
  ): Promise<ModelConfig> {
    const response = await axios.put(`/admin/models/${name}`, data);
    return response.data;
  },

  /**
   * Delete a model configuration
   */
  async deleteModel(name: string): Promise<void> {
    await axios.delete(`/admin/models/${name}`);
  },

  /**
   * Enable a model configuration
   */
  async enableModel(name: string): Promise<void> {
    await axios.post(`/admin/models/${name}/enable`);
  },

  /**
   * Disable a model configuration
   */
  async disableModel(name: string): Promise<void> {
    await axios.post(`/admin/models/${name}/disable`);
  },

  /**
   * Test model connection
   */
  async testModel(name: string): Promise<{
    name: string;
    provider: string;
    status: string;
    message: string;
  }> {
    const response = await axios.post(`/admin/models/${name}/test`);
    return response.data;
  },

  /**
   * Refresh configuration cache
   */
  async refreshCache(): Promise<void> {
    await axios.post('/admin/models/refresh');
  },

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<any> {
    const response = await axios.get('/admin/models/stats/usage');
    return response.data;
  },
};
