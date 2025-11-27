import { Injectable, Logger } from '@nestjs/common';

/**
 * Degradation Service
 * Provides fallback implementations when AI services are unavailable
 * Implements graceful degradation strategy for:
 * - Resume parsing (rule-based extraction)
 * - Optimization suggestions (predefined suggestions)
 * - Interview questions (standard question library)
 *
 * Requirement 12.2: AI service degradation
 */
@Injectable()
export class DegradationService {
  private readonly logger = new Logger(DegradationService.name);

  /**
   * Get predefined optimization suggestions
   * Used when AI service is unavailable
   * Provides generic but valuable suggestions based on common resume issues
   */
  getPredefinedOptimizationSuggestions(matchScore: number): Array<{
    type: string;
    section: string;
    original: string;
    optimized: string;
    reason: string;
  }> {
    const suggestions: Array<{
      type: string;
      section: string;
      original: string;
      optimized: string;
      reason: string;
    }> = [];

    // Suggestion 1: Professional Summary
    suggestions.push({
      type: 'structure',
      section: 'summary',
      original: 'No professional summary or weak summary',
      optimized:
        'Add a compelling professional summary (2-3 sentences) highlighting your key strengths and career objectives',
      reason:
        'A strong professional summary helps recruiters quickly understand your value proposition and increases interview chances',
    });

    // Suggestion 2: Action Verbs
    suggestions.push({
      type: 'content',
      section: 'experience',
      original: 'Weak or passive language in job descriptions',
      optimized:
        'Use strong action verbs (Led, Managed, Developed, Implemented, Designed, Architected) to start each bullet point',
      reason:
        'Action verbs make your accomplishments more impactful and demonstrate leadership and initiative',
    });

    // Suggestion 3: Quantifiable Metrics
    suggestions.push({
      type: 'quantification',
      section: 'experience',
      original: 'Achievements without specific metrics',
      optimized:
        'Add quantifiable results to each achievement (percentages, numbers, timeframes, dollar amounts)',
      reason:
        'Specific metrics provide concrete evidence of your impact and make your resume more memorable',
    });

    // Suggestion 4: Keywords
    suggestions.push({
      type: 'keyword',
      section: 'skills',
      original: 'Missing industry-specific keywords',
      optimized:
        'Include relevant technical skills and industry keywords from the job description',
      reason:
        "Keywords improve your resume's visibility in ATS (Applicant Tracking Systems) and increase match scores",
    });

    // Suggestion 5: Skills Section
    suggestions.push({
      type: 'structure',
      section: 'skills',
      original: 'Unorganized or incomplete skills list',
      optimized:
        'Organize skills by category (Technical, Languages, Tools, Soft Skills) and prioritize by relevance',
      reason:
        'Well-organized skills make it easier for recruiters to quickly identify your relevant capabilities',
    });

    // Suggestion 6: Experience Relevance
    suggestions.push({
      type: 'content',
      section: 'experience',
      original: 'Experience descriptions lack relevance to target role',
      optimized:
        'Emphasize experience and achievements most relevant to the target position',
      reason:
        'Highlighting relevant experience increases your match score and demonstrates fit for the role',
    });

    // Suggestion 7: Education Details
    suggestions.push({
      type: 'structure',
      section: 'education',
      original: 'Minimal education information',
      optimized:
        'Add relevant coursework, GPA (if strong), honors, and academic achievements',
      reason:
        'Additional education details strengthen your profile, especially for specialized or entry-level roles',
    });

    // Suggestion 8: Projects Section
    suggestions.push({
      type: 'structure',
      section: 'projects',
      original: 'Missing or weak projects section',
      optimized:
        'Add 2-3 relevant projects with descriptions, technologies used, and measurable outcomes',
      reason:
        'Projects provide concrete evidence of your technical skills and ability to deliver results',
    });

    // Suggestion 9: Certifications
    suggestions.push({
      type: 'structure',
      section: 'certifications',
      original: 'Missing relevant certifications',
      optimized:
        'Include relevant professional certifications and credentials that match job requirements',
      reason:
        'Certifications validate your expertise and can significantly improve your competitiveness',
    });

    // Suggestion 10: Formatting and Clarity
    suggestions.push({
      type: 'structure',
      section: 'general',
      original: 'Poor formatting or unclear structure',
      optimized:
        'Use consistent formatting, clear section headers, and bullet points for easy scanning',
      reason:
        'Good formatting improves readability and helps recruiters quickly find relevant information',
    });

    // If match score is low, add more aggressive suggestions
    if (matchScore < 60) {
      suggestions.push({
        type: 'content',
        section: 'summary',
        original: 'Generic professional summary',
        optimized:
          'Tailor your professional summary to specifically address the job requirements and company needs',
        reason:
          "A tailored summary shows you've researched the role and are genuinely interested in the position",
      });

      suggestions.push({
        type: 'keyword',
        section: 'experience',
        original: 'Missing job-specific keywords in experience',
        optimized:
          'Incorporate specific technologies, methodologies, and tools mentioned in the job description',
        reason:
          'Job-specific keywords significantly improve your ATS score and demonstrate direct relevance',
      });
    }

    return suggestions;
  }

