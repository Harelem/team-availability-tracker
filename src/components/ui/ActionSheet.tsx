/**
 * Enhanced ActionSheet Component
 * 
 * A mobile-friendly action sheet component that slides up from the bottom.
 * Perfect for presenting contextual actions on mobile devices.
 */

import React, { forwardRef, ReactNode, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/design-system/theme';
import { X } from 'lucide-react';
import { IconButton } from './button';

// =============================================================================
// TYPES
// =============================================================================

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  snapPoints?: number[];
  initialSnapPoint?: number;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  testId?: string;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

export interface ActionSheetItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export interface ActionSheetSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export interface UseActionSheetReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

// =============================================================================
// ACTION SHEET COMPONENT
// =============================================================================

export const ActionSheet = forwardRef<HTMLDivElement, ActionSheetProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      preventScroll = true,
      snapPoints,
      initialSnapPoint,
      className,
      overlayClassName,
      contentClassName,
      testId,
      onAfterOpen,
      onAfterClose
    },
    ref
  ) => {
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const startYRef = React.useRef<number>(0);
    const currentYRef = React.useRef<number>(0);
    const isDraggingRef = React.useRef<boolean>(false);

    // =============================================================================
    // KEYBOARD AND OVERLAY HANDLERS
    // =============================================================================

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    }, [closeOnEscape, onClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === overlayRef.current) {
        onClose();
      }
    };

    // =============================================================================
    // TOUCH HANDLERS FOR SWIPE TO DISMISS
    // =============================================================================

    const handleTouchStart = useCallback((e: TouchEvent) => {
      if (!contentRef.current?.contains(e.target as Node)) return;
      
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = 0;
      isDraggingRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
      if (!isDraggingRef.current && !contentRef.current?.contains(e.target as Node)) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;
      
      if (deltaY > 0) { // Only allow downward swipe
        isDraggingRef.current = true;
        currentYRef.current = deltaY;
        
        if (contentRef.current) {
          const progress = Math.min(deltaY / 200, 1);
          contentRef.current.style.transform = `translateY(${deltaY}px)`;
          
          // Fade out overlay
          if (overlayRef.current) {
            overlayRef.current.style.backgroundColor = `rgba(0, 0, 0, ${0.5 * (1 - progress)})`;
          }
        }
      }
    }, []);

    const handleTouchEnd = useCallback(() => {
      if (!isDraggingRef.current || !contentRef.current) return;
      
      const threshold = 100;
      
      if (currentYRef.current > threshold) {
        // Close the action sheet
        onClose();
      } else {
        // Snap back to position
        contentRef.current.style.transform = 'translateY(0)';
        if (overlayRef.current) {
          overlayRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        }
      }
      
      isDraggingRef.current = false;
      currentYRef.current = 0;
    }, [onClose]);

    // =============================================================================
    // EFFECTS
    // =============================================================================

    useEffect(() => {
      if (isOpen) {
        // Prevent body scroll
        if (preventScroll) {
          document.body.style.overflow = 'hidden';
        }

        // Add event listeners
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Callback
        onAfterOpen?.();
      } else {
        // Restore body scroll
        if (preventScroll) {
          document.body.style.overflow = '';
        }

        // Remove event listeners
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);

        // Reset transforms
        if (contentRef.current) {
          contentRef.current.style.transform = '';
        }
        if (overlayRef.current) {
          overlayRef.current.style.backgroundColor = '';
        }

        // Callback
        onAfterClose?.();
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        
        if (preventScroll) {
          document.body.style.overflow = '';
        }
      };
    }, [
      isOpen, 
      preventScroll, 
      handleKeyDown, 
      handleTouchStart, 
      handleTouchMove, 
      handleTouchEnd,
      onAfterOpen, 
      onAfterClose
    ]);

    // =============================================================================
    // STYLES
    // =============================================================================

    const overlayClasses = cx(
      'fixed inset-0 z-50 bg-black bg-opacity-50',
      'transition-all duration-300 ease-out',
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
      overlayClassName
    );

    const contentClasses = cx(
      'fixed bottom-0 left-0 right-0 z-50',
      'bg-white rounded-t-xl shadow-2xl',
      'max-h-[90vh] overflow-hidden flex flex-col',
      'transition-all duration-300 ease-out',
      isOpen ? 'translate-y-0' : 'translate-y-full',
      contentClassName,
      className
    );

    // =============================================================================
    // RENDER
    // =============================================================================

    if (!isOpen && !contentRef.current?.style.transform) {
      return null;
    }

    const actionSheetContent = (
      <>
        {/* Overlay */}
        <div
          ref={overlayRef}
          className={overlayClasses}
          onClick={handleOverlayClick}
          data-testid={testId ? `${testId}-overlay` : undefined}
        />

        {/* Content */}
        <div
          ref={contentRef}
          className={contentClasses}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'action-sheet-title' : undefined}
          aria-describedby={description ? 'action-sheet-description' : undefined}
          data-testid={testId}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          {(title || description || showCloseButton) && (
            <div className="px-4 pb-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {title && (
                    <h2 
                      id="action-sheet-title" 
                      className="text-lg font-semibold text-gray-900 mb-1"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p 
                      id="action-sheet-description" 
                      className="text-sm text-gray-600"
                    >
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <IconButton
                    icon={<X size={20} />}
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Close action sheet"
                    className="ml-4 -mt-1"
                    testId={testId ? `${testId}-close` : undefined}
                  />
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </>
    );

    // Render in portal
    if (typeof document !== 'undefined') {
      const portalRoot = document.getElementById('modal-root') || document.body;
      return createPortal(actionSheetContent, portalRoot);
    }

    return null;
  }
);

