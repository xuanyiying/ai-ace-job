import { PrismaClient } from '@prisma/client';
import { ChromaClient } from 'chromadb';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Knowledge base seeding script
 * Populates vector database with interview questions, STAR examples, and other knowledge
 * Requirements: 9.2, 3.5, 2.1
 */

// Common interview questions by role and experience level
const commonInterviewQuestions = [
  // Frontend Developer Questions
  {
    content:
      'Explain the difference between let, const, and var in JavaScript. When would you use each one?',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'junior',
      category: 'JavaScript Fundamentals',
      keywords: ['JavaScript', 'variables', 'scope'],
    },
  },
  {
    content:
      'What is the virtual DOM in React and how does it improve performance?',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'React',
      keywords: ['React', 'virtual DOM', 'performance'],
    },
  },
  {
    content:
      'Describe the lifecycle methods in React class components and their use cases.',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'React',
      keywords: ['React', 'lifecycle', 'class components'],
    },
  },
  {
    content:
      'What are React Hooks and how do they differ from class components?',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'React',
      keywords: ['React', 'hooks', 'functional components'],
    },
  },
  {
    content:
      'Explain CSS specificity and how it affects styling. Provide examples.',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'junior',
      category: 'CSS',
      keywords: ['CSS', 'specificity', 'styling'],
    },
  },
  {
    content:
      'What is the difference between responsive design and adaptive design?',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'junior',
      category: 'Web Design',
      keywords: ['responsive', 'adaptive', 'design'],
    },
  },
  {
    content:
      'How would you optimize the performance of a React application?',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'senior',
      category: 'Performance',
      keywords: ['React', 'optimization', 'performance'],
    },
  },
  {
    content:
      'Explain the concept of state management and when you would use Redux vs Context API.',
    metadata: {
      role: 'Frontend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'State Management',
      keywords: ['Redux', 'Context API', 'state management'],
    },
  },

  // Backend Developer Questions
  {
    content:
      'What is the difference between SQL and NoSQL databases? When would you use each?',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'junior',
      category: 'Databases',
      keywords: ['SQL', 'NoSQL', 'databases'],
    },
  },
  {
    content:
      'Explain the concept of database normalization and its benefits.',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'Databases',
      keywords: ['normalization', 'database design'],
    },
  },
  {
    content:
      'What are ACID properties in databases and why are they important?',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'Databases',
      keywords: ['ACID', 'transactions', 'database'],
    },
  },
  {
    content:
      'Describe the difference between authentication and authorization.',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'junior',
      category: 'Security',
      keywords: ['authentication', 'authorization', 'security'],
    },
  },
  {
    content:
      'What is REST API and what are the HTTP methods used in RESTful services?',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'junior',
      category: 'API Design',
      keywords: ['REST', 'API', 'HTTP'],
    },
  },
  {
    content:
      'Explain the concept of microservices and its advantages over monolithic architecture.',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'senior',
      category: 'Architecture',
      keywords: ['microservices', 'architecture', 'scalability'],
    },
  },
  {
    content:
      'What is caching and what are the different caching strategies?',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'Performance',
      keywords: ['caching', 'performance', 'optimization'],
    },
  },
  {
    content:
      'Describe the concept of API rate limiting and how you would implement it.',
    metadata: {
      role: 'Backend Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'API Design',
      keywords: ['rate limiting', 'API', 'scalability'],
    },
  },

  // Full Stack Developer Questions
  {
    content:
      'Explain the MVC (Model-View-Controller) architecture pattern.',
    metadata: {
      role: 'Full Stack Developer',
      type: 'technical',
      experienceLevel: 'junior',
      category: 'Architecture',
      keywords: ['MVC', 'architecture', 'design pattern'],
    },
  },
  {
    content:
      'What is the difference between client-side rendering and server-side rendering?',
    metadata: {
      role: 'Full Stack Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'Web Architecture',
      keywords: ['CSR', 'SSR', 'rendering'],
    },
  },
  {
    content:
      'How would you handle error handling and logging in a full-stack application?',
    metadata: {
      role: 'Full Stack Developer',
      type: 'technical',
      experienceLevel: 'mid',
      category: 'Best Practices',
      keywords: ['error handling', 'logging', 'debugging'],
    },
  },

  // Behavioral Questions
  {
    content:
      'Tell me about a time when you had to debug a complex issue. How did you approach it?',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'all',
      category: 'Problem Solving',
      keywords: ['debugging', 'problem solving', 'analytical'],
    },
  },
  {
    content:
      'Describe a situation where you had to work with a difficult team member. How did you handle it?',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'all',
      category: 'Teamwork',
      keywords: ['teamwork', 'communication', 'conflict resolution'],
    },
  },
  {
    content:
      'Tell me about a project where you had to learn a new technology quickly.',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'all',
      category: 'Learning',
      keywords: ['learning', 'adaptability', 'growth mindset'],
    },
  },
  {
    content:
      'Describe a time when you failed at something. What did you learn from it?',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'all',
      category: 'Resilience',
      keywords: ['failure', 'learning', 'resilience'],
    },
  },
  {
    content:
      'Tell me about your greatest achievement in your career so far.',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'all',
      category: 'Achievement',
      keywords: ['achievement', 'success', 'impact'],
    },
  },
  {
    content:
      'How do you prioritize your work when you have multiple tasks with tight deadlines?',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'all',
      category: 'Time Management',
      keywords: ['prioritization', 'time management', 'organization'],
    },
  },
  {
    content:
      'Describe a situation where you had to take initiative and lead a project.',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'mid',
      category: 'Leadership',
      keywords: ['leadership', 'initiative', 'ownership'],
    },
  },
  {
    content:
      'Tell me about a time when you had to give constructive feedback to a colleague.',
    metadata: {
      role: 'All',
      type: 'behavioral',
      experienceLevel: 'mid',
      category: 'Communication',
      keywords: ['feedback', 'communication', 'interpersonal'],
    },
  },

  // Scenario-based Questions
  {
    content:
      'Your application is experiencing slow performance in production. How would you diagnose and fix the issue?',
    metadata: {
      role: 'Backend Developer',
      type: 'scenario',
      experienceLevel: 'mid',
      category: 'Troubleshooting',
      keywords: ['performance', 'debugging', 'production'],
    },
  },
  {
    content:
      'You discover a critical security vulnerability in your codebase. What steps would you take?',
    metadata: {
      role: 'All',
      type: 'scenario',
      experienceLevel: 'mid',
      category: 'Security',
      keywords: ['security', 'vulnerability', 'incident response'],
    },
  },
  {
    content:
      'How would you approach refactoring a large legacy codebase?',
    metadata: {
      role: 'All',
      type: 'scenario',
      experienceLevel: 'senior',
      category: 'Code Quality',
      keywords: ['refactoring', 'legacy code', 'technical debt'],
    },
  },
];

