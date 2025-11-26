import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Feedback {
  id: string;
  type: string;
  category: string;
  sentiment: string;
  title: string;
  description: string;
  rating: number | null;
  priority: string;
  status: string;
  created_at: string;
}

interface TopIssue {
  category: string;
  count: number;
  impact: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  sample_feedback: string[];
  avg_priority_score: number;
}

interface BlogPostIdea {
  title: string;
  description: string;
  priority: string;
  keywords: string[];
  target_audience: string;
  estimated_traffic: string;
  related_feedback_ids: string[];
  content_outline: string[];
}

interface UseCase {
  title: string;
  description: string;
  industry: string;
  company_size: string;
  benefits: string[];
  testimonial_quote: string;
  related_feedback_ids: string[];
}

interface TrendData {
  category: string;
  current_period_count: number;
  previous_period_count: number;
  change_percentage: number;
  sentiment_trend: string; // 'improving', 'declining', 'stable'
  avg_rating_current: number | null;
  avg_rating_previous: number | null;
}

interface IntelligenceReport {
  report_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  summary: string;
  top_issues: TopIssue[];
  recommended_fixes: any[];
  blog_post_ideas: BlogPostIdea[];
  use_cases: UseCase[];
  trend_analysis: TrendData[];
  total_feedback_count: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  category_breakdown: Record<string, number>;
}

export class IntelligenceReportGenerator {
  /**
   * Generate a weekly or monthly intelligence report
   */
  async generateReport(reportType: 'weekly' | 'monthly'): Promise<IntelligenceReport> {
    const { periodStart, periodEnd } = this.calculatePeriod(reportType);

    // Fetch feedback for the period
    const { data: feedbacks, error } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());

    if (error) {
      throw new Error(`Failed to fetch feedback: ${error.message}`);
    }

    if (!feedbacks || feedbacks.length === 0) {
      return this.createEmptyReport(reportType, periodStart, periodEnd);
    }

    // Generate all report sections
    const topIssues = this.analyzeTopIssues(feedbacks);
    const blogPostIdeas = await this.generateBlogPostIdeas(feedbacks);
    const useCases = this.compileUseCases(feedbacks);
    const trendAnalysis = await this.analyzeTrends(feedbacks, periodStart, reportType);
    const summary = this.generateSummary(feedbacks, topIssues, blogPostIdeas);

    // Calculate breakdowns
    const sentimentBreakdown = this.calculateSentimentBreakdown(feedbacks);
    const categoryBreakdown = this.calculateCategoryBreakdown(feedbacks);

