import axios from '../config/axios';

/**
 * Service for resume optimization related API calls
 * Requirements: 3.1
 */
export const resumeOptimizerService = {
  /**
   * Generate PDF from optimized resume content
   * @param optimizationId - The optimization ID
   * @param content - Optional markdown content to use for PDF generation
   * @returns Promise with PDF generation results including download URL
   */
  generatePDF: async (optimizationId: string, content?: string) => {
    const response = await axios.post(
      `/optimizations/${optimizationId}/generate-pdf`,
      {
        content,
      }
    );
    return response.data;
  },

  /**
   * Get PDF generation status and download URL
   * @param optimizationId - The optimization ID
   */
  getPDFStatus: async (optimizationId: string) => {
    const response = await axios.get(
      `/optimizations/${optimizationId}/pdf-status`
    );
    return response.data;
  },

  /**
   * Download the generated PDF
   * @param optimizationId - The optimization ID
   */
  downloadPDF: async (optimizationId: string) => {
    const response = await axios.get(
      `/optimizations/${optimizationId}/download-pdf`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