// STAR formatted achievement examples
const starExamples = [
  {
    content: `STAR Example - Frontend Performance Optimization:
Situation: Our React application was experiencing slow load times, with initial page load taking 8+ seconds.
Task: I was tasked with improving the application's performance to meet the 3-second target.
Action: I analyzed the bundle size using webpack-bundle-analyzer, identified unused dependencies, implemented code splitting with React.lazy(), optimized images, and implemented lazy loading for below-the-fold content. I also set up performance monitoring using Lighthouse CI.
Result: Reduced initial load time from 8 seconds to 2.5 seconds (69% improvement), improved Lighthouse score from 45 to 92, and reduced bundle size by 40%.`,
    metadata: {
      type: 'STAR Example',
      role: 'Frontend Developer',
      industry: 'Technology',
      category: 'Performance Optimization',
      keywords: ['performance', 'React', 'optimization', 'impact'],
    },
  },
  {
    content: `STAR Example - Database Optimization:
Situation: The company's reporting system was taking 15+ minutes to generate monthly reports due to inefficient database queries.
Task: I was responsible for optimizing the query performance to reduce report generation time.
Action: I profiled the database queries using EXPLAIN ANALYZE, identified N+1 query problems, added appropriate indexes, and refactored queries to use JOINs instead of multiple queries. I also implemented query result caching.
Result: Reduced report generation time from 15 minutes to 45 seconds (95% improvement), improved system responsiveness, and reduced database load by 60%.`,
    metadata: {
      type: 'STAR Example',
      role: 'Backend Developer',
      industry: 'Technology',
      category: 'Database Optimization',
      keywords: ['database', 'optimization', 'performance', 'impact'],
    },
  },
  {
    content: `STAR Example - Team Leadership:
Situation: Our team was struggling with code quality issues and inconsistent development practices, leading to frequent bugs in production.
Task: I was asked to lead the initiative to improve code quality and establish best practices.
Action: I implemented a comprehensive code review process, set up automated testing with Jest and Cypress, created coding standards documentation, and conducted team training sessions. I also established a mentoring program for junior developers.
Result: Reduced production bugs by 70%, improved code review turnaround time, increased test coverage from 30% to 85%, and improved team satisfaction scores.`,
    metadata: {
      type: 'STAR Example',
      role: 'Senior Developer',
      industry: 'Technology',
      category: 'Leadership',
      keywords: ['leadership', 'team', 'quality', 'impact'],
    },
  },
  {
    content: `STAR Example - Cross-functional Collaboration:
Situation: The product team and engineering team had conflicting priorities, causing delays in feature releases.
Task: I was tasked with improving communication and collaboration between the two teams.
Action: I established weekly sync meetings, created a shared roadmap, implemented a transparent prioritization process, and built tools to track progress. I also facilitated workshops to align on goals and values.
Result: Reduced time-to-market for features by 40%, improved team satisfaction, and increased product delivery velocity.`,
    metadata: {
      type: 'STAR Example',
      role: 'Tech Lead',
      industry: 'Technology',
      category: 'Collaboration',
      keywords: ['collaboration', 'communication', 'leadership', 'impact'],
    },
  },
  {
    content: `STAR Example - System Architecture:
Situation: The monolithic application was becoming difficult to maintain and scale, with deployment times exceeding 2 hours.
Task: I was responsible for designing and implementing a microservices architecture.
Action: I designed the microservices architecture, identified service boundaries, implemented API gateways, set up containerization with Docker, and established CI/CD pipelines. I also led the migration of existing services.
Result: Reduced deployment time from 2 hours to 15 minutes, improved system scalability, enabled independent team deployments, and reduced mean time to recovery (MTTR) from 30 minutes to 5 minutes.`,
    metadata: {
      type: 'STAR Example',
      role: 'Senior Backend Developer',
      industry: 'Technology',
      category: 'Architecture',
      keywords: ['architecture', 'microservices', 'scalability', 'impact'],
    },
  },
];