  /**
   * Get standard interview question library
   * Used when AI service is unavailable
   * Provides a curated set of common interview questions
   */
  getStandardInterviewQuestions(): Array<{
    questionType: string;
    question: string;
    suggestedAnswer: string;
    tips: string[];
    difficulty: string;
  }> {
    return [
      // Behavioral Questions
      {
        questionType: 'BEHAVIORAL',
        question:
          'Tell me about a time when you faced a significant challenge at work. How did you handle it?',
        suggestedAnswer: `Use the STAR method:
- Situation: Describe the context and challenge
- Task: Explain what needed to be accomplished
- Action: Detail the specific steps you took
- Result: Share the positive outcome and what you learned`,
        tips: [
          'Use the STAR method: Situation, Task, Action, Result',
          'Focus on your personal contribution',
          'Highlight problem-solving skills',
          'Mention measurable outcomes if possible',
        ],
        difficulty: 'MEDIUM',
      },
      {
        questionType: 'BEHAVIORAL',
        question:
          'Describe a time when you had to work with a difficult team member. How did you handle it?',
        suggestedAnswer: `Demonstrate emotional intelligence:
- Set the context of the team situation
- Explain the conflict or difficulty
- Describe how you communicated and resolved the issue
- Share the positive outcome and improved relationship`,
        tips: [
          'Demonstrate emotional intelligence',
          'Show respect for different perspectives',
          'Focus on collaboration and communication',
          'Avoid blaming others',
        ],
        difficulty: 'MEDIUM',
      },
      {
        questionType: 'BEHAVIORAL',
        question:
          'What is your greatest professional achievement? Why are you proud of it?',
        suggestedAnswer: `Highlight your impact:
- Describe the project or initiative
- Explain your role and responsibilities
- Detail the specific actions and strategies you used
- Highlight the impact and measurable results`,
        tips: [
          'Choose an achievement relevant to the target role',
          'Quantify the impact (percentages, numbers, etc.)',
          'Show leadership and initiative',
          'Connect it to the job requirements',
        ],
        difficulty: 'MEDIUM',
      },
      {
        questionType: 'BEHAVIORAL',
        question:
          'Tell me about a time when you failed or made a mistake. What did you learn from it?',
        suggestedAnswer: `Show growth mindset:
- Describe the situation and what went wrong
- Explain your responsibility in the failure
- Detail the steps you took to fix or learn from it
- Share how you applied the lesson to future situations`,
        tips: [
          'Be honest and take responsibility',
          'Focus on learning and growth',
          'Show how you improved',
          'Avoid making excuses',
        ],
        difficulty: 'HARD',
      },
      {
        questionType: 'BEHAVIORAL',
        question:
          'Describe a time when you had to meet a tight deadline. How did you manage it?',
        suggestedAnswer: `Demonstrate time management:
- Explain the project scope and deadline pressure
- Describe how you prioritized tasks
- Detail the strategies you used to stay organized
- Share the successful outcome`,
        tips: [
          'Show organizational skills',
          'Mention specific tools or techniques you used',
          'Emphasize communication with stakeholders',
          'Highlight the successful delivery',
        ],
        difficulty: 'MEDIUM',
      },

      // Technical Questions
      {
        questionType: 'TECHNICAL',
        question:
          'Explain your experience with the primary technology stack for this role.',
        suggestedAnswer: `Provide technical depth:
- Describe your hands-on experience with the technology
- Mention specific projects where you used it
- Discuss key features and capabilities you've worked with
- Share challenges you've overcome
- Explain best practices you follow`,
        tips: [
          'Be specific about your experience',
          'Provide concrete examples from your projects',
          'Show depth of knowledge',
          'Discuss real-world applications',
        ],
        difficulty: 'MEDIUM',
      },
      {
        questionType: 'TECHNICAL',
        question:
          'How would you approach designing a solution for a complex technical problem?',
        suggestedAnswer: `Outline your design approach:
- Understand requirements and constraints
- Identify key components and their interactions
- Consider scalability and performance
- Discuss trade-offs and design decisions
- Explain how you would test and validate the solution`,
        tips: [
          'Think out loud and explain your reasoning',
          'Consider multiple approaches',
          'Discuss trade-offs',
          'Show systems thinking',
        ],
        difficulty: 'HARD',
      },
      {
        questionType: 'TECHNICAL',
        question:
          'Describe your approach to debugging a complex technical issue.',
        suggestedAnswer: `Explain your debugging methodology:
- Gather information about the problem
- Reproduce the issue consistently
- Form hypotheses about the root cause
- Test hypotheses systematically
- Implement and verify the fix
- Document the solution for future reference`,
        tips: [
          'Show systematic problem-solving approach',
          'Mention tools and techniques you use',
          'Discuss how you stay organized',
          'Emphasize communication with team members',
        ],
        difficulty: 'MEDIUM',
      },
      {
        questionType: 'TECHNICAL',
        question:
          'How do you stay current with new technologies and industry trends?',
        suggestedAnswer: `Describe your learning strategy:
- Online courses and certifications you pursue
- Technical blogs and publications you follow
- Open source projects you contribute to
- Communities and conferences you participate in
- How you apply new knowledge to your work`,
        tips: [
          'Show genuine interest in learning',
          'Mention specific resources and communities',
          'Discuss how you balance learning with work',
          'Show initiative and self-motivation',
        ],
        difficulty: 'EASY',
      },

      // Situational Questions
      {
        questionType: 'SITUATIONAL',
        question:
          'You have a tight deadline and discover a critical issue that will delay the project. What do you do?',
        suggestedAnswer: `Your approach should include:
- Immediately inform stakeholders about the issue
- Assess the severity and impact
- Propose solutions and timeline adjustments
- Collaborate with team to find alternatives
- Keep communication transparent throughout`,
        tips: [
          'Show responsibility and transparency',
          'Demonstrate problem-solving skills',
          'Emphasize communication',
          'Focus on solutions, not excuses',
        ],
        difficulty: 'MEDIUM',
      },
      {
        questionType: 'SITUATIONAL',
        question:
          'You receive conflicting priorities from two managers. How do you handle this?',
        suggestedAnswer: `Your approach should include:
- Seek clarification on business impact and urgency
- Communicate with both managers about the conflict
- Propose a prioritization based on business value
- Document the decision and reasoning
- Adjust as needed based on feedback`,
        tips: [
          'Show diplomatic communication skills',
          'Focus on business impact',
          'Demonstrate maturity in handling conflict',
          'Seek guidance when needed',
        ],
        difficulty: 'HARD',
      },
      {
        questionType: 'SITUATIONAL',
        question:
          "You disagree with your manager's technical approach. How do you handle it?",
        suggestedAnswer: `Your approach should include:
- Understand their reasoning and perspective
- Prepare data and evidence for your alternative approach
- Request a discussion to share your concerns
- Listen to feedback and be open to being wrong
- Support the final decision once made`,
        tips: [
          'Show respect for authority',
          'Demonstrate critical thinking',
          'Use data to support your position',
          'Show flexibility and team spirit',
        ],
        difficulty: 'HARD',
      },

      // Resume-Based Questions
      {
        questionType: 'RESUME_BASED',
        question:
          'Tell me about your most recent role and your key responsibilities.',
        suggestedAnswer: `Provide details about your role:
- Overview of the company and team
- Your specific responsibilities and scope
- Key projects you led or contributed to
- Technologies and tools you used
- Impact and achievements in the role`,
        tips: [
          'Be specific and detailed',
          'Highlight your contributions',
          'Connect to the target role',
          'Show growth and learning',
        ],
        difficulty: 'EASY',
      },
      {
        questionType: 'RESUME_BASED',
        question:
          'I see you have several relevant skills listed. Can you describe a project where you used them?',
        suggestedAnswer: `Describe a specific project:
- Context and objectives of the project
- Your role and responsibilities
- How you applied your skills
- Challenges you faced
- Results and what you learned`,
        tips: [
          'Choose a relevant and impressive project',
          'Be specific about your contribution',
          'Show technical depth',
          'Connect to the job requirements',
        ],
        difficulty: 'MEDIUM',
      },
      {
        questionType: 'RESUME_BASED',
        question:
          'Tell me about your educational background and how it prepared you for this role.',
        suggestedAnswer: `Discuss your education:
- Key courses and subjects you studied
- Relevant projects or research
- How it relates to the target role
- Skills and knowledge you gained
- How you've applied it in your career`,
        tips: [
          'Connect education to job requirements',
          "Show how you've applied learning",
          'Mention relevant coursework or projects',
          'Demonstrate continuous learning',
        ],
        difficulty: 'EASY',
      },
    ];
  }

