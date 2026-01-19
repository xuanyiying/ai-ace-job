# CI/CD Setup Guide

This guide provides step-by-step instructions to set up the complete CI/CD pipeline for the IntervAI MVP project.

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

### 2.2 Create Production Environment

**Settings → Environments → New environment**

- Name: `production`
- Deployment branches: `main`
- Required reviewers: (recommended)

## Step 3: Configure Branch Protection Rules

### 3.1 Protect Main Branch

**Settings → Branches → Add rule**

- Branch name pattern: `main`
- Require status checks to pass: `lint`, `test-backend`, `test-frontend`, `build-backend`, `build-frontend`, `build-docker`
- Require code reviews: 1 approval
- Require Code Owner reviews: Yes
- Dismiss stale reviews: Yes
- Require signed commits: Yes
- Require linear history: Yes

### 3.2 Protect Develop Branch

**Settings → Branches → Add rule**

- Branch name pattern: `develop`
- Require status checks to pass: `lint`, `test-backend`, `test-frontend`, `build-backend`, `build-frontend`
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

Edit `.github/dependabot.yml` and update `reviewers`.

**Settings → Code security and analysis → Dependabot**

- Enable Dependabot alerts, security updates, and version updates.
