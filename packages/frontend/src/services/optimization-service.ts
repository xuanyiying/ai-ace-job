import axios from '../config/axios';
import { Optimization } from '@/types';

/**
 * Service for managing resume optimization records and suggestions
 */
export const optimizationService = {
  /**
   * Create a new optimization record for a resume and job
   * @param resumeId - The ID of the resume
   * @param jobId - The ID of the job
   * @returns The created optimization record
   */
  createOptimization: async (resumeId: string, jobId: string): Promise<Optimization> => {
    const response = await axios.post<Optimization>('/resume-optimizer/optimizations', {
      resumeId,
      jobId,
    });
    return response.data;
  },

  /**
   * Get details of a specific optimization record
   * @param optimizationId - The ID of the optimization
   * @returns The optimization record with suggestions
   */
  getOptimization: async (optimizationId: string): Promise<Optimization> => {
    const response = await axios.get<Optimization>(
      `/resume-optimizer/optimizations/${optimizationId}`
    );
    return response.data;
  },

  /**
   * List all optimization records for the current user
   * @returns List of optimization records
   */
  listOptimizations: async (): Promise<Optimization[]> => {
    const response = await axios.get<Optimization[]>('/resume-optimizer/optimizations');
    return response.data;
  },

  /**
   * Accept a specific optimization suggestion
   * @param optimizationId - The ID of the optimization
   * @param suggestionId - The ID of the suggestion to accept
   * @returns Updated optimization record or success status
   */
  acceptSuggestion: async (optimizationId: string, suggestionId: string): Promise<any> => {
    const response = await axios.post(
      `/resume-optimizer/optimizations/${optimizationId}/suggestions/${suggestionId}/accept`
    );
    return response.data;
  },

  /**
   * Reject a specific optimization suggestion
   * @param optimizationId - The ID of the optimization
   * @param suggestionId - The ID of the suggestion to reject
   * @returns Updated optimization record or success status
   */
  rejectSuggestion: async (optimizationId: string, suggestionId: string): Promise<any> => {
    const response = await axios.post(
      `/resume-optimizer/optimizations/${optimizationId}/suggestions/${suggestionId}/reject`
    );
    return response.data;
  },

  /**
   * Accept multiple optimization suggestions at once
   * @param optimizationId - The ID of the optimization
   * @param suggestionIds - List of suggestion IDs to accept
   * @returns Updated optimization record or success status
   */
  acceptBatchSuggestions: async (
    optimizationId: string,
    suggestionIds: string[]
  ): Promise<any> => {
    const response = await axios.post(
      `/resume-optimizer/optimizations/${optimizationId}/suggestions/accept-batch`,
      { suggestionIds }
    );
    return response.data;
  },
};
