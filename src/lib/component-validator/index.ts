/**
 * Component Validator
 *
 * Validates and auto-fixes component code before saving to the library.
 * Ensures all components meet quality standards.
 */

import { format } from 'prettier';

export type QualityStatus = 'passed' | 'auto_fixed' | 'needs_review' | 'failed';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  fixable: boolean;
  fixed?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  qualityStatus: QualityStatus;
  originalCode: string;
  fixedCode: string;
  issues: ValidationIssue[];
  autoFixesApplied: string[];
}

/**
 * Validate and optionally auto-fix component code
 */
export async function validateComponent(
  code: string,
  options: {
    autoFix?: boolean;
    category?: string;
  } = {}
): Promise<ValidationResult> {
  const { autoFix = true, category = 'ui' } = options;

  const issues: ValidationIssue[] = [];
  const autoFixesApplied: string[] = [];
  let fixedCode = code;
  let hasBlockingErrors = false;

  // 1. Check for empty code
  if (!code || code.trim().length === 0) {
    issues.push({
      type: 'error',
      message: 'Component code cannot be empty',
      fixable: false,
    });
    hasBlockingErrors = true;
  }

  // 2. Check for basic syntax issues (unmatched brackets, etc.)
  if (!hasBlockingErrors) {
    const syntaxCheck = checkBasicSyntax(code);
    issues.push(...syntaxCheck.issues);
    if (syntaxCheck.hasErrors) {
      hasBlockingErrors = true;
    }
  }

  // 3. Check for 'any' type usage
  if (!hasBlockingErrors) {
    const anyMatches = code.match(/:\s*any\b/g);
    if (anyMatches && anyMatches.length > 0) {
      issues.push({
        type: 'warning',
        message: `Found ${anyMatches.length} usage(s) of 'any' type. Consider using explicit types.`,
        fixable: false,
      });
    }
  }

  // 4. Check for console.log statements (warning only)
  if (!hasBlockingErrors) {
    const consoleMatches = code.match(/console\.(log|warn|error|info)/g);
    if (consoleMatches && consoleMatches.length > 0) {
      issues.push({
        type: 'info',
        message: `Found ${consoleMatches.length} console statement(s). Consider removing for production.`,
        fixable: false,
      });
    }
  }

  // 5. Check for missing exports (UI components should export default or named)
  if (!hasBlockingErrors && (category === 'ui' || category === 'hook' || category === 'provider')) {
    const hasExport = /export\s+(default|const|function|class)/.test(code);
    if (!hasExport) {
      issues.push({
        type: 'warning',
        message: 'Component should have an export statement',
        fixable: false,
      });
    }
  }

  // 6. Auto-fix: Format with Prettier
  if (autoFix && !hasBlockingErrors) {
    try {
      const formatted = await formatWithPrettier(fixedCode, category);
      if (formatted !== fixedCode) {
        fixedCode = formatted;
        autoFixesApplied.push('Formatted code with Prettier');
        issues.push({
          type: 'info',
          message: 'Code was auto-formatted',
          fixable: true,
          fixed: true,
        });
      }
    } catch (formatError) {
      issues.push({
        type: 'warning',
        message: `Prettier formatting failed: ${formatError instanceof Error ? formatError.message : 'Unknown error'}`,
        fixable: false,
      });
    }
  }

  // 7. Auto-fix: Add 'use client' directive for React hooks in UI components
  if (autoFix && !hasBlockingErrors && category === 'ui') {
    const usesClientHooks = /use(State|Effect|Context|Reducer|Callback|Memo|Ref|ImperativeHandle|LayoutEffect|DebugValue)\s*\(/.test(fixedCode);
    const hasUseClient = /^['"]use client['"];?\s*$/m.test(fixedCode);

    if (usesClientHooks && !hasUseClient) {
      fixedCode = `'use client';\n\n${fixedCode}`;
      autoFixesApplied.push('Added "use client" directive for client component');
      issues.push({
        type: 'info',
        message: 'Added "use client" directive (component uses React hooks)',
        fixable: true,
        fixed: true,
      });
    }
  }

  // 8. Auto-fix: Ensure React import for JSX
  if (autoFix && !hasBlockingErrors && (category === 'ui' || category === 'provider')) {
    const hasJSX = /<[A-Z][a-zA-Z]*/.test(fixedCode) || /<[a-z]+/.test(fixedCode);
    const hasReactImport = /import\s+.*React.*from\s+['"]react['"]/.test(fixedCode);

    // React 17+ doesn't require React import for JSX, but we'll note it
    if (hasJSX && !hasReactImport) {
      issues.push({
        type: 'info',
        message: 'Component uses JSX. React 17+ auto-imports JSX runtime.',
        fixable: false,
      });
    }
  }

  // Determine quality status
  let qualityStatus: QualityStatus;
  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;

  if (hasBlockingErrors || errorCount > 0) {
    qualityStatus = 'failed';
  } else if (autoFixesApplied.length > 0) {
    qualityStatus = 'auto_fixed';
  } else if (warningCount > 0) {
    qualityStatus = 'needs_review';
  } else {
    qualityStatus = 'passed';
  }

  return {
    valid: !hasBlockingErrors && errorCount === 0,
    qualityStatus,
    originalCode: code,
    fixedCode,
    issues,
    autoFixesApplied,
  };
}

/**
 * Check for basic syntax issues
 */
function checkBasicSyntax(code: string): { issues: ValidationIssue[]; hasErrors: boolean } {
  const issues: ValidationIssue[] = [];
  let hasErrors = false;

  // Check bracket balance
  const brackets = { '(': 0, '[': 0, '{': 0 };
  const closingMap: Record<string, keyof typeof brackets> = { ')': '(', ']': '[', '}': '{' };

  for (const char of code) {
    if (char in brackets) {
      brackets[char as keyof typeof brackets]++;
    } else if (char in closingMap) {
      brackets[closingMap[char]]--;
    }
  }

  if (brackets['('] !== 0) {
    issues.push({
      type: 'error',
      message: `Unmatched parentheses: ${brackets['('] > 0 ? 'missing )' : 'extra )'}`,
      fixable: false,
    });
    hasErrors = true;
  }
  if (brackets['['] !== 0) {
    issues.push({
      type: 'error',
      message: `Unmatched square brackets: ${brackets['['] > 0 ? 'missing ]' : 'extra ]'}`,
      fixable: false,
    });
    hasErrors = true;
  }
  if (brackets['{'] !== 0) {
    issues.push({
      type: 'error',
      message: `Unmatched curly braces: ${brackets['{'] > 0 ? 'missing }' : 'extra }'}`,
      fixable: false,
    });
    hasErrors = true;
  }

  return { issues, hasErrors };
}

/**
 * Format code with Prettier
 */
async function formatWithPrettier(code: string, category: string): Promise<string> {
  const parser = category === 'api' || category === 'backend' ? 'typescript' : 'typescript';

  return format(code, {
    parser,
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'es5',
    printWidth: 100,
    jsxSingleQuote: false,
  });
}

/**
 * Quick check if code is likely valid TypeScript/TSX
 */
export function quickValidate(code: string): boolean {
  if (!code || code.trim().length === 0) return false;

  // Basic bracket balance check
  const brackets = { '(': 0, '[': 0, '{': 0 };
  const closingMap: Record<string, keyof typeof brackets> = { ')': '(', ']': '[', '}': '{' };

  for (const char of code) {
    if (char in brackets) {
      brackets[char as keyof typeof brackets]++;
    } else if (char in closingMap) {
      brackets[closingMap[char]]--;
    }
  }

  return brackets['('] === 0 && brackets['['] === 0 && brackets['{'] === 0;
}
