/**
 * Auto-Fix Proposal Generator
 *
 * Generates actionable fix proposals based on detected patterns.
 * Includes confidence scoring and detailed change suggestions.
 */

import supabase from '@/lib/database/supabase';
import { patternDetector } from '@/lib/self-healing/pattern-detector';

// Using service role key client as admin
const supabaseAdmin = supabase;

interface Pattern {
  issue_type: string;
  issue_description: string;
  affected_component: string | null;
  related_feedback_ids: string[];
  occurrence_count: number;
  impact_score: number;
  common_keywords: string[];
  categories: string[];
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  avg_rating: number | null;
  sources: string[];
}

interface AutoFix {
  issue_type: string;
  issue_description: string;
  affected_component: string | null;
  fix_type: string;
  fix_description: string;
  proposed_changes: any;
  related_feedback_ids: string[];
  occurrence_count: number;
  impact_score: number;
  confidence_score: number;
}

export class AutoFixGenerator {
  /**
   * Generate auto-fix proposals from detected patterns
   */
  async generateFixes(days: number = 30): Promise<AutoFix[]> {
    // Detect patterns
    const patterns = await patternDetector.detectPatterns(days);

    // Generate fixes for high-impact patterns
    const fixes: AutoFix[] = [];
    for (const pattern of patterns) {
      // Only generate fixes for patterns with impact score >= 30
      if (pattern.impact_score >= 30) {
        const fix = this.generateFixForPattern(pattern);
        if (fix) {
          fixes.push(fix);
        }
      }
    }

    return fixes;
  }

  /**
   * Generate a fix proposal for a specific pattern
   */
  private generateFixForPattern(pattern: Pattern): AutoFix | null {
    const { issue_type, categories, affected_component, common_keywords } = pattern;
    const category = categories[0];

    // Generate fix based on issue type and category
    let fixType: string;
    let fixDescription: string;
    let proposedChanges: any;
    let confidenceScore: number;

    // Documentation gaps
    if (issue_type === 'documentation_gap' || category === 'documentation') {
      fixType = 'documentation_update';
      fixDescription = this.generateDocumentationFix(pattern);
      proposedChanges = {
        action: 'create_documentation',
        topic: affected_component || common_keywords.join(' '),
        keywords: common_keywords,
        suggested_sections: this.suggestDocSections(common_keywords),
      };
      confidenceScore = this.calculateConfidence(pattern, 'documentation');
    }
    // Pricing issues
    else if (category === 'pricing') {
      fixType = 'content_update';
      fixDescription = this.generatePricingFix(pattern);
      proposedChanges = {
        action: 'update_pricing_calculator',
        component: 'PricingCalculator',
        improvements: this.suggestPricingImprovements(common_keywords),
      };
      confidenceScore = this.calculateConfidence(pattern, 'pricing');
    }
    // UI/UX issues
    else if (category === 'ui_ux') {
      fixType = 'ux_improvement';
      fixDescription = this.generateUXFix(pattern);
      proposedChanges = {
        action: 'improve_ux',
        component: affected_component,
        improvements: this.suggestUXImprovements(common_keywords),
      };
      confidenceScore = this.calculateConfidence(pattern, 'ui_ux');
    }
    // Performance issues
    else if (category === 'performance') {
      fixType = 'performance_optimization';
      fixDescription = this.generatePerformanceFix(pattern);
      proposedChanges = {
        action: 'optimize_performance',
        component: affected_component,
        optimizations: this.suggestPerformanceOptimizations(common_keywords),
      };
      confidenceScore = this.calculateConfidence(pattern, 'performance');
    }
    // Feature requests
    else if (issue_type === 'feature_gap') {
      fixType = 'feature_request';
      fixDescription = this.generateFeatureFix(pattern);
      proposedChanges = {
        action: 'add_feature',
        feature_name: common_keywords.slice(0, 3).join(' '),
        requirements: this.extractFeatureRequirements(pattern),
      };
      confidenceScore = this.calculateConfidence(pattern, 'feature');
    }
    // Authentication issues
    else if (category === 'authentication') {
      fixType = 'auth_improvement';
      fixDescription = this.generateAuthFix(pattern);
      proposedChanges = {
        action: 'improve_authentication',
        improvements: this.suggestAuthImprovements(common_keywords),
      };
      confidenceScore = this.calculateConfidence(pattern, 'authentication');
    }
    // General bugs
    else if (issue_type === 'bug') {
      fixType = 'bug_fix';
      fixDescription = this.generateBugFix(pattern);
      proposedChanges = {
        action: 'fix_bug',
        component: affected_component,
        investigation_needed: true,
        keywords: common_keywords,
      };
      confidenceScore = this.calculateConfidence(pattern, 'bug');
    }
    else {
      // Unknown pattern type
      return null;
    }

    return {
      issue_type: pattern.issue_type,
      issue_description: pattern.issue_description,
      affected_component: pattern.affected_component,
      fix_type: fixType,
      fix_description: fixDescription,
      proposed_changes: proposedChanges,
      related_feedback_ids: pattern.related_feedback_ids,
      occurrence_count: pattern.occurrence_count,
      impact_score: pattern.impact_score,
      confidence_score: confidenceScore,
    };
  }

