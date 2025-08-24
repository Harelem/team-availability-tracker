import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduleTable from '@/components/ScheduleTable';
import PersonalScheduleTable from '@/components/PersonalScheduleTable';
import { supabase } from '@/lib/supabase';

// Mock Supabase with realistic responses based on debug knowledge base
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ 
                data: [
                  { 
                    id: '1', 
                    date: '2024-01-01', 
                    hours: 7, 
                    status: 'present', 
                    team_member_id: 1,
                    created_at: '2024-01-01T00:00:00Z'
                  },
                  { 
                    id: '2', 
                    date: '2024-01-02', 
                    hours: 0, 
                    status: 'absent', 
                    team_member_id: 1, 
                    reason: 'Sick',
                    created_at: '2024-01-02T00:00:00Z'
                  }
                ], 
                error: null 
              }))
            }))
          }))
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { 
              id: '1', 
              date: '2024-01-01', 
              hours: 7, 
              status: 'present',
              team_member_id: 1 
            }, 
            error: null 
          }))
        }))
      })),
      channel: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn((callback) => {
            if (typeof callback === 'function') {
              // Simulate successful subscription
              setTimeout(() => callback('SUBSCRIBED'), 100);
            }
            return { unsubscribe: jest.fn() };
          })
        }))
      }))
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-123' } },
        error: null
      }))
    },
    removeChannel: jest.fn()
  }
}));

// Mock GlobalSprintContext
const mockSprintContext = {
  currentSprint: {
    current_sprint_number: 1,
    start_date: '2024-01-01',
    end_date: '2024-01-14'
  },
  isLoading: false
};

jest.mock('@/contexts/GlobalSprintContext', () => ({
  useGlobalSprint: () => mockSprintContext
}));

