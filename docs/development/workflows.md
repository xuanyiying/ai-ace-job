# GitHub Actions CI/CD Workflows

This document describes the automated CI/CD workflows configured for the IntervAI MVP project.

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

### 2. Deploy Workflow (`deploy.yml`)

**Trigger**: Push to `main` branch, Manual workflow dispatch

**Jobs**:
- **Deploy**: Builds Docker images and deploys to staging or production
- **Notify**: Sends Slack notifications on deployment status

### 3. Security Workflow (`security.yml`)

**Trigger**: Push to `main` or `develop`, Pull Requests, Daily schedule (2 AM UTC)

**Jobs**:
- **Dependency Check**: Runs `npm audit`
- **CodeQL Analysis**: Performs static code analysis
- **Container Scan**: Scans Docker images using Trivy
- **Secret Scan**: Scans for exposed secrets using TruffleHog

### 4. PR Checks Workflow (`pr-checks.yml`)

**Trigger**: Pull Requests to `main` or `develop`

**Jobs**:
- **Validate PR**: Validates PR title (semantic commit)
- **Check Changes**: Detects changed files
- **Test Backend (PR)**: Runs backend tests if backend files changed
- **Test Frontend (PR)**: Runs frontend tests if frontend files changed
- **Lint (PR)**: Runs linter
- **Docker Build (PR)**: Builds Docker images if Dockerfile changed

### 5. Release Workflow (`release.yml`)

**Trigger**: Push of version tags (e.g., `v1.0.0`)

**Jobs**:
- **Create Release**: Creates GitHub release with changelog
- **Build and Push**: Builds and pushes Docker images with version tags
- **Publish Artifacts**: Creates and uploads build artifacts to release
- **Notify Release**: Sends Slack notification
