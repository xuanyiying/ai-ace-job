import axios from '../config/axios';
import { ParsedResumeData } from '@/types';

export interface PitchPerfectAgentOutput {
  introduction: string;
  highlights: string[];
  keywordOverlap: {
    matched: string[];
    missing: string[];
    overlapPercentage: number;
  };
  suggestions: string[];
}

/**
 * Pitch Perfect Agent Service
 * Handles generation and refinement of elevator pitches
 */
export const pitchPerfectService = {
  /**
   * Generate an elevator pitch based on resume and job description
   * @param resumeData - Parsed resume data
   * @param jobDescription - Target job description
   * @param style - Professional style of the pitch
   * @param duration - Target duration in seconds
   * @returns Generated pitch text
   */
  generatePitch: async (
    resumeData: ParsedResumeData,
    jobDescription: string,
    style: 'technical' | 'managerial' | 'sales',
    duration: 30 | 60
  ): Promise<PitchPerfectAgentOutput> => {
    const response = await axios.post('/api/agents/pitch-perfect/generate', {
      resumeData,
      jobDescription,
      style,
      duration,
    });
    return response.data;
  },

  /**
   * Refine an existing pitch based on user feedback
   * @param currentIntroduction - The current pitch text
   * @param feedback - User feedback for refinement
   * @returns Refined pitch text
   */
  refinePitch: async (
    currentIntroduction: string,
    feedback: string
  ): Promise<{ refinedIntroduction: string }> => {
    const response = await axios.post('/api/agents/pitch-perfect/refine', {
      currentIntroduction,
      feedback,
    });
    return response.data;
  },
};

/**
 * Strategist Agent Service
 * Handles generation of interview questions and performance tracking
 */
export const strategistService = {
  /**
   * Generate a bank of interview questions based on resume and job
   * @param resumeData - Parsed resume data
   * @param jobDescription - Target job description
   * @param experienceLevel - Candidate's experience level
   * @returns List of generated questions
   */
  generateQuestionBank: async (
    resumeData: ParsedResumeData,
    jobDescription: string,
    experienceLevel: 'junior' | 'mid' | 'senior'
  ): Promise<any> => {
    const response = await axios.post('/api/agents/strategist/generate', {
      resumeData,
      jobDescription,
      experienceLevel,
    });
    return response.data;
  },

  /**
   * Update the strategist's model based on interview performance
   * @param performance - Interview performance data
   */
  updateBasedOnPerformance: async (performance: any): Promise<void> => {
    const response = await axios.post(
      '/api/agents/strategist/update-performance',
      { performance }
    );
    return response.data;
  },
};

/**
 * Role-Play Agent Service
 * Handles AI-powered mock interview simulations
 */
export const rolePlayService = {
  /**
   * Start a new mock interview session
   * @param jobDescription - Target job description
   * @param interviewerStyle - Personality style of the AI interviewer
   * @param focusAreas - Specific topics to focus on
   * @param resumeData - Optional resume data for context
   * @returns Session details and initial question
   */
  startInterview: async (
    jobDescription: string,
    interviewerStyle: 'strict' | 'friendly' | 'stress-test',
    focusAreas: string[],
    resumeData?: ParsedResumeData
  ): Promise<any> => {
    const response = await axios.post('/api/agents/role-play/start', {
      jobDescription,
      interviewerStyle,
      focusAreas,
      resumeData,
    });
    return response.data;
  },

  /**
   * Process a user's response to an interview question
   * @param sessionId - The ID of the active session
   * @param userResponse - The user's answer text
   * @returns AI's feedback and the next question
   */
  processResponse: async (sessionId: string, userResponse: string): Promise<any> => {
    const response = await axios.post('/api/agents/role-play/respond', {
      sessionId,
      userResponse,
    });
    return response.data;
  },

  /**
   * Conclude the interview session
   * @param sessionId - The ID of the session to end
   * @returns Final summary of the interview
   */
  concludeInterview: async (sessionId: string): Promise<any> => {
    const response = await axios.post('/api/agents/role-play/conclude', {
      sessionId,
    });
    return response.data;
  },

  /**
   * Get detailed feedback for a completed interview
   * @param sessionId - The ID of the completed session
   * @returns Detailed performance feedback
   */
  getFeedback: async (sessionId: string): Promise<any> => {
    const response = await axios.get(
      `/api/agents/role-play/feedback/${sessionId}`
    );
    return response.data;
  },
};

/**
 * Agent Metrics Service
 * Provides reports on AI agent usage and costs
 */
export const agentMetricsService = {
  /**
   * Get a report of token usage across AI agents
   * @param startDate - Start date for the report
   * @param endDate - End date for the report
   * @param groupBy - How to group the usage data
   * @param agentType - Optional filter for specific agent type
   * @returns Token usage report data
   */
  getTokenUsageReport: async (
    startDate: string,
    endDate: string,
    groupBy: 'agent-type' | 'workflow-step' | 'model' = 'agent-type',
    agentType?: string
  ): Promise<any> => {
    const response = await axios.get('/api/agents/metrics/token-usage', {
      params: {
        startDate,
        endDate,
        groupBy,
        ...(agentType && { agentType }),
      },
    });
    return response.data;
  },

  /**
   * Get a report of costs associated with AI agent usage
   * @param startDate - Start date for the report
   * @param endDate - End date for the report
   * @param groupBy - How to group the cost data
   * @param agentType - Optional filter for specific agent type
   * @returns Cost report data
   */
  getCostReport: async (
    startDate: string,
    endDate: string,
    groupBy: 'agent-type' | 'workflow-step' | 'model' = 'agent-type',
    agentType?: string
  ): Promise<any> => {
    const response = await axios.get('/api/agents/metrics/cost', {
      params: {
        startDate,
        endDate,
        groupBy,
        ...(agentType && { agentType }),
      },
    });
    return response.data;
  },

  /**
   * Get a report of estimated savings from using AI optimization
   * @param startDate - Start date for the report
   * @param endDate - End date for the report
   * @param agentType - Optional filter for specific agent type
   * @returns Savings report data
   */
  getOptimizationSavingsReport: async (
    startDate: string,
    endDate: string,
    agentType?: string
  ): Promise<any> => {
    const response = await axios.get(
      '/api/agents/metrics/optimization-savings',
      {
        params: {
          startDate,
          endDate,
          ...(agentType && { agentType }),
        },
      }
    );
    return response.data;
  },
};
