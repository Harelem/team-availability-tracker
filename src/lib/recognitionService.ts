import { 
  Achievement, 
  AchievementType, 
  AchievementData,
  RecognitionMetric,
  AchievementProgress,
  ACHIEVEMENT_CONFIGS,
  RECOGNITION_LEVELS,
  UserRecognitionProfile
} from '@/types/recognitionTypes';
import { DatabaseService } from './database';

/**
 * Recognition Service - Business logic for the recognition system
 * 
 * Handles achievement calculations, metric analysis, and recognition algorithms
 */

export class RecognitionService {
  
  // ============================================================================
  // ACHIEVEMENT CALCULATION
  // ============================================================================

  /**
   * Calculate if user qualifies for specific achievements based on their activity
   */
  static async calculateAchievementsForUser(userId: number, weekStart?: string): Promise<AchievementType[]> {
    const qualifiedAchievements: AchievementType[] = [];
    
    try {
      // Get current metrics for the user
      const metrics = await DatabaseService.getUserMetrics(userId, {
        limit: 10
      });
      
      // Get recent achievements to avoid duplicates
      const recentAchievements = await DatabaseService.getUserAchievements(userId, {
        startDate: weekStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        limit: 50
      });
      
      const currentWeekStart = weekStart || this.getCurrentWeekStart();
      
      // Check for Consistent Updater achievement
      if (this.checkConsistentUpdater(metrics, recentAchievements, currentWeekStart)) {
        qualifiedAchievements.push('consistent_updater');
      }
      
      // Check for Perfect Week achievement
      if (this.checkPerfectWeek(metrics, recentAchievements, currentWeekStart)) {
        qualifiedAchievements.push('perfect_week');
      }
      
      // Check for Reliability Streak achievement
      const streakLength = this.checkReliabilityStreak(metrics);
      if (streakLength >= 3 && !this.hasRecentStreakAchievement(recentAchievements, streakLength)) {
        qualifiedAchievements.push('reliability_streak');
      }
      
      // Check for Early Planner achievement
      if (await this.checkEarlyPlanner(userId, currentWeekStart)) {
        if (!this.hasAchievementThisWeek(recentAchievements, 'early_planner', currentWeekStart)) {
          qualifiedAchievements.push('early_planner');
        }
      }
      
      return qualifiedAchievements;
    } catch (error) {
      console.error('Error calculating achievements for user:', error);
      return [];
    }
  }

  /**
   * Check if user qualifies for Consistent Updater achievement
   */
  private static checkConsistentUpdater(
    metrics: RecognitionMetric[], 
    recentAchievements: Achievement[], 
    weekStart: string
  ): boolean {
    const weeklyCompletionMetric = metrics.find(m => 
      m.metricName === 'weekly_completion_rate' && 
      m.periodStart === weekStart
    );
    
    const hasAchievementThisWeek = this.hasAchievementThisWeek(recentAchievements, 'consistent_updater', weekStart);
    
    return (weeklyCompletionMetric?.metricValue || 0) >= 100 && !hasAchievementThisWeek;
  }

  /**
   * Check if user qualifies for Perfect Week achievement
   */
  private static checkPerfectWeek(
    metrics: RecognitionMetric[], 
    recentAchievements: Achievement[], 
    weekStart: string
  ): boolean {
    const weeklyCompletionMetric = metrics.find(m => 
      m.metricName === 'weekly_completion_rate' && 
      m.periodStart === weekStart
    );
    
    const earlyPlanningMetric = metrics.find(m => 
      m.metricName === 'early_planning_score' && 
      m.periodStart === weekStart
    );
    
    const hasAchievementThisWeek = this.hasAchievementThisWeek(recentAchievements, 'perfect_week', weekStart);
    
    const hasFullCompletion = (weeklyCompletionMetric?.metricValue || 0) >= 100;
    const hasEarlyPlanning = (earlyPlanningMetric?.metricValue || 0) >= 3;
    
    return hasFullCompletion && hasEarlyPlanning && !hasAchievementThisWeek;
  }

