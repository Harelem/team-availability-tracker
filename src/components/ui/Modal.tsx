/**
 * Enhanced Modal Component
 * 
 * A comprehensive modal system with support for different sizes, animations,
 * focus management, and full accessibility features.
 */

import React, { 
  forwardRef, 
  ReactNode, 
  useEffect, 
  useRef, 
  useCallback,
  Fragment 
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/design-system/theme';
import { ModalSize } from '@/design-system/variants';
import { X } from 'lucide-react';
import { IconButton } from './button';

// =============================================================================
// TYPES
// =============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  title?: string;
  description?: string;
  hideCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  testId?: string;
  initialFocus?: React.RefObject<HTMLElement>;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

export interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

// =============================================================================
// FOCUS TRAP UTILITIES
// =============================================================================

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'details',
    '[tabindex]:not([tabindex="-1"])',
    'a[href]',
    '[contenteditable="true"]'
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
    .filter(el => !el.hasAttribute('aria-hidden'));
};

// =============================================================================
// MODAL COMPONENT
// =============================================================================

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      children,
      size = 'md',
      title,
      description,
      hideCloseButton = false,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      preventScroll = true,
      className,
      overlayClassName,
      contentClassName,
      testId,
      initialFocus,
      onAfterOpen,
      onAfterClose
    },
    ref
  ) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);

    // =============================================================================
    // FOCUS MANAGEMENT
    // =============================================================================

    const trapFocus = useCallback((e: KeyboardEvent) => {
      if (!contentRef.current) return;

      const focusableElements = getFocusableElements(contentRef.current);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    }, []);

    // =============================================================================
    // KEYBOARD HANDLERS
    // =============================================================================

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
      trapFocus(e);
    }, [closeOnEscape, onClose, trapFocus]);

    // =============================================================================
    // EFFECTS
    // =============================================================================

    useEffect(() => {
      if (isOpen) {
        // Store previously focused element
        previousActiveElement.current = document.activeElement;

        // Prevent body scroll
        if (preventScroll) {
          document.body.style.overflow = 'hidden';
        }

        // Focus management
        setTimeout(() => {
          if (initialFocus?.current) {
            initialFocus.current.focus();
          } else if (contentRef.current) {
            const focusableElements = getFocusableElements(contentRef.current);
            focusableElements[0]?.focus();
          }
        }, 100);

        // Add keyboard listeners
        document.addEventListener('keydown', handleKeyDown);

        // Callback
        onAfterOpen?.();
      } else {
        // Restore body scroll
        if (preventScroll) {
          document.body.style.overflow = '';
        }

        // Restore focus
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }

        // Remove keyboard listeners
        document.removeEventListener('keydown', handleKeyDown);

        // Callback
        onAfterClose?.();
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (preventScroll) {
          document.body.style.overflow = '';
        }
      };
    }, [isOpen, preventScroll, handleKeyDown, initialFocus, onAfterOpen, onAfterClose]);

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === overlayRef.current) {
        onClose();
      }
    };

    // =============================================================================
    // STYLES
    // =============================================================================

    const overlayClasses = cx(
      // Base overlay styles
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-black bg-opacity-50 backdrop-blur-sm',
      'p-2 sm:p-4 overflow-auto',
      
      // Animation
      'animate-in fade-in duration-200',
      
      // Mobile optimizations
      'touch-manipulation overscroll-contain',
      
      overlayClassName
    );

    const sizeClasses = {
      xs: 'max-w-xs mx-2 sm:mx-0',
      sm: 'max-w-sm mx-2 sm:mx-0',
      md: 'max-w-md mx-2 sm:mx-0',
      lg: 'max-w-lg mx-2 sm:mx-0',
      xl: 'max-w-xl mx-2 sm:mx-0',
      '2xl': 'max-w-2xl mx-2 sm:mx-0',
      '3xl': 'max-w-3xl mx-2 sm:mx-0',
      '4xl': 'max-w-4xl mx-2 sm:mx-0',
      '5xl': 'max-w-5xl mx-2 sm:mx-0',
      '6xl': 'max-w-6xl mx-2 sm:mx-0',
      full: 'max-w-full w-full h-full mx-0 rounded-none sm:rounded-lg'
    };

    const contentClasses = cx(
      // Base content styles
      'relative w-full bg-white rounded-lg sm:rounded-xl shadow-xl',
      'max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col',
      
      // Mobile optimizations
      'touch-manipulation',
      'min-h-0', // Ensure flex shrinking works properly
      
      // Animation
      'animate-in zoom-in-95 duration-200',
      
      // Size
      sizeClasses[size],
      
      contentClassName,
      className
    );

    // =============================================================================
    // RENDER
    // =============================================================================

    if (!isOpen) {
      return null;
    }

    const modalContent = (
      <div
        ref={overlayRef}
        className={overlayClasses}
        onClick={handleOverlayClick}
        data-testid={testId ? `${testId}-overlay` : undefined}
      >
        <div
          ref={contentRef}
          className={contentClasses}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          data-testid={testId}
        >
          {/* Close button - Mobile optimized */}
          {!hideCloseButton && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
              <button
                onClick={onClose}
                aria-label="Close modal"
                data-testid={testId ? `${testId}-close` : undefined}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
          )}

          {/* Header */}
          {(title || description) && (
            <ModalHeader>
              {title && (
                <h2 
                  id="modal-title" 
                  className="text-lg font-semibold text-gray-900 pr-8"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p 
                  id="modal-description" 
                  className="mt-1 text-sm text-gray-600 pr-8"
                >
                  {description}
                </p>
              )}
            </ModalHeader>
          )}

          {/* Content - Mobile optimized scrolling */}
          <div className="flex-1 overflow-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    );

    // Render in portal
    if (typeof document !== 'undefined') {
      const portalRoot = document.getElementById('modal-root') || document.body;
      return createPortal(modalContent, portalRoot);
    }

    return null;
  }
);

Modal.displayName = 'Modal';

// =============================================================================
// MODAL SUBCOMPONENTS
// =============================================================================

export const ModalHeader: React.FC<ModalHeaderProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cx('px-4 sm:px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

export const ModalBody: React.FC<ModalBodyProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cx('px-4 sm:px-6 py-4', className)}>
      {children}
    </div>
  );
};

export const ModalFooter: React.FC<ModalFooterProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cx(
      'px-4 sm:px-6 py-4 border-t border-gray-200',
      'flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-3',
      className
    )}>
      {children}
    </div>
  );
};

// =============================================================================
// CONFIRMATION MODAL
// =============================================================================

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  testId?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  testId
}) => {
  const confirmVariant = variant === 'danger' ? 'error' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      testId={testId}
    >
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px] touch-manipulation order-2 sm:order-1"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cx(
            'px-4 py-3 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 min-h-[44px] touch-manipulation order-1 sm:order-2',
            variant === 'default' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800' : '',
            variant === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 active:bg-red-800' : ''
          )}
        >
          {loading ? 'Loading...' : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useModal = (initialOpen = false): UseModalReturn => {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
};

// =============================================================================
// EXPORTS
// =============================================================================

export type { ModalSize };
export default Modal;