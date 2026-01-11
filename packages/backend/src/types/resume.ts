/**
 * Resume-related data structures
 */

/**
 * Parsed resume data structure
 * Used across AI parsing and optimization features
 */
export interface ParsedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary?: string;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
    achievements?: string[];
  }>;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    location?: string;
    description: string[];
    achievements?: string[];
  }>;
  skills: string[];
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    highlights: string[];
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  languages?: Array<{
    name: string;
    proficiency: string;
  }>;
  markdown?: string;
}

/**
 * Score results of matching a resume against a job description
 */
export interface MatchScore {
  overall: number;
  skillMatch: number;
  experienceMatch: number;
  educationMatch: number;
  keywordCoverage: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
}