  /**
   * Generate documentation fix description
   */
  private generateDocumentationFix(pattern: Pattern): string {
    const { occurrence_count, common_keywords } = pattern;
    const topic = common_keywords.slice(0, 3).join(', ');
    return `Create comprehensive documentation for ${topic}. ${occurrence_count} users have asked questions about this topic.`;
  }

  /**
   * Suggest documentation sections
   */
  private suggestDocSections(keywords: string[]): string[] {
    const sections = ['Overview', 'Getting Started'];

    if (keywords.some(k => ['how', 'setup', 'install', 'configure'].includes(k))) {
      sections.push('Setup & Configuration');
    }
    if (keywords.some(k => ['example', 'sample', 'tutorial'].includes(k))) {
      sections.push('Examples & Tutorials');
    }
    if (keywords.some(k => ['troubleshoot', 'error', 'issue', 'problem'].includes(k))) {
      sections.push('Troubleshooting');
    }

    sections.push('API Reference', 'Best Practices');
    return sections;
  }

  /**
   * Generate pricing fix description
   */
  private generatePricingFix(pattern: Pattern): string {
    const { occurrence_count, common_keywords } = pattern;
    return `Improve pricing calculator clarity and accuracy. ${occurrence_count} users reported confusion about: ${common_keywords.slice(0, 3).join(', ')}.`;
  }

  /**
   * Suggest pricing improvements
   */
  private suggestPricingImprovements(keywords: string[]): string[] {
    const improvements: string[] = [];

    if (keywords.some(k => ['confus', 'unclear', 'understand'].includes(k))) {
      improvements.push('Add tooltips explaining each pricing parameter');
      improvements.push('Include real-world usage examples');
    }
    if (keywords.some(k => ['inaccurate', 'wrong', 'incorrect'].includes(k))) {
      improvements.push('Verify pricing formulas against AWS documentation');
      improvements.push('Add disclaimer about estimate accuracy');
    }
    if (keywords.some(k => ['calculator', 'estimate'].includes(k))) {
      improvements.push('Make calculator more interactive and visual');
      improvements.push('Add comparison with other configurations');
    }

    return improvements.length > 0 ? improvements : ['Review and improve pricing calculator UX'];
  }

  /**
   * Generate UX fix description
   */
  private generateUXFix(pattern: Pattern): string {
    const { occurrence_count, affected_component, common_keywords } = pattern;
    const component = affected_component || 'interface';
    return `Improve ${component} user experience. ${occurrence_count} users reported: ${common_keywords.slice(0, 3).join(', ')}.`;
  }

  /**
   * Suggest UX improvements
   */
  private suggestUXImprovements(keywords: string[]): string[] {
    const improvements: string[] = [];

    if (keywords.some(k => ['confusing', 'unclear', 'hard'].includes(k))) {
      improvements.push('Simplify interface layout');
      improvements.push('Add contextual help and tooltips');
    }
    if (keywords.some(k => ['button', 'click', 'action'].includes(k))) {
      improvements.push('Make action buttons more prominent');
      improvements.push('Add clear button labels and icons');
    }
    if (keywords.some(k => ['navigation', 'find', 'locate'].includes(k))) {
      improvements.push('Improve navigation structure');
      improvements.push('Add search functionality');
    }

    return improvements.length > 0 ? improvements : ['Conduct UX review and usability testing'];
  }

  /**
   * Generate performance fix description
   */
  private generatePerformanceFix(pattern: Pattern): string {
    const { occurrence_count, affected_component } = pattern;
    const component = affected_component || 'application';
    return `Optimize ${component} performance. ${occurrence_count} users reported slowness or timeout issues.`;
  }

