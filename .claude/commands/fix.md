# Auto-Fix Issues

Automatically fix common issues in the codebase.

## Arguments:
$ARGUMENTS - Type of fix: "lint", "types", "imports", "all"

## Fix Types:

### lint
- Run ESLint with --fix
- Run Prettier
- Report remaining issues

### types
- Fix TypeScript errors
- Add missing types
- Remove unused types

### imports
- Organize imports
- Remove unused imports
- Add missing imports

### all
- Run all fixes in sequence

## Steps:
1. Identify issues based on fix type
2. Apply automatic fixes
3. Report what was fixed
4. List remaining manual fixes needed

## Safety:
- Show diff before applying
- Ask for confirmation on large changes
- Don't auto-fix breaking changes
