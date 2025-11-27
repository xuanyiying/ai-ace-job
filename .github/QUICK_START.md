# CI/CD Quick Start Guide

## 5-Minute Setup

### 1. Add GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

```
DEPLOY_KEY_STAGING          # SSH private key
DEPLOY_HOST_STAGING         # e.g., staging.example.com
DEPLOY_USER_STAGING         # e.g., deploy
DEPLOY_PATH_STAGING         # e.g., /opt/resume-optimizer

DEPLOY_KEY_PRODUCTION       # SSH private key
DEPLOY_HOST_PRODUCTION      # e.g., api.example.com
DEPLOY_USER_PRODUCTION      # e.g., deploy
DEPLOY_PATH_PRODUCTION      # e.g., /opt/resume-optimizer

SLACK_WEBHOOK_URL           # Optional: Slack webhook
```

### 2. Create Environments

Go to **Settings → Environments** and create:

- **staging**: Deploy from `develop` branch
- **production**: Deploy from `main` branch (require approval)

### 3. Protect Branches

Go to **Settings → Branches** and add rules for:

- **main**: Require all checks + 1 approval + signed commits
- **develop**: Require all checks + 1 approval

### 4. Update CODEOWNERS

Edit `.github/CODEOWNERS` and replace `@your-github-username` with your GitHub username.

### 5. Test It

```bash
# Create a test branch
git checkout -b test/ci-setup

# Make a change
echo "// test" >> packages/backend/src/main.ts

# Commit and push
git add .
git commit -m "test: ci setup"
git push origin test/ci-setup

# Create PR and watch GitHub Actions
```

## Common Commands

### Run Tests Locally

```bash
# All tests
npm run test

# Backend only
npm run test --workspace=packages/backend

# Frontend only
npm run test --workspace=packages/frontend

# With coverage
npm run test:cov --workspace=packages/backend
```

### Build Locally

```bash
# All packages
npm run build

# Backend only
npm run build:backend

# Frontend only
npm run build:frontend
```

### Lint Code

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Workflow Triggers

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers**:

- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs**:

- Lint
- Test Backend
- Test Frontend
- Build Backend
- Build Frontend
- Build Docker

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers**:

- Push to `main` (production)
- Manual workflow dispatch

**Deploys to**:

- Staging (on `develop` push)
- Production (on `main` push with tag)

### Security Workflow (`.github/workflows/security.yml`)

**Triggers**:

- Push to `main` or `develop`
- Pull requests
- Daily at 2 AM UTC

**Scans**:

- Dependencies
- Code (CodeQL)
- Containers (Trivy)
- Secrets (TruffleHog)

### PR Checks Workflow (`.github/workflows/pr-checks.yml`)

**Triggers**:

- Pull requests to `main` or `develop`

**Checks**:

- PR title validation
- Linting
- Tests (conditional)
- Docker build (conditional)

### Release Workflow (`.github/workflows/release.yml`)

**Triggers**:

- Push of version tags (e.g., `v1.0.0`)

**Actions**:

- Create GitHub release
- Build and push Docker images
- Upload artifacts
- Notify Slack

## Deployment

### Deploy to Staging

```bash
# Automatic on develop push
git push origin develop

# Or manual trigger in GitHub Actions
```

### Deploy to Production

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# Or manual trigger in GitHub Actions
```

## Monitoring

### GitHub Actions Dashboard

- **Actions tab**: View workflow runs
- **Security tab**: View security alerts
- **Deployments**: View deployment history

### Logs

```bash
# SSH into server
ssh user@staging-server

# View logs
cd /opt/resume-optimizer
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Troubleshooting

### Workflow Not Running

1. Check branch name matches trigger
2. Verify GitHub Actions is enabled
3. Check workflow file syntax
4. Review workflow logs

### Tests Failing

1. Run locally: `npm run test`
2. Check environment variables
3. Verify database/Redis running
4. Review test logs

### Deployment Failing

1. Check SSH keys configured
2. Verify server connectivity
3. Check docker-compose installed
4. Review deployment logs

### Docker Build Failing

1. Check Dockerfile syntax
2. Verify dependencies in package.json
3. Check environment variables
4. Review build logs

## Documentation

- **Full Setup**: See `.github/CI_CD_SETUP.md`
- **Workflows**: See `.github/WORKFLOWS.md`
- **Branch Protection**: See `.github/BRANCH_PROTECTION.md`
- **Implementation**: See `.github/IMPLEMENTATION_SUMMARY.md`

## Key Files

```
.github/
├── workflows/
│   ├── ci.yml              # Main CI workflow
│   ├── deploy.yml          # Deployment workflow
│   ├── security.yml        # Security scanning
│   ├── pr-checks.yml       # PR validation
│   └── release.yml         # Release management
├── ISSUE_TEMPLATE/
│   ├── bug_report.md       # Bug report template
│   └── feature_request.md  # Feature request template
├── dependabot.yml          # Dependency updates
├── CODEOWNERS              # Code ownership
├── pull_request_template.md # PR template
├── WORKFLOWS.md            # Workflow documentation
├── BRANCH_PROTECTION.md    # Branch rules
├── CI_CD_SETUP.md          # Setup guide
├── IMPLEMENTATION_SUMMARY.md # Implementation details
└── QUICK_START.md          # This file
```

## Next Steps

1. ✅ Add GitHub Secrets
2. ✅ Create Environments
3. ✅ Protect Branches
4. ✅ Update CODEOWNERS
5. ✅ Test Workflows
6. ✅ Monitor Deployments

## Support

- Check GitHub Actions logs
- Review documentation in `.github/`
- Check deployment server logs
- Contact team members

---

**Ready to deploy!** 🚀