    return {
      report_type: reportType,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      summary,
      top_issues: topIssues.slice(0, 10),
      recommended_fixes: [], // Will be populated from auto_fixes table
      blog_post_ideas: blogPostIdeas.slice(0, 5),
      use_cases: useCases.slice(0, 3),
      trend_analysis: trendAnalysis,
      total_feedback_count: feedbacks.length,
      sentiment_breakdown: sentimentBreakdown,
      category_breakdown: categoryBreakdown,
    };
  }

  /**
   * Save report to database
   */
  async saveReport(report: IntelligenceReport): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('intelligence_reports')
      .insert({
        report_type: report.report_type,
        period_start: report.period_start,
        period_end: report.period_end,
        executive_summary: report.summary,
        top_issues: report.top_issues,
        recommended_fixes: report.recommended_fixes,
        blog_post_ideas: report.blog_post_ideas,
        use_cases: report.use_cases,
        trend_analysis: report.trend_analysis,
        total_feedback_count: report.total_feedback_count,
        sentiment_breakdown: report.sentiment_breakdown,
        category_breakdown: report.category_breakdown,
        status: 'draft',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save report: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Calculate report period based on type
   */
  private calculatePeriod(reportType: 'weekly' | 'monthly'): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    const periodEnd = new Date(now);
    let periodStart: Date;

    if (reportType === 'weekly') {
      // Last 7 days
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 7);
    } else {
      // Last 30 days
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 30);
    }

    return { periodStart, periodEnd };
  }

  /**
   * Analyze top issues by category and impact
   */
  private analyzeTopIssues(feedbacks: Feedback[]): TopIssue[] {
    const issuesOnly = feedbacks.filter(f =>
      f.type === 'issue' || f.sentiment === 'negative'
    );

    // Group by category
    const categoryGroups = this.groupByCategory(issuesOnly);

    const topIssues: TopIssue[] = [];

    for (const [category, items] of Object.entries(categoryGroups)) {
      const sentimentBreakdown = {
        positive: items.filter(f => f.sentiment === 'positive').length,
        negative: items.filter(f => f.sentiment === 'negative').length,
        neutral: items.filter(f => f.sentiment === 'neutral').length,
      };

      // Calculate impact score
      const impact = this.calculateImpactScore(items, sentimentBreakdown);

      // Get sample feedback
      const sampleFeedback = items
        .slice(0, 3)
        .map(f => f.title || f.description.substring(0, 100));

      // Calculate average priority score
      const priorityScores = items.map(f => this.getPriorityScore(f.priority));
      const avgPriorityScore = priorityScores.reduce((a, b) => a + b, 0) / priorityScores.length;

      topIssues.push({
        category: category || 'uncategorized',
        count: items.length,
        impact,
        sentiment_breakdown: sentimentBreakdown,
        sample_feedback: sampleFeedback,
        avg_priority_score: Math.round(avgPriorityScore),
      });
    }

    // Sort by impact
    return topIssues.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Generate blog post ideas based on common questions and issues
   */
  private async generateBlogPostIdeas(feedbacks: Feedback[]): Promise<BlogPostIdea[]> {
    // Find questions and feature requests
    const questions = feedbacks.filter(f => f.type === 'question');
    const featureRequests = feedbacks.filter(f => f.type === 'feature_request');

    // Group questions by topic
    const questionsByTopic = this.groupByCategory(questions);

    const blogIdeas: BlogPostIdea[] = [];

    // Generate ideas from common questions
    for (const [category, items] of Object.entries(questionsByTopic)) {
      if (items.length < 2) continue; // Skip topics with only 1 question

      const keywords = this.extractCommonKeywords(items);
      const idea = this.createBlogPostIdea(category, items, keywords, 'question');
      blogIdeas.push(idea);
    }

    // Generate ideas from feature requests
    const featuresByCategory = this.groupByCategory(featureRequests);
    for (const [category, items] of Object.entries(featuresByCategory)) {
      if (items.length < 3) continue; // Skip features with low demand

      const keywords = this.extractCommonKeywords(items);
      const idea = this.createBlogPostIdea(category, items, keywords, 'feature');
      blogIdeas.push(idea);
    }

    // Sort by priority
    return blogIdeas.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
             (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    });
  }

  /**
   * Create a blog post idea from feedback items
   */
  private createBlogPostIdea(
    category: string,
    items: Feedback[],
    keywords: string[],
    type: 'question' | 'feature'
  ): BlogPostIdea {
    const relatedIds = items.map(f => f.id);

    let title: string;
    let description: string;
    let priority: string;
    let targetAudience: string;
    let contentOutline: string[];

    if (type === 'question') {
      title = this.generateQuestionBasedTitle(category, keywords);
      description = `Answer common questions about ${category} based on ${items.length} customer inquiries`;
      targetAudience = 'Users asking about ' + category;
      contentOutline = [
        'Introduction: Why this matters',
        'Common Questions Answered',
        'Step-by-Step Guide',
        'Best Practices',
        'Troubleshooting Common Issues',
        'Conclusion & Next Steps',
      ];
    } else {
      title = this.generateFeatureBasedTitle(category, keywords);
      description = `Explore requested ${category} features based on ${items.length} customer requests`;
      targetAudience = 'Users interested in ' + category;
      contentOutline = [
        'Introduction: What users are asking for',
        'Current Solutions',
        'Requested Features',
        'Workarounds & Tips',
        'Future Roadmap',
        'How to Request Features',
      ];
    }

    // Determine priority based on count and sentiment
    if (items.length >= 10) {
      priority = 'high';
    } else if (items.length >= 5) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    return {
      title,
      description,
      priority,
      keywords: keywords.slice(0, 10),
      target_audience: targetAudience,
      estimated_traffic: this.estimateTraffic(items.length, keywords),
      related_feedback_ids: relatedIds,
      content_outline: contentOutline,
    };
  }

  /**
   * Compile use cases from testimonials and positive feedback
   */
  private compileUseCases(feedbacks: Feedback[]): UseCase[] {
    const testimonials = feedbacks.filter(f =>
      f.type === 'testimonial' ||
      f.type === 'use_case' ||
      (f.sentiment === 'positive' && f.rating && f.rating >= 4)
    );

    const useCasesByPattern = this.groupByKeywordSimilarity(testimonials);

    const useCases: UseCase[] = [];

    for (const items of useCasesByPattern) {
      if (items.length < 2) continue; // Need at least 2 similar testimonials

      const keywords = this.extractCommonKeywords(items);
      const bestTestimonial = items.reduce((prev, current) =>
        (current.rating || 0) > (prev.rating || 0) ? current : prev
      );

      useCases.push({
        title: this.generateUseCaseTitle(keywords),
        description: this.generateUseCaseDescription(items),
        industry: this.inferIndustry(items),
        company_size: this.inferCompanySize(items),
        benefits: this.extractBenefits(items),
        testimonial_quote: bestTestimonial.description,
        related_feedback_ids: items.map(f => f.id),
      });
    }

    return useCases;
  }

  /**
   * Analyze trends compared to previous period
   */
  private async analyzeTrends(
    currentFeedbacks: Feedback[],
    periodStart: Date,
    reportType: 'weekly' | 'monthly'
  ): Promise<TrendData[]> {
    // Calculate previous period
    const periodLength = reportType === 'weekly' ? 7 : 30;
    const previousStart = new Date(periodStart);
    previousStart.setDate(previousStart.getDate() - periodLength);
    const previousEnd = new Date(periodStart);

    // Fetch previous period feedback
    const { data: previousFeedbacks } = await supabaseAdmin
      .from('feedback')
      .select('*')
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', previousEnd.toISOString());

    if (!previousFeedbacks) {
      return [];
    }

    // Group both periods by category
    const currentByCategory = this.groupByCategory(currentFeedbacks);
    const previousByCategory = this.groupByCategory(previousFeedbacks || []);

    const trends: TrendData[] = [];

    // Get all categories from both periods
    const allCategories = new Set([
      ...Object.keys(currentByCategory),
      ...Object.keys(previousByCategory),
    ]);

    for (const category of allCategories) {
      const currentItems = currentByCategory[category] || [];
      const previousItems = previousByCategory[category] || [];

      const currentCount = currentItems.length;
      const previousCount = previousItems.length;

      // Calculate change percentage
      const changePercentage = previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : 100;

      // Calculate sentiment trend
      const currentNegative = currentItems.filter(f => f.sentiment === 'negative').length;
      const previousNegative = previousItems.filter(f => f.sentiment === 'negative').length;
      const currentNegativeRatio = currentCount > 0 ? currentNegative / currentCount : 0;
      const previousNegativeRatio = previousCount > 0 ? previousNegative / previousCount : 0;

      let sentimentTrend: string;
      if (currentNegativeRatio < previousNegativeRatio - 0.1) {
        sentimentTrend = 'improving';
      } else if (currentNegativeRatio > previousNegativeRatio + 0.1) {
        sentimentTrend = 'declining';
      } else {
        sentimentTrend = 'stable';
      }

      // Calculate average ratings
      const currentRatings = currentItems.filter(f => f.rating).map(f => f.rating!);
      const previousRatings = previousItems.filter(f => f.rating).map(f => f.rating!);

      const avgRatingCurrent = currentRatings.length > 0
        ? currentRatings.reduce((a, b) => a + b, 0) / currentRatings.length
        : null;

      const avgRatingPrevious = previousRatings.length > 0
        ? previousRatings.reduce((a, b) => a + b, 0) / previousRatings.length
        : null;

      trends.push({
        category: category || 'uncategorized',
        current_period_count: currentCount,
        previous_period_count: previousCount,
        change_percentage: changePercentage,
        sentiment_trend: sentimentTrend,
        avg_rating_current: avgRatingCurrent,
        avg_rating_previous: avgRatingPrevious,
      });
    }

    // Sort by absolute change percentage
    return trends.sort((a, b) =>
      Math.abs(b.change_percentage) - Math.abs(a.change_percentage)
    );
  }

  /**
   * Generate executive summary
   */
  private generateSummary(
    feedbacks: Feedback[],
    topIssues: TopIssue[],
    blogIdeas: BlogPostIdea[]
  ): string {
    const totalFeedback = feedbacks.length;
    const issueCount = feedbacks.filter(f => f.type === 'issue').length;
    const testimonialCount = feedbacks.filter(f => f.type === 'testimonial').length;
    const questionCount = feedbacks.filter(f => f.type === 'question').length;

    const topIssue = topIssues[0];
    const topBlogIdea = blogIdeas[0];

    let summary = `Received ${totalFeedback} feedback submissions this period. `;

    if (issueCount > 0) {
      summary += `${issueCount} issues reported, `;
    }
    if (questionCount > 0) {
      summary += `${questionCount} questions asked, `;
    }
    if (testimonialCount > 0) {
      summary += `${testimonialCount} testimonials shared. `;
    }

    if (topIssue) {
      summary += `\n\nTop issue: ${topIssue.category} (${topIssue.count} reports, impact score: ${topIssue.impact}/100). `;
    }

    if (topBlogIdea) {
      summary += `\n\nRecommended content: "${topBlogIdea.title}" to address ${topBlogIdea.related_feedback_ids.length} customer inquiries.`;
    }

    return summary;
  }

  // Helper methods

  private createEmptyReport(
    reportType: 'weekly' | 'monthly',
    periodStart: Date,
    periodEnd: Date
  ): IntelligenceReport {
    return {
      report_type: reportType,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      summary: 'No feedback received during this period.',
      top_issues: [],
      recommended_fixes: [],
      blog_post_ideas: [],
      use_cases: [],
      trend_analysis: [],
      total_feedback_count: 0,
      sentiment_breakdown: { positive: 0, negative: 0, neutral: 0 },
      category_breakdown: {},
    };
  }

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

  private groupByKeywordSimilarity(feedbacks: Feedback[]): Feedback[][] {
    const clusters: Feedback[][] = [];
    const processed = new Set<string>();

    for (const feedback of feedbacks) {
      if (processed.has(feedback.id)) continue;

      const cluster: Feedback[] = [feedback];
      processed.add(feedback.id);

      const keywords = this.extractKeywords(feedback);

      for (const other of feedbacks) {
        if (processed.has(other.id)) continue;

        const otherKeywords = this.extractKeywords(other);
        const similarity = this.calculateKeywordSimilarity(keywords, otherKeywords);

        if (similarity >= 0.3) {
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

  private extractKeywords(feedback: Feedback): string[] {
    const text = `${feedback.title || ''} ${feedback.description}`.toLowerCase();
    const words = text.split(/\s+/);

    // Filter out common words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);

    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 20);
  }

  private extractCommonKeywords(items: Feedback[]): string[] {
    const keywordCounts: Record<string, number> = {};

    for (const item of items) {
      const keywords = this.extractKeywords(item);
      for (const keyword of keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }

    return Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([keyword]) => keyword)
      .slice(0, 10);
  }

  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateImpactScore(
    items: Feedback[],
    sentimentBreakdown: { positive: number; negative: number; neutral: number }
  ): number {
    let score = 0;

    // Frequency (0-40)
    score += Math.min(items.length * 5, 40);

    // Negative sentiment (0-30)
    const negativeRatio = sentimentBreakdown.negative / items.length;
    score += negativeRatio * 30;

    // Priority (0-30)
    const criticalCount = items.filter(f => f.priority === 'critical').length;
    const highCount = items.filter(f => f.priority === 'high').length;
    score += (criticalCount * 10) + (highCount * 5);

    return Math.min(Math.round(score), 100);
  }

  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  private calculateSentimentBreakdown(feedbacks: Feedback[]): {
    positive: number;
    negative: number;
    neutral: number;
  } {
    return {
      positive: feedbacks.filter(f => f.sentiment === 'positive').length,
      negative: feedbacks.filter(f => f.sentiment === 'negative').length,
      neutral: feedbacks.filter(f => f.sentiment === 'neutral').length,
    };
  }

  private calculateCategoryBreakdown(feedbacks: Feedback[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const feedback of feedbacks) {
      const category = feedback.category || 'uncategorized';
      breakdown[category] = (breakdown[category] || 0) + 1;
    }

    return breakdown;
  }

  private generateQuestionBasedTitle(category: string, keywords: string[]): string {
    const mainKeyword = keywords[0] || category;
    return `How to ${mainKeyword}: A Complete Guide`;
  }

  private generateFeatureBasedTitle(category: string, keywords: string[]): string {
    const mainKeyword = keywords[0] || category;
    return `Top ${category} Features Requested by Users`;
  }

  private estimateTraffic(feedbackCount: number, keywords: string[]): string {
    if (feedbackCount >= 10) return 'High (1000+ monthly visits)';
    if (feedbackCount >= 5) return 'Medium (500-1000 monthly visits)';
    return 'Low (100-500 monthly visits)';
  }

  private generateUseCaseTitle(keywords: string[]): string {
    const mainKeyword = keywords[0] || 'application';
    return `Using our platform for ${mainKeyword}`;
  }

  private generateUseCaseDescription(items: Feedback[]): string {
    const keywords = this.extractCommonKeywords(items);
    return `${items.length} customers are successfully using our platform for ${keywords.slice(0, 3).join(', ')}.`;
  }

  private inferIndustry(items: Feedback[]): string {
    // Simple keyword matching for industry
    const allText = items.map(f => `${f.title} ${f.description}`).join(' ').toLowerCase();

    if (allText.includes('finance') || allText.includes('banking')) return 'Finance';
    if (allText.includes('healthcare') || allText.includes('medical')) return 'Healthcare';
    if (allText.includes('ecommerce') || allText.includes('retail')) return 'E-commerce';
    if (allText.includes('education') || allText.includes('learning')) return 'Education';
    if (allText.includes('saas') || allText.includes('software')) return 'SaaS';

    return 'Technology';
  }

  private inferCompanySize(items: Feedback[]): string {
    // Could be enhanced with actual user data
    return 'Small to Medium Business';
  }

  private extractBenefits(items: Feedback[]): string[] {
    const benefits: string[] = [];
    const allText = items.map(f => f.description).join(' ').toLowerCase();

    if (allText.includes('save') || allText.includes('saved')) {
      benefits.push('Time and cost savings');
    }
    if (allText.includes('easy') || allText.includes('simple')) {
      benefits.push('Easy to use and implement');
    }
    if (allText.includes('scale') || allText.includes('scaling')) {
      benefits.push('Scalable solution');
    }
    if (allText.includes('fast') || allText.includes('quick')) {
      benefits.push('Fast deployment');
    }
    if (allText.includes('reliable') || allText.includes('stability')) {
      benefits.push('Reliable and stable');
    }

    return benefits.slice(0, 5);
  }
}

// Singleton instance
export const intelligenceReportGenerator = new IntelligenceReportGenerator();
