# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source release preparation
- Documentation enhancements (CODE_OF_CONDUCT, SECURITY, ROADMAP, FAQ)

## [1.0.0] - 2025-12-01

### Added
- **Core Platform**
  - Resume parsing and analysis using AI
  - Resume optimization suggestions
  - PDF resume generation
  - Interview preparation and mock interviews
  
- **AI Integration**
  - Multi-provider support (OpenAI, Qwen, DeepSeek, Gemini, Ollama)
  - Automatic model selection and fallback
  
- **Backend**
  - NestJS based microservices architecture
  - PostgreSQL database with Prisma ORM
  - Redis caching and session management
  - Object storage support (S3, OSS, COS, MinIO)
  
- **Frontend**
  - React 18 with Vite
  - Ant Design 5 UI
  - Responsive design
  - PWA support
  
- **Payment & Subscription**
  - Stripe and Paddle integration
  - Tiered subscription plans (Free, Pro, Enterprise)

### Security
- JWT authentication
- Role-based access control
- Rate limiting
- Helmet security headers