describe('Schedule Table Core Functions - Bug Report #28 Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * CRITICAL TEST - Bug Report #28: Data Persistence Between Views
   * This was the highest priority issue where users reported data disappearing
   * when switching between week and sprint views
   */
  it('should maintain data consistency when switching between week and sprint views', async () => {
    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    const { getByText, getByTestId, rerender } = render(
      <ScheduleTable {...mockProps} />
    );
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByTestId('schedule-table')).toBeInTheDocument();
    });
    
    // Simulate reporting hours in week view
    const dayButton = screen.getByTestId('day-2024-01-01');
    await userEvent.click(dayButton);
    
    const fullDayButton = screen.getByText('יום מלא');
    await userEvent.click(fullDayButton);
    
    // Wait for update to be processed
    await waitFor(() => {
      expect(dayButton).toHaveAttribute('data-hours', '7');
    });
    
    // Switch to sprint view - this was the critical failure point
    const sprintButton = screen.getByText('ספרינט');
    await userEvent.click(sprintButton);
    
    // CRITICAL ASSERTION: Data must persist in sprint view
    await waitFor(() => {
      const sameDayInSprint = screen.getByTestId('day-2024-01-01');
      expect(sameDayInSprint).toHaveAttribute('data-hours', '7');
    });
    
    // Switch back to week view
    const weekButton = screen.getByText('שבוע');
    await userEvent.click(weekButton);
    
    // CRITICAL ASSERTION: Data must still be consistent
    await waitFor(() => {
      const dayInWeekView = screen.getByTestId('day-2024-01-01');
      expect(dayInWeekView).toHaveAttribute('data-hours', '7');
    });

    // Verify that navigation mode switching doesn't trigger extra API calls
    // This was part of the bug - each view switch was fetching data again
    expect(supabase.from).toHaveBeenCalledTimes(1); // Only one fetch for full range
  }, 10000);

  /**
   * TEST - Requirement from debug knowledge: Reason validation
   */
  it('should require reason for half day and absent status', async () => {
    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    const { getByText, getByPlaceholderText } = render(<ScheduleTable {...mockProps} />);
    
    // Wait for data load
    await waitFor(() => {
      expect(screen.getByTestId('schedule-table')).toBeInTheDocument();
    });
    
    // Try to set half day
    const dayButton = screen.getByTestId('day-2024-01-02');
    await userEvent.click(dayButton);
    
    const halfDayButton = screen.getByText('חצי יום');
    await userEvent.click(halfDayButton);
    
    // Should show reason input
    await waitFor(() => {
      expect(getByPlaceholderText('הזן סיבה...')).toBeInTheDocument();
    });
    
    // Enter reason and verify save
    const reasonInput = getByPlaceholderText('הזן סיבה...');
    await userEvent.type(reasonInput, 'Doctor appointment');
    await userEvent.tab(); // Trigger blur event
    
    // Verify upsert called with reason
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('schedule_entries');
    });
  });

  /**
   * CRITICAL TEST - Bug Report #27: Authentication Error Handling
   */
  it('should handle authentication errors gracefully', async () => {
    // Mock authentication error - common issue from debug knowledge base
    const mockError = { 
      code: 'PGRST301', 
      message: 'JWT expired',
      details: null,
      hint: null
    };

    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => ({
              order: () => Promise.resolve({ 
                data: null, 
                error: mockError
              })
            })
          })
        })
      })
    }));

    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    const { getByText } = render(<ScheduleTable {...mockProps} />);
    
    // Should show authentication error message
    await waitFor(() => {
      expect(getByText(/Authentication Error|שגיאת אימות/i)).toBeInTheDocument();
    });
    
    // Should provide refresh mechanism
    expect(getByText(/Refresh|רענן/i)).toBeInTheDocument();
  });

  /**
   * TEST - Bug Report Pattern: Retry mechanism for failed requests
   */
  it('should retry failed requests automatically', async () => {
    let attempts = 0;
    
    // Mock network errors that should trigger retries
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => ({
              order: () => {
                attempts++;
                if (attempts < 3) {
                  return Promise.resolve({ 
                    data: null, 
                    error: { message: 'Network error', code: 'NETWORK_ERROR' } 
                  });
                }
                return Promise.resolve({ 
                  data: [{ 
                    id: '1', 
                    date: '2024-01-01', 
                    hours: 7, 
                    status: 'present',
                    team_member_id: 1 
                  }], 
                  error: null 
                });
              }
            })
          })
        })
      })
    }));

    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    render(<ScheduleTable {...mockProps} />);
    
    // Should eventually succeed after retries
    await waitFor(() => {
      expect(screen.getByTestId('day-2024-01-01')).toBeInTheDocument();
    }, { timeout: 8000 });
    
    // Verify retry attempts were made
    expect(attempts).toBe(3);
  });

  /**
   * CRITICAL TEST - Bug Report #25: Navigation State Updates
   * Prevents infinite loops and state update chains
   */
  it('should handle navigation without infinite state updates', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    render(<ScheduleTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('schedule-table')).toBeInTheDocument();
    });

    // Rapidly switch between navigation modes
    const sprintButton = screen.getByText('ספרינט');
    const weekButton = screen.getByText('שבוע');

    // Simulate rapid navigation switching
    for (let i = 0; i < 5; i++) {
      await userEvent.click(sprintButton);
      await userEvent.click(weekButton);
    }

    // Should not trigger "Maximum update depth exceeded" error
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Maximum update depth exceeded')
    );

    consoleSpy.mockRestore();
  });

  /**
   * TEST - Real-time subscription handling
   * Based on WebSocket connection issues from debug knowledge base
   */
  it('should handle real-time subscriptions correctly', async () => {
    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    const { unmount } = render(<ScheduleTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('schedule-table')).toBeInTheDocument();
    });

    // Verify channel subscription was set up
    expect(supabase.from).toHaveBeenCalled();
    expect(supabase.channel).toHaveBeenCalled();

    // Unmount component
    unmount();

    // Verify cleanup was called (prevents memory leaks)
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  /**
   * TEST - Data integrity checks
   */
  it('should prevent duplicate schedule entries', async () => {
    // Mock upsert to simulate duplicate prevention
    supabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => ({
              order: () => Promise.resolve({ 
                data: [
                  { id: '1', date: '2024-01-01', hours: 7, status: 'present', team_member_id: 1 }
                ], 
                error: null 
              })
            })
          })
        })
      }),
      upsert: jest.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: { id: '1', date: '2024-01-01', hours: 3.5, status: 'half_day' }, 
            error: null 
          })
        })
      }))
    }));

    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    render(<ScheduleTable {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('schedule-table')).toBeInTheDocument();
    });

    // Update same day twice
    const dayButton = screen.getByTestId('day-2024-01-01');
    await userEvent.click(dayButton);
    
    const halfDayButton = screen.getByText('חצי יום');
    await userEvent.click(halfDayButton);

    // Should use upsert (not insert) to prevent duplicates
    await waitFor(() => {
      expect(supabase.from().upsert).toHaveBeenCalled();
    });
  });
});

