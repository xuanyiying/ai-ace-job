import axios from '../config/axios';
import { Resume, ParsedResumeData } from '@/types';

/**
 * Service for handling resume-related operations
 */
export const resumeService = {
  /**
   * Upload a new resume file
   * @param file - The resume file (PDF, DOCX, etc.)
   * @param title - Optional title for the resume
   * @returns The uploaded resume details
   */
  uploadResume: async (file: File, title?: string): Promise<Resume> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }

    const response = await axios.post<Resume>('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Parse an uploaded resume to extract structured data
   * @param resumeId - The ID of the resume to parse
   * @returns The parsed resume data
   */
  parseResume: async (resumeId: string): Promise<ParsedResumeData> => {
    const response = await axios.get<ParsedResumeData>(`/resumes/${resumeId}/parse`);
    return response.data;
  },

  /**
   * Get all resumes for the current user
   * @returns List of resumes
   */
  getResumes: async (): Promise<Resume[]> => {
    const response = await axios.get<Resume[]>('/resumes');
    return response.data;
  },

  /**
   * Get details of a specific resume
   * @param resumeId - The ID of the resume
   * @returns Resume details
   */
  getResume: async (resumeId: string): Promise<Resume> => {
    const response = await axios.get<Resume>(`/resumes/${resumeId}`);
    return response.data;
  },

  /**
   * Update resume metadata or content
   * @param resumeId - The ID of the resume
   * @param data - The update data
   * @returns Updated resume details
   */
  updateResume: async (resumeId: string, data: Partial<Resume>): Promise<Resume> => {
    const response = await axios.put<Resume>(`/resumes/${resumeId}`, data);
    return response.data;
  },

  /**
   * Delete a resume
   * @param resumeId - The ID of the resume to delete
   */
  deleteResume: async (resumeId: string): Promise<void> => {
    await axios.delete(`/resumes/${resumeId}`);
  },

  /**
   * Set a resume as the primary one for the user
   * @param resumeId - The ID of the resume
   * @returns Updated resume details
   */
  setPrimaryResume: async (resumeId: string): Promise<Resume> => {
    const response = await axios.put<Resume>(`/resumes/${resumeId}/primary`);
    return response.data;
  },
};
