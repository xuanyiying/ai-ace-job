/**
 * Job-related data structures
 */

/**
 * Parsed job description data
 */
export interface ParsedJobData {
  title?: string;
  company?: string;
  description?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears?: number;
  educationLevel?: string;
  responsibilities: string[];
  keywords: string[];
  location?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  } | string;
}

/**
 * Alias for ParsedJobData to support legacy AI engine
 */
export type ParsedJobDescription = ParsedJobData;

/**
 * Input format for job description processing
 */
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
