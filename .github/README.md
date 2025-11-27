# GitHub Actions CI/CD Configuration

Welcome to the Resume Optimizer MVP CI/CD pipeline! This directory contains all GitHub Actions workflows and configuration for automated testing, building, security scanning, and deployment.

## 📋 Quick Navigation

- **Getting Started**: Start with [QUICK_START.md](./QUICK_START.md) for 5-minute setup
- **Full Setup**: See [CI_CD_SETUP.md](./CI_CD_SETUP.md) for detailed configuration
- **Workflows**: Review [WORKFLOWS.md](./WORKFLOWS.md) for workflow documentation
- **Branch Protection**: Check [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) for branch rules
- **Implementation**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for details

## 🚀 What's Included

### Workflows

| Workflow                                   | Trigger                 | Purpose                      |
| ------------------------------------------ | ----------------------- | ---------------------------- |
| [ci.yml](./workflows/ci.yml)               | Push/PR to main/develop | Lint, test, build            |
| [deploy.yml](./workflows/deploy.yml)       | Push to main or manual  | Deploy to staging/production |
| [security.yml](./workflows/security.yml)   | Push/PR/Daily           | Security scanning            |
| [pr-checks.yml](./workflows/pr-checks.yml) | Pull requests           | PR validation                |
| [release.yml](./workflows/release.yml)     | Version tags            | Release management           |

### Configuration

| File                                                   | Purpose                      |
| ------------------------------------------------------ | ---------------------------- |
| [dependabot.yml](./dependabot.yml)                     | Automated dependency updates |
| [CODEOWNERS](./CODEOWNERS)                             | Code ownership rules         |
| [pull_request_template.md](./pull_request_template.md) | PR template                  |

### Templates

| Template                                                                 | Purpose                  |
| ------------------------------------------------------------------------ | ------------------------ |
| [ISSUE_TEMPLATE/bug_report.md](./ISSUE_TEMPLATE/bug_report.md)           | Bug report template      |
| [ISSUE_TEMPLATE/feature_request.md](./ISSUE_TEMPLATE/feature_request.md) | Feature request template |

### Documentation

| Document                                                 | Content                     |
| -------------------------------------------------------- | --------------------------- |
| [QUICK_START.md](./QUICK_START.md)                       | 5-minute setup guide        |
| [CI_CD_SETUP.md](./CI_CD_SETUP.md)                       | Complete setup instructions |
| [WORKFLOWS.md](./WORKFLOWS.md)                           | Workflow documentation      |
| [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md)           | Branch protection rules     |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Implementation details      |

## ⚡ Quick Start

### 1. Add Secrets

Go to **Settings → Secrets and variables → Actions** and add deployment credentials.

### 2. Create Environments

Go to **Settings → Environments** and create `staging` and `production`.

### 3. Protect Branches

Go to **Settings → Branches** and add protection rules for `main` and `develop`.

### 4. Update CODEOWNERS

Edit [CODEOWNERS](./CODEOWNERS) with your GitHub username.

### 5. Test

Create a test PR and watch GitHub Actions run!

## 📊 Workflow Overview

### CI Workflow

```
Push/PR
  ↓
Lint Code
  ↓
Test Backend (PostgreSQL + Redis)
  ↓
Test Frontend
  ↓
Build Backend
  ↓
Build Frontend
  ↓
Build Docker Images
```

### Deploy Workflow

```
Push to main/tag
  ↓
Build Docker Images
  ↓
Push to GHCR
  ↓
Deploy to Staging/Production
  ↓
Notify Slack
```

### Security Workflow

```
Push/PR/Daily
  ↓
Check Dependencies
  ↓
CodeQL Analysis
  ↓
Container Scanning
  ↓
Secret Detection
```

## 🔐 Security Features

