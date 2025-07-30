/**
 * TypeScript interfaces for Recognition System
 * 
 * Defines types for achievements, metrics, leaderboards, and recognition UI components
 */

// =============================================================================
// CORE RECOGNITION INTERFACES
// =============================================================================

export interface Achievement {
  id: string;
  userId: number;
  achievementType: AchievementType;
  achievementData: AchievementData;
  earnedAt: string;
  weekStart?: string;
  sprintId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AchievementType = 
  | 'consistent_updater'
  | 'early_planner'
  | 'perfect_week'
  | 'team_helper'
  | 'sprint_champion'
  | 'reliability_streak';

export interface AchievementData {
  [key: string]: any;
  // Common fields that might appear in achievement data
  completion_rate?: number;
  streak_length?: number;
  early_planning_count?: number;
  team_members_helped?: number;
  sprint_completion_score?: number;
  week_start?: string;
  achieved_at?: string;
}

export interface RecognitionMetric {
  id: string;
  userId: number;
  metricName: MetricName;
  metricValue: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export type MetricName = 
  | 'weekly_completion_rate'
  | 'consistency_streak'
  | 'early_planning_score'
  | 'team_collaboration_score'
  | 'sprint_participation_rate'
  | 'schedule_accuracy_score';

// =============================================================================
// LEADERBOARD AND RANKINGS
// =============================================================================

export interface LeaderboardEntry {
  id: number;
  name: string;
  hebrew: string;
  teamName: string;
  consistencyScore: number;
  totalAchievements: number;
  recentAchievements: Achievement[];
  streakCount: number;
  rank: number;
  previousRank?: number;
}

export interface TeamRecognitionStats {
  teamId: number;
  teamName: string;
  totalMembers: number;
  averageConsistency: number;
  totalAchievements: number;
  topPerformers: LeaderboardEntry[];
  improvementTrend: 'up' | 'down' | 'stable';
}

export type LeaderboardTimeframe = 'week' | 'month' | 'quarter' | 'all-time';

// =============================================================================
// ACHIEVEMENT CONFIGURATION
// =============================================================================

export interface AchievementConfig {
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  requirements: AchievementRequirements;
  points: number;
}

export interface AchievementRequirements {
  [key: string]: any;
  // Specific requirements for different achievement types
  completionRate?: number;
  streakLength?: number;
  earlyPlanningDays?: number;
  consecutiveWeeks?: number;
  teamInteractions?: number;
}

// =============================================================================
// RECOGNITION DASHBOARD
// =============================================================================

export interface RecognitionDashboardData {
  user: {
    id: number;
    name: string;
    hebrew: string;
    teamId: number;
  };
  currentMetrics: {
    weeklyCompletionRate: number;
    consistencyStreak: number;
    totalAchievements: number;
    currentRank: number;
  };
  recentAchievements: Achievement[];
  progressToNext: AchievementProgress[];
  weeklyTrend: MetricTrend[];
  achievements: Achievement[];
}

export interface AchievementProgress {
  achievementType: AchievementType;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  progress: number; // 0-100 percentage
  estimatedCompletion?: string;
}

export interface MetricTrend {
  date: string;
  metricName: MetricName;
  value: number;
}

// =============================================================================
// RECOGNITION HOOKS
// =============================================================================

export interface UseRecognitionSystemReturn {
  // Data
  achievements: Achievement[];
  metrics: RecognitionMetric[];
  dashboardData: RecognitionDashboardData | null;
  leaderboard: LeaderboardEntry[];
  
  // Loading states
  isLoading: boolean;
  isLoadingAchievements: boolean;
  isLoadingMetrics: boolean;
  isLoadingLeaderboard: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  checkForNewAchievements: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  
  // Utility functions
  getUserRank: (userId: number) => number;
  getAchievementsByType: (type: AchievementType) => Achievement[];
  getMetricHistory: (metricName: MetricName, days: number) => MetricTrend[];
}

export interface UseRecognitionSystemProps {
  userId?: number;
  teamId?: number;
  timeframe?: LeaderboardTimeframe;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface RecognitionBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  onClick?: (achievement: Achievement) => void;
  className?: string;
}

export interface RecognitionDashboardProps {
  userId: number;
  teamView?: boolean;
  timeframe?: LeaderboardTimeframe;
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
}

export interface TeamRecognitionLeaderboardProps {
  teamId?: number;
  timeframe?: LeaderboardTimeframe;
  limit?: number;
  showTeamStats?: boolean;
  onMemberClick?: (member: LeaderboardEntry) => void;
  className?: string;
}

export interface AchievementDetailModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
  showSharing?: boolean;
}

export interface RecognitionStatsCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
  className?: string;
}