  /**
   * Get predefined resume parsing rules
   * Used when AI service is unavailable
   * Provides rule-based extraction patterns
   */
  getPredefinedParsingRules(): Record<string, any> {
    return {
      personalInfoPatterns: {
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        phone: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/,
        linkedin: /https?:\/\/(www\.)?linkedin\.com\/in\/[^\s]+/,
        github: /https?:\/\/(www\.)?github\.com\/[^\s]+/,
      },
      sectionKeywords: {
        summary: ['summary', 'objective', 'professional summary', 'profile'],
        education: ['education', 'degree', 'university', 'college', 'school'],
        experience: ['experience', 'work experience', 'employment', 'career'],
        skills: ['skills', 'technical skills', 'competencies', 'abilities'],
        projects: ['projects', 'portfolio', 'notable projects', 'work samples'],
        certifications: [
          'certification',
          'certifications',
          'licenses',
          'credentials',
        ],
        languages: ['languages', 'language', 'linguistic'],
      },
      degreePatterns: [
        'bachelor',
        'master',
        'phd',
        'associate',
        'diploma',
        'certificate',
      ],
      actionVerbs: [
        'led',
        'managed',
        'developed',
        'implemented',
        'created',
        'built',
        'designed',
        'architected',
        'engineered',
        'optimized',
        'improved',
        'enhanced',
        'streamlined',
        'increased',
        'reduced',
        'achieved',
        'delivered',
        'launched',
        'established',
        'coordinated',
      ],
      commonSkills: [
        'javascript',
        'typescript',
        'python',
        'java',
        'c++',
        'react',
        'vue',
        'angular',
        'node.js',
        'express',
        'django',
        'flask',
        'postgresql',
        'mysql',
        'mongodb',
        'redis',
        'docker',
        'kubernetes',
        'aws',
        'azure',
        'gcp',
        'git',
        'rest api',
        'graphql',
        'html',
        'css',
        'sass',
        'webpack',
        'jest',
        'agile',
        'scrum',
      ],
    };
  }

  /**
   * Log degradation event
   * Tracks when degradation strategies are used
   */
  logDegradationEvent(
    service: 'ai_parsing' | 'ai_suggestions' | 'ai_interview',
    reason: string
  ): void {
    this.logger.warn(
      `Degradation activated for ${service}: ${reason}. Using fallback strategy.`
    );
  }
}
