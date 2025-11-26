/**
 * Pattern Detection Service
 *
 * Analyzes feedback to identify recurring issues and patterns.
 * Clusters similar feedback items and calculates impact scores.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Feedback {
  id: string;
  type: string;
  category: string | null;
  sentiment: string | null;
  title: string | null;
  description: string;
  rating: number | null;
  status: string;
  priority: string;
  source: string;
  created_at: string;
  matched_keywords: string[] | null;
}

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

export class PatternDetector {
  /**
   * Analyze feedback from the last N days to detect patterns
   */
  async detectPatterns(days: number = 30): Promise<Pattern[]> {
    // Fetch recent feedback
    const { data: feedbacks, error } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .in('status', ['new', 'reviewed', 'in_progress']); // Don't analyze resolved/rejected

    if (error || !feedbacks) {
      console.error('Failed to fetch feedback for pattern detection:', error);
      return [];
    }

    // Group by category
    const categoryGroups = this.groupByCategory(feedbacks);

    // Detect patterns within each category
    const patterns: Pattern[] = [];
    for (const [category, items] of Object.entries(categoryGroups)) {
      const categoryPatterns = this.detectCategoryPatterns(category, items);
      patterns.push(...categoryPatterns);
    }

    // Sort by impact score
    patterns.sort((a, b) => b.impact_score - a.impact_score);

    return patterns;
  }

  /**
   * Group feedback by category
   */
  private groupByCategory(feedbacks: Feedback[]): Record<string, Feedback[]> {
    const groups: Record<string, Feedback[]> = {};

    for (const feedback of feedbacks) {
      const category = feedback.category || 'uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(feedback);
    }

    return groups;
  }

  /**
   * Detect patterns within a category
   */
  private detectCategoryPatterns(category: string, feedbacks: Feedback[]): Pattern[] {
    if (feedbacks.length < 2) {
      return []; // Need at least 2 items to form a pattern
    }

    // Cluster by keyword similarity
    const clusters = this.clusterByKeywords(feedbacks);

    const patterns: Pattern[] = [];
    for (const cluster of clusters) {
      if (cluster.length < 2) continue; // Skip single-item clusters

      const pattern = this.createPatternFromCluster(category, cluster);
      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Cluster feedback items by keyword similarity
   */
  private clusterByKeywords(feedbacks: Feedback[]): Feedback[][] {
    const clusters: Feedback[][] = [];
    const processed = new Set<string>();

    for (const feedback of feedbacks) {
      if (processed.has(feedback.id)) continue;

      const cluster: Feedback[] = [feedback];
      processed.add(feedback.id);

      const keywords = this.extractKeywords(feedback);

      // Find similar items
      for (const other of feedbacks) {
        if (processed.has(other.id)) continue;

        const otherKeywords = this.extractKeywords(other);
        const similarity = this.calculateKeywordSimilarity(keywords, otherKeywords);

        if (similarity >= 0.3) { // 30% similarity threshold
          cluster.push(other);
          processed.add(other.id);
        }
      }

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Extract keywords from feedback
   */
  private extractKeywords(feedback: Feedback): string[] {
    const text = `${feedback.title || ''} ${feedback.description}`.toLowerCase();

    // Use matched_keywords if available
    if (feedback.matched_keywords && feedback.matched_keywords.length > 0) {
      return feedback.matched_keywords.map(k => k.toLowerCase());
    }

    // Otherwise extract from text
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3); // Only words longer than 3 chars

    // Remove common stop words
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'when', 'where', 'what', 'which']);
    return words.filter(w => !stopWords.has(w));
  }

  /**
   * Calculate similarity between two keyword sets
   */
  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Create a pattern object from a cluster of feedback
   */
  private createPatternFromCluster(category: string, cluster: Feedback[]): Pattern {
    // Extract common keywords
    const allKeywords = cluster.flatMap(f => this.extractKeywords(f));
    const keywordCounts = new Map<string, number>();
    for (const keyword of allKeywords) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    }

    // Get keywords that appear in at least 50% of items
    const threshold = Math.ceil(cluster.length * 0.5);
    const commonKeywords = Array.from(keywordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([keyword, _]) => keyword)
      .slice(0, 10); // Top 10

    // Calculate sentiment breakdown
    const sentimentBreakdown = {
      positive: cluster.filter(f => f.sentiment === 'positive').length,
      negative: cluster.filter(f => f.sentiment === 'negative').length,
      neutral: cluster.filter(f => f.sentiment === 'neutral').length,
    };

    // Calculate average rating
    const ratingsOnly = cluster.filter(f => f.rating !== null).map(f => f.rating!);
    const avgRating = ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum, r) => sum + r, 0) / ratingsOnly.length
      : null;

    // Calculate impact score (1-100)
    const impactScore = this.calculateImpactScore(cluster, sentimentBreakdown, avgRating);

    // Identify affected component
    const affectedComponent = this.identifyAffectedComponent(cluster);

    // Generate issue description
    const issueDescription = this.generateIssueDescription(category, commonKeywords, cluster);

    return {
      issue_type: this.determineIssueType(cluster),
      issue_description: issueDescription,
      affected_component: affectedComponent,
      related_feedback_ids: cluster.map(f => f.id),
      occurrence_count: cluster.length,
      impact_score: impactScore,
      common_keywords: commonKeywords,
      categories: [category],
      sentiment_breakdown: sentimentBreakdown,
      avg_rating: avgRating,
      sources: [...new Set(cluster.map(f => f.source))],
    };
  }

  /**
   * Calculate impact score (1-100)
   */
  private calculateImpactScore(
    cluster: Feedback[],
    sentimentBreakdown: { positive: number; negative: number; neutral: number },
    avgRating: number | null
  ): number {
    let score = 0;

    // Frequency weight (0-40 points)
    score += Math.min(cluster.length * 5, 40);

    // Sentiment weight (0-30 points)
    const negativeRatio = sentimentBreakdown.negative / cluster.length;
    score += negativeRatio * 30;

    // Rating weight (0-20 points) - lower rating = higher impact
    if (avgRating !== null) {
      score += (5 - avgRating) * 4; // 1 star = 16 points, 5 stars = 0 points
    }

    // Priority weight (0-10 points)
    const criticalCount = cluster.filter(f => f.priority === 'critical').length;
    const highCount = cluster.filter(f => f.priority === 'high').length;
    score += (criticalCount * 5) + (highCount * 2);

    return Math.min(Math.round(score), 100);
  }

  /**
   * Identify affected component from feedback sources and keywords
   */
  private identifyAffectedComponent(cluster: Feedback[]): string | null {
    // Check for common components in keywords
    const componentKeywords = ['pricing', 'calculator', 'dashboard', 'authentication', 'login', 'signup', 'docs', 'documentation', 'marketplace'];

    for (const keyword of componentKeywords) {
      const count = cluster.filter(f =>
        this.extractKeywords(f).includes(keyword)
      ).length;

      if (count >= cluster.length * 0.5) {
        return keyword;
      }
    }

    return null;
  }

  /**
   * Generate human-readable issue description
   */
  private generateIssueDescription(category: string, keywords: string[], cluster: Feedback[]): string {
    const keywordList = keywords.slice(0, 5).join(', ');
    const count = cluster.length;

    if (keywords.length > 0) {
      return `${count} users reported issues related to ${category} involving: ${keywordList}`;
    } else {
      return `${count} users reported issues in the ${category} category`;
    }
  }

  /**
   * Determine issue type from cluster
   */
  private determineIssueType(cluster: Feedback[]): string {
    // Count feedback types
    const typeCounts = new Map<string, number>();
    for (const feedback of cluster) {
      typeCounts.set(feedback.type, (typeCounts.get(feedback.type) || 0) + 1);
    }

    // Get most common type
    const mostCommonType = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    // Map to issue types
    const issueTypeMap: Record<string, string> = {
      'issue': 'bug',
      'feature_request': 'feature_gap',
      'question': 'documentation_gap',
      'testimonial': 'positive_feedback',
      'use_case': 'use_case_pattern',
    };

    return issueTypeMap[mostCommonType] || 'general_issue';
  }
}

export const patternDetector = new PatternDetector();
