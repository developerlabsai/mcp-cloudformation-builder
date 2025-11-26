# Coding Style and Quality Rules

## TypeScript Standards
- Strict mode enabled (strict: true in tsconfig)
- No 'any' type - use 'unknown' and type guards instead
- Explicit return types for public functions
- Use interfaces for object shapes, types for unions/primitives
- Prefer readonly for immutable data

## JavaScript/TypeScript Style
```typescript
// Good: Explicit types, async/await
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Bad: any type, .then chains
function fetchUser(id): any {
  return fetch(`/api/users/${id}`).then(r => r.json());
}
```

## Function Guidelines
- Maximum 50 lines per function
- Maximum 4 parameters (use object for more)
- Single responsibility principle
- Pure functions preferred
- Avoid side effects when possible

## Naming Conventions
- Files: kebab-case (user-service.ts)
- Components: PascalCase (UserCard.tsx)
- Functions: camelCase (getUserById)
- Constants: SCREAMING_SNAKE_CASE (MAX_RETRIES)
- Interfaces: PascalCase with 'I' prefix optional (User or IUser)
- Types: PascalCase (UserResponse)
- Database tables: snake_case (user_profiles)

## Error Handling
```typescript
// Good: Structured error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  return { success: false, error: 'Operation failed' };
}

// Bad: Swallowing errors
try {
  await riskyOperation();
} catch (e) {
  // silent fail
}
```

## Code Organization
- One component/class per file
- Group related utilities in modules
- Export from index.ts for clean imports
- Separate business logic from framework code

## Comments and Documentation
- Document WHY, not WHAT
- JSDoc for public APIs
- No commented-out code in production
- TODO comments must have owner and date
- Update comments when code changes

## Clean Code Principles
- DRY: Don't Repeat Yourself (but avoid premature abstraction)
- KISS: Keep It Simple, Stupid
- YAGNI: You Aren't Gonna Need It
- Composition over inheritance
- Fail fast and explicitly

## Code Review Rubric
1. Does it work correctly?
2. Is it secure?
3. Is it maintainable?
4. Is it tested?
5. Is it documented?

## Anti-Patterns to Avoid
- God objects (classes that do too much)
- Deep nesting (max 3 levels)
- Magic numbers/strings
- Copy-paste code
- Premature optimization
- Over-engineering simple solutions

## Formatting Rules
- Use Prettier for formatting
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline
- Max line length: 100 characters

## Import Order
1. Node.js built-ins
2. External packages
3. Internal modules (absolute paths)
4. Relative imports
5. Type imports last
