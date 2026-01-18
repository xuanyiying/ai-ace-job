import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  InterviewQuestion,
  InterviewSession,
  InterviewMessage,
} from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { QuestionGeneratorService } from './services/question-generator.service';
import { InterviewSessionService } from './services/interview-session.service';
import { AIEngine } from '@/ai';
import { PromptScenario } from '@/ai-providers/interfaces/prompt-template.interface';
import { GetPreparationGuideDto } from './dto/get-preparation-guide.dto';

@Injectable()
export class InterviewService {
  constructor(
    private prisma: PrismaService,
    private questionGenerator: QuestionGeneratorService,
    private sessionService: InterviewSessionService,
    private aiEngine: AIEngine
  ) {}

  async getPreparationGuide(dto: GetPreparationGuideDto): Promise<string> {
    const variables: Record<string, any> = {
      resume_content: dto.resumeData ? JSON.stringify(dto.resumeData) : '',
      job_description: dto.jobDescription || '',
      experience_description: dto.question || '', // reusing question field for STAR scenario input
      question: dto.question || '',
    };

    return this.aiEngine.generateContent(
      PromptScenario.INTERVIEW_PREPARATION,
      variables,
      {
        variant: dto.type,
        language: dto.language,
      }
    );
  }

  async generateQuestions(
    optimizationId: string,
    userId: string,
    count: number = 12
  ): Promise<InterviewQuestion[]> {
    return this.questionGenerator.generateQuestions(
      optimizationId,
      userId,
      count
    );
  }

  async getQuestions(
    optimizationId: string,
    userId: string
  ): Promise<InterviewQuestion[]> {
    const optimization = await this.prisma.optimization.findUnique({
      where: { id: optimizationId },
    });

    if (!optimization) {
      throw new NotFoundException(
        `Optimization with ID ${optimizationId} not found`
      );
    }

    if (optimization.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this optimization'
      );
    }

    return this.prisma.interviewQuestion.findMany({
      where: { optimizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async exportInterviewPrep(
    optimizationId: string,
    userId: string
  ): Promise<string> {
    const questions = await this.getQuestions(optimizationId, userId);

    if (questions.length === 0) {
      throw new NotFoundException(
        'No interview questions found for this optimization'
      );
    }

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Preparation Guide</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 20px; }
    .question { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; }
    .question-text { font-weight: bold; color: #333; margin-bottom: 10px; }
    .answer { margin: 10px 0; }
    .tips { margin: 10px 0; padding: 10px; background: #e7f3ff; border-radius: 4px; }
    .tips-title { font-weight: bold; color: #0056b3; }
    .difficulty { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
    .difficulty.easy { background: #d4edda; color: #155724; }
    .difficulty.medium { background: #fff3cd; color: #856404; }
    .difficulty.hard { background: #f8d7da; color: #721c24; }
    .type { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #e2e3e5; color: #383d41; }
  </style>
</head>
<body>
  <h1>Interview Preparation Guide</h1>
  <p>This guide contains interview questions and suggested answers to help you prepare for your interview.</p>
`;

    const questionsByType = this.groupQuestionsByType(questions);

    for (const [type, typeQuestions] of Object.entries(questionsByType)) {
      html += `<h2>${this.formatQuestionType(type)} Questions (${typeQuestions.length})</h2>`;

      typeQuestions.forEach((q, index) => {
        html += `
  <div class="question">
    <div class="question-text">
      Q${index + 1}: ${this.escapeHtml(q.question)}
      <span class="type">${this.formatQuestionType(q.questionType)}</span>
      <span class="difficulty ${q.difficulty.toLowerCase()}">${q.difficulty}</span>
    </div>
    <div class="answer">
      <strong>Suggested Answer:</strong>
      <p>${this.escapeHtml(q.suggestedAnswer).replace(/\n/g, '<br>')}</p>
    </div>
    ${
      q.tips && q.tips.length > 0
        ? `
    <div class="tips">
      <div class="tips-title">Tips:</div>
      <ul>
        ${q.tips.map((tip) => `<li>${this.escapeHtml(tip)}</li>`).join('')}
      </ul>
    </div>
    `
        : ''
    }
  </div>
`;
      });
    }

    html += `
</body>
</html>
`;

    return html;
  }

  async startSession(
    userId: string,
    createSessionDto: CreateSessionDto
  ): Promise<{
    session: InterviewSession;
    firstQuestion: InterviewQuestion | null;
  }> {
    return this.sessionService.startSession(userId, createSessionDto);
  }

  async handleMessage(
    userId: string,
    sessionId: string,
    sendMessageDto: SendMessageDto
  ): Promise<{
    userMessage: InterviewMessage;
    aiMessage: InterviewMessage;
  }> {
    return this.sessionService.handleMessage(userId, sessionId, sendMessageDto);
  }

  async endSession(
    userId: string,
    endSessionDto: EndSessionDto
  ): Promise<InterviewSession> {
    return this.sessionService.endSession(userId, endSessionDto);
  }

  async getSession(
    userId: string,
    sessionId: string
  ): Promise<InterviewSession> {
    return this.sessionService.getSession(userId, sessionId);
  }

  async getActiveSessionByOptimization(
    userId: string,
    optimizationId: string
  ): Promise<InterviewSession | null> {
    return this.sessionService.getActiveSessionByOptimization(
      userId,
      optimizationId
    );
  }

  async transcribeAudio(file: Express.Multer.File): Promise<{ text: string }> {
    return this.sessionService.transcribeAudio(file);
  }

  private groupQuestionsByType(
    questions: InterviewQuestion[]
  ): Record<string, InterviewQuestion[]> {
    const grouped: Record<string, InterviewQuestion[]> = {};
    for (const question of questions) {
      if (!grouped[question.questionType]) {
        grouped[question.questionType] = [];
      }
      grouped[question.questionType].push(question);
    }
    return grouped;
  }

  private formatQuestionType(type: string): string {
    const typeMap: Record<string, string> = {
      BEHAVIORAL: 'Behavioral',
      TECHNICAL: 'Technical',
      SITUATIONAL: 'Situational',
      RESUME_BASED: 'Resume-Based',
    };
    return typeMap[type] || type;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