  /**
   * Check reliability streak length
   */
  private static checkReliabilityStreak(metrics: RecognitionMetric[]): number {
    const streakMetric = metrics
      .filter(m => m.metricName === 'consistency_streak')
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
    
    return streakMetric?.metricValue || 0;
  }

  /**
   * Check if user qualifies for Early Planner achievement
   */
  private static async checkEarlyPlanner(userId: number, weekStart: string): Promise<boolean> {
    // This would need to check schedule entries to see if user planned ahead
    // For now, we'll use a simplified check based on metrics
    const metrics = await DatabaseService.getUserMetrics(userId, {
      startDate: weekStart,
      limit: 5
    });
    
    const earlyPlanningMetric = metrics.find(m => 
      m.metricName === 'early_planning_score' && 
      m.periodStart === weekStart
    );
    
    return (earlyPlanningMetric?.metricValue || 0) >= 3;
  }

  /**
   * Check if user has a specific achievement this week
   */
  private static hasAchievementThisWeek(
    achievements: Achievement[], 
    type: AchievementType, 
    weekStart: string
  ): boolean {
    return achievements.some(a => 
      a.achievementType === type && 
      a.weekStart === weekStart
    );
  }

  /**
   * Check if user has recent streak achievement for this streak length
   */
  private static hasRecentStreakAchievement(achievements: Achievement[], streakLength: number): boolean {
    return achievements.some(a => 
      a.achievementType === 'reliability_streak' && 
      a.achievementData.streak_length === streakLength
    );
  }

  // ============================================================================
  // METRIC ANALYSIS
  // ============================================================================

  /**
   * Analyze user's recognition performance and provide insights
   */
  static async analyzeUserPerformance(userId: number, periodDays: number = 30): Promise<any> {
    try {
      const analytics = await DatabaseService.getUserRecognitionAnalytics(userId, periodDays);
      
      if (!analytics) return null;
      
      // Add additional analysis
      const insights = this.generatePerformanceInsights(analytics);
      const recommendations = this.generateRecommendations(analytics);
      const projections = this.generateProjections(analytics);
      
      return {
        ...analytics,
        insights,
        recommendations,
        projections
      };
    } catch (error) {
      console.error('Error analyzing user performance:', error);
      return null;
    }
  }

  /**
   * Generate performance insights
   */
  private static generatePerformanceInsights(analytics: any): string[] {
    const insights: string[] = [];
    
    if (analytics.summary.averageCompletionRate >= 90) {
      insights.push('Excellent consistency in availability updates');
    } else if (analytics.summary.averageCompletionRate >= 70) {
      insights.push('Good planning habits with room for improvement');
    } else {
      insights.push('Opportunity to improve consistency in planning');
    }
    
    if (analytics.summary.bestStreak >= 5) {
      insights.push('Outstanding reliability streak - keep it up!');
    } else if (analytics.summary.bestStreak >= 3) {
      insights.push('Building good consistency habits');
    }
    
    if (analytics.summary.totalAchievements >= 10) {
      insights.push('High achiever in the recognition system');
    }
    
    return insights;
  }

