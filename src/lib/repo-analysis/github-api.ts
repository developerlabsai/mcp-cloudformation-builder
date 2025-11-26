/**
 * GitHub API client for fetching repository contents
 */

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
}

/**
 * Parse a GitHub URL to extract owner and repo
 * Supports formats:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Remove trailing slashes and .git
  const cleaned = url.trim().replace(/\/+$/, '').replace(/\.git$/, '');

  // Try to match various formats
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/,
    /^github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }

  return null;
}

/**
 * Fetch repository metadata
 */
export async function fetchRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DeveloperLabs-RepoAnalyzer',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      if (rateLimitRemaining === '0') {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    owner,
    repo,
    defaultBranch: data.default_branch,
  };
}

/**
 * Fetch the complete file tree of a repository
 */
export async function fetchRepoTree(owner: string, repo: string, branch?: string): Promise<GitHubTree> {
  // If no branch specified, get the default branch
  const targetBranch = branch || (await fetchRepoInfo(owner, repo)).defaultBranch;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DeveloperLabs-RepoAnalyzer',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository or branch not found: ${owner}/${repo}@${targetBranch}`);
    }
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      if (rateLimitRemaining === '0') {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch the content of a specific file
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DeveloperLabs-RepoAnalyzer',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${path}`);
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // GitHub returns content as base64 encoded
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }

  throw new Error(`Unexpected content encoding: ${data.encoding}`);
}

/**
 * Fetch multiple files in parallel
 */
export async function fetchMultipleFiles(
  owner: string,
  repo: string,
  paths: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  const fetchPromises = paths.map(async (path) => {
    try {
      const content = await fetchFileContent(owner, repo, path);
      results.set(path, content);
    } catch {
      // File not found or error - skip it
    }
  });

  await Promise.all(fetchPromises);
  return results;
}

/**
 * Get important files for analysis based on the tree
 */
export function getAnalysisFiles(tree: GitHubTree): string[] {
  const importantFiles = [
    // Package managers
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'requirements.txt',
    'setup.py',
    'pyproject.toml',
    'Pipfile',
    'go.mod',
    'go.sum',
    'Cargo.toml',
    'Cargo.lock',
    'pom.xml',
    'build.gradle',
    'Gemfile',
    'composer.json',

    // Infrastructure
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'serverless.yml',
    'serverless.yaml',
    'template.yaml',
    'template.yml',
    'cloudformation.yaml',
    'cloudformation.yml',

    // Config files
    '.env.example',
    '.env.sample',
    'README.md',
    'tsconfig.json',
    'next.config.js',
    'next.config.mjs',
    'vite.config.ts',
    'webpack.config.js',

    // Database
    'prisma/schema.prisma',
    '.sequelizerc',
    'knexfile.js',
    'ormconfig.json',
    'typeorm.config.ts',
  ];

  const foundFiles: string[] = [];
  const treePathSet = new Set(tree.tree.map(item => item.path));

  for (const file of importantFiles) {
    if (treePathSet.has(file)) {
      foundFiles.push(file);
    }
  }

  // Also look for terraform files
  for (const item of tree.tree) {
    if (item.path.endsWith('.tf') && !foundFiles.includes(item.path)) {
      foundFiles.push(item.path);
    }
  }

  return foundFiles;
}

/**
 * Get file extension statistics from tree
 */
export function getLanguageStats(tree: GitHubTree): Map<string, number> {
  const stats = new Map<string, number>();

  for (const item of tree.tree) {
    if (item.type !== 'blob') continue;

    const ext = item.path.split('.').pop()?.toLowerCase();
    if (!ext) continue;

    const count = stats.get(ext) || 0;
    stats.set(ext, count + 1);
  }

  return stats;
}

/**
 * Fetch the latest commit SHA for a repository branch
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Branch name (optional, defaults to repository's default branch)
 * @returns Latest commit SHA
 */
export async function fetchLatestCommitSha(
  owner: string,
  repo: string,
  branch?: string
): Promise<string> {
  try {
    // Get default branch if not specified
    const targetBranch = branch || (await fetchRepoInfo(owner, repo)).defaultBranch;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${targetBranch}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DeveloperLabs-RepoAnalyzer',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Commit not found for branch: ${targetBranch}`);
      }
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        if (rateLimitRemaining === '0') {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data: GitHubCommit = await response.json();
    return data.sha;
  } catch (error) {
    // If we can't get the commit SHA, throw the error so cache logic can handle it
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch commit SHA from GitHub');
  }
}
