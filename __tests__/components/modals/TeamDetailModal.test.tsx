/**
 * @jest-environment jsdom
 */

// Mock all the hooks first
jest.mock('@/hooks/useTeamDetail', () => ({
  useTeamDetail: jest.fn()
}));

jest.mock('@/hooks/useTeamActions', () => ({
  useTeamActions: jest.fn(),
  useFileDownload: jest.fn(() => ({ downloadFile: jest.fn() })),
  useNotificationActions: jest.fn(() => ({
    showSuccessNotification: jest.fn(),
    showErrorNotification: jest.fn(),
    requestNotificationPermission: jest.fn()
  }))
}));

jest.mock('@/hooks/useModalKeyboard', () => ({
  useModalKeyboard: jest.fn()
}));

jest.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: jest.fn()
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamDetailModal from '@/components/modals/TeamDetailModal';
import { useTeamDetail } from '@/hooks/useTeamDetail';
import { useTeamActions } from '@/hooks/useTeamActions';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';
import { useMobileDetection } from '@/hooks/useMobileDetection';

// Mock notification APIs
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'granted',
    requestPermission: jest.fn(() => Promise.resolve('granted'))
  },
  writable: true
});

const mockUseTeamDetail = useTeamDetail as jest.MockedFunction<typeof useTeamDetail>;
const mockUseTeamActions = useTeamActions as jest.MockedFunction<typeof useTeamActions>;
const mockUseModalKeyboard = useModalKeyboard as jest.MockedFunction<typeof useModalKeyboard>;
const mockUseMobileDetection = useMobileDetection as jest.MockedFunction<typeof useMobileDetection>;

