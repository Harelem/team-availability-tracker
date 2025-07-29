'use client';

import { useState, useCallback } from 'react';
import { UseTeamActionsReturn, ExportResult, ReminderResult, NavigationResult } from '@/types/modalTypes';

/**
 * Custom hook for team-related actions in the modal
 * Handles exports and navigation
 */
export function useTeamActions(teamId: number): UseTeamActionsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Export team data to CSV or Excel
  const exportTeamData = useCallback(async (format: 'csv' | 'excel'): Promise<ExportResult> => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `team-${teamId}-data-${timestamp}.${format}`;
      
      // In a real implementation, this would call the actual export service
      // For now, we'll simulate a successful export
      const mockDownloadUrl = `${window.location.origin}/api/exports/${filename}`;

      console.log(`Exporting team ${teamId} data as ${format}...`);
      
      // Simulate random success/failure for testing
      if (Math.random() > 0.1) { // 90% success rate
        return {
          success: true,
          filename,
          downloadUrl: mockDownloadUrl
        };
      } else {
        throw new Error('Export service temporarily unavailable');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [teamId]);


  // Navigate to team dashboard
  const navigateToTeamDashboard = useCallback(async (): Promise<NavigationResult> => {
    setLoading(true);
    setError(null);

    try {
      // Simulate brief loading for UI feedback
      await new Promise(resolve => setTimeout(resolve, 300));

      const redirectUrl = `/team/${teamId}/dashboard`;
      
      console.log(`Navigating to team dashboard: ${redirectUrl}`);

      // In a real implementation, this would use Next.js router
      // For now, we'll simulate the navigation
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', redirectUrl);
      }

      return {
        success: true,
        redirectUrl
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Navigation failed';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [teamId]);


  return {
    exportTeamData,
    navigateToTeamDashboard,
    loading,
    error
  };
}

/**
 * Utility hook for handling file downloads
 */
export function useFileDownload() {
  const downloadFile = useCallback((url: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (err) {
      console.error('Failed to download file:', err);
      return false;
    }
  }, []);

  return { downloadFile };
}

/**
 * Utility hook for notification management
 */
export function useNotificationActions() {
  const showSuccessNotification = useCallback((message: string) => {
    // In a real implementation, this would integrate with a toast/notification system
    console.log('SUCCESS:', message);
    
    // Browser notification as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Success', { body: message, icon: '/favicon.ico' });
    }
  }, []);

  const showErrorNotification = useCallback((message: string) => {
    console.error('ERROR:', message);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Error', { body: message, icon: '/favicon.ico' });
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    showSuccessNotification,
    showErrorNotification,
    requestNotificationPermission
  };
}