# Save Session Log

Save the entire conversation to a log file for future reference.

## Steps:

1. **Create logs directory** if it doesn't exist:
   ```bash
   mkdir -p logs
   ```

2. **Generate filename** with timestamp:
   - Format: `session-{MM-DD-YY}_{descriptive_name}.md`
   - Example: `session-11-26-24_project_setup.md`

3. **Create log file** with the following structure:

```markdown
# Session Log: {Date} - {Brief Title}

## Summary
{2-3 paragraph summary of what was accomplished in this session}

## Table of Contents
1. [Topic 1](#topic-1)
2. [Topic 2](#topic-2)
3. [Topic 3](#topic-3)
...

## Key Outcomes
- Bullet point of major accomplishments
- Another accomplishment
- etc.

## Files Modified
- `path/to/file1.ts` - Description of change
- `path/to/file2.sql` - Description of change

## Commands/Tools Used
- List of significant commands run
- Database migrations
- Deployments

---

## Full Conversation Log

{The entire conversation, word for word, preserving user messages and assistant responses}
```

4. **Save the file** to `logs/session-{timestamp}_{name}.md`

5. **Confirm** the log was saved and show the file path

## Notes:
- Ask user for a brief descriptive name for the session
- Include timestamps for major sections if relevant
- Preserve code blocks and formatting
- Add to .gitignore if logs should not be committed
