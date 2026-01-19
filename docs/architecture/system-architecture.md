# IntervAI - System Architecture

## Overview

This document provides a comprehensive view of the system architecture, including frontend, backend, databases, caching, and AI integration layers.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile Browser]
    end

    subgraph "Frontend - React + Vite"
        UI[UI Components]
        STORES[Zustand Stores]
        SERVICES[API Services]
        ROUTER[React Router]
        WS_CLIENT[WebSocket Client]
    end

    subgraph "Backend - NestJS"
        subgraph "API Layer"
            CONTROLLERS[Controllers]
            GUARDS[Auth Guards]
            MIDDLEWARE[Middleware]
        end

        subgraph "Business Logic"
            AGENT[Agent Module]
            INTERVIEW[Interview Module]
            RESUME[Resume Module]
            PAYMENT[Payment Module]
            USER[User Module]
            AUTH[Auth Module]
        end

        subgraph "Infrastructure"
            STORAGE[Storage Service]
            QUEUE[Bull Queue]
            CACHE[Cache Manager]
            WS_GATEWAY[WebSocket Gateway]
        end

        subgraph "AI Layer"
            AI_ENGINE[AI Engine]
            AI_PROVIDERS[AI Providers]
            RAG[RAG Service]
            VECTOR[Vector DB Service]
        end
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL + pgvector)]
        REDIS[(Redis)]
        S3[S3/OSS Storage]
    end

    subgraph "External Services"
        OPENAI[OpenAI API]
        QWEN[Qwen API]
        DEEPSEEK[DeepSeek API]
        GEMINI[Gemini API]
        STRIPE[Stripe API]
        PADDLE[Paddle API]
    end

    WEB --> UI
    MOBILE --> UI
    UI --> STORES
    UI --> ROUTER
    STORES --> SERVICES
    SERVICES --> CONTROLLERS
    WS_CLIENT --> WS_GATEWAY

    CONTROLLERS --> GUARDS
    GUARDS --> MIDDLEWARE
    MIDDLEWARE --> AGENT
    MIDDLEWARE --> INTERVIEW
    MIDDLEWARE --> RESUME
    MIDDLEWARE --> PAYMENT
    MIDDLEWARE --> USER
    MIDDLEWARE --> AUTH

    AGENT --> AI_ENGINE
    INTERVIEW --> AI_ENGINE
    RESUME --> STORAGE
    RESUME --> QUEUE
    PAYMENT --> STRIPE
    PAYMENT --> PADDLE

    AI_ENGINE --> AI_PROVIDERS
    AI_PROVIDERS --> OPENAI
    AI_PROVIDERS --> QWEN
    AI_PROVIDERS --> DEEPSEEK
    AI_PROVIDERS --> GEMINI

    AGENT --> RAG
    RAG --> VECTOR
    VECTOR --> POSTGRES

    STORAGE --> S3
    QUEUE --> REDIS
    CACHE --> REDIS
    WS_GATEWAY --> REDIS

    AGENT --> POSTGRES
    INTERVIEW --> POSTGRES
    RESUME --> POSTGRES
    PAYMENT --> POSTGRES
    USER --> POSTGRES
    AUTH --> POSTGRES
```

## Component Details

### Frontend Architecture

```mermaid
graph LR
    subgraph "Pages"
        HOME[Home Page]
        CHAT[Chat Page]
        RESUME_LIST[Resume List]
        INTERVIEW_PAGE[Interview Page]
        ADMIN[Admin Dashboard]
    end

    subgraph "Components"
        UPLOAD[Resume Upload]
        BUILDER[Resume Builder]
        CHAT_UI[Chat Interface]
        INTERVIEW_UI[Interview UI]
        METRICS[Metrics Dashboard]
    end

    subgraph "State Management"
        AUTH_STORE[Auth Store]
        RESUME_STORE[Resume Store]
        CONV_STORE[Conversation Store]
        INTERVIEW_STORE[Interview Store]
        UI_STORE[UI Store]
    end

    subgraph "Services"
        AUTH_SVC[Auth Service]
        RESUME_SVC[Resume Service]
        INTERVIEW_SVC[Interview Service]
        PAYMENT_SVC[Payment Service]
        AGENT_SVC[Agent Service]
    end

    HOME --> UPLOAD
    CHAT --> CHAT_UI
    RESUME_LIST --> BUILDER
    INTERVIEW_PAGE --> INTERVIEW_UI
    ADMIN --> METRICS

    UPLOAD --> RESUME_STORE
    CHAT_UI --> CONV_STORE
    INTERVIEW_UI --> INTERVIEW_STORE

    RESUME_STORE --> RESUME_SVC
    CONV_STORE --> AGENT_SVC
    INTERVIEW_STORE --> INTERVIEW_SVC
    AUTH_STORE --> AUTH_SVC
