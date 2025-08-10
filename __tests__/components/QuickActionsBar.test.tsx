/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickActionsBar from '@/components/QuickActionsBar';
import { 
  createMockTeamMember, 
  createMockManager,
  createMockTeam
} from '../utils/testHelpers';

describe('QuickActionsBar', () => {
  // Test data setup
  const mockCurrentUser = createMockManager({ id: 1, name: 'Manager User' });
  const mockSelectedTeam = createMockTeam({ id: 1, name: 'Engineering Team' });

  // Mock functions
  const mockOnFullWeekSet = jest.fn();
  const mockOnSaveCurrentAsTemplate = jest.fn();

  // Default props
  const defaultProps = {
    currentUser: mockCurrentUser,
    selectedTeam: mockSelectedTeam,
    onFullWeekSet: mockOnFullWeekSet,
    onSaveCurrentAsTemplate: mockOnSaveCurrentAsTemplate
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the component without crashing', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      expect(screen.getByText(/Full Week/)).toBeInTheDocument();
    });

    it('should render the full week button with bilingual text', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      expect(fullWeekButton).toBeInTheDocument();
    });

    it('should render team information', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
    });

    it('should have proper styling classes', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const container = screen.getByRole('button').parentElement?.parentElement?.parentElement;
      expect(container).toHaveClass('bg-white', 'border-b', 'border-gray-200');
    });
  });

  describe('Full Week Button', () => {
    it('should display full week button with correct styling', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      expect(fullWeekButton).toHaveClass(
        'bg-green-50',
        'text-green-700',
        'hover:bg-green-100',
        'border-green-200'
      );
    });

    it('should call onFullWeekSet with current user ID when clicked', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      fireEvent.click(fullWeekButton);
      
      expect(mockOnFullWeekSet).toHaveBeenCalledTimes(1);
      expect(mockOnFullWeekSet).toHaveBeenCalledWith(mockCurrentUser.id);
    });

    it('should have appropriate touch target sizing', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      expect(fullWeekButton).toHaveClass('touch-target');
    });

    it('should include Zap icon', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      const icon = fullWeekButton.querySelector('[data-testid="mock-icon"]');
      expect(icon).toBeInTheDocument();
    });

    it('should work with different user types', () => {
      const regularUser = createMockTeamMember({ id: 5, name: 'Regular User', isManager: false });
      
      render(<QuickActionsBar {...defaultProps} currentUser={regularUser} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      fireEvent.click(fullWeekButton);
      
      expect(mockOnFullWeekSet).toHaveBeenCalledWith(regularUser.id);
    });
  });

  describe('Team Information Display', () => {
    it('should display team name with Users icon', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
      
      // Check that Users icon is present (mocked as mock-icon)
      const teamSection = screen.getByText('Engineering Team').parentElement;
      const icon = teamSection?.querySelector('[data-testid="mock-icon"]');
      expect(icon).toBeInTheDocument();
    });

    it('should hide team info on mobile devices', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const teamInfo = screen.getByText('Engineering Team').parentElement?.parentElement;
      expect(teamInfo).toHaveClass('hidden', 'md:flex');
    });

    it('should handle different team names', () => {
      const differentTeam = createMockTeam({ id: 2, name: 'Product Team' });
      
      render(<QuickActionsBar {...defaultProps} selectedTeam={differentTeam} />);
      
      expect(screen.getByText('Product Team')).toBeInTheDocument();
      expect(screen.queryByText('Engineering Team')).not.toBeInTheDocument();
    });

    it('should handle team names with special characters', () => {
      const specialTeam = createMockTeam({ 
        id: 3, 
        name: 'R&D Team - Dev/QA' 
      });
      
      render(<QuickActionsBar {...defaultProps} selectedTeam={specialTeam} />);
      
      expect(screen.getByText('R&D Team - Dev/QA')).toBeInTheDocument();
    });

    it('should handle very long team names', () => {
      const longNameTeam = createMockTeam({ 
        id: 4, 
        name: 'Very Long Team Name That Might Cause Layout Issues' 
      });
      
      render(<QuickActionsBar {...defaultProps} selectedTeam={longNameTeam} />);
      
      expect(screen.getByText('Very Long Team Name That Might Cause Layout Issues')).toBeInTheDocument();
    });
  });

  describe('Layout and Responsive Design', () => {
    it('should have proper flex layout structure', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const mainContainer = screen.getByRole('button').parentElement?.parentElement;
      expect(mainContainer).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should have proper spacing between elements', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const leftSection = screen.getByRole('button').parentElement;
      expect(leftSection).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('should have proper responsive visibility for team info', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const teamInfo = screen.getByText('Engineering Team').parentElement?.parentElement;
      expect(teamInfo).toHaveClass('hidden', 'md:flex');
    });

    it('should maintain consistent padding', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const container = screen.getByRole('button').parentElement?.parentElement?.parentElement;
      expect(container).toHaveClass('px-4', 'py-3');
    });
  });

  describe('Optional Props', () => {
    it('should work without onSaveCurrentAsTemplate prop', () => {
      const { onSaveCurrentAsTemplate, ...propsWithoutTemplate } = defaultProps;
      
      render(<QuickActionsBar {...propsWithoutTemplate} />);
      
      expect(screen.getByRole('button', { name: /Full Week • שבוע מלא/ })).toBeInTheDocument();
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
    });

    it('should handle undefined onSaveCurrentAsTemplate gracefully', () => {
      render(<QuickActionsBar {...defaultProps} onSaveCurrentAsTemplate={undefined} />);
      
      expect(screen.getByRole('button', { name: /Full Week • שבוע מלא/ })).toBeInTheDocument();
    });
  });

  describe('Interaction States', () => {
    it('should handle multiple rapid clicks on full week button', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוع מלא/ });
      
      // Click multiple times rapidly
      fireEvent.click(fullWeekButton);
      fireEvent.click(fullWeekButton);
      fireEvent.click(fullWeekButton);
      
      expect(mockOnFullWeekSet).toHaveBeenCalledTimes(3);
      expect(mockOnFullWeekSet).toHaveBeenCalledWith(mockCurrentUser.id);
    });

    it('should maintain button state during interactions', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      
      // Test hover state (through focus)
      fullWeekButton.focus();
      expect(fullWeekButton).toHaveFocus();
      
      // Test active state
      fireEvent.mouseDown(fullWeekButton);
      fireEvent.mouseUp(fullWeekButton);
      
      expect(mockOnFullWeekSet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button with proper role', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      expect(fullWeekButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוع מלא/ });
      
      // Test keyboard navigation
      fullWeekButton.focus();
      expect(fullWeekButton).toHaveFocus();
      
      // Test enter key activation
      fireEvent.keyDown(fullWeekButton, { key: 'Enter', code: 'Enter' });
      
      // Note: The actual keyDown handling would depend on browser defaults
      // but the button should be focusable
    });

    it('should have proper text content for screen readers', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      // Button text includes both English and Hebrew
      expect(screen.getByText(/Full Week • שבוע מלא/)).toBeInTheDocument();
      
      // Team information is clearly labeled
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
    });

    it('should have sufficient color contrast', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      
      // The button uses green-700 text on green-50 background which should have good contrast
      expect(fullWeekButton).toHaveClass('text-green-700', 'bg-green-50');
    });
  });

  describe('Internationalization', () => {
    it('should display bilingual text correctly', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const buttonText = screen.getByText(/Full Week • שבוע מלא/);
      expect(buttonText).toBeInTheDocument();
    });

    it('should handle RTL text properly in bilingual context', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      // The Hebrew text should be present
      expect(screen.getByText(/שבוע מלא/)).toBeInTheDocument();
      
      // Both languages should be in the same element
      expect(screen.getByText(/Full Week • שבוע מלא/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing currentUser gracefully', () => {
      const propsWithoutUser = {
        ...defaultProps,
        currentUser: null as any
      };
      
      // Should not crash even with null user
      expect(() => render(<QuickActionsBar {...propsWithoutUser} />)).not.toThrow();
    });

    it('should handle missing selectedTeam gracefully', () => {
      const propsWithoutTeam = {
        ...defaultProps,
        selectedTeam: null as any
      };
      
      // Should not crash even with null team
      expect(() => render(<QuickActionsBar {...propsWithoutTeam} />)).not.toThrow();
    });

    it('should handle currentUser with missing ID', () => {
      const userWithoutId = {
        ...mockCurrentUser,
        id: undefined as any
      };
      
      render(<QuickActionsBar {...defaultProps} currentUser={userWithoutId} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      fireEvent.click(fullWeekButton);
      
      expect(mockOnFullWeekSet).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(<QuickActionsBar {...defaultProps} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(50); // Should render very quickly
    });

    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<QuickActionsBar {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Re-render multiple times with different props
      for (let i = 0; i < 10; i++) {
        const newTeam = createMockTeam({ id: i, name: `Team ${i}` });
        rerender(<QuickActionsBar {...defaultProps} selectedTeam={newTeam} />);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(100); // Should handle re-renders efficiently
    });
  });

  describe('Visual Styling', () => {
    it('should have proper button styling', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const fullWeekButton = screen.getByRole('button', { name: /Full Week • שבוע מלא/ });
      
      expect(fullWeekButton).toHaveClass(
        'flex',
        'items-center',
        'gap-2',
        'bg-green-50',
        'text-green-700',
        'px-4',
        'py-2',
        'rounded-lg',
        'hover:bg-green-100',
        'transition-colors',
        'text-sm',
        'border',
        'border-green-200'
      );
    });

    it('should have proper container styling', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const container = screen.getByRole('button').parentElement?.parentElement?.parentElement;
      
      expect(container).toHaveClass(
        'bg-white',
        'border-b',
        'border-gray-200',
        'px-4',
        'py-3'
      );
    });

    it('should have proper team info styling', () => {
      render(<QuickActionsBar {...defaultProps} />);
      
      const teamInfo = screen.getByText('Engineering Team').parentElement?.parentElement;
      
      expect(teamInfo).toHaveClass(
        'hidden',
        'md:flex',
        'items-center',
        'gap-2',
        'text-sm',
        'text-gray-600'
      );
    });
  });
});