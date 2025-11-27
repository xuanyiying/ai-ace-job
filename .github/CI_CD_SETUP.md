# CI/CD Setup Guide

This guide provides step-by-step instructions to set up the complete CI/CD pipeline for the Resume Optimizer MVP project.

## Prerequisites

- GitHub repository with admin access
- Docker Hub or GitHub Container Registry account
- Slack workspace (optional, for notifications)
- SSH access to staging and production servers

## Step 1: Configure GitHub Secrets

### 1.1 Container Registry Secrets

GitHub Actions automatically uses `GITHUB_TOKEN` for GitHub Container Registry (GHCR). No additional setup needed.

### 1.2 Deployment Secrets

Add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

```
DEPLOY_KEY_STAGING
DEPLOY_HOST_STAGING
DEPLOY_USER_STAGING
DEPLOY_PATH_STAGING

DEPLOY_KEY_PRODUCTION
DEPLOY_HOST_PRODUCTION
DEPLOY_USER_PRODUCTION
DEPLOY_PATH_PRODUCTION
```

**To generate SSH keys**:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -f deploy_key -N ""

# Copy private key to GitHub Secrets
cat deploy_key

# Add public key to server
cat deploy_key.pub >> ~/.ssh/authorized_keys
```

### 1.3 Slack Webhook (Optional)

For deployment notifications:

1. Go to https://api.slack.com/apps
2. Create a new app or select existing
3. Enable Incoming Webhooks
4. Create new webhook for your channel
5. Add to GitHub Secrets as `SLACK_WEBHOOK_URL`

## Step 2: Configure GitHub Environments

### 2.1 Create Staging Environment

**Settings → Environments → New environment**

- Name: `staging`
- Deployment branches: `develop`
- Environment secrets: (optional)

### 2.2 Create Production Environment

**Settings → Environments → New environment**

- Name: `production`
- Deployment branches: `main`
- Required reviewers: (recommended)
- Environment secrets: (optional)

## Step 3: Configure Branch Protection Rules

### 3.1 Protect Main Branch

**Settings → Branches → Add rule**

- Branch name pattern: `main`
- Require status checks to pass:
  - `lint`
  - `test-backend`
  - `test-frontend`
  - `build-backend`
  - `build-frontend`
  - `build-docker`
- Require code reviews: 1 approval
- Require Code Owner reviews: Yes
- Dismiss stale reviews: Yes
- Require signed commits: Yes
- Require linear history: Yes

### 3.2 Protect Develop Branch

**Settings → Branches → Add rule**

- Branch name pattern: `develop`
- Require status checks to pass:
  - `lint`
  - `test-backend`
  - `test-frontend`
  - `build-backend`
  - `build-frontend`
- Require code reviews: 1 approval
- Require Code Owner reviews: Yes
- Dismiss stale reviews: Yes

## Step 4: Configure Code Owners

Edit `.github/CODEOWNERS` and replace `@your-github-username` with actual GitHub usernames.

## Step 5: Enable GitHub Actions

**Settings → Actions → General**

- Actions permissions: Allow all actions and reusable workflows
- Workflow permissions: Read and write permissions
- Allow GitHub Actions to create and approve pull requests: Yes

## Step 6: Configure Dependabot

Edit `.github/dependabot.yml` and update:

- `reviewers`: Add your GitHub username
- `ignore`: Customize ignored dependencies

**Settings → Code security and analysis → Dependabot**

- Enable Dependabot alerts: Yes
- Enable Dependabot security updates: Yes
- Enable Dependabot version updates: Yes

## Step 7: Set Up Deployment Servers

### 7.1 Staging Server Setup

```bash
# SSH into staging server
ssh user@staging-server

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deployment directory
mkdir -p /opt/resume-optimizer
cd /opt/resume-optimizer

# Create .env file
cat > .env << 'EOF'
NODE_ENV=staging
POSTGRES_DB=resume_optimizer
POSTGRES_USER=resume_user
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=your-openai-key
CORS_ORIGIN=https://staging.example.com
VITE_API_BASE_URL=https://api-staging.example.com/api/v1
EOF

