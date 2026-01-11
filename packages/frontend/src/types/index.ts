export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  TRIALING = 'TRIALING',
  UNPAID = 'UNPAID',
}

export enum BillingStatus {
  PAID = 'PAID',
  OPEN = 'OPEN',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
  DRAFT = 'DRAFT',
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// User types
export interface User {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  role?: Role;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  updatedAt?: string;
}

// Resume types
export enum ParseStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Resume {
  id: string;
  userId: string;
  title: string;
  originalFilename?: string;
  fileUrl?: string;
  fileType?: string;
  version: number;
  isPrimary: boolean;
  parseStatus: ParseStatus;
  parsedData?: ParsedResumeData;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedResumeData {
  personalInfo?: PersonalInfo;
  summary?: string;
  education?: Education[];
  experience?: Experience[];
  skills?: string[];
  projects?: Project[];
  certifications?: Certification[];
  languages?: Language[];
  markdown?: string;
  extractedText?: string;
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

// Conversation types
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messageCount: number;
  isActive: boolean;
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  attachments?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  createdAt: string;
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

export type ParsedJobDescription = ParsedJobData;

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

// Optimization types
export enum OptimizationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum SuggestionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum SuggestionType {
  CONTENT = 'CONTENT',
  KEYWORD = 'KEYWORD',
  STRUCTURE = 'STRUCTURE',
  QUANTIFICATION = 'QUANTIFICATION',
}

export interface Optimization {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  matchScore?: MatchScore;
  suggestions: Suggestion[];
  optimizedContent?: ParsedResumeData;
  status: OptimizationStatus;
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
  type: SuggestionType;
  section: string;
  itemIndex?: number;
  original: string;
  optimized: string;
  reason: string;
  status: SuggestionStatus;
}

export type OptimizationSuggestion = Suggestion;

export enum QuestionType {
  BEHAVIORAL = 'BEHAVIORAL',
  TECHNICAL = 'TECHNICAL',
  SITUATIONAL = 'SITUATIONAL',
  RESUME_BASED = 'RESUME_BASED',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

// Interview types
export enum InterviewStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface InterviewSession {
  id: string;
  userId: string;
  optimizationId: string;
  status: InterviewStatus;
  startTime: string;
  endTime?: string;
  score?: number;
  feedback?: string;
  messages?: InterviewMessage[];
}

export interface InterviewMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  audioUrl?: string;
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  optimizationId: string;
  questionType: QuestionType;
  question: string;
  suggestedAnswer: string;
  tips: string[];
  difficulty: Difficulty;
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
