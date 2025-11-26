/**
 * Repository Analyzer using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  GitHubTree,
  fetchRepoTree,
  fetchMultipleFiles,
  getAnalysisFiles,
  getLanguageStats,
  parseGitHubUrl,
} from './github-api';

export interface LanguageInfo {
  name: string;
  percentage: number;
  version?: string;
}

export interface FrameworkInfo {
  name: string;
  version: string;
  confidence: number;
}

export interface DatabaseInfo {
  type: string;
  orm?: string;
  reason: string;
}

export interface AWSService {
  service: string;
  reason: string;
  cost: number;
  configuration?: Record<string, unknown>;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'runtime' | 'dev' | 'peer';
}

export interface EnvironmentVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface SecurityFinding {
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface AnalysisResult {
  repoName: string;
  owner: string;
  description?: string;
  languages: LanguageInfo[];
  frameworks: FrameworkInfo[];
  databases: DatabaseInfo[];
  awsServices: AWSService[];
  dependencies: DependencyInfo[];
  envVars: EnvironmentVariable[];
  securityFindings?: SecurityFinding[];
  totalCost: number;
  analyzedAt?: string;
  // Token usage for cost tracking
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  // Time saved estimate
  manualHoursEstimate?: number;
  // SpecKit metadata (added for SpecKit-first flow)
  specKitMetadata?: {
    commitSha?: string;
    cacheKey?: string;
    analysisTime?: number;
    specDocument?: string;
  };
}

// Map file extensions to language names
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  rb: 'Ruby',
  php: 'PHP',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  swift: 'Swift',
  dart: 'Dart',
  vue: 'Vue',
  svelte: 'Svelte',
};

/**
 * Analyze a GitHub repository and generate architecture recommendations
 */
export async function analyzeRepository(repositoryUrl: string): Promise<AnalysisResult> {
  // Parse the URL
  const parsed = parseGitHubUrl(repositoryUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub URL format');
  }

  const { owner, repo } = parsed;

  // Fetch the repository tree
  const tree = await fetchRepoTree(owner, repo);

  // Get language statistics
  const languageStats = getLanguageStats(tree);
  const languages = calculateLanguages(languageStats);

  // Get important files for analysis
  const filesToAnalyze = getAnalysisFiles(tree);
  const fileContents = await fetchMultipleFiles(owner, repo, filesToAnalyze);

  // Use Claude to analyze the repository
  const analysis = await analyzeWithClaude(owner, repo, tree, fileContents, languages);

  return {
    repoName: repo,
    owner,
    languages,
    ...analysis,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Calculate language percentages from file extension stats
 */
function calculateLanguages(stats: Map<string, number>): LanguageInfo[] {
  const languageCounts = new Map<string, number>();

  for (const [ext, count] of stats) {
    const language = EXTENSION_TO_LANGUAGE[ext];
    if (language) {
      const current = languageCounts.get(language) || 0;
      languageCounts.set(language, current + count);
    }
  }

  const total = Array.from(languageCounts.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  const languages: LanguageInfo[] = [];
  for (const [name, count] of languageCounts) {
    languages.push({
      name,
      percentage: Math.round((count / total) * 100),
    });
  }

  // Sort by percentage descending
  languages.sort((a, b) => b.percentage - a.percentage);

  return languages.slice(0, 5); // Top 5 languages
}

/**
 * Use Claude API to analyze repository contents
 */
async function analyzeWithClaude(
  owner: string,
  repo: string,
  tree: GitHubTree,
  fileContents: Map<string, string>,
  languages: LanguageInfo[]
): Promise<Omit<AnalysisResult, 'repoName' | 'owner' | 'languages' | 'analyzedAt'> & { tokenUsage: { inputTokens: number; outputTokens: number }; manualHoursEstimate: number }> {
  const client = new Anthropic();

  // Build context from file contents
  const filesContext = Array.from(fileContents.entries())
    .map(([path, content]) => `### ${path}\n\`\`\`\n${content.slice(0, 5000)}\n\`\`\``)
    .join('\n\n');

  // Build tree summary
  const treeSummary = tree.tree
    .filter(item => item.type === 'blob')
    .slice(0, 100)
    .map(item => item.path)
    .join('\n');

  const prompt = `Analyze this GitHub repository and provide architecture recommendations.

## Repository: ${owner}/${repo}

## Detected Languages:
${languages.map(l => `- ${l.name}: ${l.percentage}%`).join('\n')}

## File Structure (first 100 files):
${treeSummary}

## Key File Contents:
${filesContext}

Based on this analysis, provide a JSON response with the following structure:

{
  "frameworks": [
    {"name": "string", "version": "string", "confidence": 0.0-1.0}
  ],
  "databases": [
    {"type": "string", "orm": "string or null", "reason": "string"}
  ],
  "awsServices": [
    {"service": "string", "reason": "string", "cost": number}
  ],
  "dependencies": [
    {"name": "string", "version": "string", "type": "runtime|dev|peer"}
  ],
  "envVars": [
    {"name": "string", "description": "string", "required": boolean}
  ],
  "securityFindings": [
    {"title": "string", "severity": "low|medium|high", "description": "string", "recommendation": "string"}
  ],
  "totalCost": number
}

Guidelines:
- For awsServices, recommend appropriate AWS services based on the detected stack
- Use realistic monthly cost estimates in USD for us-east-1
- For dependencies, extract from package.json, requirements.txt, etc.
- For envVars, look for process.env, os.environ, or .env.example patterns
- For securityFindings, identify common security concerns for the stack
- Confidence should reflect how certain you are about the framework detection

Return ONLY valid JSON, no additional text.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  try {
    // Try to extract JSON from the response (in case there's any surrounding text)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Calculate manual hours estimate based on complexity
    const awsServiceCount = (analysis.awsServices || []).length;
    const frameworkCount = (analysis.frameworks || []).length;
    const databaseCount = (analysis.databases || []).length;

    // Base: 2 hours for basic analysis, +1 hour per AWS service, +0.5 per framework/db
    const manualHoursEstimate = 2 + (awsServiceCount * 1) + (frameworkCount * 0.5) + (databaseCount * 0.5);

    // Validate and provide defaults
    return {
      frameworks: analysis.frameworks || [],
      databases: analysis.databases || [],
      awsServices: analysis.awsServices || [],
      dependencies: analysis.dependencies || [],
      envVars: analysis.envVars || [],
      securityFindings: analysis.securityFindings || [],
      totalCost: analysis.totalCost || 0,
      tokenUsage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      manualHoursEstimate: Math.round(manualHoursEstimate * 10) / 10,
    };
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text);
    throw new Error('Failed to parse analysis response');
  }
}
