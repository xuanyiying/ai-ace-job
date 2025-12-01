# Contributing to AI Resume Optimizer

First off, thank you for considering contributing to AI Resume Optimizer! It's people like you that make this project such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if relevant**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any similar features in other applications**

### Your First Code Contribution

Unsure where to begin? You can start by looking through `good-first-issue` and `help-wanted` issues:

- **Good first issues** - issues which should only require a few lines of code
- **Help wanted issues** - issues which may be more involved

### Pull Requests

- Fill in the required template
- Follow our [style guidelines](#style-guidelines)
- Include screenshots and animated GIFs in your pull request whenever possible
- End all files with a newline
- Ensure the test suite passes
- Make sure your code lints

## Development Process

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Setting Up Your Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-resume.git
   cd ai-resume
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp packages/backend/.env.example packages/backend/.env
   
   # Frontend
   cp packages/frontend/.env.example packages/frontend/.env
   ```

4. **Set up the database**
   ```bash
   cd packages/backend
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

### Project Structure

```
ai-resume/
├── packages/
│   ├── backend/          # NestJS backend
│   │   ├── src/
│   │   ├── test/
│   │   └── prisma/
│   └── frontend/         # React frontend
│       ├── src/
│       └── public/
├── deployment/           # Docker and deployment configs
├── scripts/             # Utility scripts
└── .github/             # GitHub templates and workflows
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run backend tests
cd packages/backend
pnpm test

# Run frontend tests
cd packages/frontend
pnpm test

# Run tests with coverage
pnpm test:cov
```

### Building for Production

```bash
# Build all packages
pnpm build

# Build backend only
pnpm build:backend

# Build frontend only
pnpm build:frontend
```

## Style Guidelines

### TypeScript Style Guide

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer `const` over `let`, avoid `var`
- Use async/await over promises when possible

### Code Formatting

We use Prettier for code formatting. Run before committing:

```bash
pnpm format
```

### Linting

We use ESLint for code linting. Run before committing:

```bash
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Backend Conventions

- Use NestJS decorators and dependency injection
- Follow the module-service-controller pattern
- Use DTOs for request/response validation
- Write unit tests for services
- Write integration tests for controllers

### Frontend Conventions

- Use functional components with hooks
- Use TypeScript for type safety
- Follow the container/presentational component pattern
- Use Zustand for state management
- Use Ant Design components when possible

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (white-space, formatting)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to build process or auxiliary tools

### Examples

```
feat(backend): add support for Google OAuth login

Implement Google OAuth authentication strategy using passport-google-oauth20.
Add GoogleStrategy and GoogleAuthGuard for route protection.

Closes #123
```

```
fix(frontend): resolve memory leak in interview page

Fixed memory leak caused by unsubscribed event listeners in the
InterviewPage component. Added proper cleanup in useEffect.

Fixes #456
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes and commit**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

3. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

4. **Open a Pull Request**
   - Use a clear and descriptive title
   - Fill out the PR template completely
   - Link related issues
   - Request reviews from maintainers

5. **Address review comments**
   - Make requested changes
   - Push additional commits
   - Re-request review

6. **Merge**
   - PRs are merged using "Squash and merge"
   - Ensure the final commit message is clean

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code follows the style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for hard-to-understand areas
- [ ] Documentation updated (if needed)
- [ ] No new warnings generated
- [ ] Tests added/updated and all pass
- [ ] Dependent changes merged and published

## Getting Help

- 💬 Join our [Discord community](https://discord.gg/ai-resume)
- 📧 Email us at support@ai-resume.com
- 📝 Check existing [issues](https://github.com/xuanyiying/ai-resume/issues)
- 📖 Read the [documentation](https://docs.ai-resume.com)

## Recognition

Contributors will be recognized in:
- Our [Contributors](https://github.com/xuanyiying/ai-resume/graphs/contributors) page
- The CHANGELOG for their contributions
- Our monthly community highlights

Thank you for contributing! 🎉