// =============================================================================
// NOTIFICATION AND ALERTS
// =============================================================================

export interface AchievementNotification {
  id: string;
  achievement: Achievement;
  isNew: boolean;
  showAt: Date;
  dismissed: boolean;
}

export interface RecognitionAlert {
  id: string;
  type: 'achievement' | 'milestone' | 'streak' | 'rank_change';
  title: string;
  message: string;
  data: any;
  severity: 'info' | 'success' | 'warning';
  timestamp: string;
  dismissed: boolean;
}

// =============================================================================
// ANALYTICS AND INSIGHTS
// =============================================================================

export interface RecognitionAnalytics {
  userId: number;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalAchievements: number;
    averageCompletionRate: number;
    bestStreak: number;
    improvementAreas: string[];
  };
  trends: {
    consistency: MetricTrend[];
    engagement: MetricTrend[];
    teamCollaboration: MetricTrend[];
  };
  predictions: {
    nextAchievement: AchievementType | null;
    estimatedDate: string | null;
    confidence: number;
  };
}

export interface TeamRecognitionInsights {
  teamId: number;
  period: {
    start: string;
    end: string;
  };
  teamStats: {
    totalMembers: number;
    activeMembers: number;
    averageConsistency: number;
    totalAchievements: number;
  };
  topPerformers: LeaderboardEntry[];
  improvementOpportunities: {
    category: string;
    suggestion: string;
    impactLevel: 'high' | 'medium' | 'low';
  }[];
  celebrationMoments: {
    type: 'team_milestone' | 'individual_achievement' | 'streak_record';
    description: string;
    date: string;
    participants: string[];
  }[];
}

// =============================================================================
// DATABASE INTEGRATION
// =============================================================================

export interface CreateAchievementRequest {
  userId: number;
  achievementType: AchievementType;
  achievementData: AchievementData;
  weekStart?: string;
  sprintId?: string;
}

export interface UpdateMetricRequest {
  userId: number;
  metricName: MetricName;
  metricValue: number;
  periodStart: string;
  periodEnd: string;
}

export interface RecognitionQueryOptions {
  userId?: number;
  teamId?: number;
  achievementTypes?: AchievementType[];
  timeframe?: LeaderboardTimeframe;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'earned_at' | 'achievement_type' | 'metric_value';
  sortOrder?: 'asc' | 'desc';
}

export interface RecognitionQueryResult {
  achievements: Achievement[];
  metrics: RecognitionMetric[];
  leaderboard: LeaderboardEntry[];
  totalCount: number;
  hasMore: boolean;
}

// =============================================================================
// GAMIFICATION FEATURES
// =============================================================================

export interface RecognitionLevel {
  level: number;
  title: string;
  description: string;
  minimumPoints: number;
  benefits: string[];
  badgeIcon: string;
  badgeColor: string;
}

export interface UserRecognitionProfile {
  userId: number;
  totalPoints: number;
  currentLevel: RecognitionLevel;
  nextLevel: RecognitionLevel | null;
  pointsToNextLevel: number;
  joinedAt: string;
  achievements: Achievement[];
  badges: string[];
  statistics: {
    totalAchievements: number;
    averageConsistency: number;
    bestStreak: number;
    teamRank: number;
    companyRank: number;
  };
}

// =============================================================================
// CONSTANTS AND CONFIGURATIONS
// =============================================================================

export const ACHIEVEMENT_CONFIGS: Record<AchievementType, AchievementConfig> = {
  consistent_updater: {
    type: 'consistent_updater',
    title: 'Consistent Updater',
    description: 'Updated availability every day this week',
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    difficulty: 'easy',
    requirements: { completionRate: 100 },
    points: 50
  },
  early_planner: {
    type: 'early_planner',
    title: 'Early Planner',
    description: 'Planned next week before Friday',
    icon: '⚡',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    difficulty: 'medium',
    requirements: { earlyPlanningDays: 3 },
    points: 75
  },
  perfect_week: {
    type: 'perfect_week',
    title: 'Perfect Week',
    description: 'Complete and accurate week planning',
    icon: '⭐',
    color: 'bg-green-100 text-green-800 border-green-300',
    difficulty: 'medium',
    requirements: { completionRate: 100, earlyPlanningDays: 3 },
    points: 100
  },
  team_helper: {
    type: 'team_helper',
    title: 'Team Helper',
    description: 'Helped team members with planning',
    icon: '🤝',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    difficulty: 'hard',
    requirements: { teamInteractions: 5 },
    points: 150
  },
  sprint_champion: {
    type: 'sprint_champion',
    title: 'Sprint Champion',
    description: 'Completed sprint planning perfectly',
    icon: '🏃',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    difficulty: 'hard',
    requirements: { completionRate: 100, consecutiveWeeks: 2 },
    points: 200
  },
  reliability_streak: {
    type: 'reliability_streak',
    title: 'Reliability Streak',
    description: 'Consistent updates for multiple weeks',
    icon: '🔥',
    color: 'bg-red-100 text-red-800 border-red-300',
    difficulty: 'legendary',
    requirements: { streakLength: 3 },
    points: 300
  }
};

