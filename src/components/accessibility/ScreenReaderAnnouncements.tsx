/**
 * Screen Reader Announcements Component
 * 
 * Provides live region announcements for dynamic content changes,
 * ensuring screen reader users receive timely updates about application state.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface ScreenReaderAnnouncementProps {
  announcements: string[];
  priority: 'polite' | 'assertive';
  clearOnUnmount?: boolean;
  className?: string;
}

interface AnnouncementQueueItem {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

// Global announcement queue and manager
class AnnouncementManager {
  private static instance: AnnouncementManager;
  private queue: AnnouncementQueueItem[] = [];
  private listeners: Set<(announcements: AnnouncementQueueItem[]) => void> = new Set();
  private lastId = 0;

  static getInstance(): AnnouncementManager {
    if (!AnnouncementManager.instance) {
      AnnouncementManager.instance = new AnnouncementManager();
    }
    return AnnouncementManager.instance;
  }

  addAnnouncement(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement: AnnouncementQueueItem = {
      id: `announcement-${++this.lastId}`,
      message: message.trim(),
      priority,
      timestamp: Date.now()
    };

    // Avoid duplicate announcements
    const isDuplicate = this.queue.some(
      item => item.message === announcement.message && 
               Date.now() - item.timestamp < 1000 // Within 1 second
    );

    if (!isDuplicate && announcement.message) {
      this.queue.push(announcement);
      this.notifyListeners();

      // Auto-clear after a delay to prevent memory buildup
      setTimeout(() => {
        this.removeAnnouncement(announcement.id);
      }, 10000); // 10 seconds
    }
  }

  removeAnnouncement(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.notifyListeners();
  }

  clearAll() {
    this.queue = [];
    this.notifyListeners();
  }

  subscribe(listener: (announcements: AnnouncementQueueItem[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.queue]));
  }

  getAnnouncements(): AnnouncementQueueItem[] {
    return [...this.queue];
  }
}

// Hook for managing screen reader announcements
export function useScreenReaderAnnouncements() {
  const manager = useRef(AnnouncementManager.getInstance());
  const [announcements, setAnnouncements] = useState<AnnouncementQueueItem[]>([]);

  useEffect(() => {
    const unsubscribe = manager.current.subscribe(setAnnouncements);
    setAnnouncements(manager.current.getAnnouncements());
    return () => {
      unsubscribe();
    };
  }, []);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    manager.current.addAnnouncement(message, priority);
  };

  const clearAnnouncements = () => {
    manager.current.clearAll();
  };

  return {
    announce,
    clearAnnouncements,
    announcements
  };
}

// Main Screen Reader Announcements Component
const ScreenReaderAnnouncements: React.FC<ScreenReaderAnnouncementProps> = ({
  announcements,
  priority,
  clearOnUnmount = true,
  className = ''
}) => {
  const { announce } = useScreenReaderAnnouncements();

  // Announce new messages
  useEffect(() => {
    announcements.forEach(message => {
      if (message) {
        announce(message, priority);
      }
    });
  }, [announcements, priority, announce]);

  // Clear announcements on unmount if requested
  useEffect(() => {
    return () => {
      if (clearOnUnmount) {
        const manager = AnnouncementManager.getInstance();
        manager.clearAll();
      }
    };
  }, [clearOnUnmount]);

  return null; // This component doesn't render visually
};

// Live region component for direct announcements
export const LiveRegion: React.FC<{
  message: string;
  priority: 'polite' | 'assertive';
  className?: string;
}> = ({ message, priority, className = '' }) => {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      role="status"
    >
      {message}
    </div>
  );
};

// Global live regions for the application
export const GlobalLiveRegions: React.FC = () => {
  const { announcements } = useScreenReaderAnnouncements();

  // Separate announcements by priority
  const politeAnnouncements = announcements
    .filter(a => a.priority === 'polite')
    .map(a => a.message)
    .join('. ');

  const assertiveAnnouncements = announcements
    .filter(a => a.priority === 'assertive')
    .map(a => a.message)
    .join('. ');

  return (
    <>
      {/* Polite announcements */}
      <LiveRegion
        message={politeAnnouncements}
        priority="polite"
      />
      
      {/* Assertive announcements */}
      <LiveRegion
        message={assertiveAnnouncements}
        priority="assertive"
      />
    </>
  );
};

// Utility hook for common announcement patterns
export function useCommonAnnouncements() {
  const { announce } = useScreenReaderAnnouncements();

  return {
    announceNavigation: (destination: string) => {
      announce(`Navigated to ${destination}`, 'polite');
    },

    announceLoading: (resource: string) => {
      announce(`Loading ${resource}`, 'polite');
    },

    announceLoadingComplete: (resource: string) => {
      announce(`${resource} loaded successfully`, 'polite');
    },

    announceError: (error: string) => {
      announce(`Error: ${error}`, 'assertive');
    },

    announceSuccess: (action: string) => {
      announce(`Success: ${action}`, 'polite');
    },

    announceFormValidation: (errors: string[]) => {
      if (errors.length > 0) {
        const message = `Form validation errors: ${errors.join(', ')}`;
        announce(message, 'assertive');
      }
    },

    announceDataUpdate: (type: string, count?: number) => {
      const message = count !== undefined 
        ? `${type} updated. ${count} items now available.`
        : `${type} has been updated`;
      announce(message, 'polite');
    },

    announceModalOpen: (modalTitle: string) => {
      announce(`${modalTitle} dialog opened`, 'polite');
    },

    announceModalClose: (modalTitle: string) => {
      announce(`${modalTitle} dialog closed`, 'polite');
    },

    announceSelection: (item: string, context?: string) => {
      const message = context 
        ? `${item} selected in ${context}`
        : `${item} selected`;
      announce(message, 'polite');
    },

    announceExpansion: (item: string, expanded: boolean) => {
      const action = expanded ? 'expanded' : 'collapsed';
      announce(`${item} ${action}`, 'polite');
    },

    announceProgress: (progress: number, total?: number, description?: string) => {
      let message = '';
      if (total) {
        message = `Progress: ${progress} of ${total}`;
      } else {
        message = `Progress: ${progress}%`;
      }
      if (description) {
        message += ` - ${description}`;
      }
      announce(message, 'polite');
    },

    announceSort: (column: string, direction: 'ascending' | 'descending') => {
      announce(`Table sorted by ${column}, ${direction}`, 'polite');
    },

    announceFilter: (filter: string, resultCount: number) => {
      announce(`Filter applied: ${filter}. ${resultCount} results found.`, 'polite');
    }
  };
}

export default ScreenReaderAnnouncements;