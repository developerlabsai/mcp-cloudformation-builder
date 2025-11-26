import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/database/supabase';

// Using supabase as supabaseAdmin (service role key has admin access)
const supabaseAdmin = supabase;

interface ScenarioContext {
  originalQuestion: string;
  cloudProvider: string;
  services: string[];
  complexity: string;
  clarifications: { question: string; answer: string }[];
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { scenarioContext, userId, email, sessionId } = await request.json();

    if (!scenarioContext) {
      return NextResponse.json(
        { error: 'Scenario context is required' },
        { status: 400 }
      );
    }

    // Update user profile with authentication event
    if (userId) {
      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: userId,
          email: email,
          conversion_stage: 'authenticated',
          last_login: new Date().toISOString(),
        }, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      // Track authentication event in conversion funnel
      if (sessionId) {
        await supabaseAdmin.from('conversion_funnel_events').insert({
          session_id: sessionId,
          user_id: userId,
          event_type: 'authenticated',
          email: email,
          metadata: {
            authenticated_via: 'magic_link',
            had_scenario_context: true,
          },
        });

        // Track magic link clicked event
        await supabaseAdmin.from('conversion_funnel_events').insert({
          session_id: sessionId,
          user_id: userId,
          event_type: 'magic_link_clicked',
          email: email,
        });
      }
    }

    // Step 1: Check cache for similar scenario
    const cacheResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scenarios/cache?question=${encodeURIComponent(scenarioContext.originalQuestion)}`,
      { method: 'GET' }
    );
    const cacheData = await cacheResponse.json();

    let terraformData;
    let documentationData;
    let scenarioId;

    if (cacheData.cacheHit && cacheData.scenario) {
      // Use cached scenario
      terraformData = {
        terraform: cacheData.scenario.terraform_modules,
        metadata: {
          provider: cacheData.scenario.cloud_provider,
          estimatedCostPerHour: cacheData.scenario.estimated_cost_per_hour,
          provisionTimeSeconds: cacheData.scenario.estimated_provision_time_seconds,
        },
        validationScript: cacheData.scenario.validation_scripts,
      };
      documentationData = {
        documentation: JSON.parse(cacheData.scenario.documentation_markdown),
        externalResources: cacheData.scenario.external_resources,
      };
      scenarioId = cacheData.scenario.id;
    } else {
      // Step 2: Generate Terraform
      const terraformResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate/terraform`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioContext }),
        }
      );
      terraformData = await terraformResponse.json();

      if (!terraformData.success) {
        throw new Error('Failed to generate Terraform');
      }

      // Step 3: Generate Documentation
      const docResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate/documentation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioContext,
            terraformMetadata: terraformData.metadata,
          }),
        }
      );
      documentationData = await docResponse.json();

      if (!documentationData.success) {
        throw new Error('Failed to generate documentation');
      }

      // Step 4: Cache the generated scenario
      const cacheStoreResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scenarios/cache`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userQuestion: scenarioContext.originalQuestion,
            clarifyingAnswers: scenarioContext.clarifications,
            terraformModules: terraformData.terraform,
            documentationMarkdown: JSON.stringify(documentationData.documentation),
            validationScripts: terraformData.validationScript,
            externalResources: documentationData.externalResources,
            cloudProvider: scenarioContext.cloudProvider,
            estimatedCostPerHour: terraformData.metadata?.estimatedCostPerHour,
            estimatedProvisionTimeSeconds: terraformData.metadata?.provisionTimeSeconds,
            complexityScore: scenarioContext.complexity === 'basic' ? 3 :
                           scenarioContext.complexity === 'intermediate' ? 6 : 9,
            userId,
          }),
        }
      );
      const cacheStoreData = await cacheStoreResponse.json();
      scenarioId = cacheStoreData.scenarioId;
    }

    // Step 5: Deploy to sandbox
    const deployResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sandbox/deploy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          duration: 60, // 60 minutes default
          scenarioId,
          scenarioContext,
          terraform: terraformData.terraform,
        }),
      }
    );
    const deployData = await deployResponse.json();

    if (!deployData.success && !deployData.sessionId) {
      throw new Error('Failed to deploy sandbox');
    }

    // Step 6: Log activity
    if (userId) {
      await supabaseAdmin.from('activity_logs').insert({
        user_id: userId,
        session_id: deployData.sessionId,
        action_type: 'scenario_generated',
        details: {
          question: scenarioContext.originalQuestion,
          cloudProvider: scenarioContext.cloudProvider,
          services: scenarioContext.services,
          cached: cacheData.cacheHit,
        },
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: deployData.sessionId,
      scenarioId,
      credentials: deployData.credentials,
      consoleUrl: deployData.consoleUrl,
      documentation: documentationData.documentation,
      externalResources: documentationData.externalResources,
      terraform: terraformData.terraform,
      metadata: {
        estimatedCostPerHour: terraformData.metadata?.estimatedCostPerHour || 0.5,
        provisionTimeSeconds: terraformData.metadata?.provisionTimeSeconds || 300,
        cached: cacheData.cacheHit,
      },
    });
  } catch (error) {
    console.error('Orchestration error:', error);
    return NextResponse.json(
      { error: 'Failed to orchestrate scenario' },
      { status: 500 }
    );
  }
}
