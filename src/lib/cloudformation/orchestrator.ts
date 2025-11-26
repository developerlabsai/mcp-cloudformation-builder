/**
 * SpecKit Orchestrator
 *
 * CRITICAL: ALL CloudFormation template generation MUST go through SpecKit analysis first.
 * This ensures accurate, specification-driven infrastructure generation.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface SpecKitResult {
  specDocument: string;           // Generated specification markdown
  repositoryStructure: any;       // File tree and organization
  detectedFrameworks: string[];   // Languages and frameworks found
  infrastructureFiles: string[];  // Infrastructure-related files
  dependencies: any;              // Package dependencies
  estimatedComplexity: 'low' | 'medium' | 'high';
  analysisTime: number;           // ms
  cacheKey?: string;              // For caching results
  commitSha?: string;             // Git commit SHA for versioning
}

export interface SpecKitAnalysisOptions {
  repositoryUrl: string;
  useCache?: boolean;
  cacheMaxAge?: number;           // seconds (default 45 days)
}

/**
 * Run SpecKit analysis on a GitHub repository
 * This is the REQUIRED first step before CloudFormation generation
 */
export async function runSpecKitAnalysis(
  options: SpecKitAnalysisOptions
): Promise<SpecKitResult> {
  const startTime = Date.now();
  const { repositoryUrl, useCache = true, cacheMaxAge = 45 * 24 * 60 * 60 } = options;

  console.log('🔍 Starting SpecKit analysis for:', repositoryUrl);

  // Check cache first if enabled
  if (useCache) {
    const cached = await checkSpecKitCache(repositoryUrl, cacheMaxAge);
    if (cached) {
      console.log('✓ Using cached SpecKit analysis');
      return cached;
    }
  }

  // Clone repository to temporary directory
  const tempDir = await cloneRepository(repositoryUrl);

  try {
    // Run SpecKit analysis
    const result = await executeSpecKitAnalysis(tempDir, repositoryUrl);

    // Add analysisTime to complete result
    const completeResult = {
      ...result,
      analysisTime: Date.now() - startTime,
    };

    // Cache the result
    if (useCache) {
      await cacheSpecKitResult(repositoryUrl, completeResult);
    }

    // Cleanup temp directory
    await cleanupTempDirectory(tempDir);

    return completeResult;
  } catch (error) {
    // Cleanup on error
    await cleanupTempDirectory(tempDir);
    throw error;
  }
}

/**
 * Clone GitHub repository to temporary directory
 */
