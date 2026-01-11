import axios from '../config/axios';
import type { InterviewQuestion, InterviewSession, InterviewMessage } from '../types';

/**
 * Service for managing AI-powered interview sessions and question generation
 */
export const interviewService = {
  /**
   * Start a new interview session for a given optimization
   * @param optimizationId - The ID of the optimization to base the interview on
   * @returns The created interview session
   */
  startSession: async (optimizationId: string): Promise<InterviewSession> => {
    const response = await axios.post<InterviewSession>('/interview/session', {
      optimizationId,
    });
    return response.data;
  },

  /**
   * Send a message in an active interview session
   * @param sessionId - The ID of the active session
   * @param content - The message content
   * @param audioUrl - Optional URL to an audio recording of the message
   * @returns The user's message and the AI's response
   */
  sendMessage: async (
    sessionId: string,
    content: string,
    audioUrl?: string
  ): Promise<{
    userMessage: InterviewMessage;
    aiMessage: InterviewMessage;
  }> => {
    const response = await axios.post<{
      userMessage: InterviewMessage;
      aiMessage: InterviewMessage;
    }>(`/interview/session/${sessionId}/message`, {
      content,
      audioUrl,
    });
    return response.data;
  },

  /**
   * End an active interview session
   * @param sessionId - The ID of the session to end
   * @returns The updated interview session
   */
  endSession: async (sessionId: string): Promise<InterviewSession> => {
    const response = await axios.post<InterviewSession>(
      `/interview/session/${sessionId}/end`
    );
    return response.data;
  },

  /**
   * Upload an audio recording for an interview message
   * @param file - The audio file blob
   * @returns The URL of the uploaded audio file
   */
  uploadAudio: async (file: Blob): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file, 'recording.webm');
    formData.append('fileType', 'AUDIO');
    formData.append('category', 'interview_recording');

    const response = await axios.post<{ url: string }>(
      '/storage/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Get details of a specific interview session
   * @param sessionId - The ID of the session
   * @returns The interview session details
   */
  getSession: async (sessionId: string): Promise<InterviewSession> => {
    const response = await axios.get<InterviewSession>(
      `/interview/session/${sessionId}`
    );
    return response.data;
  },

  /**
   * Get the active interview session for an optimization, if any
   * @param optimizationId - The ID of the optimization
   * @returns The active session or null
   */
  getActiveSession: async (optimizationId: string): Promise<InterviewSession | null> => {
    const response = await axios.get<InterviewSession | null>(
      `/interview/active-session/${optimizationId}`
    );
    return response.data;
  },

  /**
   * Generate interview questions based on an optimization
   * @param optimizationId - The ID of the optimization
   * @returns A list of generated interview questions
   */
  generateQuestions: async (optimizationId: string): Promise<InterviewQuestion[]> => {
    const response = await axios.post<InterviewQuestion[]>('/interview/questions', {
      optimizationId,
    });
    return response.data;
  },

  /**
   * Get existing interview questions for an optimization
   * @param optimizationId - The ID of the optimization
   * @returns A list of interview questions
   */
  getQuestions: async (optimizationId: string): Promise<InterviewQuestion[]> => {
    const response = await axios.get<InterviewQuestion[]>(
      `/interview/questions/${optimizationId}`
    );
    return response.data;
  },

  /**
   * Export interview preparation materials as a PDF
   * @param optimizationId - The ID of the optimization
   * @returns The URL of the generated PDF
   */
  exportInterviewPrep: async (optimizationId: string): Promise<string> => {
    const response = await axios.get(
      `/interview/export/${optimizationId}`,
      { responseType: 'blob' }
    );
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
