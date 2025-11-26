# Smart Commit

Create a well-formatted git commit with proper message.

## Arguments:
$ARGUMENTS - Optional commit message hint

## Steps:
1. Run `git status` to see changes
2. Run `git diff` to understand what changed
3. Analyze changes and generate commit message:
   - Use conventional commit format (feat:, fix:, refactor:, docs:, etc.)
   - Keep subject under 72 characters
   - Include body if changes are significant
4. Show proposed commit to user for approval
5. If approved, stage and commit

## Commit Message Format:
```
type: Short description

- Bullet point details if needed
- Another detail

🤖 Generated with Claude Code
```

## Types:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- docs: Documentation
- style: Formatting
- test: Tests
- chore: Maintenance
