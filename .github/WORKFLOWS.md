# GitHub Actions CI/CD Workflows

This document describes the automated CI/CD workflows configured for the Resume Optimizer MVP project.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Trigger**: Push to `main` or `develop` branches, Pull Requests

**Jobs**:

- **Lint**: Runs ESLint on all code
- **Test Backend**: Runs Jest tests with PostgreSQL and Redis services
- **Test Frontend**: Runs Vitest tests
- **Build Backend**: Builds NestJS application
- **Build Frontend**: Builds React application with Vite
- **Build Docker**: Builds and pushes Docker images to GitHub Container Registry

**Artifacts**:

- Backend build artifacts (retained for 1 day)
- Frontend build artifacts (retained for 1 day)
- Docker images pushed to `ghcr.io`

### 2. Deploy Workflow (`deploy.yml`)

**Trigger**: Push to `main` branch, Manual workflow dispatch

**Jobs**:

- **Deploy**: Builds Docker images and deploys to staging or production
- **Notify**: Sends Slack notifications on deployment status

**Environment Variables Required**:

- `DEPLOY_KEY_STAGING`: SSH private key for staging server
- `DEPLOY_HOST_STAGING`: Staging server hostname
- `DEPLOY_USER_STAGING`: SSH user for staging
- `DEPLOY_PATH_STAGING`: Deployment path on staging server
- `DEPLOY_KEY_PRODUCTION`: SSH private key for production server
- `DEPLOY_HOST_PRODUCTION`: Production server hostname
- `DEPLOY_USER_PRODUCTION`: SSH user for production
- `DEPLOY_PATH_PRODUCTION`: Deployment path on production server
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications

### 3. Security Workflow (`security.yml`)

**Trigger**: Push to `main` or `develop`, Pull Requests, Daily schedule (2 AM UTC)

**Jobs**:

- **Dependency Check**: Runs `npm audit` to check for vulnerable dependencies
- **CodeQL Analysis**: Performs static code analysis using GitHub CodeQL
- **Container Scan**: Scans Docker images for vulnerabilities using Trivy
- **Secret Scan**: Scans repository for exposed secrets using TruffleHog

**Security Checks**:

- Fails on high-severity vulnerabilities
- Uploads SARIF reports to GitHub Security tab
- Detects exposed API keys and credentials

### 4. PR Checks Workflow (`pr-checks.yml`)

**Trigger**: Pull Requests to `main` or `develop`

**Jobs**:

- **Validate PR**: Validates PR title follows semantic commit convention
- **Check Changes**: Detects which files have changed
- **Test Backend (PR)**: Runs backend tests if backend files changed
- **Test Frontend (PR)**: Runs frontend tests if frontend files changed
- **Lint (PR)**: Runs linter on all code
- **Docker Build (PR)**: Builds Docker images if Dockerfile changed
- **PR Summary**: Summarizes all check results

**Features**:

- Conditional job execution based on changed files
- Automatic PR comments with test results
- Semantic commit validation

### 5. Release Workflow (`release.yml`)

**Trigger**: Push of version tags (e.g., `v1.0.0`)

**Jobs**:

- **Create Release**: Creates GitHub release with changelog
- **Build and Push**: Builds and pushes Docker images with version tags
- **Publish Artifacts**: Creates and uploads build artifacts to release
- **Notify Release**: Sends Slack notification about new release

**Artifacts**:

- Backend tarball: `backend-v1.0.0.tar.gz`
- Frontend tarball: `frontend-v1.0.0.tar.gz`
- Docker images tagged with semantic version

## Setup Instructions

### 1. GitHub Secrets Configuration

Add the following secrets to your GitHub repository settings:

```
DEPLOY_KEY_STAGING          # SSH private key for staging
DEPLOY_HOST_STAGING         # Staging server hostname
DEPLOY_USER_STAGING         # SSH username for staging
DEPLOY_PATH_STAGING         # Deployment directory on staging

DEPLOY_KEY_PRODUCTION       # SSH private key for production
DEPLOY_HOST_PRODUCTION      # Production server hostname
DEPLOY_USER_PRODUCTION      # SSH username for production
DEPLOY_PATH_PRODUCTION      # Deployment directory on production

SLACK_WEBHOOK_URL           # Slack webhook for notifications
```

### 2. GitHub Environments Configuration

Create two environments in GitHub repository settings:

**Staging Environment**:

