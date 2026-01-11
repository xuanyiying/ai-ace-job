import axios from '../config/axios';
import { type Job, type JobInput, type ParsedJobData } from '@/types';

export type { Job, JobInput, ParsedJobData };

/**
 * Service for handling job-related operations
 */
export const jobService = {
  /**
   * Create a new job record
   * @param data - Job details input
   * @returns Created job details
   */
  createJob: async (data: JobInput): Promise<Job> => {
    const response = await axios.post<Job>('/jobs', data);
    return response.data;
  },

  /**
   * Get all jobs for the current user
   * @returns List of jobs
   */
  getJobs: async (): Promise<Job[]> => {
    const response = await axios.get<Job[]>('/jobs');
    return response.data;
  },

  /**
   * Get details of a specific job
   * @param jobId - The ID of the job
   * @returns Job details
   */
  getJob: async (jobId: string): Promise<Job> => {
    const response = await axios.get<Job>(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Update an existing job record
   * @param jobId - The ID of the job
   * @param data - The update data
   * @returns Updated job details
   */
  updateJob: async (jobId: string, data: Partial<JobInput>): Promise<Job> => {
    const response = await axios.put<Job>(`/jobs/${jobId}`, data);
    return response.data;
  },

  /**
   * Delete a job record
   * @param jobId - The ID of the job to delete
   */
  deleteJob: async (jobId: string): Promise<void> => {
    await axios.delete(`/jobs/${jobId}`);
  },

  /**
   * Fetch job information from a URL
   * Requirement 4.2: Handle job links in conversation
   * @param url - The URL of the job posting
   * @returns Extracted job details
   */
  fetchJobFromUrl: async (url: string): Promise<JobInput> => {
    const response = await axios.post<JobInput>('/jobs/fetch-from-url', { url });
    return response.data;
  },

  /**
   * Parse job description text to extract structured data
   * Requirement 4.1: Identify job description text in conversation
   * @param description - The job description text
   * @returns Parsed structured job data
   */
  parseJobDescription: async (description: string): Promise<ParsedJobData> => {
    const response = await axios.post<ParsedJobData>('/jobs/parse', { description });
    return response.data;
  },
};
