import type { KBEntry } from './index';

/**
 * Knowledge Base Entries
 *
 * Add new solutions here as they are discovered.
 * Each entry should have a unique ID following the pattern: {category}-{number}
 */
export const kbEntries: KBEntry[] = [
  // ============================================
  // NEXT.JS SOLUTIONS
  // ============================================
  {
    id: 'nextjs-001',
    category: 'nextjs',
    title: 'Next.js 16 Turbopack Build Fails with NODE_ENV=development',
    problem:
      'When NODE_ENV is set to "development" in the shell environment, running `npm run build` fails because Next.js 16 with Turbopack detects the wrong environment and attempts development-only operations during production build.',
    errorMessages: [
      'NODE_ENV=development',
      'build failed',
      'Turbopack build error',
    ],
    solution: `Unset NODE_ENV before running the build command:

1. Run: \`unset NODE_ENV\`
2. Then run: \`npm run build\`

Or in a single command:
\`unset NODE_ENV && npm run build\`

This ensures Next.js correctly detects production mode during the build process.`,
    codeExample: `# Before building
unset NODE_ENV

# Or combined
unset NODE_ENV && npm run build`,
    tags: ['nextjs', 'turbopack', 'build', 'NODE_ENV', 'environment', 'next16'],
    dateAdded: '2024-11-26',
  },
  {
    id: 'nextjs-002',
    category: 'nextjs',
    title: 'useSearchParams Must Be Wrapped in Suspense Boundary',
    problem:
      'In Next.js 16, using the useSearchParams() hook in a client component without a Suspense boundary causes a build error during static generation.',
    errorMessages: [
      'useSearchParams() should be wrapped in a suspense boundary',
      'Error occurred prerendering page',
      'useSearchParams',
    ],
    solution: `Wrap the component that uses useSearchParams() in a Suspense boundary:

1. Extract the logic using useSearchParams into a separate component
2. Wrap that component with <Suspense fallback={...}>
3. Provide a loading skeleton as the fallback`,
    codeExample: `// Before (causes error)
export default function LoginPage() {
  const searchParams = useSearchParams(); // Error!
  return <div>...</div>;
}

// After (correct)
function LoginContent() {
  const searchParams = useSearchParams();
  return <div>...</div>;
}

function LoginSkeleton() {
  return <div className="animate-pulse">Loading...</div>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}`,
    relatedFiles: ['src/app/login/page.tsx'],
    tags: ['nextjs', 'useSearchParams', 'suspense', 'static-generation', 'next16', 'hooks'],
    dateAdded: '2024-11-26',
  },

  // ============================================
  // SUPABASE SOLUTIONS
  // ============================================
  {
    id: 'supabase-001',
    category: 'supabase',
    title: 'Supabase SSR Client Fails During Static Generation',
    problem:
      'When Next.js pre-renders pages during build, Supabase environment variables are not available, causing the @supabase/ssr createBrowserClient or createServerClient to throw an error.',
    errorMessages: [
      "@supabase/ssr: Your project's URL and API key are required",
      'Error occurred prerendering page',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ],
    solution: `Create a mock Supabase client that returns safe defaults when environment variables are not available:

1. Check if env vars exist before creating the client
2. If missing, return a mock client with no-op methods
3. The mock should match the Supabase client interface`,
    codeExample: `// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return mock client during static generation
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    } as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}`,
    relatedFiles: [
      'src/lib/database/supabase.ts',
    ],
    tags: ['supabase', 'ssr', 'static-generation', 'mock', 'environment-variables', 'prerender'],
    dateAdded: '2024-11-26',
  },

  // ============================================
  // TYPESCRIPT SOLUTIONS
  // ============================================
  {
    id: 'typescript-001',
    category: 'typescript',
    title: 'Implicit Any Type in Callback Parameters with Mock Clients',
    problem:
      'When using a mock Supabase client (for static generation), TypeScript cannot infer types for callback parameters like in onAuthStateChange, causing "implicit any" errors.',
    errorMessages: [
      "Parameter 'event' implicitly has an 'any' type",
      "Parameter 'newSession' implicitly has an 'any' type",
      'implicit any',
    ],
    solution: `Explicitly type the callback parameters instead of relying on type inference:`,
    codeExample: `// Before (causes error with mock client)
supabase.auth.onAuthStateChange(async (event, newSession) => {
  // Error: Parameter 'event' implicitly has an 'any' type
});

// After (explicit types)
import type { Session } from '@supabase/supabase-js';

supabase.auth.onAuthStateChange(
  async (_event: string, newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
  }
);`,
    tags: ['typescript', 'supabase', 'implicit-any', 'callbacks', 'type-inference'],
    dateAdded: '2024-11-26',
  },

  // ============================================
  // VERCEL DEPLOYMENT SOLUTIONS
  // ============================================
  {
    id: 'vercel-001',
    category: 'vercel',
    title: 'Vercel Build Fails Due to Missing Environment Variables',
    problem:
      'Vercel builds fail during static page generation when code assumes environment variables are always present. During prerendering, these variables may not be available.',
    errorMessages: [
      'Error occurred prerendering page',
      'Export encountered an error',
      'exiting the build',
    ],
    solution: `Implement graceful fallbacks for all code that uses environment variables:

1. Check if env vars exist before using them
2. Return mock/default values during prerendering
3. Real functionality activates at runtime when env vars are available

This applies to:
- Supabase clients (client.ts, server.ts)
- Middleware
- Any service that requires API keys`,
    tags: ['vercel', 'deployment', 'environment-variables', 'prerender', 'static-generation'],
    dateAdded: '2024-11-26',
  },

  // ============================================
  // AWS / CLOUDFORMATION SOLUTIONS
  // ============================================
  {
    id: 'aws-001',
    category: 'aws',
    title: 'AWS SDK Credentials Not Found in Next.js API Routes',
    problem:
      'AWS SDK cannot find credentials when running in Next.js API routes, even when environment variables are set.',
    errorMessages: [
      'CredentialsProviderError',
      'Could not load credentials from any providers',
      'Missing credentials in config',
    ],
    solution: `Explicitly pass credentials to AWS SDK clients instead of relying on default credential chain:`,
    codeExample: `import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

const client = new CloudFormationClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});`,
    relatedFiles: ['src/lib/aws/sdk-utils.ts'],
    tags: ['aws', 'sdk', 'credentials', 'cloudformation', 'nextjs', 'api-routes'],
    dateAdded: '2024-11-26',
  },
  {
    id: 'cloudformation-001',
    category: 'cloudformation',
    title: 'CloudFormation Template Validation Fails Silently',
    problem:
      'CloudFormation templates pass local validation but fail when deployed, often due to missing IAM permissions or invalid resource references.',
    errorMessages: [
      'Template validation error',
      'Resource does not exist',
      'Invalid parameter',
    ],
    solution: `Use AWS CLI to validate templates before deployment:

1. Use \`aws cloudformation validate-template\`
2. Check IAM permissions with Access Analyzer
3. Use \`cfn-lint\` for additional static analysis`,
    codeExample: `# Validate template
aws cloudformation validate-template --template-body file://template.yaml

# Use cfn-lint
cfn-lint template.yaml`,
    tags: ['cloudformation', 'validation', 'aws', 'iam', 'deployment'],
    dateAdded: '2024-11-26',
  },

  // ============================================
  // DATABASE SOLUTIONS
  // ============================================
  {
    id: 'database-001',
    category: 'database',
    title: 'First User Becomes Admin Pattern',
    problem:
      'When setting up a new application, the first user to sign up should automatically become an admin to bootstrap the system.',
    errorMessages: [],
    solution: `Use a database trigger to check if any users exist and assign admin role to the first user:`,
    codeExample: `-- In your Supabase migration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  new_role TEXT;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- First user becomes admin
  IF user_count = 0 THEN
    new_role := 'admin';
  ELSE
    new_role := 'user';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, github_username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name',
    new_role
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`,
    tags: ['database', 'admin', 'trigger', 'supabase', 'user-management', 'bootstrap'],
    dateAdded: '2024-11-26',
  },
];
