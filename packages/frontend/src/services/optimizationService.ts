import axios from '../config/axios';

export const optimizationService = {
  createOptimization: async (resumeId: string, jobId: string) => {
    const response = await axios.post('/optimizations', {
      resumeId,
      jobId,
    });
    return response.data;
  },

  getOptimization: async (optimizationId: string) => {
    const response = await axios.get(`/optimizations/${optimizationId}`);
    return response.data;
  },

  acceptSuggestion: async (optimizationId: string, suggestionId: string) => {
    const response = await axios.post(
      `/optimizations/${optimizationId}/suggestions/${suggestionId}/accept`
    );
    return response.data;
  },

  rejectSuggestion: async (optimizationId: string, suggestionId: string) => {
    const response = await axios.post(
      `/optimizations/${optimizationId}/suggestions/${suggestionId}/reject`
    );
    return response.data;
  },
};
