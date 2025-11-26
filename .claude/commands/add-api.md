# Add API Endpoint

Create a new Next.js API route.

## Arguments:
$ARGUMENTS - Endpoint path and description (e.g., "/api/templates list all templates")

## Steps:
1. Parse endpoint path from arguments
2. Create route file in `src/app/api/{path}/route.ts`
3. Include:
   - Input validation with Zod
   - Proper error handling
   - TypeScript types
   - Supabase client if database needed
4. Add to test-api.sh if exists
5. Show the created endpoint

## Template:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  // Define input schema
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RequestSchema.parse(body);

    // Implementation

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```