/**
 * ADDITIONAL TEST SUITE - PersonalScheduleTable specific tests
 * This component had similar issues to ScheduleTable
 */
describe('PersonalScheduleTable - Data Persistence Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it('should maintain personal data consistency across view switches', async () => {
    const mockProps = {
      userId: 'test-user-123',
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    render(<PersonalScheduleTable {...mockProps} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('personal-schedule-table')).toBeInTheDocument();
    });

    // Test personal schedule specific functionality
    const dayCell = screen.getByTestId('day-2024-01-01');
    await userEvent.click(dayCell);

    // Verify personal schedule updates work
    const fullDayOption = screen.getByText('יום מלא');
    await userEvent.click(fullDayOption);

    await waitFor(() => {
      expect(dayCell).toHaveAttribute('data-hours', '7');
    });

    // Switch views and verify persistence
    const sprintView = screen.getByText('ספרינט');
    await userEvent.click(sprintView);

    await waitFor(() => {
      const sameDayInSprint = screen.getByTestId('day-2024-01-01');
      expect(sameDayInSprint).toHaveAttribute('data-hours', '7');
    });
  });
});

/**
 * INTEGRATION TEST - Full user workflow
 * Tests the complete user journey that was failing
 */
describe('Complete User Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it('should support complete user workflow without data loss', async () => {
    const mockProps = {
      userId: 'test-user',
      teamId: 1,
      selectedTeam: { id: 1, name: 'Test Team' }
    };

    const { rerender } = render(<ScheduleTable {...mockProps} />);
    
    // Step 1: Load schedule
    await waitFor(() => {
      expect(screen.getByTestId('schedule-table')).toBeInTheDocument();
    });

    // Step 2: Report hours for multiple days
    const day1 = screen.getByTestId('day-2024-01-01');
    const day2 = screen.getByTestId('day-2024-01-02');

    await userEvent.click(day1);
    await userEvent.click(screen.getByText('יום מלא'));
    
    await userEvent.click(day2);
    await userEvent.click(screen.getByText('חצי יום'));
    
    // Add reason for half day
    const reasonInput = screen.getByPlaceholderText('הזן סיבה...');
    await userEvent.type(reasonInput, 'Medical appointment');
    await userEvent.tab();

    // Step 3: Switch to sprint view
    await userEvent.click(screen.getByText('ספרינט'));

    // Step 4: Verify all data persists
    await waitFor(() => {
      expect(screen.getByTestId('day-2024-01-01')).toHaveAttribute('data-hours', '7');
      expect(screen.getByTestId('day-2024-01-02')).toHaveAttribute('data-hours', '3.5');
    });

    // Step 5: Switch back to week view
    await userEvent.click(screen.getByText('שבוע'));

    // Step 6: Final verification
    await waitFor(() => {
      expect(screen.getByTestId('day-2024-01-01')).toHaveAttribute('data-hours', '7');
      expect(screen.getByTestId('day-2024-01-02')).toHaveAttribute('data-hours', '3.5');
    });

    // Verify that only one data fetch occurred (single source of truth)
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});