const mockTeamData = {
  teamInfo: {
    id: 1,
    name: 'Engineering Team',
    description: 'Software development team',
    color: '#3B82F6',
    managerName: 'John Manager',
    managerEmail: 'john.manager@company.com',
    memberCount: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  currentSprint: {
    sprintNumber: 5,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-14T23:59:59Z',
    lengthWeeks: 2,
    potentialHours: 280,
    plannedHours: 250,
    completedHours: 180,
    completionPercentage: 72,
    daysRemaining: 3,
    progressPercentage: 75,
    healthStatus: 'good' as const,
    healthColor: '#10B981',
    isActive: true
  },
  members: [
    {
      id: 1,
      name: 'John Doe',
      hebrew: 'ג\'ון דו',
      isManager: true,
      email: 'john@company.com',
      team_id: 1,
      role: 'Team Manager',
      currentWeekStatus: 'available' as const,
      currentWeekHours: 35,
      sprintPlannedHours: 70,
      sprintCompletedHours: 50,
      individualCompletionPercentage: 71.4,
      lastActivityTimestamp: '2024-01-15T10:00:00Z',
      lastActivityDescription: 'Updated schedule',
      availabilityColor: '#10B981'
    },
    {
      id: 2,
      name: 'Jane Smith',
      hebrew: 'ג\'יין סמית\'',
      isManager: false,
      email: 'jane@company.com',
      team_id: 1,
      role: 'Team Member',
      currentWeekStatus: 'partial' as const,
      currentWeekHours: 20,
      sprintPlannedHours: 60,
      sprintCompletedHours: 35,
      individualCompletionPercentage: 58.3,
      lastActivityTimestamp: '2024-01-14T15:30:00Z',
      lastActivityDescription: 'Added absence reason',
      availabilityColor: '#F59E0B'
    }
  ],
  statistics: {
    averageUtilization: 85.5,
    currentSprintUtilization: 82,
    mostProductiveDay: 'Tuesday',
    mostProductiveDayHours: 42,
    topAbsenceReasons: [
      { reason: 'Sick Leave', count: 3, percentage: 50 },
      { reason: 'Personal Time', count: 2, percentage: 33 }
    ],
    trendIndicator: 'improving' as const,
    trendPercentage: 5.2,
    comparisonToOtherTeams: {
      rank: 2,
      totalTeams: 5,
      percentile: 80
    },
    weeklyTrends: [
      { week: '2024-01-01', utilization: 80, hours: 240 },
      { week: '2024-01-08', utilization: 85, hours: 255 }
    ]
  },
  recentActivity: [
    {
      id: '1',
      timestamp: '2024-01-15T10:00:00Z',
      type: 'schedule_update' as const,
      description: 'Updated weekly schedule',
      userName: 'John Doe',
      userId: 1,
      memberName: 'John Doe',
      details: 'Changed availability for Wednesday',
      icon: '📅',
      color: '#3B82F6'
    }
  ],
  pendingEntries: [
    {
      memberId: 2,
      memberName: 'Jane Smith',
      date: '2024-01-16',
      type: 'missing_schedule' as const,
      description: 'Schedule not submitted for tomorrow',
      priority: 'high' as const
    }
  ],
  lastUpdated: '2024-01-15T12:00:00Z'
};

const mockTeamActions = {
  exportTeamData: jest.fn(),
  sendReminders: jest.fn(),
  navigateToTeamDashboard: jest.fn(),
  scheduleMeeting: jest.fn(),
  loading: false,
  error: null
};

const mockFileDownload = {
  downloadFile: jest.fn()
};

const mockNotificationActions = {
  showSuccessNotification: jest.fn(),
  showErrorNotification: jest.fn(),
  requestNotificationPermission: jest.fn()
};

describe('TeamDetailModal', () => {
  const defaultProps = {
    teamId: 1,
    isOpen: true,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseTeamDetail.mockReturnValue({
      data: mockTeamData,
      loading: false,
      error: null,
      refetch: jest.fn(),
      lastFetch: new Date()
    });

    mockUseTeamActions.mockReturnValue(mockTeamActions);

    mockUseModalKeyboard.mockReturnValue({
      handleKeyDown: jest.fn(),
      focusedElementIndex: 0,
      setFocusedElement: jest.fn(),
      modalRef: { current: null },
      focusableElements: []
    });

    mockUseMobileDetection.mockReturnValue(false);
  });

  it('should render modal when isOpen is true', () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Engineering Team')).toBeInTheDocument();
    expect(screen.getByText('Team Details & Current Sprint Status')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<TeamDetailModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close modal when clicking close button', async () => {
    const onClose = jest.fn();
    
    render(<TeamDetailModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display loading state while fetching data', () => {
    mockUseTeamDetail.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
      lastFetch: null
    });

    render(<TeamDetailModal {...defaultProps} />);
    
    expect(screen.getByText('Loading team details...')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeInTheDocument();
  });

  it('should handle data fetching errors gracefully', () => {
    const errorMessage = 'Failed to fetch team data';
    mockUseTeamDetail.mockReturnValue({
      data: null,
      loading: false,
      error: errorMessage,
      refetch: jest.fn(),
      lastFetch: null
    });

    render(<TeamDetailModal {...defaultProps} />);
    
    expect(screen.getByText('Error Loading Team Details')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should display all team information sections', () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    // Team Header Section
    expect(screen.getByText('Team Information')).toBeInTheDocument();
    expect(screen.getByText('Engineering Team')).toBeInTheDocument();
    expect(screen.getByText('John Manager')).toBeInTheDocument();
    
    // Current Sprint Section
    expect(screen.getByText('Current Sprint')).toBeInTheDocument();
    expect(screen.getByText('Sprint #5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // days remaining
    
    // Team Members Section
    expect(screen.getByText('Team Members (2)')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Statistics Section
    expect(screen.getByText('Team Statistics')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument(); // average utilization
    
    // Activity Section
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Updated weekly schedule')).toBeInTheDocument();
    
    // Action Panel Section
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('View Dashboard')).toBeInTheDocument();
  });

  it('should handle member selection', async () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    // Initially no members selected
    expect(screen.getByText('(0 selected)')).toBeInTheDocument();
    
    // Select first member
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(screen.getByText('(1 selected)')).toBeInTheDocument();
  });

  it('should handle select all and clear all members', async () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    // Select all members
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);
    
    expect(screen.getByText('(2 selected)')).toBeInTheDocument();
    
    // Clear all selections
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    expect(screen.getByText('(0 selected)')).toBeInTheDocument();
  });

  it('should filter members by status', async () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    // Both members should be visible initially
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    
    // Filter by available status
    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'available' } });
    
    // Only available member should be visible
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('should navigate to team dashboard when clicking view button', async () => {
    mockTeamActions.navigateToTeamDashboard.mockResolvedValue({ success: true, redirectUrl: '/team/1/dashboard' });
    
    render(<TeamDetailModal {...defaultProps} />);
    
    const viewDashboardButton = screen.getByText('View Dashboard');
    fireEvent.click(viewDashboardButton);
    
    expect(mockTeamActions.navigateToTeamDashboard).toHaveBeenCalledTimes(1);
  });

  it('should trigger export when clicking export button', async () => {
    mockTeamActions.exportTeamData.mockResolvedValue({ 
      success: true, 
      filename: 'team-data.csv',
      downloadUrl: '/downloads/team-data.csv'
    });
    
    render(<TeamDetailModal {...defaultProps} />);
    
    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);
    
    expect(mockTeamActions.exportTeamData).toHaveBeenCalledWith('csv');
  });

  it('should send reminders when clicking reminder button with selected members', async () => {
    mockTeamActions.sendReminders.mockResolvedValue({ 
      success: true, 
      sentCount: 1, 
      failedCount: 0 
    });
    
    render(<TeamDetailModal {...defaultProps} />);
    
    // Select a member first
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    const reminderButton = screen.getByText('Send Reminders');
    fireEvent.click(reminderButton);
    
    expect(mockTeamActions.sendReminders).toHaveBeenCalledWith([1]);
  });

  it('should handle schedule meeting action', async () => {
    mockTeamActions.scheduleMeeting.mockResolvedValue({ 
      success: true, 
      redirectUrl: '/calendar/schedule?team=1&member=1'
    });
    
    render(<TeamDetailModal {...defaultProps} />);
    
    // Select a member first
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    const meetingButton = screen.getByText('Schedule Meeting');
    fireEvent.click(meetingButton);
    
    expect(mockTeamActions.scheduleMeeting).toHaveBeenCalledWith([1]);
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    
    const title = screen.getByText('Engineering Team');
    expect(title).toHaveAttribute('id', 'modal-title');
  });

  it('should be responsive on mobile devices', () => {
    mockUseMobileDetection.mockReturnValue(true);
    
    render(<TeamDetailModal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-sm'); // Mobile class
  });

  it('should handle keyboard navigation', () => {
    const handleKeyDown = jest.fn();
    mockUseModalKeyboard.mockReturnValue({
      handleKeyDown,
      focusedElementIndex: 0,
      setFocusedElement: jest.fn(),
      modalRef: { current: null },
      focusableElements: []
    });
    
    render(<TeamDetailModal {...defaultProps} />);
    
    expect(mockUseModalKeyboard).toHaveBeenCalledWith(
      true, // isOpen
      defaultProps.onClose,
      {
        trapFocus: true,
        closeOnEscape: true,
        closeOnOutsideClick: true,
        restoreFocus: true
      }
    );
  });

  it('should display pending entries when available', () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    expect(screen.getByText('Pending Items (1)')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Schedule not submitted for tomorrow')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('should show loading state for actions', () => {
    mockUseTeamActions.mockReturnValue({
      ...mockTeamActions,
      loading: true
    });
    
    render(<TeamDetailModal {...defaultProps} />);
    
    const actionButtons = [
      screen.getByText('View Dashboard'),
      screen.getByText('Export CSV'),
      screen.getByText('Send Reminders'),
      screen.getByText('Schedule Meeting')
    ];
    
    actionButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should disable actions when no members are selected', () => {
    render(<TeamDetailModal {...defaultProps} />);
    
    const reminderButton = screen.getByText('Send Reminders');
    const meetingButton = screen.getByText('Schedule Meeting');
    
    expect(reminderButton).toBeDisabled();
    expect(meetingButton).toBeDisabled();
  });
});