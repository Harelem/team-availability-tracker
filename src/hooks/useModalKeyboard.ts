'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { UseModalKeyboardReturn } from '@/types/modalTypes';

/**
 * Custom hook for modal keyboard navigation and accessibility
 * Handles ESC key, focus management, and tab navigation
 */
export function useModalKeyboard(
  isOpen: boolean,
  onClose: () => void,
  options: {
    trapFocus?: boolean;
    closeOnEscape?: boolean;
    closeOnOutsideClick?: boolean;
    restoreFocus?: boolean;
  } = {}
): UseModalKeyboardReturn {
  const {
    trapFocus = true,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    restoreFocus = true
  } = options;

  const [focusedElementIndex, setFocusedElementIndex] = useState(0);
  const previousActiveElement = useRef<Element | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const focusableElements = useRef<HTMLElement[]>([]);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
    } else if (restoreFocus && previousActiveElement.current) {
      // Restore focus when modal closes
      (previousActiveElement.current as HTMLElement).focus?.();
    }
  }, [isOpen, restoreFocus]);

  // Update focusable elements when modal content changes
  const updateFocusableElements = useCallback(() => {
    if (!modalRef.current) return;

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];

    focusableElements.current = Array.from(
      modalRef.current.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        if (closeOnEscape) {
          event.preventDefault();
          onClose();
        }
        break;

      case 'Tab':
        if (trapFocus && focusableElements.current.length > 0) {
          event.preventDefault();
          
          const currentIndex = focusedElementIndex;
          let nextIndex: number;

          if (event.shiftKey) {
            // Shift+Tab - go to previous element
            nextIndex = currentIndex <= 0 
              ? focusableElements.current.length - 1 
              : currentIndex - 1;
          } else {
            // Tab - go to next element
            nextIndex = currentIndex >= focusableElements.current.length - 1 
              ? 0 
              : currentIndex + 1;
          }

          setFocusedElementIndex(nextIndex);
          focusableElements.current[nextIndex]?.focus();
        }
        break;

      case 'ArrowDown':
      case 'ArrowUp':
        // Arrow key navigation for accessibility
        if (focusableElements.current.length > 0) {
          event.preventDefault();
          
          const currentIndex = focusedElementIndex;
          let nextIndex: number;

          if (event.key === 'ArrowDown') {
            nextIndex = currentIndex >= focusableElements.current.length - 1 
              ? 0 
              : currentIndex + 1;
          } else {
            nextIndex = currentIndex <= 0 
              ? focusableElements.current.length - 1 
              : currentIndex - 1;
          }

          setFocusedElementIndex(nextIndex);
          focusableElements.current[nextIndex]?.focus();
        }
        break;

      case 'Home':
        // Focus first element
        if (focusableElements.current.length > 0) {
          event.preventDefault();
          setFocusedElementIndex(0);
          focusableElements.current[0]?.focus();
        }
        break;

      case 'End':
        // Focus last element
        if (focusableElements.current.length > 0) {
          event.preventDefault();
          const lastIndex = focusableElements.current.length - 1;
          setFocusedElementIndex(lastIndex);
          focusableElements.current[lastIndex]?.focus();
        }
        break;
    }
  }, [isOpen, closeOnEscape, onClose, trapFocus, focusedElementIndex]);

  // Handle outside clicks
  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (!isOpen || !closeOnOutsideClick || !modalRef.current) return;

    // Check if click is outside modal content
    const modalContent = modalRef.current.querySelector('[role="dialog"]');
    if (modalContent && !modalContent.contains(event.target as Node)) {
      onClose();
    }
  }, [isOpen, closeOnOutsideClick, onClose]);

  // Set up event listeners
  useEffect(() => {
    if (isOpen) {
      updateFocusableElements();
      
      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);
      
      // Add click outside listener
      if (closeOnOutsideClick) {
        document.addEventListener('mousedown', handleOutsideClick);
      }

      // Focus first element if available
      if (trapFocus && focusableElements.current.length > 0) {
        setTimeout(() => {
          focusableElements.current[0]?.focus();
          setFocusedElementIndex(0);
        }, 100);
      }

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown, handleOutsideClick, trapFocus, updateFocusableElements, closeOnOutsideClick]);

  // Update focusable elements when modal content changes
  useEffect(() => {
    if (isOpen) {
      const observer = new MutationObserver(() => {
        updateFocusableElements();
      });

      if (modalRef.current) {
        observer.observe(modalRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['disabled', 'tabindex']
        });
      }

      return () => observer.disconnect();
    }
  }, [isOpen, updateFocusableElements]);

  const setFocusedElement = useCallback((index: number) => {
    if (index >= 0 && index < focusableElements.current.length) {
      setFocusedElementIndex(index);
      focusableElements.current[index]?.focus();
    }
  }, []);

  return {
    handleKeyDown,
    focusedElementIndex,
    setFocusedElement,
    modalRef,
    focusableElements: focusableElements.current
  } as UseModalKeyboardReturn & {
    modalRef: React.RefObject<HTMLDivElement>;
    focusableElements: HTMLElement[];
  };
}