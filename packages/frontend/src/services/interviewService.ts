import axios from 'axios';
import type { InterviewQuestion } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const interviewService = {
  async generateQuestions(
    optimizationId: string
  ): Promise<InterviewQuestion[]> {
    const response = await axios.post(`${API_BASE_URL}/interview/questions`, {
      optimizationId,
    });
    return response.data;
  },

  async getQuestions(optimizationId: string): Promise<InterviewQuestion[]> {
    const response = await axios.get(
      `${API_BASE_URL}/interview/questions/${optimizationId}`
    );
    return response.data;
  },

  async exportInterviewPrep(optimizationId: string): Promise<string> {
    const response = await axios.get(
      `${API_BASE_URL}/interview/export/${optimizationId}`,
      { responseType: 'blob' }
    );
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `interview-prep-${optimizationId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
    return url;
  },
};