```

### Backend Module Architecture

```mermaid
graph TB
    subgraph "Agent Module"
        AGENT_CTRL[Agent Controllers]
        STRATEGIST[Strategist Agent]
        ROLEPLAY[RolePlay Agent]
        PITCHPERFECT[PitchPerfect Agent]
        ORCHESTRATOR[Workflow Orchestrator]
        TOOLS[Agent Tools]
    end

    subgraph "AI Providers Module"
        AI_FACTORY[Provider Factory]
        OPENAI_PROVIDER[OpenAI Provider]
        QWEN_PROVIDER[Qwen Provider]
        DEEPSEEK_PROVIDER[DeepSeek Provider]
        GEMINI_PROVIDER[Gemini Provider]
        MODEL_SELECTOR[Model Selector]
        USAGE_TRACKER[Usage Tracker]
    end

    subgraph "Interview Module"
        INTERVIEW_CTRL[Interview Controller]
        QUESTION_GEN[Question Generator]
        SESSION_MGR[Session Manager]
        FEEDBACK_SVC[Feedback Service]
    end

    subgraph "Resume Module"
        RESUME_CTRL[Resume Controller]
        RESUME_SVC[Resume Service]
        PARSER[Resume Parser]
        OPTIMIZER[IntervAI]
    end

    subgraph "Payment Module"
        PAYMENT_CTRL[Payment Controller]
        PAYMENT_SVC[Payment Service]
        STRIPE_PROVIDER[Stripe Provider]
        PADDLE_PROVIDER[Paddle Provider]
    end

    AGENT_CTRL --> STRATEGIST
    AGENT_CTRL --> ROLEPLAY
    AGENT_CTRL --> PITCHPERFECT
    STRATEGIST --> ORCHESTRATOR
    ORCHESTRATOR --> TOOLS

    STRATEGIST --> AI_FACTORY
    ROLEPLAY --> AI_FACTORY
    PITCHPERFECT --> AI_FACTORY

    AI_FACTORY --> OPENAI_PROVIDER
    AI_FACTORY --> QWEN_PROVIDER
    AI_FACTORY --> DEEPSEEK_PROVIDER
    AI_FACTORY --> GEMINI_PROVIDER
    AI_FACTORY --> MODEL_SELECTOR
    MODEL_SELECTOR --> USAGE_TRACKER

    INTERVIEW_CTRL --> QUESTION_GEN
    INTERVIEW_CTRL --> SESSION_MGR
    INTERVIEW_CTRL --> FEEDBACK_SVC
    QUESTION_GEN --> AI_FACTORY

    RESUME_CTRL --> RESUME_SVC
    RESUME_SVC --> PARSER
    RESUME_SVC --> OPTIMIZER
    PARSER --> AI_FACTORY
    OPTIMIZER --> AI_FACTORY

    PAYMENT_CTRL --> PAYMENT_SVC
    PAYMENT_SVC --> STRIPE_PROVIDER
    PAYMENT_SVC --> PADDLE_PROVIDER
```

### Data Flow - Resume Upload & Optimization

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Storage
    participant Queue
    participant AI
    participant DB
    participant WebSocket

    User->>Frontend: Upload Resume
    Frontend->>API: POST /resumes/upload
    API->>Storage: Save File
    Storage-->>API: File URL
    API->>DB: Create Resume Record
    API->>Queue: Add Parse Job
    API-->>Frontend: 202 Accepted

    Queue->>AI: Parse Resume
    AI-->>Queue: Parsed Data
    Queue->>DB: Update Resume
    Queue->>WebSocket: Notify Client
    WebSocket-->>Frontend: Parse Complete

    User->>Frontend: Request Optimization
    Frontend->>API: POST /resumes/:id/optimize
    API->>AI: Generate Suggestions
    AI-->>API: Optimization Result
    API->>DB: Save Optimization
    API-->>Frontend: Optimization Data
    Frontend-->>User: Display Suggestions
```

