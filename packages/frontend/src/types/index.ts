// User types
export interface User {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  role?: 'USER' | 'ADMIN' | string;
  subscriptionTier: 'FREE' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
  updatedAt?: string;
}

// Resume types
export interface Resume {
  id: string;
  userId: string;
  title: string;
  originalFilename?: string;
  fileUrl?: string;
  fileType?: string;
  version: number;
  isPrimary: boolean;
  parseStatus: 'pending' | 'processing' | 'completed' | 'failed';
  parsedData?: ParsedResumeData;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedResumeData {
  personalInfo: PersonalInfo;
  summary?: string;
  education: Education[];
  experience: Experience[];
  skills: string[];
  projects: Project[];
  certifications?: Certification[];
  languages?: Language[];
  markdown?: string;
}

export interface PersonalInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  achievements?: string[];
}

export interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  location?: string;
  description: string[];
  achievements?: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  highlights: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface Language {
  name: string;
  proficiency: string;
}

// Job types
export interface Job {
  id: string;
  userId: string;
  title: string;
  company: string;
  location?: string;
  jobType?: string;
  salaryRange?: string;
  jobDescription: string;
  requirements: string;
  parsedRequirements?: ParsedJobData;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedJobData {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears?: number;
  educationLevel?: string;
  responsibilities: string[];
  keywords: string[];
}

// Optimization types
export interface Optimization {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  matchScore?: MatchScore;
  suggestions: Suggestion[];
  optimizedContent?: ParsedResumeData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

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

export interface Suggestion {
  id: string;
  type: 'content' | 'keyword' | 'structure' | 'quantification';
  section: string;
  itemIndex?: number;
  original: string;
  optimized: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
}

// Interview types
export interface InterviewQuestion {
  id: string;
  optimizationId: string;
  questionType: 'behavioral' | 'technical' | 'situational' | 'resume_based';
  question: string;
  suggestedAnswer: string;
  tips: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

// API Response types
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId: string;
  };
}

// Knowledge Base types
export type DocumentCategory =
  | 'interview_questions'
  | 'career_advice'
  | 'industry_knowledge'
  | 'resume_tips'
  | 'general';

export interface KBDocument {
  id: string;
  title: string;
  fileName: string;
  documentType: 'pdf' | 'docx' | 'txt';
  category: DocumentCategory;
  tags?: string[];
  chunkCount: number;
  wordCount: number;
  createdAt: string;
}

export interface KBStats {
  totalDocuments: number;
  totalChunks: number;
  documentsByCategory: Record<string, number>;
  lastUpdated?: string;
}

export interface KBQueryResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface KBQueryResponse {
  results: KBQueryResult[];
  answer?: string;
  totalResults: number;
}