export const RECOGNITION_LEVELS: RecognitionLevel[] = [
  {
    level: 1,
    title: 'Newcomer',
    description: 'Just getting started with recognition',
    minimumPoints: 0,
    benefits: ['Basic achievement tracking'],
    badgeIcon: '🌱',
    badgeColor: 'bg-gray-100'
  },
  {
    level: 2,
    title: 'Consistent Contributor',
    description: 'Building good planning habits',
    minimumPoints: 500,
    benefits: ['Achievement history', 'Progress tracking'],
    badgeIcon: '📈',
    badgeColor: 'bg-blue-100'
  },
  {
    level: 3,
    title: 'Reliable Planner',
    description: 'Demonstrating planning excellence',
    minimumPoints: 1500,
    benefits: ['Team visibility', 'Advanced analytics'],
    badgeIcon: '⭐',
    badgeColor: 'bg-green-100'
  },
  {
    level: 4,
    title: 'Planning Master',
    description: 'Setting the standard for the team',
    minimumPoints: 3000,
    benefits: ['Leaderboard prominence', 'Mentor status'],
    badgeIcon: '🏆',
    badgeColor: 'bg-yellow-100'
  },
  {
    level: 5,
    title: 'Recognition Legend',
    description: 'The ultimate planning champion',
    minimumPoints: 5000,
    benefits: ['Hall of fame', 'Special recognition'],
    badgeIcon: '👑',
    badgeColor: 'bg-purple-100'
  }
];

export const METRIC_DISPLAY_CONFIGS = {
  weekly_completion_rate: {
    label: 'Weekly Completion',
    unit: '%',
    format: 'percentage',
    color: 'blue',
    icon: '📊'
  },
  consistency_streak: {
    label: 'Consistency Streak',
    unit: 'weeks',
    format: 'number',
    color: 'orange',
    icon: '🔥'
  },
  early_planning_score: {
    label: 'Early Planning',
    unit: 'days',
    format: 'number',
    color: 'green',
    icon: '⚡'
  },
  team_collaboration_score: {
    label: 'Team Collaboration',
    unit: 'interactions',
    format: 'number',
    color: 'purple',
    icon: '🤝'
  }
};

// =============================================================================
// TYPE GUARDS AND VALIDATION
// =============================================================================

export const isValidAchievementType = (type: string): type is AchievementType => {
  return ['consistent_updater', 'early_planner', 'perfect_week', 'team_helper', 'sprint_champion', 'reliability_streak'].includes(type);
};

export const isValidMetricName = (name: string): name is MetricName => {
  return ['weekly_completion_rate', 'consistency_streak', 'early_planning_score', 'team_collaboration_score', 'sprint_participation_rate', 'schedule_accuracy_score'].includes(name);
};

export const isValidLeaderboardTimeframe = (timeframe: string): timeframe is LeaderboardTimeframe => {
  return ['week', 'month', 'quarter', 'all-time'].includes(timeframe);
};

export const isAchievement = (obj: unknown): obj is Achievement => {
  if (!obj || typeof obj !== 'object') return false;
  
  const achievement = obj as Record<string, unknown>;
  
  return (
    typeof achievement.id === 'string' &&
    typeof achievement.userId === 'number' &&
    typeof achievement.achievementType === 'string' &&
    isValidAchievementType(achievement.achievementType) &&
    typeof achievement.achievementData === 'object' &&
    typeof achievement.earnedAt === 'string'
  );
};

export const isRecognitionMetric = (obj: unknown): obj is RecognitionMetric => {
  if (!obj || typeof obj !== 'object') return false;
  
  const metric = obj as Record<string, unknown>;
  
  return (
    typeof metric.id === 'string' &&
    typeof metric.userId === 'number' &&
    typeof metric.metricName === 'string' &&
    isValidMetricName(metric.metricName) &&
    typeof metric.metricValue === 'number' &&
    typeof metric.periodStart === 'string' &&
    typeof metric.periodEnd === 'string'
  );
};