### Data Flow - Mock Interview

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Agent
    participant AI
    participant DB
    participant WebSocket

    User->>Frontend: Start Interview
    Frontend->>API: POST /interview/sessions
    API->>Agent: Initialize Session
    Agent->>AI: Generate Questions
    AI-->>Agent: Question Bank
    Agent->>DB: Save Session
    Agent-->>API: Session + First Question
    API-->>Frontend: Interview Started

    loop Interview Conversation
        User->>Frontend: Send Answer
        Frontend->>WebSocket: Send Message
        WebSocket->>Agent: Process Answer
        Agent->>AI: Evaluate Response
        AI-->>Agent: Feedback + Next Question
        Agent->>DB: Save Messages
        Agent->>WebSocket: Send Response
        WebSocket-->>Frontend: Display Response
    end

    User->>Frontend: End Interview
    Frontend->>API: POST /interview/sessions/:id/end
    API->>Agent: Finalize Session
    Agent->>AI: Generate Summary
    AI-->>Agent: Final Evaluation
    Agent->>DB: Update Session
    Agent-->>API: Interview Summary
    API-->>Frontend: Show Results
```

### Database Schema (Simplified)

```mermaid
erDiagram
    User ||--o{ Resume : owns
    User ||--o{ Conversation : has
    User ||--o{ InterviewSession : participates
    User {
        string id PK
        string email
        string passwordHash
        string subscriptionTier
        string subscriptionProvider
        datetime subscriptionExpiresAt
    }

    Resume ||--o{ Optimization : has
    Resume {
        string id PK
        string userId FK
        string originalName
        string filePath
        json parsedContent
        string status
        datetime createdAt
    }

    Optimization ||--o{ InterviewQuestion : generates
    Optimization {
        string id PK
        string resumeId FK
        string jobDescription
        json suggestions
        float matchScore
        datetime createdAt
    }

    InterviewSession ||--o{ InterviewMessage : contains
    InterviewSession {
        string id PK
        string userId FK
        string optimizationId FK
        string status
        json evaluation
        datetime startedAt
        datetime endedAt
    }

    InterviewQuestion {
        string id PK
        string optimizationId FK
        string question
        string suggestedAnswer
        string questionType
        string difficulty
    }

    InterviewMessage {
        string id PK
        string sessionId FK
        string role
        string content
        datetime createdAt
    }

    Conversation ||--o{ Message : contains
    Conversation {
        string id PK
        string userId FK
        string title
        datetime createdAt
    }

    Message {
        string id PK
        string conversationId FK
        string role
        string content
        datetime createdAt
    }
```

## Technology Stack

### Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router v6
- **UI Components**: Taroify (Taro UI for H5)
- **Styling**: CSS Modules + Tailwind CSS
- **WebSocket**: Socket.io-client
- **HTTP Client**: Axios

### Backend

- **Framework**: NestJS + TypeScript
- **Runtime**: Node.js 18+
- **ORM**: Prisma
- **Queue**: Bull (Redis-based)
- **WebSocket**: Socket.io
- **Validation**: class-validator
- **Authentication**: JWT + Passport
- **File Upload**: Multer

### Databases & Storage

- **Primary Database**: PostgreSQL 14+
- **Vector Extension**: pgvector
- **Cache & Queue**: Redis 7+
- **File Storage**: S3 / Aliyun OSS / MinIO

### AI & ML

- **LLM Framework**: LangChain
- **AI Providers**:
  - OpenAI (GPT-4, GPT-3.5)
  - Alibaba Qwen
  - DeepSeek
  - Google Gemini
- **Vector Search**: pgvector
- **Embeddings**: OpenAI text-embedding-ada-002

### DevOps

- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + Loki
- **CI/CD**: GitHub Actions

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer"
            LB[Nginx Load Balancer]
        end

        subgraph "Application Tier"
            APP1[NestJS Instance 1]
            APP2[NestJS Instance 2]
            APP3[NestJS Instance 3]
        end

        subgraph "Static Assets"
            CDN[CDN / S3]
            STATIC[React Build]
        end

        subgraph "Data Tier"
            PG_PRIMARY[(PostgreSQL Primary)]
            PG_REPLICA[(PostgreSQL Replica)]
            REDIS_CLUSTER[(Redis Cluster)]
        end

        subgraph "Storage Tier"
            S3_BUCKET[S3 Bucket]
        end

        subgraph "Monitoring"
            PROMETHEUS[Prometheus]
            GRAFANA[Grafana]
            LOKI[Loki]
        end
    end

    LB --> APP1
    LB --> APP2
    LB --> APP3
    LB --> STATIC

    STATIC --> CDN

    APP1 --> PG_PRIMARY
    APP2 --> PG_PRIMARY
    APP3 --> PG_PRIMARY

    PG_PRIMARY --> PG_REPLICA

    APP1 --> REDIS_CLUSTER
    APP2 --> REDIS_CLUSTER
    APP3 --> REDIS_CLUSTER

    APP1 --> S3_BUCKET
    APP2 --> S3_BUCKET
    APP3 --> S3_BUCKET

    APP1 --> PROMETHEUS
    APP2 --> PROMETHEUS
    APP3 --> PROMETHEUS

    PROMETHEUS --> GRAFANA
    APP1 --> LOKI
    APP2 --> LOKI
    APP3 --> LOKI
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Auth
    participant DB

    User->>Frontend: Enter Credentials
    Frontend->>API: POST /auth/login
    API->>Auth: Validate Credentials
    Auth->>DB: Query User
    DB-->>Auth: User Data
    Auth->>Auth: Verify Password
    Auth->>Auth: Generate JWT
    Auth-->>API: JWT Token
    API-->>Frontend: Token + User Info
    Frontend->>Frontend: Store Token

    Note over Frontend,API: Subsequent Requests
    Frontend->>API: Request + JWT Header
    API->>Auth: Verify JWT
    Auth-->>API: User Context
    API->>API: Process Request
    API-->>Frontend: Response
```

### Security Layers

1. **Transport Security**: HTTPS/TLS 1.3
2. **Authentication**: JWT with refresh tokens
3. **Authorization**: Role-based access control (RBAC)
4. **Input Validation**: class-validator + sanitization
5. **Rate Limiting**: Redis-based throttling
6. **CORS**: Configured whitelist
7. **SQL Injection**: Prisma parameterized queries
8. **XSS Protection**: Content Security Policy
9. **File Upload**: Type validation + virus scanning
10. **API Keys**: Encrypted storage + rotation

## Performance Optimization

### Caching Strategy

```mermaid
graph LR
    REQUEST[API Request] --> CACHE_CHECK{Cache Hit?}
    CACHE_CHECK -->|Yes| REDIS[Redis Cache]
    CACHE_CHECK -->|No| DB[Database]
    DB --> CACHE_UPDATE[Update Cache]
    CACHE_UPDATE --> REDIS
    REDIS --> RESPONSE[Return Response]
```

### Caching Layers

1. **Browser Cache**: Static assets (1 year)
2. **CDN Cache**: Images, CSS, JS (1 week)
3. **Redis Cache**:
   - User sessions (24 hours)
   - API responses (5 minutes)
   - AI results (1 hour)
4. **Database Query Cache**: Prisma query caching

### Queue Processing

- **Resume Parsing**: Async with Bull queue
- **AI Generation**: Rate-limited queue
- **Email Sending**: Background queue
- **Backup Tasks**: Scheduled cron jobs

## Scalability Considerations

### Horizontal Scaling

- **Stateless API**: Multiple NestJS instances
- **Session Storage**: Redis cluster
- **File Storage**: S3 (unlimited)
- **Database**: Read replicas for queries

### Vertical Scaling

- **Database**: Increase PostgreSQL resources
- **Redis**: Increase memory allocation
- **AI Processing**: GPU instances for local models

### Cost Optimization

- **AI Provider Selection**: Cost-based model routing
- **Caching**: Reduce redundant AI calls
- **CDN**: Reduce bandwidth costs
- **Database**: Connection pooling

## Monitoring & Observability

### Metrics Collected

- **Application**: Request rate, latency, errors
- **Database**: Query performance, connection pool
- **Cache**: Hit rate, memory usage
- **AI**: Token usage, cost, latency
- **Queue**: Job processing time, failure rate

### Alerting Rules

- High error rate (>5%)
- Slow response time (>2s)
- Database connection issues
- Redis memory threshold (>80%)
- AI cost threshold exceeded

## Future Architecture Enhancements

### Planned Improvements

1. **Microservices**: Split into domain services
2. **Event Sourcing**: Audit trail for all changes
3. **GraphQL**: Alternative API layer
4. **Kubernetes**: Container orchestration
5. **Multi-region**: Geographic distribution
6. **Real-time Collaboration**: Operational transformation
7. **Mobile Apps**: Native iOS/Android
8. **Offline Support**: Progressive Web App

## Conclusion

The architecture is designed for:

- **Scalability**: Horizontal and vertical scaling
- **Reliability**: Redundancy and failover
- **Performance**: Multi-layer caching
- **Security**: Defense in depth
- **Maintainability**: Modular design
- **Cost Efficiency**: Smart resource usage

The system can handle thousands of concurrent users while maintaining sub-second response times for most operations.
