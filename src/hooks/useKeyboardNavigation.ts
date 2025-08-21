/**
 * Enhanced Keyboard Navigation Hook
 * 
 * Provides comprehensive keyboard navigation support including focus management,
 * custom shortcuts, and accessibility compliance for the entire application.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useCommonAnnouncements } from '@/components/accessibility/ScreenReaderAnnouncements';

// Keyboard navigation configuration types
interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  action: () => void;
  scope?: 'global' | 'modal' | 'form' | 'table';
  disabled?: boolean;
}

interface FocusableElement {
  element: HTMLElement;
  priority: number;
  group?: string;
}

interface KeyboardNavigationConfig {
  shortcuts?: KeyboardShortcut[];
  focusableElements?: string; // CSS selector
  skipLinks?: boolean;
  announceNavigation?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  roving?: boolean; // Roving tabindex for groups
}

// Focus management utilities
class FocusManager {
  private static instance: FocusManager;
  private focusHistory: HTMLElement[] = [];
  private skipTargets: Map<string, HTMLElement> = new Map();

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  // Track focus history for restoration
  pushFocus(element: HTMLElement) {
    this.focusHistory.push(element);
    if (this.focusHistory.length > 10) {
      this.focusHistory.shift(); // Keep history manageable
    }
  }

  // Restore previous focus
  restoreFocus() {
    const previousElement = this.focusHistory.pop();
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
      return true;
    }
    return false;
  }

  // Register skip link targets
  registerSkipTarget(id: string, element: HTMLElement) {
    this.skipTargets.set(id, element);
  }

  // Navigate to skip target
  skipTo(id: string) {
    const target = this.skipTargets.get(id);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    return false;
  }

  // Get all focusable elements within a container
  getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector))
      .filter((el): el is HTMLElement => {
        return el instanceof HTMLElement && 
               this.isElementVisible(el) && 
               !this.isElementInert(el);
      });
  }

  // Check if element is visible and interactable
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  // Check if element is inert (disabled or in inert container)
  private isElementInert(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    while (current) {
      if (current.hasAttribute('inert') || current.hasAttribute('aria-disabled')) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }
}

/**
 * Main keyboard navigation hook
 */
export function useKeyboardNavigation(config: KeyboardNavigationConfig = {}) {
  const {
    shortcuts = [],
    focusableElements,
    skipLinks = true,
    announceNavigation = true,
    trapFocus = false,
    restoreFocus = false,
    roving = false
  } = config;

  const containerRef = useRef<HTMLElement>(null);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const { announceNavigation: announce } = useCommonAnnouncements();
  const focusManager = useRef(FocusManager.getInstance());

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, altKey, shiftKey, metaKey } = event;

    // Check for matching shortcuts
    for (const shortcut of shortcuts) {
      if (shortcut.disabled) continue;

      const modifierMatch = shortcut.modifiers?.every(modifier => {
        switch (modifier) {
          case 'ctrl': return ctrlKey;
          case 'alt': return altKey;
          case 'shift': return shiftKey;
          case 'meta': return metaKey;
          default: return false;
        }
      }) ?? (!ctrlKey && !altKey && !shiftKey && !metaKey);

      if (key.toLowerCase() === shortcut.key.toLowerCase() && modifierMatch) {
        event.preventDefault();
        shortcut.action();
        
        if (announceNavigation) {
          announce(`Keyboard shortcut activated: ${shortcut.description}`);
        }
        return;
      }
    }

    // Handle skip links
    if (skipLinks && key === 'Tab' && !shiftKey && event.target === document.body) {
      const skipLink = document.querySelector('[data-skip-link]') as HTMLElement;
      if (skipLink) {
        event.preventDefault();
        skipLink.focus();
      }
    }

    // Handle focus trapping
    if (trapFocus && containerRef.current) {
      handleFocusTrapping(event);
    }

    // Handle roving tabindex
    if (roving && (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight')) {
      handleRovingTabindex(event);
    }
  }, [shortcuts, skipLinks, announceNavigation, trapFocus, roving, announce]);

  // Focus trapping logic
  const handleFocusTrapping = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !containerRef.current) return;

    const focusableElements = focusManager.current.getFocusableElements(containerRef.current);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  // Roving tabindex for arrow key navigation
  const handleRovingTabindex = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return;

    const elements = focusManager.current.getFocusableElements(containerRef.current);
    const currentIndex = elements.findIndex(el => el === document.activeElement);
    
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      elements[nextIndex]?.focus();
      setCurrentFocusIndex(nextIndex);
      
      if (announceNavigation) {
        announce(`Focused on ${elements[nextIndex]?.getAttribute('aria-label') || 'item'}`);
      }
    }
  }, [announceNavigation, announce]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus restoration on unmount
  useEffect(() => {
    if (restoreFocus) {
      return () => {
        focusManager.current.restoreFocus();
      };
    }
  }, [restoreFocus]);

  return {
    containerRef,
    currentFocusIndex,
    focusManager: focusManager.current
  };
}

