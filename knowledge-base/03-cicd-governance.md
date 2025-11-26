# CI/CD Code Constitution

## Pull Request Requirements
- All changes must go through pull requests
- No direct commits to main/master branch
- Branch protection rules must be enabled
- Require at least 1 approval (2 for critical changes)
- Require passing CI checks before merge

## Automated Testing
- Unit tests required before merge
- Integration tests required for API changes
- End-to-end tests for critical user flows
- Minimum code coverage: 80% for new code
- Test execution time limit: 10 minutes for unit tests

## CI Pipeline Stages
1. Lint and format check
2. Type checking (TypeScript)
3. Unit tests
4. Security scanning
5. Build verification
6. Integration tests (staging)

## CD Pipeline Rules
- Automated deployment to dev on merge to main
- Automated deployment to staging after dev success
- Manual approval required for production
- Deploy during business hours only (unless emergency)
- Notify team channel on deployment start/complete

## Build Artifacts
- Store all build artifacts in a registry
- Sign artifacts for production deployments
- Retain artifacts for 90 days minimum
- Include build metadata (git sha, timestamp, builder)

## Rollback Procedures
- One-click rollback capability required
- Keep last 5 production versions deployable
- Automated rollback on health check failure
- Document rollback steps for each service

## Branch Strategy
- main: Production-ready code
- develop: Integration branch (optional)
- feature/*: New features
- fix/*: Bug fixes
- hotfix/*: Emergency production fixes
- release/*: Release preparation (optional)

## Commit Message Format
Use conventional commits:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- docs: Documentation
- style: Formatting
- test: Tests
- chore: Maintenance
- perf: Performance improvement

## Code Review Standards
- Review within 24 hours
- Focus on logic, security, performance
- Suggest, don't demand (unless critical)
- Approve with comments if minor issues
- Request changes for blocking issues

## Deployment Windows
- Production deployments: Weekdays 9am-4pm local time
- No deployments on Friday afternoons
- Holiday freeze periods announced in advance
- Emergency deployments require on-call approval

## Feature Flags
- Use feature flags for incomplete features
- Remove flags within 30 days of full rollout
- Document flag purpose and removal criteria
- Monitor flag usage and clean up stale flags