- ✅ Dependency vulnerability scanning
- ✅ Static code analysis (CodeQL)
- ✅ Container image scanning (Trivy)
- ✅ Secret detection (TruffleHog)
- ✅ Signed commit requirements
- ✅ Code owner reviews
- ✅ Branch protection rules

## 📦 Deployment

### Staging

Automatic deployment on `develop` branch push:

```bash
git push origin develop
```

### Production

Manual or tag-triggered deployment:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 🔍 Monitoring

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

## 🛠️ Troubleshooting

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

## 📚 Documentation

### For Setup

- [QUICK_START.md](./QUICK_START.md) - 5-minute setup
- [CI_CD_SETUP.md](./CI_CD_SETUP.md) - Complete setup

### For Understanding

- [WORKFLOWS.md](./WORKFLOWS.md) - Workflow details
- [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) - Branch rules
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation details

### For Development

- [pull_request_template.md](./pull_request_template.md) - PR guidelines
- [CODEOWNERS](./CODEOWNERS) - Code ownership
- [ISSUE_TEMPLATE/](./ISSUE_TEMPLATE/) - Issue templates

## 🎯 Key Features

### Automated Testing

- Backend tests with PostgreSQL and Redis
- Frontend tests with jsdom
- Code coverage reporting
- Linting on every commit

### Automated Building

- Backend compilation
- Frontend bundling
- Docker image builds
- Artifact storage

### Security Scanning

- Dependency audits
- Static code analysis
- Container scanning
- Secret detection

### Deployment

- Staging deployment
- Production deployment
- Zero-downtime ready
- Rollback capable

### Notifications

- Slack alerts
- PR comments
- Release notifications
- Failure alerts

## 🚦 Status Checks

All workflows must pass before merging to `main`:

- ✅ `lint` - Code linting
- ✅ `test-backend` - Backend tests
- ✅ `test-frontend` - Frontend tests
- ✅ `build-backend` - Backend build
- ✅ `build-frontend` - Frontend build
- ✅ `build-docker` - Docker build

## 📋 Checklist

- [ ] Add GitHub Secrets
- [ ] Create Environments
- [ ] Protect Branches
- [ ] Update CODEOWNERS
- [ ] Test Workflows
- [ ] Monitor Deployments
- [ ] Review Documentation

## 🔗 Related Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 💡 Best Practices

1. **Use semantic versioning** for releases
2. **Sign commits** for production
3. **Require code reviews** before merging
4. **Monitor deployment status** via Slack
5. **Keep secrets secure** - never commit them
6. **Test locally** before pushing
7. **Review logs** after deployment
8. **Maintain documentation** for runbooks

## 🆘 Support

For issues or questions:

1. Check GitHub Actions logs
2. Review documentation in this directory
3. Check deployment server logs
4. Contact team members

## 📝 File Structure

```
.github/
├── workflows/                    # GitHub Actions workflows
│   ├── ci.yml                   # Main CI workflow
│   ├── deploy.yml               # Deployment workflow
│   ├── security.yml             # Security scanning
│   ├── pr-checks.yml            # PR validation
│   └── release.yml              # Release management
├── ISSUE_TEMPLATE/              # Issue templates
│   ├── bug_report.md            # Bug report template
│   └── feature_request.md       # Feature request template
├── dependabot.yml               # Dependency updates
├── CODEOWNERS                   # Code ownership
├── pull_request_template.md     # PR template
├── README.md                    # This file
├── QUICK_START.md               # Quick start guide
├── CI_CD_SETUP.md               # Setup guide
├── WORKFLOWS.md                 # Workflow documentation
├── BRANCH_PROTECTION.md         # Branch protection rules
└── IMPLEMENTATION_SUMMARY.md    # Implementation details
```

## 🎉 Ready to Deploy!

You're all set! Follow the [QUICK_START.md](./QUICK_START.md) guide to get started.

---

**Last Updated**: November 26, 2025
**Status**: ✅ Complete
**Requirement**: Task 45 - Configure CI/CD Pipeline