/**
 * Skip links hook for accessibility
 */
export function useSkipLinks() {
  const focusManager = useRef(FocusManager.getInstance());

  const registerSkipTarget = useCallback((id: string, element: HTMLElement) => {
    focusManager.current.registerSkipTarget(id, element);
  }, []);

  const skipTo = useCallback((id: string) => {
    return focusManager.current.skipTo(id);
  }, []);

  return { registerSkipTarget, skipTo };
}

/**
 * Modal keyboard navigation hook
 */
export function useModalKeyboardNavigation(isOpen: boolean) {
  const { containerRef } = useKeyboardNavigation({
    trapFocus: isOpen,
    restoreFocus: true,
    shortcuts: [
      {
        key: 'Escape',
        description: 'Close modal',
        action: () => {
          // This will be overridden by the modal component
        },
        scope: 'modal'
      }
    ]
  });

  const [onClose, setOnClose] = useState<(() => void) | null>(null);

  // Set up escape key handling
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && onClose) {
        event.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return {
    containerRef,
    setOnClose
  };
}

/**
 * Table keyboard navigation hook
 */
export function useTableKeyboardNavigation() {
  const [focusedCell, setFocusedCell] = useState<{row: number, col: number} | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const navigateTable = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!tableRef.current || !focusedCell) return;

    const rows = Array.from(tableRef.current.querySelectorAll('tr'));
    const currentRow = rows[focusedCell.row];
    if (!currentRow) return;

    const cells = Array.from(currentRow.querySelectorAll('td, th'));
    let newRow = focusedCell.row;
    let newCol = focusedCell.col;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, focusedCell.row - 1);
        break;
      case 'down':
        newRow = Math.min(rows.length - 1, focusedCell.row + 1);
        break;
      case 'left':
        newCol = Math.max(0, focusedCell.col - 1);
        break;
      case 'right':
        newCol = Math.min(cells.length - 1, focusedCell.col + 1);
        break;
    }

    const targetRow = rows[newRow];
    const targetCell = targetRow?.querySelectorAll('td, th')[newCol] as HTMLElement;
    
    if (targetCell) {
      targetCell.focus();
      setFocusedCell({ row: newRow, col: newCol });
    }
  }, [focusedCell]);

  useKeyboardNavigation({
    shortcuts: [
      {
        key: 'ArrowUp',
        description: 'Navigate up in table',
        action: () => navigateTable('up'),
        scope: 'table'
      },
      {
        key: 'ArrowDown',
        description: 'Navigate down in table',
        action: () => navigateTable('down'),
        scope: 'table'
      },
      {
        key: 'ArrowLeft',
        description: 'Navigate left in table',
        action: () => navigateTable('left'),
        scope: 'table'
      },
      {
        key: 'ArrowRight',
        description: 'Navigate right in table',
        action: () => navigateTable('right'),
        scope: 'table'
      }
    ]
  });

  return {
    tableRef,
    focusedCell,
    setFocusedCell
  };
}

/**
 * Form keyboard navigation hook
 */
export function useFormKeyboardNavigation() {
  return useKeyboardNavigation({
    shortcuts: [
      {
        key: 'Enter',
        modifiers: ['ctrl'],
        description: 'Submit form',
        action: () => {
          const form = document.activeElement?.closest('form');
          if (form) {
            form.requestSubmit();
          }
        },
        scope: 'form'
      }
    ]
  });
}

export default useKeyboardNavigation;