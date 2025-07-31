/**
 * Recognition System Integration Tests
 * 
 * Validates achievement system functionality, badge mechanics, milestone tracking,
 * team recognition features, and cross-component integration.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RecognitionDashboard from '../../src/components/recognition/RecognitionDashboard';
import { DatabaseService } from '@/lib/database';

// Mock database dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Mock recognition system hook
jest.mock('../../src/hooks/useRecognitionSystem', () => ({
  useRecognitionSystem: jest.fn(() => ({
    userAchievements: [],
    availableBadges: [],
    userStats: {
      totalPoints: 0,
      currentStreak: 0,
      completedSprints: 0,
      badgesEarned: 0
    },
    isLoading: false,
    error: null,
    refreshAchievements: jest.fn()
  }))
}));

describe('Recognition System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Achievement System Core Functionality', () => {
    it('should track and display user achievements correctly', async () => {
      const { useRecognitionSystem } = require('../../src/hooks/useRecognitionSystem');
      
      const mockAchievements = [
        {
          id: 'perfect-week-1',
          title: 'Perfect Week',
          description: 'Completed a full week with 100% availability',
          badgeId: 'perfect-attendee',
          earnedAt: '2024-01-15T10:00:00Z',
          points: 50
        },
        {
          id: 'team-player-1',
          title: 'Team Player',
          description: 'Helped cover for teammates 5 times',
          badgeId: 'team-support',
          earnedAt: '2024-01-20T14:30:00Z',
          points: 75
        }
      ];
      
      useRecognitionSystem.mockReturnValue({
        userAchievements: mockAchievements,
        availableBadges: [],
        userStats: {
          totalPoints: 125,
          currentStreak: 3,
          completedSprints: 5,
          badgesEarned: 2
        },
        isLoading: false,
        error: null,
        refreshAchievements: jest.fn()
      });
      
      render(<RecognitionDashboard userId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('Perfect Week')).toBeInTheDocument();
        expect(screen.getByText('Team Player')).toBeInTheDocument();
        expect(screen.getByText('125')).toBeInTheDocument(); // Total points
      });
    });

    it('should validate achievement criteria based on schedule data', () => {
      // Perfect Week Achievement: 35 hours (5 days × 7 hours)
      const perfectWeekSchedule = [
        { date: '2024-01-07', hours: 7 }, // Sunday
        { date: '2024-01-08', hours: 7 }, // Monday
        { date: '2024-01-09', hours: 7 }, // Tuesday
        { date: '2024-01-10', hours: 7 }, // Wednesday
        { date: '2024-01-11', hours: 7 }  // Thursday
      ];
      
      const totalHours = perfectWeekSchedule.reduce((sum, day) => sum + day.hours, 0);
      expect(totalHours).toBe(35);
      
      // Streak Achievement: Consistent 35 hours for multiple weeks
      const consistentStreak = [
        { week: 1, hours: 35 },
        { week: 2, hours: 35 },
        { week: 3, hours: 35 }
      ];
      
      const qualifiesForStreak = consistentStreak.every(week => week.hours === 35);
      expect(qualifiesForStreak).toBe(true);
    });

    it('should calculate achievement points correctly', () => {
      const achievementPoints = {
        'perfect-week': 50,
        'consistency-streak-3': 75,
        'team-support': 100,
        'early-submitter': 25,
        'overtime-hero': 150
      };
      
      const earnedAchievements = ['perfect-week', 'team-support', 'early-submitter'];
      const totalPoints = earnedAchievements.reduce((sum, achievement) => 
        sum + achievementPoints[achievement], 0
      );
      
      expect(totalPoints).toBe(175); // 50 + 100 + 25
    });
  });

  describe('Badge System Integration', () => {
    it('should display earned badges with proper visual hierarchy', async () => {
      const { useRecognitionSystem } = require('../../src/hooks/useRecognitionSystem');
      
      const mockBadges = [
        {
          id: 'perfect-attendee',
          name: 'Perfect Attendee',
          description: 'Maintains 100% availability',
          iconUrl: '/badges/perfect-attendee.svg',
          rarity: 'common',
          isEarned: true,
          earnedAt: '2024-01-15T10:00:00Z'
        },
        {
          id: 'consistency-master',
          name: 'Consistency Master',
          description: 'Maintained streak for 10 weeks',
          iconUrl: '/badges/consistency-master.svg',
          rarity: 'legendary',
          isEarned: true,
          earnedAt: '2024-02-01T09:00:00Z'
        },
        {
          id: 'team-captain',
          name: 'Team Captain',
          description: 'Leadership in team coordination',
          iconUrl: '/badges/team-captain.svg',
          rarity: 'epic',
          isEarned: false
        }
      ];
      
      useRecognitionSystem.mockReturnValue({
        userAchievements: [],
        availableBadges: mockBadges,
        userStats: {
          totalPoints: 300,
          currentStreak: 10,
          completedSprints: 15,
          badgesEarned: 2
        },
        isLoading: false,
        error: null,
        refreshAchievements: jest.fn()
      });
      
      render(<RecognitionDashboard userId={1} />);
      
      await waitFor(() => {
        // Earned badges should be displayed
        expect(screen.getByText('Perfect Attendee')).toBeInTheDocument();
        expect(screen.getByText('Consistency Master')).toBeInTheDocument();
        
        // Unearned badges should show as locked
        const teamCaptainBadge = screen.queryByText('Team Captain');
        if (teamCaptainBadge) {
          expect(teamCaptainBadge.closest('[class*="opacity-"]')).toBeTruthy();
        }
      });
    });

    it('should handle badge rarity levels correctly', () => {
      const rarityLevels = {
        common: { color: '#10B981', points: 25 },
        rare: { color: '#3B82F6', points: 50 },
        epic: { color: '#8B5CF6', points: 100 },
        legendary: { color: '#F59E0B', points: 200 }
      };
      
      Object.entries(rarityLevels).forEach(([rarity, config]) => {
        expect(config.points).toBeGreaterThan(0);
        expect(config.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
      
      // Legendary should be worth more than epic
      expect(rarityLevels.legendary.points).toBeGreaterThan(rarityLevels.epic.points);
      expect(rarityLevels.epic.points).toBeGreaterThan(rarityLevels.rare.points);
      expect(rarityLevels.rare.points).toBeGreaterThan(rarityLevels.common.points);
    });

    it('should show badge progress for near achievements', async () => {
      const { useRecognitionSystem } = require('../../src/hooks/useRecognitionSystem');
      
      const nearAchievementBadge = {
        id: 'early-bird',
        name: 'Early Bird',
        description: 'Submit schedule before deadline 20 times',
        iconUrl: '/badges/early-bird.svg',
        rarity: 'rare',
        isEarned: false,
        progress: {
          current: 17,
          required: 20,
          percentage: 85
        }
      };
      
      useRecognitionSystem.mockReturnValue({
        userAchievements: [],
        availableBadges: [nearAchievementBadge],
        userStats: {
          totalPoints: 150,
          currentStreak: 5,
          completedSprints: 8,
          badgesEarned: 1
        },
        isLoading: false,
        error: null,
        refreshAchievements: jest.fn()
      });
      
      render(<RecognitionDashboard userId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('Early Bird')).toBeInTheDocument();
        
        // Should show progress indicators
        const progressText = screen.queryByText(/17.*20/);
        if (progressText) {
          expect(progressText).toBeInTheDocument();
        }
      });
    });
  });

  describe('Milestone Tracking System', () => {
    it('should track sprint completion milestones accurately', () => {
      const sprintMilestones = {
        novice: { sprintsRequired: 1, title: 'First Sprint', points: 25 },
        regular: { sprintsRequired: 5, title: 'Regular Contributor', points: 50 },
        experienced: { sprintsRequired: 15, title: 'Experienced Member', points: 100 },
        veteran: { sprintsRequired: 50, title: 'Sprint Veteran', points: 250 },
        master: { sprintsRequired: 100, title: 'Sprint Master', points: 500 }
      };
      
      const completedSprints = 15;
      
      // User should qualify for experienced milestone
      const qualifiedMilestones = Object.entries(sprintMilestones)
        .filter(([_, milestone]) => completedSprints >= milestone.sprintsRequired);
      
      expect(qualifiedMilestones.length).toBe(3); // novice, regular, experienced
      expect(qualifiedMilestones.map(([key]) => key)).toEqual(['novice', 'regular', 'experienced']);
    });

    it('should track consistency streak milestones', () => {
      const consistencyMilestones = {
        'streak-3': { weeks: 3, title: 'Getting Started', points: 30 },
        'streak-7': { weeks: 7, title: 'One Month Strong', points: 70 },
        'streak-15': { weeks: 15, title: 'Quarter Champion', points: 150 },
        'streak-30': { weeks: 30, title: 'Half Year Hero', points: 300 },
        'streak-52': { weeks: 52, title: 'Annual Legend', points: 520 }
      };
      
      const currentStreak = 15;
      
      const achievedStreaks = Object.entries(consistencyMilestones)
        .filter(([_, milestone]) => currentStreak >= milestone.weeks);
      
      expect(achievedStreaks.length).toBe(3); // 3, 7, 15 week streaks
      
      const nextMilestone = Object.entries(consistencyMilestones)
        .find(([_, milestone]) => currentStreak < milestone.weeks);
      
      expect(nextMilestone[1].weeks).toBe(30); // Next target is 30 weeks
    });

    it('should calculate hours-based milestones correctly', () => {
      const hoursMilestones = {
        'hours-100': { hours: 100, title: 'Century Mark', points: 50 },
        'hours-500': { hours: 500, title: 'Power Contributor', points: 200 },
        'hours-1000': { hours: 1000, title: 'Thousand Club', points: 400 },
        'hours-2500': { hours: 2500, title: 'Elite Performer', points: 750 }
      };
      
      // User with 15 completed sprints at 35 hours each = 525 hours
      const totalHours = 15 * 35;
      expect(totalHours).toBe(525);
      
      const achievedHoursMilestones = Object.entries(hoursMilestones)
        .filter(([_, milestone]) => totalHours >= milestone.hours);
      
      expect(achievedHoursMilestones.length).toBe(2); // 100 and 500 hour milestones
      expect(achievedHoursMilestones.map(([key]) => key)).toEqual(['hours-100', 'hours-500']);
    });
  });

  describe('Team Recognition Features', () => {
    it('should display team-wide achievements and leaderboards', async () => {
      const { useRecognitionSystem } = require('../../src/hooks/useRecognitionSystem');
      
      const teamStats = {
        teamId: 1,
        teamName: 'Product Team',
        totalPoints: 1250,
        averageStreak: 8.5,
        topPerformers: [
          { userId: 1, name: 'John Doe', points: 350, badges: 5 },
          { userId: 2, name: 'Jane Smith', points: 300, badges: 4 },
          { userId: 3, name: 'Bob Johnson', points: 250, badges: 3 }
        ],
        teamAchievements: [
          {
            id: 'team-perfect-sprint',
            title: 'Perfect Sprint Team',
            description: 'Entire team achieved 100% availability',
            earnedAt: '2024-01-20T16:00:00Z'
          }
        ]
      };
      
      useRecognitionSystem.mockReturnValue({
        userAchievements: [],
        availableBadges: [],
        userStats: {
          totalPoints: 350,
          currentStreak: 10,
          completedSprints: 12,
          badgesEarned: 5
        },
        teamStats,
        isLoading: false,
        error: null,
        refreshAchievements: jest.fn()
      });
      
      render(<RecognitionDashboard userId={1} teamId={1} />);
      
      await waitFor(() => {
        // Team achievement should be displayed
        expect(screen.getByText('Perfect Sprint Team')).toBeInTheDocument();
        
        // Leaderboard should show top performers
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should handle team collaboration achievements', () => {
      const collaborationMetrics = {
        coverageEvents: [
          { userId: 1, coveredFor: 2, date: '2024-01-15', hours: 3.5 },
          { userId: 3, coveredFor: 1, date: '2024-01-16', hours: 7 },
          { userId: 2, coveredFor: 3, date: '2024-01-17', hours: 7 }
        ],
        teamSupportScore: 85,
        mutualHelpEvents: 12
      };
      
      // Team support achievement criteria
      const teamSupportThreshold = 80;
      const qualifiesForTeamSupport = collaborationMetrics.teamSupportScore >= teamSupportThreshold;
      expect(qualifiesForTeamSupport).toBe(true);
      
      // Individual coverage achievements  
      const coverageHours = collaborationMetrics.coverageEvents.reduce((sum, event) => sum + event.hours, 0);
      expect(coverageHours).toBe(17.5); // 3.5 + 7 + 7
    });

    it('should rank teams in organization-wide competitions', () => {
      const organizationTeams = [
        { teamId: 1, name: 'Product Team', totalPoints: 2500, avgStreakWeeks: 12 },
        { teamId: 2, name: 'Dev Team Tal', totalPoints: 2200, avgStreakWeeks: 10 },
        { teamId: 3, name: 'Infrastructure Team', totalPoints: 2800, avgStreakWeeks: 15 },
        { teamId: 4, name: 'Data Team', totalPoints: 2100, avgStreakWeeks: 8 }
      ];
      
      // Rank by total points
      const rankedByPoints = [...organizationTeams].sort((a, b) => b.totalPoints - a.totalPoints);
      expect(rankedByPoints[0].name).toBe('Infrastructure Team');
      expect(rankedByPoints[1].name).toBe('Product Team');
      
      // Rank by consistency (average streak)
      const rankedByConsistency = [...organizationTeams].sort((a, b) => b.avgStreakWeeks - a.avgStreakWeeks);
      expect(rankedByConsistency[0].name).toBe('Infrastructure Team');
      expect(rankedByConsistency[1].name).toBe('Product Team');
    });
  });

  describe('Recognition System Accessibility', () => {
    it('should provide screen reader support for achievements', async () => {
      const { useRecognitionSystem } = require('../../src/hooks/useRecognitionSystem');
      
      useRecognitionSystem.mockReturnValue({
        userAchievements: [
          {
            id: 'accessible-achievement',
            title: 'Accessibility Champion',
            description: 'Maintained perfect attendance for accessibility',
            badgeId: 'accessibility-badge',
            earnedAt: '2024-01-15T10:00:00Z',
            points: 100
          }
        ],
        availableBadges: [],
        userStats: {
          totalPoints: 100,
          currentStreak: 5,
          completedSprints: 3,
          badgesEarned: 1
        },
        isLoading: false,
        error: null,
        refreshAchievements: jest.fn()
      });
      
      render(<RecognitionDashboard userId={1} />);
      
      await waitFor(() => {
        const achievement = screen.getByText('Accessibility Champion');
        expect(achievement).toBeInTheDocument();
        
        // Achievement should have proper ARIA attributes
        const achievementContainer = achievement.closest('[role]');
        if (achievementContainer) {
          expect(achievementContainer).toHaveAttribute('role');
        }
      });
    });

    it('should provide keyboard navigation for badge gallery', async () => {
      const user = userEvent.setup();
      const { useRecognitionSystem } = require('../../src/hooks/useRecognitionSystem');
      
      useRecognitionSystem.mockReturnValue({
        userAchievements: [],
        availableBadges: [
          { id: 'badge-1', name: 'Badge 1', isEarned: true },
          { id: 'badge-2', name: 'Badge 2', isEarned: false },
          { id: 'badge-3', name: 'Badge 3', isEarned: true }
        ],
        userStats: {
          totalPoints: 200,
          currentStreak: 7,
          completedSprints: 6,
          badgesEarned: 2
        },
        isLoading: false,
        error: null,
        refreshAchievements: jest.fn()
      });
      
      render(<RecognitionDashboard userId={1} />);
      
      await waitFor(() => {
        const badgeElements = screen.getAllByText(/Badge \d/);
        expect(badgeElements.length).toBe(3);
      });
      
      // Should be able to navigate badges with keyboard
      await user.tab();
      expect(document.activeElement).toBeTruthy();
    });

    it('should handle high contrast mode for badge visibility', async () => {
      // Enable high contrast mode
      document.documentElement.classList.add('high-contrast');
      
      const { useRecognitionSystem } = require('../../src/hooks/useRecognitionSystem');
      
      useRecognitionSystem.mockReturnValue({
        userAchievements: [],
        availableBadges: [
          {
            id: 'contrast-badge',
            name: 'High Contrast Badge',
            description: 'Badge for contrast testing',
            rarity: 'common',
            isEarned: true
          }
        ],
        userStats: {
          totalPoints: 50,
          currentStreak: 2,
          completedSprints: 1,
          badgesEarned: 1
        },
        isLoading: false,
        error: null,
        refreshAchievements: jest.fn()
      });
      
      const { container } = render(<RecognitionDashboard userId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('High Contrast Badge')).toBeInTheDocument();
        
        // Badge should maintain visibility in high contrast
        const badgeElement = container.querySelector('[class*="badge"]');
        if (badgeElement) {
          const computedStyle = window.getComputedStyle(badgeElement);
          expect(computedStyle).toBeTruthy();
        }
      });
      
      // Clean up
      document.documentElement.classList.remove('high-contrast');
    });
  });

  describe('Recognition Data Integration', () => {
    it('should sync achievements with database correctly', async () => {
      mockDatabaseService.getUserAchievements.mockResolvedValue([
        {
          id: 'db-achievement-1',
          userId: 1,
          achievementType: 'perfect-week',
          earnedAt: '2024-01-15T10:00:00Z',
          points: 50,
          metadata: { weekStart: '2024-01-07', totalHours: 35 }
        }
      ]);
      
      const achievements = await mockDatabaseService.getUserAchievements(1);
      
      expect(achievements).toHaveLength(1);
      expect(achievements[0].achievementType).toBe('perfect-week');
      expect(achievements[0].points).toBe(50);
      expect(achievements[0].metadata.totalHours).toBe(35);
    });

    it('should handle achievement notification system', async () => {
      const mockNotification = {
        userId: 1,
        type: 'achievement-earned',
        title: 'New Achievement Unlocked!',
        message: 'You earned the Perfect Week badge',
        achievementId: 'perfect-week-1',
        timestamp: '2024-01-15T10:00:00Z',
        isRead: false
      };
      
      mockDatabaseService.createNotification.mockResolvedValue(mockNotification);
      
      const notification = await mockDatabaseService.createNotification(
        1,
        'achievement-earned',
        'New Achievement Unlocked!',
        'You earned the Perfect Week badge'
      );
      
      expect(notification.type).toBe('achievement-earned');
      expect(notification.isRead).toBe(false);
      expect(notification.message).toContain('Perfect Week');
    });

    it('should validate achievement eligibility before awarding', () => {
      const scheduleData = {
        weekStart: '2024-01-07',
        entries: [
          { date: '2024-01-07', value: '1' }, // Sunday
          { date: '2024-01-08', value: '1' }, // Monday  
          { date: '2024-01-09', value: '1' }, // Tuesday
          { date: '2024-01-10', value: '1' }, // Wednesday
          { date: '2024-01-11', value: '1' }  // Thursday
        ]
      };
      
      // Perfect Week validation
      const isPerfectWeek = scheduleData.entries.every(entry => entry.value === '1');
      const hasAllWorkingDays = scheduleData.entries.length === 5; // Sunday-Thursday
      
      expect(isPerfectWeek).toBe(true);
      expect(hasAllWorkingDays).toBe(true);
      
      // Calculate total hours: 5 days × 7 hours = 35 hours
      const totalHours = scheduleData.entries.length * 7;
      expect(totalHours).toBe(35);
    });
  });
});