# Create docker-compose.yml (copy from repository)
# Set proper permissions
chmod 600 .env
```

### 7.2 Production Server Setup

```bash
# SSH into production server
ssh user@production-server

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deployment directory
mkdir -p /opt/resume-optimizer
cd /opt/resume-optimizer

# Create .env file with production values
cat > .env << 'EOF'
NODE_ENV=production
POSTGRES_DB=resume_optimizer
POSTGRES_USER=resume_user
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=your-openai-key
CORS_ORIGIN=https://example.com
VITE_API_BASE_URL=https://api.example.com/api/v1
EOF

# Set proper permissions
chmod 600 .env

# Configure SSL/TLS (using Let's Encrypt)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d api.example.com -d example.com
```

## Step 8: Configure Docker Registry Access

### 8.1 On Deployment Servers

```bash
# Create GitHub token with read:packages scope
# https://github.com/settings/tokens

# Login to GitHub Container Registry
docker login ghcr.io -u your-username -p your-token

# Save credentials
docker logout ghcr.io  # Optional: to remove credentials
```

## Step 9: Test CI/CD Pipeline

### 9.1 Test Linting

```bash
# Create a test branch
git checkout -b test/ci-setup

# Make a code change
echo "// test" >> packages/backend/src/main.ts

# Commit and push
git add .
git commit -m "test: ci setup"
git push origin test/ci-setup

# Create pull request and check GitHub Actions
```

### 9.2 Test Deployment

```bash
# Create a release tag
git tag v0.1.0
git push origin v0.1.0

# Monitor GitHub Actions for deployment
```

## Step 10: Monitor and Maintain

### 10.1 GitHub Actions Dashboard

**Actions tab** - Monitor workflow runs:

- Check for failed jobs
- Review logs for errors
- Monitor execution times

### 10.2 Deployment Monitoring

```bash
# SSH into server and check logs
ssh user@staging-server
cd /opt/resume-optimizer
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 10.3 Security Monitoring

**Security tab** - Review:

- CodeQL alerts
- Dependabot alerts
- Secret scanning alerts

## Troubleshooting

### Workflow Not Triggering

1. Check workflow file syntax: `yamllint .github/workflows/*.yml`
2. Verify branch names match triggers
3. Check GitHub Actions is enabled
4. Review workflow logs for errors

### Tests Failing in CI

1. Run tests locally: `npm run test`
2. Check environment variables
3. Verify database/Redis services
4. Review test logs in GitHub Actions

### Deployment Failing

1. Verify SSH keys are correct
2. Check server connectivity: `ssh -i deploy_key user@host`
3. Verify docker-compose is installed
4. Check deployment directory permissions
5. Review deployment logs

### Docker Build Failing

1. Check Dockerfile syntax
2. Verify all dependencies in package.json
3. Check for missing environment variables
4. Review build logs in GitHub Actions

## Best Practices

1. **Use semantic versioning** for releases: `v1.0.0`
2. **Sign commits** for production deployments
3. **Require code reviews** before merging
4. **Monitor deployment status** via Slack
5. **Keep secrets secure** - never commit them
6. **Test locally** before pushing
7. **Review logs** after each deployment
8. **Maintain documentation** for runbooks

## Security Considerations

1. **SSH Keys**: Use ed25519 keys, rotate regularly
2. **Secrets**: Use GitHub Secrets, never commit credentials
3. **Access Control**: Limit deployment permissions
4. **Audit Logs**: Monitor GitHub audit logs
5. **Signed Commits**: Require GPG signatures
6. **Code Review**: Require multiple approvals
7. **Dependency Updates**: Review Dependabot PRs carefully

## Performance Optimization

1. **Caching**: Node modules are cached automatically
2. **Parallel Jobs**: Tests run in parallel
3. **Conditional Execution**: Jobs skip if not needed
4. **Docker Layer Caching**: Reuse build layers

## Scaling Considerations

1. **Concurrent Deployments**: Use environments to prevent conflicts
2. **Database Migrations**: Run before deployment
3. **Blue-Green Deployment**: Implement for zero-downtime
4. **Rollback Strategy**: Plan for quick rollbacks
5. **Load Testing**: Test before production deployment

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Support

For issues or questions:

1. Check GitHub Actions logs
2. Review workflow documentation
3. Check deployment server logs
4. Contact team members
5. Open GitHub issue for bugs