ActionSheet.displayName = 'ActionSheet';

// =============================================================================
// ACTION SHEET ITEM COMPONENT
// =============================================================================

export const ActionSheetItem = forwardRef<HTMLButtonElement, ActionSheetItemProps>(
  (
    {
      children,
      icon,
      variant = 'default',
      disabled = false,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const itemClasses = cx(
      'w-full flex items-center gap-3 px-4 py-4 text-left',
      'transition-colors duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'default' && !disabled 
        ? 'text-gray-900 hover:bg-gray-50 active:bg-gray-100' 
        : variant === 'destructive' && !disabled
        ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
        : '',
      className
    );

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={itemClasses}
        data-testid={testId}
        {...props}
      >
        {icon && (
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {icon}
          </span>
        )}
        <span className="flex-1 font-medium">{children}</span>
      </button>
    );
  }
);

ActionSheetItem.displayName = 'ActionSheetItem';

// =============================================================================
// ACTION SHEET SECTION COMPONENT
// =============================================================================

export const ActionSheetSection: React.FC<ActionSheetSectionProps> = ({
  children,
  title,
  className
}) => {
  return (
    <div className={cx('border-t border-gray-200 first:border-t-0', className)}>
      {title && (
        <div className="px-4 py-3 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// ACTION SHEET SEPARATOR COMPONENT
// =============================================================================

export const ActionSheetSeparator: React.FC<{ className?: string }> = ({
  className
}) => {
  return <div className={cx('h-px bg-gray-200', className)} />;
};

// =============================================================================
// ACTION SHEET CONTENT COMPONENT
// =============================================================================

export interface ActionSheetContentProps {
  children: ReactNode;
  className?: string;
}

export const ActionSheetContent: React.FC<ActionSheetContentProps> = ({
  children,
  className
}) => {
  return (
    <div className={cx('px-4 py-4', className)}>
      {children}
    </div>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

export const useActionSheet = (initialOpen = false): UseActionSheetReturn => {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
};

// =============================================================================
// MOBILE DETECTION HOOK
// =============================================================================

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// =============================================================================
// RESPONSIVE ACTION SHEET WRAPPER
// =============================================================================

export interface ResponsiveActionSheetProps extends ActionSheetProps {
  fallbackComponent?: React.ComponentType<any>;
  fallbackProps?: any;
  mobileBreakpoint?: number;
}

export const ResponsiveActionSheet: React.FC<ResponsiveActionSheetProps> = ({
  fallbackComponent: Fallback,
  fallbackProps,
  mobileBreakpoint = 768,
  ...actionSheetProps
}) => {
  const [windowWidth, setWindowWidth] = React.useState<number>(0);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize(); // Set initial value
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < mobileBreakpoint;

  if (!isMobile && Fallback) {
    return <Fallback {...fallbackProps} />;
  }

  return <ActionSheet {...actionSheetProps} />;
};

// =============================================================================
// EXPORTS
// =============================================================================

export default ActionSheet;