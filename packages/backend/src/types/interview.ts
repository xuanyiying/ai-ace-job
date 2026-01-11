/**
 * Interview-related types
 */

/**
 * Type of interview question
 */
export enum InterviewQuestionType {
  BEHAVIORAL = 'BEHAVIORAL',
  TECHNICAL = 'TECHNICAL',
  SITUATIONAL = 'SITUATIONAL',
  RESUME_BASED = 'RESUME_BASED',
}

/**
 * Difficulty level of an interview question
 */
export enum InterviewDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/**
 * Interview question structure
 */
export interface InterviewQuestion {
  questionType: InterviewQuestionType;
  question: string;
  suggestedAnswer: string;
  tips: string[];
  difficulty: InterviewDifficulty;
}