  /**
   * Generate improvement recommendations
   */
  private static generateRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];
    
    if (analytics.summary.averageCompletionRate < 80) {
      recommendations.push('Try to update your schedule every day to build consistency');
    }
    
    if (analytics.summary.bestStreak < 3) {
      recommendations.push('Focus on maintaining weekly updates to build a streak');
    }
    
    if (analytics.trends.consistency.length > 2) {
      const recent = analytics.trends.consistency.slice(-3);
      const trend = recent[2].value - recent[0].value;
      
      if (trend < 0) {
        recommendations.push('Your consistency has declined recently - try to get back on track');
      } else if (trend > 0) {
        recommendations.push('Great improvement in consistency - keep the momentum!');
      }
    }
    
    return recommendations;
  }

  /**
   * Generate performance projections
   */
  private static generateProjections(analytics: any): any {
    const projections = {
      nextWeekCompletionPrediction: 0,
      achievementOpportunities: [] as string[],
      timeToNextLevel: null as string | null
    };
    
    // Simple projection based on recent trends
    if (analytics.trends.consistency.length >= 3) {
      const recentValues = analytics.trends.consistency.slice(-3).map((t: any) => t.value);
      const avgRecent = recentValues.reduce((sum: number, val: number) => sum + val, 0) / recentValues.length;
      projections.nextWeekCompletionPrediction = Math.min(100, Math.max(0, avgRecent));
    }
    
    // Identify achievement opportunities
    if (analytics.summary.averageCompletionRate >= 85) {
      projections.achievementOpportunities.push('consistent_updater');
    }
    
    if (analytics.summary.bestStreak >= 2) {
      projections.achievementOpportunities.push('reliability_streak');
    }
    
    return projections;
  }

  // ============================================================================
  // ACHIEVEMENT PROGRESS CALCULATION
  // ============================================================================

  /**
   * Calculate progress towards next achievements
   */
  static calculateAchievementProgress(
    achievements: Achievement[], 
    metrics: RecognitionMetric[]
  ): AchievementProgress[] {
    const progress: AchievementProgress[] = [];
    
    // Get latest weekly completion rate
    const latestCompletion = metrics
      .filter(m => m.metricName === 'weekly_completion_rate')
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
    
    if (latestCompletion && latestCompletion.metricValue < 100) {
      const hasRecentConsistentUpdater = achievements.some(a => 
        a.achievementType === 'consistent_updater' && 
        new Date(a.earnedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      
      if (!hasRecentConsistentUpdater) {
        progress.push({
          achievementType: 'consistent_updater',
          title: ACHIEVEMENT_CONFIGS['consistent_updater'].title,
          description: ACHIEVEMENT_CONFIGS['consistent_updater'].description,
          currentValue: latestCompletion.metricValue,
          targetValue: 100,
          progress: latestCompletion.metricValue
        });
      }
    }
    
    // Get latest streak
    const latestStreak = metrics
      .filter(m => m.metricName === 'consistency_streak')
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
    
    if (latestStreak && latestStreak.metricValue < 5) {
      progress.push({
        achievementType: 'reliability_streak',
        title: ACHIEVEMENT_CONFIGS['reliability_streak'].title,
        description: ACHIEVEMENT_CONFIGS['reliability_streak'].description,
        currentValue: latestStreak.metricValue,
        targetValue: 5,
        progress: (latestStreak.metricValue / 5) * 100
      });
    }
    
    return progress;
  }

  // ============================================================================
  // USER LEVEL CALCULATION
  // ============================================================================

  /**
   * Calculate user's recognition level based on total points
   */
  static calculateUserLevel(achievements: Achievement[]): { 
    currentLevel: typeof RECOGNITION_LEVELS[0]; 
    nextLevel: typeof RECOGNITION_LEVELS[0] | null;
    totalPoints: number;
    pointsToNextLevel: number;
  } {
    // Calculate total points from achievements
    const totalPoints = achievements.reduce((sum, achievement) => {
      const config = ACHIEVEMENT_CONFIGS[achievement.achievementType];
      return sum + (config?.points || 0);
    }, 0);
    
    // Find current level
    let currentLevel = RECOGNITION_LEVELS[0];
    for (const level of RECOGNITION_LEVELS) {
      if (totalPoints >= level.minimumPoints) {
        currentLevel = level;
      } else {
        break;
      }
    }
    
    // Find next level
    const currentLevelIndex = RECOGNITION_LEVELS.findIndex(l => l.level === currentLevel.level);
    const nextLevel = currentLevelIndex < RECOGNITION_LEVELS.length - 1 
      ? RECOGNITION_LEVELS[currentLevelIndex + 1] 
      : null;
    
    const pointsToNextLevel = nextLevel ? nextLevel.minimumPoints - totalPoints : 0;
    
    return {
      currentLevel,
      nextLevel,
      totalPoints,
      pointsToNextLevel
    };
  }

  /**
   * Build complete user recognition profile
   */
  static async buildUserProfile(userId: number): Promise<UserRecognitionProfile | null> {
    try {
      const [achievements, metrics, leaderboard] = await Promise.all([
        DatabaseService.getUserAchievements(userId, { limit: 100 }),
        DatabaseService.getUserMetrics(userId, { limit: 50 }),
        DatabaseService.getRecognitionLeaderboard('all-time')
      ]);
      
      const levelInfo = this.calculateUserLevel(achievements);
      const userRank = leaderboard.findIndex(entry => entry.id === userId) + 1;
      
      // Calculate statistics
      const weeklyCompletionMetrics = metrics.filter(m => m.metricName === 'weekly_completion_rate');
      const averageConsistency = weeklyCompletionMetrics.length > 0
        ? weeklyCompletionMetrics.reduce((sum, m) => sum + m.metricValue, 0) / weeklyCompletionMetrics.length
        : 0;
      
      const streakMetrics = metrics.filter(m => m.metricName === 'consistency_streak');
      const bestStreak = streakMetrics.length > 0 
        ? Math.max(...streakMetrics.map(m => m.metricValue))
        : 0;
      
      const profile: UserRecognitionProfile = {
        userId,
        totalPoints: levelInfo.totalPoints,
        currentLevel: levelInfo.currentLevel,
        nextLevel: levelInfo.nextLevel,
        pointsToNextLevel: levelInfo.pointsToNextLevel,
        joinedAt: achievements.length > 0 
          ? achievements.sort((a, b) => new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime())[0].earnedAt
          : new Date().toISOString(),
        achievements,
        badges: achievements.map(a => ACHIEVEMENT_CONFIGS[a.achievementType]?.icon || '').filter(Boolean),
        statistics: {
          totalAchievements: achievements.length,
          averageConsistency: Math.round(averageConsistency),
          bestStreak,
          teamRank: userRank,
          companyRank: userRank // Same as team rank for now
        }
      };
      
      return profile;
    } catch (error) {
      console.error('Error building user profile:', error);
      return null;
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get current week start date
   */
  private static getCurrentWeekStart(): string {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go to Sunday
    startOfWeek.setDate(startOfWeek.getDate() + 1); // Move to Monday
    return startOfWeek.toISOString().split('T')[0];
  }

  /**
   * Format achievement data for display
   */
  static formatAchievementData(achievement: Achievement): string {
    const config = ACHIEVEMENT_CONFIGS[achievement.achievementType];
    if (!config) return achievement.achievementType;
    
    let description = config.description;
    
    // Add specific details from achievement data
    if (achievement.achievementData.completion_rate) {
      description += ` (${achievement.achievementData.completion_rate}% completion)`;
    }
    
    if (achievement.achievementData.streak_length) {
      description += ` (${achievement.achievementData.streak_length} week streak)`;
    }
    
    return description;
  }

  /**
   * Calculate team recognition statistics
   */
  static async calculateTeamStats(teamId: number): Promise<any> {
    try {
      const leaderboard = await DatabaseService.getRecognitionLeaderboard('month', teamId);
      
      if (leaderboard.length === 0) {
        return {
          teamId,
          totalMembers: 0,
          averageConsistency: 0,
          totalAchievements: 0,
          topPerformers: [],
          improvementTrend: 'stable'
        };
      }
      
      const totalMembers = leaderboard.length;
      const averageConsistency = leaderboard.reduce((sum, member) => sum + member.consistencyScore, 0) / totalMembers;
      const totalAchievements = leaderboard.reduce((sum, member) => sum + member.totalAchievements, 0);
      const topPerformers = leaderboard.slice(0, 5);
      
      return {
        teamId,
        totalMembers,
        averageConsistency: Math.round(averageConsistency),
        totalAchievements,
        topPerformers,
        improvementTrend: 'stable' // Would need historical data to calculate
      };
    } catch (error) {
      console.error('Error calculating team stats:', error);
      return null;
    }
  }

  /**
   * Award achievement to user
   */
  static async awardAchievement(
    userId: number, 
    achievementType: AchievementType, 
    achievementData: AchievementData = {},
    weekStart?: string
  ): Promise<Achievement | null> {
    try {
      const achievement = await DatabaseService.createAchievement({
        userId,
        achievementType,
        achievementData,
        weekStart: weekStart || this.getCurrentWeekStart()
      });
      
      return achievement;
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return null;
    }
  }
}