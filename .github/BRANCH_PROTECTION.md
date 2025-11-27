# Branch Protection Rules

This document describes the recommended branch protection rules for the Resume Optimizer MVP project.

## Main Branch Protection

### Rule Configuration

**Branch name pattern**: `main`

### Require status checks to pass before merging

- ✅ Require branches to be up to date before merging
- ✅ Require status checks to pass before merging

**Status checks that must pass**:

- `lint` - Code linting
- `test-backend` - Backend tests
- `test-frontend` - Frontend tests
- `build-backend` - Backend build
- `build-frontend` - Frontend build
- `build-docker` - Docker image build

### Require code reviews before merging

- ✅ Require at least 1 approval
- ✅ Require review from Code Owners
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require approval of the most recent reviewable push

### Require conversation resolution before merging

- ✅ Require all conversations on code to be resolved

### Require signed commits

- ✅ Require commits to be signed

### Require linear history

- ✅ Require linear history

### Restrict who can push to matching branches

- ✅ Allow force pushes: No
- ✅ Allow deletions: No

## Develop Branch Protection

### Rule Configuration

**Branch name pattern**: `develop`

### Require status checks to pass before merging

- ✅ Require branches to be up to date before merging
- ✅ Require status checks to pass before merging

**Status checks that must pass**:

- `lint` - Code linting
- `test-backend` - Backend tests
- `test-frontend` - Frontend tests
- `build-backend` - Backend build
- `build-frontend` - Frontend build

### Require code reviews before merging

- ✅ Require at least 1 approval
- ✅ Require review from Code Owners
- ✅ Dismiss stale pull request approvals when new commits are pushed

### Require conversation resolution before merging

- ✅ Require all conversations on code to be resolved

### Restrict who can push to matching branches

- ✅ Allow force pushes: No
- ✅ Allow deletions: No

## Release Branch Protection

### Rule Configuration

**Branch name pattern**: `release/*`

### Require status checks to pass before merging

- ✅ Require branches to be up to date before merging
- ✅ Require status checks to pass before merging

**Status checks that must pass**:

- `lint` - Code linting
- `test-backend` - Backend tests
- `test-frontend` - Frontend tests
- `build-backend` - Backend build
- `build-frontend` - Frontend build
- `build-docker` - Docker image build

### Require code reviews before merging

- ✅ Require at least 2 approvals
- ✅ Require review from Code Owners
- ✅ Dismiss stale pull request approvals when new commits are pushed

### Require conversation resolution before merging

- ✅ Require all conversations on code to be resolved

### Require signed commits

- ✅ Require commits to be signed

### Restrict who can push to matching branches

- ✅ Allow force pushes: No
- ✅ Allow deletions: No

## Setup Instructions

### Using GitHub CLI

```bash
# Protect main branch
gh api repos/{owner}/{repo}/branches/main/protection \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test-backend", "test-frontend", "build-backend", "build-frontend", "build-docker"]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "enforce_admins": true,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Protect develop branch
gh api repos/{owner}/{repo}/branches/develop/protection \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test-backend", "test-frontend", "build-backend", "build-frontend"]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "enforce_admins": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

### Using GitHub Web UI

1. Go to repository Settings → Branches
2. Click "Add rule" under "Branch protection rules"
3. Enter branch name pattern (e.g., `main`)
4. Configure protection rules as described above
5. Click "Create"

## Bypass Rules

### Administrators

Repository administrators can bypass branch protection rules by:

- Force pushing to protected branches
- Deleting protected branches
- Merging without required reviews

**Note**: This should be used only in emergency situations.

### Temporary Bypass

To temporarily bypass rules:

1. Go to repository Settings → Branches
2. Edit the branch protection rule
3. Temporarily disable the rule
4. Re-enable after the emergency is resolved

## Enforcement

### Automatic Enforcement

- Status checks are automatically enforced by GitHub Actions
- Code reviews are automatically enforced by GitHub
- Signed commits are automatically verified

### Manual Enforcement

- Repository administrators should monitor branch protection violations
- Use GitHub's audit log to track bypass events
- Review and approve all pull requests carefully

## Best Practices

1. **Always require status checks**: Ensures code quality before merging
2. **Require code reviews**: Catches bugs and improves code quality
3. **Require signed commits**: Ensures commit authenticity
4. **Require linear history**: Keeps git history clean
5. **Dismiss stale reviews**: Ensures reviews are current
6. **Require Code Owner reviews**: Ensures domain experts review changes
7. **Enforce for admins**: Prevents accidental mistakes by administrators

## Troubleshooting

### Status checks not appearing

1. Ensure GitHub Actions workflows are configured
2. Check that workflow files are in `.github/workflows/`
3. Verify workflow triggers match branch names
4. Check GitHub Actions logs for errors

### Cannot merge despite passing checks

1. Verify all required status checks have passed
2. Check that required reviews have been approved
3. Ensure branch is up to date with base branch
4. Check for unresolved conversations

### Need to bypass protection

1. Contact repository administrator
2. Provide justification for bypass
3. Administrator can temporarily disable rule
4. Rule should be re-enabled after bypass

## Monitoring

### GitHub Audit Log

Monitor branch protection events:

```bash
gh api repos/{owner}/{repo}/audit-log \
  --jq '.[] | select(.action | contains("branch_protection"))'
```

### Status Check Failures

Monitor failed status checks:

```bash
gh api repos/{owner}/{repo}/check-runs \
  --jq '.check_runs[] | select(.conclusion == "failure")'
```

## Related Documentation

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Code Owners Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
