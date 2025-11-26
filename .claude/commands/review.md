# Code Review

Review code changes for quality and best practices.

## Arguments:
$ARGUMENTS - File path or "staged" for git staged changes

## Review Checklist:

### Code Quality
- [ ] TypeScript types are explicit (no `any`)
- [ ] Functions are under 50 lines
- [ ] Error handling is present
- [ ] No console.log in production code

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS prevention

### Performance
- [ ] No N+1 queries
- [ ] Expensive operations are cached
- [ ] Async operations are properly awaited

### Best Practices
- [ ] Follows project naming conventions
- [ ] Includes necessary comments
- [ ] No dead code
- [ ] DRY principle followed

## Output:
- Summary of findings
- Specific issues with line numbers
- Suggested improvements
- Overall rating (1-5 stars)
