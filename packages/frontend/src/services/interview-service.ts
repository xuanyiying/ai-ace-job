import axios from '../config/axios';
import type {
  InterviewQuestion,
  InterviewSession,
  InterviewMessage,
} from '../types';

/**
 * Service for managing AI-powered interview sessions and question generation
 */
export const interviewService = {
  /**
   * Start a new interview session for a given optimization
   * @param optimizationId - The ID of the optimization to base the interview on
   * @returns The created interview session and the first question
   */
  startSession: async (
    optimizationId: string
  ): Promise<{
    session: InterviewSession;
    firstQuestion: InterviewQuestion;
  }> => {
    const response = await axios.post<{
      session: InterviewSession;
      firstQuestion: InterviewQuestion;
    }>('/interview/session', {
      optimizationId,
    });
    return response.data;
  },

  /**
   * Submit an answer for the current question
   * @param sessionId - The ID of the active session
   * @param content - The answer content
   * @param audioUrl - Optional URL to an audio recording of the answer
   * @returns The next question (if any) and completion status
   */
  submitAnswer: async (
    sessionId: string,
    content: string,
    audioUrl?: string
  ): Promise<{
    nextQuestion: InterviewQuestion | null;
    isCompleted: boolean;
  }> => {
    const response = await axios.post<{
      nextQuestion: InterviewQuestion | null;
      isCompleted: boolean;
    }>(`/interview/session/${sessionId}/answer`, {
      content,
      audioUrl,
    });
    return response.data;
  },

  /**
   * Get the current state of the interview session
   * @param sessionId - The ID of the session
   * @returns The current question index, question, and status
   */
  getCurrentState: async (
    sessionId: string
  ): Promise<{
    currentIndex?: number;
    currentQuestion?: InterviewQuestion;
    totalQuestions?: number;
    status: string;
    isCompleted?: boolean;
  }> => {
    const response = await axios.get(`/interview/session/${sessionId}/current`);
    return response.data;
  },

  /**
   * Send a message in an active interview session (Deprecated - use submitAnswer)
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
   * Transcribe audio file
   * @param file - The audio file blob
   * @returns The transcribed text
   */
  transcribeAudio: async (file: Blob): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append('file', file, 'recording.webm');

    const response = await axios.post<{ text: string }>(
      '/interview/audio/transcribe',
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
  getActiveSession: async (
    optimizationId: string
  ): Promise<InterviewSession | null> => {
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
  generateQuestions: async (
    optimizationId: string
  ): Promise<InterviewQuestion[]> => {
    const response = await axios.post<InterviewQuestion[]>(
      '/interview/questions',
      {
        optimizationId,
      }
    );
    return response.data;
  },

  /**
   * Get existing interview questions for an optimization
   * @param optimizationId - The ID of the optimization
   * @returns A list of interview questions
   */
  getQuestions: async (
    optimizationId: string
  ): Promise<InterviewQuestion[]> => {
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
    const response = await axios.get(`/interview/export/${optimizationId}`, {
      responseType: 'blob',
    });
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

  /**
   * Get interview preparation guide or strategy
   * @param params - Configuration for the guide generation
   * @returns The generated guide content
   */
  getPreparationGuide: async (params: {
    type: 'guide' | 'strategy' | 'star';
    language?: string;
    resumeData?: Record<string, any>;
    jobDescription?: string;
    question?: string;
  }): Promise<{ content: string }> => {
    const response = await axios.post<{ content: string }>(
      '/interview/preparation-guide',
      params
    );
    return response.data;
  },
};
