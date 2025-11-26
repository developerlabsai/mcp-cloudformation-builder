# AI Code Review & Usage Policies

## AI-Generated Code Rules

### Human Review Required
- All AI-generated code must be reviewed by a human before merge
- Never blindly accept AI suggestions
- Verify logic, not just syntax
- Check for security vulnerabilities
- Validate against project standards

### What AI Must Never Generate
- Secrets, API keys, or credentials
- PII or personal data
- Production database queries without review
- Security-critical authentication logic (without thorough review)
- Code that bypasses security controls

### AI Usage Disclosure
- Disclose significant AI assistance in PR descriptions
- Document AI-generated architecture decisions
- Track AI tool usage for compliance
- Keep prompts for significant generations

## Token Efficiency

### Context Management
- Keep core rules under 3k tokens in system prompt
- Use RAG for detailed rules and examples
- Clear context between unrelated tasks
- Summarize long conversations

### Efficient Prompting
- Be specific and concise
- Provide relevant context only
- Use structured formats (JSON, bullet points)
- Avoid redundant explanations

## AI Tool Selection

### When to Use AI
- Boilerplate code generation
- Test case generation
- Documentation drafting
- Code refactoring suggestions
- Bug hypothesis generation
- Learning new technologies

### When NOT to Use AI
- Security-critical implementations (without review)
- Cryptographic operations
- Financial calculations
- Compliance-critical code
- Final production deployments

## Quality Assurance for AI Output

### Code Review Checklist for AI-Generated Code
- [ ] Does the code compile/run?
- [ ] Are there any hardcoded values that should be configurable?
- [ ] Does it follow our naming conventions?
- [ ] Is error handling appropriate?
- [ ] Are there any security issues?
- [ ] Does it match the requested functionality?
- [ ] Is it over-engineered?
- [ ] Are tests included?

### Common AI Pitfalls
- Hallucinated APIs or functions
- Outdated syntax or deprecated methods
- Over-engineered solutions
- Missing edge case handling
- Incorrect assumptions about context
- Verbose or redundant code

## AI-Assisted Workflows

### Code Generation Workflow
1. Clearly specify requirements
2. Review generated code
3. Test locally
4. Refactor as needed
5. Document AI assistance
6. Submit for peer review

### AI-Assisted Debugging
1. Describe the problem clearly
2. Provide relevant code context
3. Review suggested solutions
4. Test fixes before applying
5. Understand the root cause

## Data Privacy with AI

### What NOT to Share with AI
- Customer data or PII
- Production credentials
- Internal security documentation
- Proprietary algorithms
- Confidential business logic

### Safe to Share
- Public documentation
- General code patterns
- Error messages (sanitized)
- Stack traces (without PII)
- Open source examples

## AI Tool Governance

### Approved AI Tools
Document which AI tools are approved for:
- Code generation
- Code review
- Documentation
- Testing

### Tool Configuration
- Enable safety filters
- Configure appropriate guardrails
- Use enterprise/team accounts
- Monitor usage and costs

## Continuous Improvement

### Learning from AI
- Document useful patterns
- Share effective prompts
- Build prompt libraries
- Identify gaps in AI knowledge

### Feedback Loop
- Report AI errors to improve prompts
- Track common corrections
- Update system prompts based on learnings
- Share best practices across team
