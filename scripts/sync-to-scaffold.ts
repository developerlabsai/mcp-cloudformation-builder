/**
 * Sync to Scaffold Script
 *
 * Pushes components, commands, and KB entries to the DeveloperLabs Scaffold
 * so they're available for all new projects.
 *
 * Usage: npx ts-node scripts/sync-to-scaffold.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const SCAFFOLD_API_URL = process.env.SCAFFOLD_API_URL || 'https://developerlabs-scaffold.vercel.app';
const SCAFFOLD_API_TOKEN = process.env.SCAFFOLD_API_TOKEN;

interface SyncResult {
  success: boolean;
  synced: string[];
  failed: string[];
  message?: string;
}

async function syncComponent(component: {
  name: string;
  description: string;
  category: string;
  code: string;
  dependencies: string[];
  tags: string[];
}): Promise<SyncResult> {
  const url = `${SCAFFOLD_API_URL}/api/library/components`;
  console.log(`    Syncing to: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SCAFFOLD_API_TOKEN}`,
      },
      body: JSON.stringify({
        ...component,
        sourceProject: 'mcp-cloudformation-builder',
      }),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText || `HTTP ${response.status}` };
    }

    if (!response.ok) {
      console.log(`    Response: ${response.status} - ${responseText.substring(0, 200)}`);
      return {
        success: false,
        synced: [],
        failed: [component.name],
        message: responseData.message || responseData.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      synced: [component.name],
      failed: [],
    };
  } catch (error) {
    console.log(`    Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return {
      success: false,
      synced: [],
      failed: [component.name],
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}

async function syncCommand(command: {
  name: string;
  description: string;
  content: string;
  category: string;
}): Promise<SyncResult> {
  try {
    const response = await fetch(`${SCAFFOLD_API_URL}/api/library/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SCAFFOLD_API_TOKEN}`,
      },
      body: JSON.stringify({
        ...command,
        sourceProject: 'mcp-cloudformation-builder',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        synced: [],
        failed: [command.name],
        message: error.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      synced: [command.name],
      failed: [],
    };
  } catch (error) {
    return {
      success: false,
      synced: [],
      failed: [command.name],
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}

async function main() {
  console.log('🚀 Syncing to DeveloperLabs Scaffold...\n');

  if (!SCAFFOLD_API_TOKEN) {
    console.error('❌ SCAFFOLD_API_TOKEN not set. Please set it in .env.local');
    process.exit(1);
  }

  const results = {
    components: { synced: [] as string[], failed: [] as string[] },
    commands: { synced: [] as string[], failed: [] as string[] },
  };

  // ========================================
  // 1. SYNC COMPONENTS
  // ========================================
  console.log('📦 Syncing components...\n');

  // Component Validator
  const validatorCode = fs.readFileSync(
    path.join(__dirname, '../src/lib/component-validator/index.ts'),
    'utf-8'
  );

  const componentValidator = await syncComponent({
    name: 'component-validator',
    description: 'Validates and auto-fixes component code before saving. Includes Prettier formatting, syntax checking, and quality status tracking.',
    category: 'utility',
    code: validatorCode,
    dependencies: ['prettier'],
    tags: ['validation', 'prettier', 'formatting', 'quality', 'auto-fix', 'typescript'],
  });

  if (componentValidator.success) {
    results.components.synced.push('component-validator');
    console.log('  ✅ component-validator');
  } else {
    results.components.failed.push('component-validator');
    console.log(`  ❌ component-validator: ${componentValidator.message}`);
  }

  // Scaffold Sync
  const scaffoldSyncCode = fs.readFileSync(
    path.join(__dirname, '../src/lib/scaffold-sync/index.ts'),
    'utf-8'
  );

  const scaffoldSync = await syncComponent({
    name: 'scaffold-sync',
    description: 'Syncs KB entries, components, and commands back to the DeveloperLabs Scaffold for cross-project reuse.',
    category: 'utility',
    code: scaffoldSyncCode,
    dependencies: [],
    tags: ['sync', 'scaffold', 'knowledgebase', 'components', 'reuse'],
  });

  if (scaffoldSync.success) {
    results.components.synced.push('scaffold-sync');
    console.log('  ✅ scaffold-sync');
  } else {
    results.components.failed.push('scaffold-sync');
    console.log(`  ❌ scaffold-sync: ${scaffoldSync.message}`);
  }

  // Knowledge Base
  const kbIndexCode = fs.readFileSync(
    path.join(__dirname, '../src/lib/knowledgebase/index.ts'),
    'utf-8'
  );

  const kbIndex = await syncComponent({
    name: 'knowledgebase-system',
    description: 'Knowledge base system for storing and searching solutions discovered during development.',
    category: 'utility',
    code: kbIndexCode,
    dependencies: [],
    tags: ['knowledgebase', 'kb', 'solutions', 'search', 'errors'],
  });

  if (kbIndex.success) {
    results.components.synced.push('knowledgebase-system');
    console.log('  ✅ knowledgebase-system');
  } else {
    results.components.failed.push('knowledgebase-system');
    console.log(`  ❌ knowledgebase-system: ${kbIndex.message}`);
  }

  // ========================================
  // 2. SYNC CLAUDE COMMANDS
  // ========================================
  console.log('\n📜 Syncing Claude commands...\n');

  const commandsDir = path.join(__dirname, '../.claude/commands');
  const commandFiles = ['kb-add.md', 'component-add.md'];

  for (const file of commandFiles) {
    const filePath = path.join(commandsDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  ${file} not found, skipping`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const name = file.replace('.md', '');

    const result = await syncCommand({
      name,
      description: name === 'kb-add'
        ? 'Capture a solution to the knowledge base after solving a problem'
        : 'Register a reusable component to the library',
      content,
      category: 'workflow',
    });

    if (result.success) {
      results.commands.synced.push(name);
      console.log(`  ✅ ${name}`);
    } else {
      results.commands.failed.push(name);
      console.log(`  ❌ ${name}: ${result.message}`);
    }
  }

  // ========================================
  // 3. SUMMARY
  // ========================================
  console.log('\n========================================');
  console.log('📊 SYNC SUMMARY');
  console.log('========================================\n');

  console.log(`Components: ${results.components.synced.length} synced, ${results.components.failed.length} failed`);
  console.log(`Commands:   ${results.commands.synced.length} synced, ${results.commands.failed.length} failed`);

  const totalSynced = results.components.synced.length + results.commands.synced.length;
  const totalFailed = results.components.failed.length + results.commands.failed.length;

  if (totalFailed === 0) {
    console.log('\n✅ All items synced successfully!');
  } else {
    console.log(`\n⚠️  ${totalFailed} item(s) failed to sync`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
