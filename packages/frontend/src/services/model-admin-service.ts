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
   * Get a specific model config by ID
   */
  async getModel(id: string): Promise<ModelConfig> {
    const response = await axios.get(`/admin/models/${id}`);
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
    id: string,
    data: Partial<CreateModelConfigDto>
  ): Promise<ModelConfig> {
    const response = await axios.put(`/admin/models/${id}`, data);
    return response.data;
  },

  /**
   * Delete a model configuration
   */
  async deleteModel(id: string): Promise<void> {
    await axios.delete(`/admin/models/${id}`);
  },

  /**
   * Enable a model configuration
   */
  async enableModel(id: string): Promise<void> {
    await axios.post(`/admin/models/${id}/enable`);
  },

  /**
   * Disable a model configuration
   */
  async disableModel(id: string): Promise<void> {
    await axios.post(`/admin/models/${id}/disable`);
  },

  /**
   * Test model connection
   */
  async testModel(id: string): Promise<{
    id: string;
    name: string;
    provider: string;
    status: string;
    message: string;
  }> {
    const response = await axios.post(`/admin/models/${id}/test`);
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