- Name: `staging`
- Deployment branches: `develop`
- Required reviewers: (optional)

**Production Environment**:

- Name: `production`
- Deployment branches: `main`
- Required reviewers: (recommended)

### 3. Container Registry Authentication

The workflows use GitHub Container Registry (GHCR) which automatically authenticates using `GITHUB_TOKEN`. No additional setup required.

### 4. Codecov Integration (Optional)

To enable code coverage reporting:

1. Visit https://codecov.io and sign in with GitHub
2. Enable coverage for your repository
3. Codecov will automatically pick up coverage reports from CI

## Workflow Execution Flow

### On Pull Request

```
PR Created
    ↓
Validate PR Title
    ↓
Check Changed Files
    ↓
├─ Lint Code
├─ Test Backend (if changed)
├─ Test Frontend (if changed)
└─ Build Docker (if changed)
    ↓
PR Summary
    ↓
Comment Results on PR
```

### On Push to Main

```
Push to Main
    ↓
Lint & Test
    ↓
Build Artifacts
    ↓
Build Docker Images
    ↓
Push to GHCR
    ↓
Deploy to Production (if tagged)
    ↓
Notify Slack
```

### On Release Tag

```
Push Tag (v1.0.0)
    ↓
Create GitHub Release
    ↓
Build & Push Docker Images
    ↓
Generate Artifacts
    ↓
Upload to Release
    ↓
Notify Slack
```

## Environment Variables

### CI Environment

- `NODE_VERSION`: 18
- `REGISTRY`: ghcr.io

### Backend Test Environment

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: localhost
- `REDIS_PORT`: 6379
- `JWT_SECRET`: test-secret-key
- `OPENAI_API_KEY`: test-key

### Frontend Build Environment

- `VITE_API_BASE_URL`: API endpoint URL
- `VITE_API_TIMEOUT`: Request timeout in ms

## Troubleshooting

### Docker Build Fails

1. Check Dockerfile syntax
2. Verify all dependencies are in package.json
3. Check for missing environment variables
4. Review build logs in GitHub Actions

### Tests Fail in CI but Pass Locally

1. Ensure Node.js version matches (18.x)
2. Check for environment variable differences
3. Verify database/Redis services are running
4. Check for file path issues (use forward slashes)

### Deployment Fails

1. Verify SSH keys are correctly configured
2. Check deployment server connectivity
3. Ensure docker-compose is installed on server
4. Review deployment logs in GitHub Actions

### Security Scan Failures

1. Run `npm audit` locally to identify vulnerabilities
2. Update vulnerable packages: `npm update`
3. For high-severity issues, update to patched versions
4. Review CodeQL alerts in GitHub Security tab

## Best Practices

1. **Semantic Versioning**: Use `v1.0.0` format for release tags
2. **Commit Messages**: Follow conventional commits (feat:, fix:, etc.)
3. **Branch Protection**: Enable branch protection rules requiring CI to pass
4. **Code Review**: Require at least one approval before merging
5. **Secrets Management**: Never commit secrets; use GitHub Secrets
6. **Docker Images**: Tag images with both version and `latest`
7. **Monitoring**: Set up Slack notifications for deployment status

## Performance Optimization

### Caching

- Node modules are cached using `actions/setup-node@v4`
- Docker layers are cached using GitHub Actions cache
- Build artifacts are cached for 1 day

### Parallel Execution

- Backend and frontend tests run in parallel
- Docker image builds run in parallel
- Multiple security scans run concurrently

### Conditional Execution

- Jobs only run if relevant files changed
- Tests only run on PR and push events
- Deployment only runs on main branch or manual trigger

## Monitoring and Alerts

### Slack Notifications

Workflows send notifications for:

- Deployment failures
- Deployment successes
- New releases

### GitHub Security Tab

Security findings are uploaded to:

- CodeQL analysis results
- Container vulnerability scans
- Secret detection alerts

### Codecov

Code coverage reports are available at:

- https://codecov.io/gh/your-org/resume-optimizer-mvp

## Future Enhancements

1. **Performance Testing**: Add k6 load testing workflow
2. **E2E Testing**: Add Playwright E2E tests
3. **Database Migrations**: Automate database schema migrations
4. **Rollback Strategy**: Implement automated rollback on deployment failure
5. **Blue-Green Deployment**: Implement zero-downtime deployments
6. **Canary Releases**: Gradual rollout to production
7. **Automated Dependency Updates**: Use Dependabot for automatic updates
