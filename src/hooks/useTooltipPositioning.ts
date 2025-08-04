/**
 * Custom hook for responsive tooltip positioning
 * Handles edge detection and positioning adjustments
 */

import { useState, useCallback, useEffect } from 'react';
import { TooltipPosition } from '@/types/tooltipTypes';

interface UseTooltipPositioningOptions {
  offset?: number;
  arrowSize?: number;
  minMargin?: number;
}

interface UseTooltipPositioningReturn {
  calculatePosition: (
    triggerElement: HTMLElement,
    tooltipElement: HTMLElement | null,
    preferredPosition?: 'top' | 'bottom' | 'left' | 'right'
  ) => TooltipPosition;
  position: TooltipPosition | null;
}

export const useTooltipPositioning = ({
  offset = 10,
  arrowSize = 6,
  minMargin = 10
}: UseTooltipPositioningOptions = {}): UseTooltipPositioningReturn => {
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const calculatePosition = useCallback((
    triggerElement: HTMLElement,
    tooltipElement: HTMLElement | null,
    preferredPosition: 'top' | 'bottom' | 'left' | 'right' = 'top'
  ): TooltipPosition => {
    if (!tooltipElement) {
      return {
        top: 0,
        left: 0,
        transform: 'translateX(-50%)',
        maxWidth: '200px'
      };
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;
    let transform = '';
    let maxWidth = '300px';

    // Calculate available space in each direction
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Determine best position based on available space
    let finalPosition = preferredPosition;

    // Adjust position if not enough space
    if (preferredPosition === 'top' && spaceAbove < tooltipRect.height + offset + minMargin) {
      if (spaceBelow > spaceAbove) {
        finalPosition = 'bottom';
      }
    } else if (preferredPosition === 'bottom' && spaceBelow < tooltipRect.height + offset + minMargin) {
      if (spaceAbove > spaceBelow) {
        finalPosition = 'top';
      }
    }

    // Calculate position based on final position
    switch (finalPosition) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - offset - arrowSize;
        left = triggerRect.left + scrollX + (triggerRect.width / 2);
        transform = 'translateX(-50%)';
        
        // Adjust for horizontal edges
        const tooltipWidth = tooltipRect.width;
        if (left - (tooltipWidth / 2) < minMargin) {
          left = minMargin + (tooltipWidth / 2);
          transform = 'translateX(-50%)';
        } else if (left + (tooltipWidth / 2) > viewportWidth - minMargin) {
          left = viewportWidth - minMargin - (tooltipWidth / 2);
          transform = 'translateX(-50%)';
        }
        break;

      case 'bottom':
        top = triggerRect.bottom + scrollY + offset + arrowSize;
        left = triggerRect.left + scrollX + (triggerRect.width / 2);
        transform = 'translateX(-50%)';
        
        // Adjust for horizontal edges
        const tooltipWidthBottom = tooltipRect.width;
        if (left - (tooltipWidthBottom / 2) < minMargin) {
          left = minMargin + (tooltipWidthBottom / 2);
          transform = 'translateX(-50%)';
        } else if (left + (tooltipWidthBottom / 2) > viewportWidth - minMargin) {
          left = viewportWidth - minMargin - (tooltipWidthBottom / 2);
          transform = 'translateX(-50%)';
        }
        break;

      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height / 2);
        left = triggerRect.left + scrollX - tooltipRect.width - offset - arrowSize;
        transform = 'translateY(-50%)';
        break;

      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height / 2);
        left = triggerRect.right + scrollX + offset + arrowSize;
        transform = 'translateY(-50%)';
        break;
    }

    // Mobile adjustments
    if (viewportWidth < 768) {
      maxWidth = `${Math.min(280, viewportWidth - (minMargin * 2))}px`;
      
      // On mobile, prefer full-width positioning
      if (finalPosition === 'top' || finalPosition === 'bottom') {
        left = minMargin;
        transform = 'none';
        maxWidth = `${viewportWidth - (minMargin * 2)}px`;
      }
    } else if (viewportWidth < 1024) {
      // Tablet adjustments
      maxWidth = '250px';
    }

    const calculatedPosition: TooltipPosition = {
      top: Math.max(minMargin, top),
      left: Math.max(minMargin, Math.min(left, viewportWidth - minMargin)),
      transform,
      maxWidth
    };

    setPosition(calculatedPosition);
    return calculatedPosition;
  }, [offset, arrowSize, minMargin]);

  // Reset position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(null);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    calculatePosition,
    position
  };
};