async function cloneRepository(repositoryUrl: string): Promise<string> {
  const tempDir = path.join('/tmp', `speckit-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  try {
    console.log(`  Cloning ${repositoryUrl} to ${tempDir}...`);
    await execAsync(`git clone --depth 1 ${repositoryUrl} ${tempDir}`, {
      timeout: 60000, // 60 second timeout
    });
    console.log('  ✓ Repository cloned');
    return tempDir;
  } catch (error: any) {
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * Execute SpecKit analysis on cloned repository
 */
async function executeSpecKitAnalysis(
  repoPath: string,
  repositoryUrl: string
): Promise<Omit<SpecKitResult, 'analysisTime'>> {
  console.log('  Running SpecKit analysis...');

  try {
    // Get commit SHA for versioning
    const { stdout: commitSha } = await execAsync('git rev-parse HEAD', {
      cwd: repoPath,
    });

    // Detect languages and frameworks
    const languages = await detectLanguages(repoPath);
    const frameworks = await detectFrameworks(repoPath);
    const infrastructureFiles = await detectInfrastructureFiles(repoPath);
    const dependencies = await analyzeDependencies(repoPath);
    const repositoryStructure = await analyzeStructure(repoPath);

    // Generate specification document
    const specDocument = await generateSpecificationDocument({
      repositoryUrl,
      languages,
      frameworks,
      infrastructureFiles,
      dependencies,
      repositoryStructure,
    });

    // Estimate complexity
    const estimatedComplexity = estimateComplexity({
      languages,
      frameworks,
      infrastructureFiles,
      dependencies,
    });

    console.log('  ✓ SpecKit analysis complete');

    return {
      specDocument,
      repositoryStructure,
      detectedFrameworks: frameworks,
      infrastructureFiles,
      dependencies,
      estimatedComplexity,
      commitSha: commitSha.trim(),
      cacheKey: generateCacheKey(repositoryUrl, commitSha.trim()),
    };
  } catch (error: any) {
    throw new Error(`SpecKit analysis failed: ${error.message}`);
  }
}

/**
 * Detect programming languages in repository
 */
async function detectLanguages(repoPath: string): Promise<string[]> {
  const languages: Set<string> = new Set();

  const languageExtensions: Record<string, string> = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.jsx': 'JavaScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.go': 'Go',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.rs': 'Rust',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
  };

  try {
    const { stdout } = await execAsync(
      `find . -type f \\( ${Object.keys(languageExtensions).map(ext => `-name "*${ext}"`).join(' -o ')} \\) | head -100`,
      { cwd: repoPath }
    );

    const files = stdout.split('\n').filter(Boolean);
    files.forEach(file => {
      const ext = path.extname(file);
      if (languageExtensions[ext]) {
        languages.add(languageExtensions[ext]);
      }
    });
  } catch (error) {
    console.warn('  ⚠ Language detection error:', error);
  }

  return Array.from(languages);
}

/**
 * Detect frameworks and tools
 */
async function detectFrameworks(repoPath: string): Promise<string[]> {
  const frameworks: Set<string> = new Set();

  // Check for common config files
  const frameworkIndicators: Record<string, string> = {
    'package.json': 'Node.js',
    'next.config.js': 'Next.js',
    'nuxt.config.js': 'Nuxt.js',
    'angular.json': 'Angular',
    'vue.config.js': 'Vue.js',
    'requirements.txt': 'Python',
    'Pipfile': 'Python/Pipenv',
    'poetry.lock': 'Python/Poetry',
    'go.mod': 'Go Modules',
    'Cargo.toml': 'Rust/Cargo',
    'pom.xml': 'Java/Maven',
    'build.gradle': 'Java/Gradle',
    'Gemfile': 'Ruby/Bundler',
    'composer.json': 'PHP/Composer',
  };

  for (const [file, framework] of Object.entries(frameworkIndicators)) {
    if (fs.existsSync(path.join(repoPath, file))) {
      frameworks.add(framework);
    }
  }

  return Array.from(frameworks);
}

/**
 * Detect infrastructure-related files
 */
async function detectInfrastructureFiles(repoPath: string): Promise<string[]> {
  const infraFiles: string[] = [];

  const infraPatterns = [
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    '*.tf',
    'serverless.yml',
    'serverless.yaml',
    '.ebextensions/*',
    'cloudformation/*',
    'infrastructure/*',
    'deploy/*',
    'k8s/*',
    'kubernetes/*',
    '*.yaml',
    '*.yml',
  ];

  try {
    for (const pattern of infraPatterns) {
      const { stdout } = await execAsync(
        `find . -name "${pattern}" -type f | head -20`,
        { cwd: repoPath }
      );

      const files = stdout.split('\n').filter(Boolean);
      infraFiles.push(...files.map(f => f.replace('./', '')));
    }
  } catch (error) {
    console.warn('  ⚠ Infrastructure file detection error:', error);
  }

  return [...new Set(infraFiles)]; // Remove duplicates
}

/**
 * Analyze package dependencies
 */
async function analyzeDependencies(repoPath: string): Promise<any> {
  const dependencies: any = {
    runtime: [],
    dev: [],
    peer: [],
  };

  // Check package.json
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (packageJson.dependencies) {
        dependencies.runtime = Object.keys(packageJson.dependencies);
      }
      if (packageJson.devDependencies) {
        dependencies.dev = Object.keys(packageJson.devDependencies);
      }
      if (packageJson.peerDependencies) {
        dependencies.peer = Object.keys(packageJson.peerDependencies);
      }
    } catch (error) {
      console.warn('  ⚠ Failed to parse package.json');
    }
  }

  return dependencies;
}

/**
 * Analyze repository structure
 */
async function analyzeStructure(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `find . -maxdepth 3 -type d | grep -v node_modules | grep -v .git | head -50`,
      { cwd: repoPath }
    );

    const directories = stdout.split('\n').filter(Boolean).map(d => d.replace('./', ''));

    return {
      directories,
      hasSourceDir: directories.some(d => d.match(/^(src|source|lib)/)),
      hasTestDir: directories.some(d => d.match(/(test|__test__|spec)/)),
      hasDocsDir: directories.some(d => d.match(/(docs|documentation)/)),
      hasPublicDir: directories.some(d => d.match(/(public|static|assets)/)),
    };
  } catch (error) {
    return { directories: [], hasSourceDir: false, hasTestDir: false, hasDocsDir: false, hasPublicDir: false };
  }
}

/**
 * Generate specification document from analysis
 */
async function generateSpecificationDocument(data: {
  repositoryUrl: string;
  languages: string[];
  frameworks: string[];
  infrastructureFiles: string[];
  dependencies: any;
  repositoryStructure: any;
}): Promise<string> {
  const { repositoryUrl, languages, frameworks, infrastructureFiles, dependencies, repositoryStructure } = data;

  return `# Repository Specification

## Repository Information
- **URL**: ${repositoryUrl}
- **Languages**: ${languages.join(', ') || 'None detected'}
- **Frameworks**: ${frameworks.join(', ') || 'None detected'}

## Project Structure
${repositoryStructure.hasSourceDir ? '- ✓ Source directory detected' : '- ✗ No source directory'}
${repositoryStructure.hasTestDir ? '- ✓ Test directory detected' : '- ✗ No test directory'}
${repositoryStructure.hasDocsDir ? '- ✓ Documentation directory detected' : '- ✗ No documentation directory'}
${repositoryStructure.hasPublicDir ? '- ✓ Public/Static assets detected' : '- ✗ No public assets directory'}

## Infrastructure Files Detected
${infrastructureFiles.length > 0 ? infrastructureFiles.map(f => `- ${f}`).join('\n') : '- None detected'}

## Dependencies
- **Runtime**: ${dependencies.runtime.length} packages
- **Development**: ${dependencies.dev.length} packages
${dependencies.runtime.length > 0 ? `\n### Key Runtime Dependencies\n${dependencies.runtime.slice(0, 10).map((d: string) => `- ${d}`).join('\n')}` : ''}

## Recommended AWS Architecture

Based on the detected languages, frameworks, and infrastructure:

### Compute Layer
${frameworks.includes('Next.js') || frameworks.includes('Node.js') ? '- **AWS ECS Fargate** - For containerized Node.js application\n- **Application Load Balancer** - For traffic distribution' : ''}
${languages.includes('Python') ? '- **AWS Lambda** or **ECS Fargate** - For Python application\n- **API Gateway** (if Lambda) or **ALB** (if ECS)' : ''}
${infrastructureFiles.some(f => f.includes('Dockerfile')) ? '- **Container-based deployment** detected (ECS/EKS recommended)' : ''}

### Database Layer
${dependencies.runtime.some((d: string) => d.includes('pg') || d.includes('postgres')) ? '- **Amazon RDS PostgreSQL** - Relational database' : ''}
${dependencies.runtime.some((d: string) => d.includes('mysql')) ? '- **Amazon RDS MySQL** - Relational database' : ''}
${dependencies.runtime.some((d: string) => d.includes('mongoose') || d.includes('mongodb')) ? '- **Amazon DocumentDB** - MongoDB-compatible database' : ''}
${dependencies.runtime.some((d: string) => d.includes('redis') || d.includes('ioredis')) ? '- **Amazon ElastiCache (Redis)** - Caching layer' : ''}

### Storage Layer
- **Amazon S3** - Static assets and file storage
${frameworks.includes('Next.js') ? '- **Amazon CloudFront** - CDN for static assets and SSR' : ''}

### Security & Secrets
- **AWS Secrets Manager** - Secure credential storage
- **AWS IAM** - Access control and permissions

### Monitoring
- **Amazon CloudWatch** - Logs and metrics
- **AWS X-Ray** - Distributed tracing (optional)

## Deployment Strategy
${infrastructureFiles.some(f => f.includes('docker')) ? '- Docker-based containerization recommended' : '- Traditional deployment or serverless recommended'}
${infrastructureFiles.some(f => f.includes('.tf')) ? '- Terraform detected - consider migration to CloudFormation or maintain Terraform' : ''}
${infrastructureFiles.some(f => f.includes('serverless')) ? '- Serverless Framework detected - Lambda-first architecture' : ''}
`;
}

/**
 * Estimate project complexity
 */
function estimateComplexity(data: {
  languages: string[];
  frameworks: string[];
  infrastructureFiles: string[];
  dependencies: any;
}): 'low' | 'medium' | 'high' {
  let score = 0;

  // More languages = more complex
  score += data.languages.length * 10;

  // More frameworks = more complex
  score += data.frameworks.length * 15;

  // Infrastructure files = complexity
  score += data.infrastructureFiles.length * 5;

  // Many dependencies = complex
  score += Math.min(data.dependencies.runtime.length * 2, 50);

  if (score < 50) return 'low';
  if (score < 100) return 'medium';
  return 'high';
}

/**
 * Generate cache key for repository
 */
function generateCacheKey(repositoryUrl: string, commitSha: string): string {
  return `${repositoryUrl}::${commitSha}`;
}

/**
 * Check if cached SpecKit result exists and is valid
 */
async function checkSpecKitCache(
  repositoryUrl: string,
  maxAge: number
): Promise<SpecKitResult | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate the oldest acceptable analysis time
    const minAnalyzedAt = new Date(Date.now() - maxAge * 1000).toISOString();

    // Get the latest commit SHA for this repository
    let latestCommitSha: string | undefined;
    try {
      const { stdout } = await execAsync(`git ls-remote ${repositoryUrl} HEAD`, {
        timeout: 10000,
      });
      latestCommitSha = stdout.split('\t')[0]?.trim();
    } catch (error) {
      console.warn('  ⚠ Could not fetch latest commit SHA, will skip cache');
      return null;
    }

    if (!latestCommitSha) {
      return null;
    }

    // Query cache
    const { data, error } = await supabase
      .from('repository_version_tracking')
      .select('*')
      .eq('repository_url', repositoryUrl)
      .eq('commit_sha', latestCommitSha)
      .gte('analyzed_at', minAnalyzedAt)
      .not('spec_document', 'is', null)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Reconstruct SpecKitResult from cache
    return {
      specDocument: data.spec_document,
      repositoryStructure: data.repository_structure || {},
      detectedFrameworks: data.detected_frameworks || [],
      infrastructureFiles: data.infrastructure_files || [],
      dependencies: data.dependencies || { runtime: [], dev: [], peer: [] },
      estimatedComplexity: (data.estimated_complexity as 'low' | 'medium' | 'high') || 'medium',
      analysisTime: data.analysis_time_ms || 0,
      cacheKey: data.cache_key,
      commitSha: data.commit_sha,
    };
  } catch (error) {
    console.error('  ⚠ Cache check failed:', error);
    return null;
  }
}

/**
 * Cache SpecKit result
 */
async function cacheSpecKitResult(
  repositoryUrl: string,
  result: SpecKitResult
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const cacheEntry = {
      repository_url: repositoryUrl,
      commit_sha: result.commitSha,
      spec_document: result.specDocument,
      detected_languages: [], // Will be extracted from frameworks
      detected_frameworks: result.detectedFrameworks,
      infrastructure_files: result.infrastructureFiles,
      dependencies: result.dependencies,
      repository_structure: result.repositoryStructure,
      estimated_complexity: result.estimatedComplexity,
      analysis_time_ms: result.analysisTime,
      cache_key: result.cacheKey,
      analyzed_at: new Date().toISOString(),
      metadata: {
        cached_by: 'speckit-orchestrator',
        version: '1.0.0',
      },
    };

    // Upsert (insert or update if exists)
    const { error } = await supabase
      .from('repository_version_tracking')
      .upsert(cacheEntry, {
        onConflict: 'repository_url,commit_sha',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('  ⚠ Failed to cache result:', error.message);
    } else {
      console.log('  ✓ SpecKit result cached successfully');
    }
  } catch (error) {
    console.error('  ⚠ Caching failed:', error);
  }
}

/**
 * Cleanup temporary directory
 */
async function cleanupTempDirectory(tempDir: string): Promise<void> {
  try {
    await execAsync(`rm -rf ${tempDir}`);
    console.log('  ✓ Cleaned up temporary directory');
  } catch (error) {
    console.warn('  ⚠ Failed to cleanup temp directory:', error);
  }
}