  /**
   * Suggest performance optimizations
   */
  private suggestPerformanceOptimizations(keywords: string[]): string[] {
    const optimizations: string[] = [];

    if (keywords.some(k => ['slow', 'loading'].includes(k))) {
      optimizations.push('Implement caching strategy');
      optimizations.push('Optimize database queries');
      optimizations.push('Add loading indicators');
    }
    if (keywords.some(k => ['timeout', 'hang'].includes(k))) {
      optimizations.push('Increase timeout limits');
      optimizations.push('Implement request retries');
    }

    return optimizations.length > 0 ? optimizations : ['Profile and optimize performance bottlenecks'];
  }

  /**
   * Generate feature fix description
   */
  private generateFeatureFix(pattern: Pattern): string {
    const { occurrence_count, common_keywords } = pattern;
    const feature = common_keywords.slice(0, 3).join(' ');
    return `Consider adding: ${feature}. ${occurrence_count} users have requested this functionality.`;
  }

  /**
   * Extract feature requirements from pattern
   */
  private extractFeatureRequirements(pattern: Pattern): string[] {
    return [
      `Requested by ${pattern.occurrence_count} users`,
      `Keywords: ${pattern.common_keywords.join(', ')}`,
      'Analyze feedback details for specific requirements',
      'Create technical specification',
      'Estimate development effort',
    ];
  }

  /**
   * Generate auth fix description
   */
  private generateAuthFix(pattern: Pattern): string {
    const { occurrence_count, common_keywords } = pattern;
    return `Improve authentication flow. ${occurrence_count} users reported issues with: ${common_keywords.slice(0, 3).join(', ')}.`;
  }

  /**
   * Suggest auth improvements
   */
  private suggestAuthImprovements(keywords: string[]): string[] {
    const improvements: string[] = [];

    if (keywords.some(k => ['login', 'signin'].includes(k))) {
      improvements.push('Simplify login process');
      improvements.push('Add social login options');
    }
    if (keywords.some(k => ['password', 'reset', 'forgot'].includes(k))) {
      improvements.push('Improve password reset flow');
      improvements.push('Add password strength indicator');
    }
    if (keywords.some(k => ['signup', 'register'].includes(k))) {
      improvements.push('Streamline signup process');
      improvements.push('Add email verification');
    }

    return improvements.length > 0 ? improvements : ['Review authentication flow and error messaging'];
  }

  /**
   * Generate bug fix description
   */
  private generateBugFix(pattern: Pattern): string {
    const { occurrence_count, affected_component, common_keywords } = pattern;
    const component = affected_component || 'component';
    return `Fix bug in ${component}. ${occurrence_count} users reported: ${common_keywords.slice(0, 3).join(', ')}.`;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(pattern: Pattern, fixCategory: string): number {
    let confidence = 50; // Base confidence

    // Frequency boost (0-20 points)
    confidence += Math.min(pattern.occurrence_count * 2, 20);

    // Category match boost (0-15 points)
    if (pattern.categories.includes(fixCategory)) {
      confidence += 15;
    }

    // Keyword clarity boost (0-15 points)
    if (pattern.common_keywords.length >= 3) {
      confidence += 15;
    } else if (pattern.common_keywords.length >= 1) {
      confidence += 7;
    }

    // Impact score correlation (0-10 points)
    confidence += Math.min(pattern.impact_score / 10, 10);

    return Math.min(Math.round(confidence), 100);
  }

  /**
   * Save auto-fix proposals to database
   */
  async saveAutoFixes(fixes: AutoFix[]): Promise<void> {
    for (const fix of fixes) {
      // Check if similar fix already exists
      const { data: existing } = await supabaseAdmin
        .from('auto_fixes')
        .select('id')
        .eq('issue_type', fix.issue_type)
        .eq('affected_component', fix.affected_component)
        .in('status', ['proposed', 'pending_review'])
        .single();

      if (existing) {
        // Update existing fix with new occurrence count
        await supabaseAdmin
          .from('auto_fixes')
          .update({
            occurrence_count: fix.occurrence_count,
            impact_score: fix.impact_score,
            related_feedback_ids: fix.related_feedback_ids,
          })
          .eq('id', existing.id);
      } else {
        // Create new fix proposal
        await supabaseAdmin
          .from('auto_fixes')
          .insert({
            issue_type: fix.issue_type,
            issue_description: fix.issue_description,
            affected_component: fix.affected_component,
            fix_type: fix.fix_type,
            fix_description: fix.fix_description,
            proposed_changes: fix.proposed_changes,
            related_feedback_ids: fix.related_feedback_ids,
            occurrence_count: fix.occurrence_count,
            impact_score: fix.impact_score,
            confidence_score: fix.confidence_score,
            status: 'proposed',
          });
      }
    }
  }
}

export const autoFixGenerator = new AutoFixGenerator();
