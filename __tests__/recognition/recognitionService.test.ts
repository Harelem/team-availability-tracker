import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RecognitionService } from '../../src/lib/recognitionService';
import { DatabaseService } from '../../src/lib/database';
import { 
  Achievement, 
  RecognitionMetric, 
  ACHIEVEMENT_CONFIGS,
  RECOGNITION_LEVELS 
} from '../../src/types/recognitionTypes';

// Mock the DatabaseService
jest.mock('../../src/lib/database');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('RecognitionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-07-30')); // Fixed date for consistent testing
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateAchievementsForUser', () => {
    const mockUserId = 1;
    const mockWeekStart = '2024-07-29'; // Monday

    beforeEach(() => {
      mockDatabaseService.getUserMetrics.mockResolvedValue([
        {
          id: '1',
          userId: mockUserId,
          metricName: 'weekly_completion_rate',
          metricValue: 100,
          periodStart: mockWeekStart,
          periodEnd: '2024-08-04',
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        },
        {
          id: '2',
          userId: mockUserId,
          metricName: 'consistency_streak',
          metricValue: 3,
          periodStart: mockWeekStart,
          periodEnd: '2024-08-04',
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        }
      ]);

      mockDatabaseService.getUserAchievements.mockResolvedValue([]);
    });

    test('identifies consistent_updater achievement', async () => {
      const achievements = await RecognitionService.calculateAchievementsForUser(mockUserId, mockWeekStart);
      
      expect(achievements).toContain('consistent_updater');
      expect(mockDatabaseService.getUserMetrics).toHaveBeenCalledWith(mockUserId, { limit: 10 });
      expect(mockDatabaseService.getUserAchievements).toHaveBeenCalled();
    });

    test('identifies reliability_streak achievement', async () => {
      mockDatabaseService.getUserMetrics.mockResolvedValue([
        {
          id: '1',
          userId: mockUserId,
          metricName: 'consistency_streak',
          metricValue: 5,
          periodStart: mockWeekStart,
          periodEnd: '2024-08-04',
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        }
      ]);

      const achievements = await RecognitionService.calculateAchievementsForUser(mockUserId, mockWeekStart);
      
      expect(achievements).toContain('reliability_streak');
    });

    test('does not award duplicate achievements', async () => {
      mockDatabaseService.getUserAchievements.mockResolvedValue([
        {
          id: '1',
          userId: mockUserId,
          achievementType: 'consistent_updater',
          achievementData: { completion_rate: 100 },
          earnedAt: '2024-07-30T00:00:00Z',
          weekStart: mockWeekStart,
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        }
      ]);

      const achievements = await RecognitionService.calculateAchievementsForUser(mockUserId, mockWeekStart);
      
      expect(achievements).not.toContain('consistent_updater');
    });

    test('handles errors gracefully', async () => {
      mockDatabaseService.getUserMetrics.mockRejectedValue(new Error('Database error'));

      const achievements = await RecognitionService.calculateAchievementsForUser(mockUserId, mockWeekStart);
      
      expect(achievements).toEqual([]);
    });
  });

  describe('analyzeUserPerformance', () => {
    test('analyzes user performance and provides insights', async () => {
      const mockAnalytics = {
        userId: 1,
        period: { start: '2024-07-01', end: '2024-07-30' },
        summary: {
          totalAchievements: 5,
          averageCompletionRate: 95,
          bestStreak: 4,
          improvementAreas: []
        },
        trends: {
          consistency: [
            { date: '2024-07-15', metricName: 'weekly_completion_rate', value: 90 },
            { date: '2024-07-22', metricName: 'weekly_completion_rate', value: 95 },
            { date: '2024-07-29', metricName: 'weekly_completion_rate', value: 100 }
          ]
        }
      };

      mockDatabaseService.getUserRecognitionAnalytics.mockResolvedValue(mockAnalytics);

      const result = await RecognitionService.analyzeUserPerformance(1, 30);

      expect(result).toBeDefined();
      expect(result.insights).toContain('Excellent consistency in availability updates');
      expect(result.recommendations).toBeDefined();
      expect(result.projections).toBeDefined();
      expect(result.projections.nextWeekCompletionPrediction).toBeGreaterThan(90);
    });

    test('generates appropriate recommendations for low performers', async () => {
      const mockAnalytics = {
        userId: 1,
        period: { start: '2024-07-01', end: '2024-07-30' },
        summary: {
          totalAchievements: 1,
          averageCompletionRate: 60,
          bestStreak: 1,
          improvementAreas: []
        },
        trends: {
          consistency: [
            { date: '2024-07-15', metricName: 'weekly_completion_rate', value: 70 },
            { date: '2024-07-22', metricName: 'weekly_completion_rate', value: 50 },
            { date: '2024-07-29', metricName: 'weekly_completion_rate', value: 60 }
          ]
        }
      };

      mockDatabaseService.getUserRecognitionAnalytics.mockResolvedValue(mockAnalytics);

      const result = await RecognitionService.analyzeUserPerformance(1, 30);

      expect(result.insights).toContain('Opportunity to improve consistency in planning');
      expect(result.recommendations).toContain('Try to update your schedule every day to build consistency');
    });

    test('handles null analytics gracefully', async () => {
      mockDatabaseService.getUserRecognitionAnalytics.mockResolvedValue(null);

      const result = await RecognitionService.analyzeUserPerformance(1, 30);

      expect(result).toBeNull();
    });
  });

  describe('calculateAchievementProgress', () => {
    test('calculates progress to consistent_updater achievement', () => {
      const achievements: Achievement[] = [];
      const metrics: RecognitionMetric[] = [
        {
          id: '1',
          userId: 1,
          metricName: 'weekly_completion_rate',
          metricValue: 80,
          periodStart: '2024-07-29',
          periodEnd: '2024-08-04',
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        }
      ];

      const progress = RecognitionService.calculateAchievementProgress(achievements, metrics);

      expect(progress).toHaveLength(1);
      expect(progress[0].achievementType).toBe('consistent_updater');
      expect(progress[0].currentValue).toBe(80);
      expect(progress[0].targetValue).toBe(100);
      expect(progress[0].progress).toBe(80);
    });

    test('calculates progress to reliability_streak achievement', () => {
      const achievements: Achievement[] = [];
      const metrics: RecognitionMetric[] = [
        {
          id: '1',
          userId: 1,
          metricName: 'consistency_streak',
          metricValue: 2,
          periodStart: '2024-07-29',
          periodEnd: '2024-08-04',
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        }
      ];

      const progress = RecognitionService.calculateAchievementProgress(achievements, metrics);

      expect(progress).toHaveLength(1);
      expect(progress[0].achievementType).toBe('reliability_streak');
      expect(progress[0].currentValue).toBe(2);
      expect(progress[0].targetValue).toBe(5);
      expect(progress[0].progress).toBe(40);
    });

    test('excludes achievements already earned recently', () => {
      const achievements: Achievement[] = [
        {
          id: '1',
          userId: 1,
          achievementType: 'consistent_updater',
          achievementData: {},
          earnedAt: '2024-07-29T00:00:00Z',
          createdAt: '2024-07-29T00:00:00Z',
          updatedAt: '2024-07-29T00:00:00Z'
        }
      ];
      const metrics: RecognitionMetric[] = [
        {
          id: '1',
          userId: 1,
          metricName: 'weekly_completion_rate',
          metricValue: 80,
          periodStart: '2024-07-29',
          periodEnd: '2024-08-04',
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        }
      ];

      const progress = RecognitionService.calculateAchievementProgress(achievements, metrics);

      expect(progress).toHaveLength(0);
    });
  });

  describe('calculateUserLevel', () => {
    test('calculates correct level for new user', () => {
      const achievements: Achievement[] = [];

      const result = RecognitionService.calculateUserLevel(achievements);

      expect(result.currentLevel).toEqual(RECOGNITION_LEVELS[0]);
      expect(result.nextLevel).toEqual(RECOGNITION_LEVELS[1]);
      expect(result.totalPoints).toBe(0);
      expect(result.pointsToNextLevel).toBe(RECOGNITION_LEVELS[1].minimumPoints);
    });

    test('calculates correct level for high achiever', () => {
      const achievements: Achievement[] = [
        {
          id: '1',
          userId: 1,
          achievementType: 'consistent_updater',
          achievementData: {},
          earnedAt: '2024-07-01T00:00:00Z',
          createdAt: '2024-07-01T00:00:00Z',
          updatedAt: '2024-07-01T00:00:00Z'
        },
        {
          id: '2',
          userId: 1,
          achievementType: 'perfect_week',
          achievementData: {},
          earnedAt: '2024-07-08T00:00:00Z',
          createdAt: '2024-07-08T00:00:00Z',
          updatedAt: '2024-07-08T00:00:00Z'
        },
        {
          id: '3',
          userId: 1,
          achievementType: 'reliability_streak',
          achievementData: {},
          earnedAt: '2024-07-15T00:00:00Z',
          createdAt: '2024-07-15T00:00:00Z',
          updatedAt: '2024-07-15T00:00:00Z'
        }
      ];

      const expectedPoints = ACHIEVEMENT_CONFIGS.consistent_updater.points + 
                           ACHIEVEMENT_CONFIGS.perfect_week.points + 
                           ACHIEVEMENT_CONFIGS.reliability_streak.points;

      const result = RecognitionService.calculateUserLevel(achievements);

      expect(result.totalPoints).toBe(expectedPoints);
      expect(result.currentLevel.level).toBeGreaterThan(1);
    });

    test('handles max level user', () => {
      // Create enough achievements to reach max level
      const achievements: Achievement[] = Array(20).fill(null).map((_, i) => ({
        id: i.toString(),
        userId: 1,
        achievementType: 'reliability_streak',
        achievementData: {},
        earnedAt: '2024-07-01T00:00:00Z',
        createdAt: '2024-07-01T00:00:00Z',
        updatedAt: '2024-07-01T00:00:00Z'
      }));

      const result = RecognitionService.calculateUserLevel(achievements);

      expect(result.nextLevel).toBeNull(); // At max level
      expect(result.pointsToNextLevel).toBe(0);
    });
  });

  describe('buildUserProfile', () => {
    test('builds complete user profile', async () => {
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          userId: 1,
          achievementType: 'consistent_updater',
          achievementData: {},
          earnedAt: '2024-07-01T00:00:00Z',
          createdAt: '2024-07-01T00:00:00Z',
          updatedAt: '2024-07-01T00:00:00Z'
        }
      ];

      const mockMetrics: RecognitionMetric[] = [
        {
          id: '1',
          userId: 1,
          metricName: 'weekly_completion_rate',
          metricValue: 90,
          periodStart: '2024-07-29',
          periodEnd: '2024-08-04',
          createdAt: '2024-07-30T00:00:00Z',
          updatedAt: '2024-07-30T00:00:00Z'
        }
      ];

      const mockLeaderboard = [
        {
          id: 1,
          name: 'Test User',
          hebrew: 'משתמש מבחן',
          teamName: 'Test Team',
          consistencyScore: 90,
          totalAchievements: 1,
          recentAchievements: [],
          streakCount: 2,
          rank: 1
        }
      ];

      mockDatabaseService.getUserAchievements.mockResolvedValue(mockAchievements);
      mockDatabaseService.getUserMetrics.mockResolvedValue(mockMetrics);
      mockDatabaseService.getRecognitionLeaderboard.mockResolvedValue(mockLeaderboard);

      const profile = await RecognitionService.buildUserProfile(1);

      expect(profile).toBeDefined();
      expect(profile!.userId).toBe(1);
      expect(profile!.achievements).toEqual(mockAchievements);
      expect(profile!.statistics.totalAchievements).toBe(1);
      expect(profile!.statistics.averageConsistency).toBe(90);
      expect(profile!.statistics.teamRank).toBe(1);
    });

    test('handles errors gracefully', async () => {
      mockDatabaseService.getUserAchievements.mockRejectedValue(new Error('Database error'));

      const profile = await RecognitionService.buildUserProfile(1);

      expect(profile).toBeNull();
    });
  });

  describe('calculateTeamStats', () => {
    test('calculates team statistics correctly', async () => {
      const mockLeaderboard = [
        {
          id: 1,
          name: 'User 1',
          hebrew: 'משתמש 1',
          teamName: 'Test Team',
          consistencyScore: 95,
          totalAchievements: 3,
          recentAchievements: [],
          streakCount: 2,
          rank: 1
        },
        {
          id: 2,
          name: 'User 2',
          hebrew: 'משתמש 2',
          teamName: 'Test Team',
          consistencyScore: 85,
          totalAchievements: 2,
          recentAchievements: [],
          streakCount: 1,
          rank: 2
        }
      ];

      mockDatabaseService.getRecognitionLeaderboard.mockResolvedValue(mockLeaderboard);

      const stats = await RecognitionService.calculateTeamStats(1);

      expect(stats).toBeDefined();
      expect(stats.totalMembers).toBe(2);
      expect(stats.averageConsistency).toBe(90); // (95 + 85) / 2
      expect(stats.totalAchievements).toBe(5); // 3 + 2
      expect(stats.topPerformers).toHaveLength(2);
    });

    test('handles empty team gracefully', async () => {
      mockDatabaseService.getRecognitionLeaderboard.mockResolvedValue([]);

      const stats = await RecognitionService.calculateTeamStats(1);

      expect(stats.totalMembers).toBe(0);
      expect(stats.averageConsistency).toBe(0);
      expect(stats.totalAchievements).toBe(0);
      expect(stats.topPerformers).toEqual([]);
    });
  });

  describe('awardAchievement', () => {
    test('awards achievement successfully', async () => {
      const mockAchievement: Achievement = {
        id: '1',
        userId: 1,
        achievementType: 'consistent_updater',
        achievementData: { completion_rate: 100 },
        earnedAt: '2024-07-30T00:00:00Z',
        weekStart: '2024-07-29',
        createdAt: '2024-07-30T00:00:00Z',
        updatedAt: '2024-07-30T00:00:00Z'
      };

      mockDatabaseService.createAchievement.mockResolvedValue(mockAchievement);

      const result = await RecognitionService.awardAchievement(
        1, 
        'consistent_updater', 
        { completion_rate: 100 },
        '2024-07-29'
      );

      expect(result).toEqual(mockAchievement);
      expect(mockDatabaseService.createAchievement).toHaveBeenCalledWith({
        userId: 1,
        achievementType: 'consistent_updater',
        achievementData: { completion_rate: 100 },
        weekStart: '2024-07-29'
      });
    });

    test('handles creation failure gracefully', async () => {
      mockDatabaseService.createAchievement.mockRejectedValue(new Error('Database error'));

      const result = await RecognitionService.awardAchievement(1, 'consistent_updater');

      expect(result).toBeNull();
    });
  });

  describe('formatAchievementData', () => {
    test('formats achievement with completion rate', () => {
      const achievement: Achievement = {
        id: '1',
        userId: 1,
        achievementType: 'consistent_updater',
        achievementData: { completion_rate: 100 },
        earnedAt: '2024-07-30T00:00:00Z',
        createdAt: '2024-07-30T00:00:00Z',
        updatedAt: '2024-07-30T00:00:00Z'
      };

      const formatted = RecognitionService.formatAchievementData(achievement);

      expect(formatted).toContain('100% completion');
      expect(formatted).toContain(ACHIEVEMENT_CONFIGS.consistent_updater.description);
    });

    test('formats achievement with streak length', () => {
      const achievement: Achievement = {
        id: '1',
        userId: 1,
        achievementType: 'reliability_streak',
        achievementData: { streak_length: 5 },
        earnedAt: '2024-07-30T00:00:00Z',
        createdAt: '2024-07-30T00:00:00Z',
        updatedAt: '2024-07-30T00:00:00Z'
      };

      const formatted = RecognitionService.formatAchievementData(achievement);

      expect(formatted).toContain('5 week streak');
    });

    test('handles unknown achievement type gracefully', () => {
      const achievement: Achievement = {
        id: '1',
        userId: 1,
        achievementType: 'unknown_type' as any,
        achievementData: {},
        earnedAt: '2024-07-30T00:00:00Z',
        createdAt: '2024-07-30T00:00:00Z',
        updatedAt: '2024-07-30T00:00:00Z'
      };

      const formatted = RecognitionService.formatAchievementData(achievement);

      expect(formatted).toBe('unknown_type');
    });
  });
});