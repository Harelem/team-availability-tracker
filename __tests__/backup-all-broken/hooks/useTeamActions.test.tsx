/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useTeamActions, useFileDownload, useNotificationActions } from '@/hooks/useTeamActions';

// Mock window.history
const mockPushState = jest.fn();
Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
  },
  writable: true,
});

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
};

// Mock Math.random for predictable test results
const mockRandom = jest.fn();
Math.random = mockRandom;

// Mock notifications
Object.defineProperty(window, 'Notification', {
  value: class MockNotification {
    static permission = 'granted';
    static requestPermission = jest.fn(() => Promise.resolve('granted'));
    constructor(public title: string, public options?: NotificationOptions) {}
  },
  configurable: true,
});

describe('useTeamActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    mockPushState.mockClear();
    mockRandom.mockReturnValue(0.5); // Default to 50% for predictable results
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('exportTeamData', () => {
    it('should export team data as CSV successfully', async () => {
      mockRandom.mockReturnValue(0.5); // Ensure success (> 0.1)
      
      const { result } = renderHook(() => useTeamActions(1));

      expect(result.current.loading).toBe(false);

      const exportResult = await result.current.exportTeamData('csv');

      expect(exportResult.success).toBe(true);
      expect(exportResult.filename).toMatch(/^team-1-data-.*\.csv$/);
      expect(exportResult.downloadUrl).toContain('/api/exports/');
      expect(consoleSpy.log).toHaveBeenCalledWith('Exporting team 1 data as csv...');
    });

    it('should export team data as Excel successfully', async () => {
      mockRandom.mockReturnValue(0.5);
      
      const { result } = renderHook(() => useTeamActions(2));

      const exportResult = await result.current.exportTeamData('excel');

      expect(exportResult.success).toBe(true);
      expect(exportResult.filename).toMatch(/^team-2-data-.*\.excel$/);
      expect(exportResult.downloadUrl).toContain('/api/exports/');
    });

    it('should handle export failures', async () => {
      mockRandom.mockReturnValue(0.05); // Cause failure (< 0.1)
      
      const { result } = renderHook(() => useTeamActions(1));

      const exportResult = await result.current.exportTeamData('csv');

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toBe('Export service temporarily unavailable');
    });

  });

  describe('sendReminders', () => {
    it('should send reminders successfully', async () => {
      mockRandom.mockReturnValue(0.5);
      
      const { result } = renderHook(() => useTeamActions(1));

      const reminderResult = await result.current.sendReminders([1, 2, 3]);

      expect(reminderResult.success).toBe(true);
      expect(reminderResult.sentCount).toBe(2); // 85% of 3 members
      expect(reminderResult.failedCount).toBe(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sending reminders to 3 team members...');
    });

    it('should handle empty member list', async () => {
      const { result } = renderHook(() => useTeamActions(1));

      const reminderResult = await result.current.sendReminders([]);

      expect(reminderResult.success).toBe(false);
      expect(reminderResult.sentCount).toBe(0);
      expect(reminderResult.failedCount).toBe(0);
      expect(reminderResult.error).toBe('No team members selected for reminders');
    });

    it('should handle complete failure scenario', async () => {
      // Mock a scenario where all reminders fail
      const { result } = renderHook(() => useTeamActions(1));

      // Override the hook's internal behavior for this test
      mockRandom.mockReturnValue(0.5);
      
      const reminderResult = await result.current.sendReminders([1]);
      
      // With our 85% success rate, 1 member should succeed
      expect(reminderResult.sentCount).toBe(0); // floor(1 * 0.85) = 0
      expect(reminderResult.failedCount).toBe(1);
    });

  });

  describe('navigateToTeamDashboard', () => {
    it('should navigate to team dashboard successfully', async () => {
      const { result } = renderHook(() => useTeamActions(5));

      const navigationResult = await result.current.navigateToTeamDashboard();

      expect(navigationResult.success).toBe(true);
      expect(navigationResult.redirectUrl).toBe('/team/5/dashboard');
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/team/5/dashboard');
      expect(consoleSpy.log).toHaveBeenCalledWith('Navigating to team dashboard: /team/5/dashboard');
    });

  });

  describe('scheduleMeeting', () => {
    it('should schedule meeting successfully', async () => {
      const { result } = renderHook(() => useTeamActions(3));

      const meetingResult = await result.current.scheduleMeeting([1, 2, 4]);

      expect(meetingResult.success).toBe(true);
      expect(meetingResult.redirectUrl).toBe('/calendar/schedule?team=3&member=1&member=2&member=4');
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/calendar/schedule?team=3&member=1&member=2&member=4');
      expect(consoleSpy.log).toHaveBeenCalledWith('Scheduling meeting with team 3 members: 1, 2, 4');
    });

    it('should handle empty member list for meeting', async () => {
      const { result } = renderHook(() => useTeamActions(1));

      const meetingResult = await result.current.scheduleMeeting([]);

      expect(meetingResult.success).toBe(false);
      expect(meetingResult.error).toBe('No team members selected for meeting');
    });

  });

  describe('loading and error states', () => {
    it('should clear error state when starting new action', async () => {
      mockRandom.mockReturnValue(0.05); // Cause first action to fail
      
      const { result } = renderHook(() => useTeamActions(1));

      // First action fails
      const firstResult = await result.current.exportTeamData('csv');
      expect(firstResult.success).toBe(false);

      mockRandom.mockReturnValue(0.5); // Make next action succeed
      
      // Second action should clear error
      const secondResult = await result.current.exportTeamData('csv');
      expect(secondResult.success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle multiple concurrent actions properly', async () => {
      const { result } = renderHook(() => useTeamActions(1));

      // Start multiple actions concurrently
      const [exportResult, navigationResult] = await Promise.all([
        result.current.exportTeamData('csv'),
        result.current.navigateToTeamDashboard()
      ]);

      expect(exportResult.success).toBe(true);
      expect(navigationResult.success).toBe(true);
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('useFileDownload', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useFileDownload());
    expect(typeof result.current.downloadFile).toBe('function');
  });
});

describe('useNotificationActions', () => {
  it('should exist and provide notification functions', () => {
    const { result } = renderHook(() => useNotificationActions());
    
    expect(typeof result.current.showSuccessNotification).toBe('function');
    expect(typeof result.current.showErrorNotification).toBe('function');
    expect(typeof result.current.requestNotificationPermission).toBe('function');
  });
});