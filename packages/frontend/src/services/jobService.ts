import axios from '../config/axios';

export interface JobInput {
  title: string;
  company: string;
  location?: string;
  jobType?: string;
  salaryRange?: string;
  jobDescription: string;
  requirements: string;
  sourceUrl?: string;
}

export interface ParsedJobData {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears?: number;
  educationLevel?: string;
  responsibilities: string[];
  keywords: string[];
}

export interface Job extends JobInput {
  id: string;
  userId: string;
  parsedRequirements?: ParsedJobData;
  createdAt: string;
  updatedAt: string;
}

export const jobService = {
  createJob: async (data: JobInput): Promise<Job> => {
    const response = await axios.post('/jobs', data);
    return response.data;
  },

  getJobs: async (): Promise<Job[]> => {
    const response = await axios.get('/jobs');
    return response.data;
  },

  getJob: async (jobId: string): Promise<Job> => {
    const response = await axios.get(`/jobs/${jobId}`);
    return response.data;
  },

  updateJob: async (jobId: string, data: Partial<JobInput>): Promise<Job> => {
    const response = await axios.put(`/jobs/${jobId}`, data);
    return response.data;
  },

  deleteJob: async (jobId: string): Promise<void> => {
    await axios.delete(`/jobs/${jobId}`);
  },

  /**
   * Fetch job information from a URL
   * Requirement 4.2: Handle job links in conversation
   */
  fetchJobFromUrl: async (url: string): Promise<JobInput> => {
    const response = await axios.post('/jobs/fetch-from-url', { url });
    return response.data;
  },

  /**
   * Parse job description text to extract structured data
   * Requirement 4.1: Identify job description text in conversation
   */
  parseJobDescription: async (description: string): Promise<ParsedJobData> => {
    const response = await axios.post('/jobs/parse', { description });
    return response.data;
  },
};
