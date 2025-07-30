import { useState, useEffect, useCallback } from 'react';
import { 
  Achievement, 
  RecognitionMetric, 
  RecognitionDashboardData,
  LeaderboardEntry,
  UseRecognitionSystemReturn,
  UseRecognitionSystemProps,
  AchievementType,
  MetricName,
  MetricTrend,
  LeaderboardTimeframe,
  RecognitionQueryOptions
} from '@/types/recognitionTypes';
import { DatabaseService } from '@/lib/database';

export const useRecognitionSystem = ({
  userId,
  teamId,
  timeframe = 'week',
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: UseRecognitionSystemProps = {}): UseRecognitionSystemReturn => {
  // State management
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [metrics, setMetrics] = useState<RecognitionMetric[]>([]);
  const [dashboardData, setDashboardData] = useState<RecognitionDashboardData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Get date range based on timeframe
  const getDateRange = useCallback((timeframe: LeaderboardTimeframe) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'all-time':
        startDate.setFullYear(2020); // Far back enough
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  }, []);

  // Load user achievements
  const loadAchievements = useCallback(async () => {
    if (!userId) return;
    
    setIsLoadingAchievements(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange(timeframe);
      const options: RecognitionQueryOptions = {
        startDate,
        endDate,
        limit: 50,
        sortBy: 'earned_at',
        sortOrder: 'desc'
      };
      
      const userAchievements = await DatabaseService.getUserAchievements(userId, options);
      setAchievements(userAchievements);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load achievements';
      setError(errorMessage);
      console.error('Error loading achievements:', err);
    } finally {
      setIsLoadingAchievements(false);
    }
  }, [userId, timeframe, getDateRange]);

  // Load user metrics
  const loadMetrics = useCallback(async () => {
    if (!userId) return;
    
    setIsLoadingMetrics(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange(timeframe);
      const options: RecognitionQueryOptions = {
        startDate,
        endDate,
        limit: 100
      };
      
      const userMetrics = await DatabaseService.getUserMetrics(userId, options);
      setMetrics(userMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load metrics';
      setError(errorMessage);
      console.error('Error loading metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [userId, timeframe, getDateRange]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    setError(null);
    
    try {
      const leaderboardData = await DatabaseService.getRecognitionLeaderboard(timeframe, teamId);
      setLeaderboard(leaderboardData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(errorMessage);
      console.error('Error loading leaderboard:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [timeframe, teamId]);

  // Build dashboard data
  const buildDashboardData = useCallback(async () => {
    if (!userId || achievements.length === 0 && metrics.length === 0) return;
    
    try {
      // Get current metrics
      const weeklyCompletionMetric = metrics.find(m => 
        m.metricName === 'weekly_completion_rate' && 
        new Date(m.periodStart) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      
      const streakMetric = metrics.find(m => 
        m.metricName === 'consistency_streak' && 
        new Date(m.periodStart) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      
      const currentRank = leaderboard.findIndex(entry => entry.id === userId) + 1 || 0;
      
      // Get recent achievements (last 10)
      const recentAchievements = achievements.slice(0, 10);
      
      // Calculate progress to next achievements
      const progressToNext = calculateProgressToNext(metrics, achievements);
      
      // Build weekly trend
      const weeklyTrend = buildWeeklyTrend(metrics);
      
      const dashboardData: RecognitionDashboardData = {
        user: {
          id: userId,
          name: '', // Would need to fetch from user data
          hebrew: '', // Would need to fetch from user data
          teamId: teamId || 0
        },
        currentMetrics: {
          weeklyCompletionRate: weeklyCompletionMetric?.metricValue || 0,
          consistencyStreak: streakMetric?.metricValue || 0,
          totalAchievements: achievements.length,
          currentRank
        },
        recentAchievements,
        progressToNext,
        weeklyTrend,
        achievements
      };
      
      setDashboardData(dashboardData);
    } catch (err) {
      console.error('Error building dashboard data:', err);
    }
  }, [userId, teamId, achievements, metrics, leaderboard]);

  // Calculate progress to next achievements
  const calculateProgressToNext = (metrics: RecognitionMetric[], achievements: Achievement[]) => {
    const progressItems = [];
    
    // Progress to consistency achievement
    const latestCompletionRate = metrics
      .filter(m => m.metricName === 'weekly_completion_rate')
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
    
    if (latestCompletionRate && latestCompletionRate.metricValue < 100) {
      progressItems.push({
        achievementType: 'consistent_updater' as AchievementType,
        title: 'Consistent Updater',
        description: 'Update availability every day this week',
        currentValue: latestCompletionRate.metricValue,
        targetValue: 100,
        progress: latestCompletionRate.metricValue
      });
    }
    
    // Progress to streak achievement
    const latestStreak = metrics
      .filter(m => m.metricName === 'consistency_streak')
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())[0];
    
    if (latestStreak && latestStreak.metricValue < 3) {
      progressItems.push({
        achievementType: 'reliability_streak' as AchievementType,
        title: 'Reliability Streak',
        description: 'Maintain consistent updates for 3 weeks',
        currentValue: latestStreak.metricValue,
        targetValue: 3,
        progress: (latestStreak.metricValue / 3) * 100
      });
    }
    
    return progressItems;
  };

  // Build weekly trend data
  const buildWeeklyTrend = (metrics: RecognitionMetric[]): MetricTrend[] => {
    return metrics
      .filter(m => m.metricName === 'weekly_completion_rate')
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
      .slice(-8) // Last 8 weeks
      .map(metric => ({
        date: metric.periodStart,
        metricName: metric.metricName,
        value: metric.metricValue
      }));
  };

  // Check for new achievements
  const checkForNewAchievements = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    setError(null);
    
    try {
      await DatabaseService.triggerAchievementCheck(userId);
      // Refresh data after checking
      await Promise.all([loadAchievements(), loadMetrics()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check for new achievements';
      setError(errorMessage);
      console.error('Error checking for new achievements:', err);
    }
  }, [userId, loadAchievements, loadMetrics]);

  // Refresh all data
  const refreshData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadAchievements(),
        loadMetrics(),
        loadLeaderboard()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      console.error('Error refreshing recognition data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadAchievements, loadMetrics, loadLeaderboard]);

  // Clear error
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Utility: Get user rank
  const getUserRank = useCallback((userId: number): number => {
    const userEntry = leaderboard.find(entry => entry.id === userId);
    return userEntry?.rank || 0;
  }, [leaderboard]);

  // Utility: Get achievements by type
  const getAchievementsByType = useCallback((type: AchievementType): Achievement[] => {
    return achievements.filter(achievement => achievement.achievementType === type);
  }, [achievements]);

  // Utility: Get metric history
  const getMetricHistory = useCallback((metricName: MetricName, days: number): MetricTrend[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return metrics
      .filter(metric => 
        metric.metricName === metricName && 
        new Date(metric.periodStart) >= cutoffDate
      )
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
      .map(metric => ({
        date: metric.periodStart,
        metricName: metric.metricName,
        value: metric.metricValue
      }));
  }, [metrics]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Build dashboard data when achievements or metrics change
  useEffect(() => {
    buildDashboardData();
  }, [buildDashboardData]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  return {
    // Data
    achievements,
    metrics,
    dashboardData,
    leaderboard,
    
    // Loading states
    isLoading,
    isLoadingAchievements,
    isLoadingMetrics,
    isLoadingLeaderboard,
    
    // Error state
    error,
    
    // Actions
    checkForNewAchievements,
    refreshData,
    clearError,
    
    // Utility functions
    getUserRank,
    getAchievementsByType,
    getMetricHistory
  };
};

// Helper hook for a specific user's achievements only
export const useUserAchievements = (userId?: number, timeframe: LeaderboardTimeframe = 'week') => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserAchievements = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'all-time':
          startDate.setFullYear(2020);
          break;
      }

      const options: RecognitionQueryOptions = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        limit: 20
      };

      const userAchievements = await DatabaseService.getUserAchievements(userId, options);
      setAchievements(userAchievements);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load achievements';
      setError(errorMessage);
      console.error('Error loading user achievements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, timeframe]);

  useEffect(() => {
    loadUserAchievements();
  }, [loadUserAchievements]);

  return {
    achievements,
    isLoading,
    error,
    refetch: loadUserAchievements
  };
};

// Helper hook for leaderboard data only
export const useRecognitionLeaderboard = (timeframe: LeaderboardTimeframe = 'week', teamId?: number) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const leaderboardData = await DatabaseService.getRecognitionLeaderboard(timeframe, teamId);
      setLeaderboard(leaderboardData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(errorMessage);
      console.error('Error loading leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, teamId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return {
    leaderboard,
    isLoading,
    error,
    refetch: loadLeaderboard
  };
};