export async function seedKnowledgeBase(prisma: PrismaClient) {
  console.log('🌱 Seeding knowledge base to ChromaDB...\n');

  // Check for DashScope Key first
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
      console.warn('⚠️  QWEN_API_KEY not found. Skipping knowledge base seeding.');
      return { created: 0, skipped: 0, failed: 0 };
  }

  const chromaUrl = process.env.CHROMA_DB_URL || 'http://150.158.20.143:8000';
  const client = new ChromaClient({ path: chromaUrl });
  const collectionName = 'resume-optimizer-vectors';
  
  const embedder = new QwenEmbeddings({ apiKey, modelName: 'text-embedding-v2' });

  let collection;
  try {
    collection = await client.getOrCreateCollection({ 
        name: collectionName,
        embeddingFunction: embedder
    });
    console.log(`✅ Connected to ChromaDB at ${chromaUrl}, collection: ${collectionName}`);
  } catch (error) {
    console.error(
      '❌ Failed to connect to ChromaDB:',
      error instanceof Error ? error.message : String(error)
    );
    console.log('⚠️  Make sure ChromaDB is running. Skipping knowledge base seeding.');
    return {
      created: 0,
      skipped: commonInterviewQuestions.length + starExamples.length,
      failed: 0,
    };
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  const allItems = [
    ...commonInterviewQuestions.map(q => ({ ...q, source: 'common-interview-questions' })),
    ...starExamples.map(e => ({ ...e, source: 'star-examples' }))
  ];

  console.log(`📚 Processing ${allItems.length} items...`);

  for (const item of allItems) {
    try {
      const id = hashContent(item.content);
      
      // Check if document already exists
      try {
          const existing = await collection.get({ ids: [id] });
          if (existing.ids && existing.ids.length > 0) {
            console.log(`⏭️  Skipped: ${item.content.substring(0, 50)}...`);
            skipped++;
            continue;
          }
      } catch (e) {
          // Ignore error if get fails
      }

      const now = new Date().toISOString();
      // Ensure metadata values are compatible with Chroma
      const safeMetadata: Record<string, string | number | boolean> = {};
      const metadataSource = { ...item.metadata, source: item.source, contentHash: id };
      
      for (const [key, value] of Object.entries(metadataSource)) {
          if (Array.isArray(value)) {
              safeMetadata[key] = value.join(', ');
          } else if (typeof value === 'object' && value !== null) {
               safeMetadata[key] = JSON.stringify(value);
          } else {
              safeMetadata[key] = value as string | number | boolean;
          }
      }
      
      // Add timestamps
      safeMetadata['createdAt'] = now;
      safeMetadata['updatedAt'] = now;

      await collection.add({
        ids: [id],
        metadatas: [safeMetadata],
        documents: [item.content],
      });

      console.log(`✅ Created: ${item.content.substring(0, 50)}...`);
      created++;
    } catch (error) {
      console.error(
        `❌ Failed to create item: ${item.content.substring(0, 50)}...`,
        error instanceof Error ? error.message : String(error)
      );
      failed++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${allItems.length}\n`);

  return { created, skipped, failed };
}

/**
 * MD5 hash function for content ID
 */
function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Custom Qwen Embeddings implementation using DashScope API
 */
class QwenEmbeddings {
  private apiKey: string;
  private model: string;

  constructor(config: { apiKey: string; modelName?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.modelName || 'text-embedding-v2';
  }

  async generate(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding',
        {
          model: this.model,
          input: {
            texts: texts,
          },
          parameters: {
            text_type: 'document',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.output && response.data.output.embeddings) {
        return response.data.output.embeddings
          .sort((a: any, b: any) => a.text_index - b.text_index)
          .map((e: any) => e.embedding);
      }
      
      throw new Error(`Invalid response structure: ${JSON.stringify(response.data)}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`DashScope API Error: ${errorMessage}`);
      }
      throw error;
    }
  }
}
