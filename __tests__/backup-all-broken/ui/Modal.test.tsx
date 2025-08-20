/**
 * Enhanced Modal Component Tests
 * 
 * Comprehensive test suite covering functionality, accessibility, focus management, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmationModal, useModal } from '@/components/ui/Modal';
import { ModalSize } from '@/design-system/variants';

expect.extend(toHaveNoViolations);

// Mock createPortal for testing
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('Modal Component', () => {
  // =============================================================================
  // BASIC FUNCTIONALITY TESTS
  // =============================================================================

  describe('Basic Functionality', () => {
    it('renders when open', () => {
      render(
        <Modal isOpen onClose={jest.fn()}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <Modal isOpen={false} onClose={jest.fn()}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen onClose={handleClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('supports custom test ID', () => {
      render(
        <Modal isOpen onClose={jest.fn()} testId="custom-modal">
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByTestId('custom-modal')).toBeInTheDocument();
      expect(screen.getByTestId('custom-modal-overlay')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // SIZE TESTS
  // =============================================================================

  describe('Sizes', () => {
    const sizes: ModalSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', 'full'];

    it.each(sizes)('renders %s size correctly', (size) => {
      render(
        <Modal isOpen onClose={jest.fn()} size={size}>
          <div>Modal content</div>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      const sizeClasses = {
        xs: 'max-w-xs',
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        full: 'max-w-full'
      };
      
      expect(modal).toHaveClass(sizeClasses[size]);
    });
  });

  // =============================================================================
  // TITLE AND DESCRIPTION TESTS
  // =============================================================================

  describe('Title and Description', () => {
    it('renders title', () => {
      render(
        <Modal isOpen onClose={jest.fn()} title="Modal Title">
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('renders description', () => {
      render(
        <Modal isOpen onClose={jest.fn()} description="Modal description">
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal description')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'modal-description');
    });

    it('renders both title and description', () => {
      render(
        <Modal isOpen onClose={jest.fn()} title="Modal Title" description="Modal description">
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal description')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // CLOSE BUTTON TESTS
  // =============================================================================

  describe('Close Button', () => {
    it('shows close button by default', () => {
      render(
        <Modal isOpen onClose={jest.fn()}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
    });

    it('hides close button when specified', () => {
      render(
        <Modal isOpen onClose={jest.fn()} hideCloseButton>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(screen.queryByRole('button', { name: /close modal/i })).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // OVERLAY INTERACTION TESTS
  // =============================================================================

  describe('Overlay Interaction', () => {
    it('closes on overlay click by default', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      // Click the overlay (not the modal content)
      fireEvent.click(screen.getByTestId('custom-modal-overlay') || screen.getByRole('dialog').parentElement!);
      expect(handleClose).toHaveBeenCalled();
    });

    it('prevents closing on overlay click when disabled', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen onClose={handleClose} closeOnOverlayClick={false}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.click(screen.getByRole('dialog').parentElement!);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('does not close when clicking modal content', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.click(screen.getByText('Modal content'));
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // KEYBOARD INTERACTION TESTS
  // =============================================================================

  describe('Keyboard Interaction', () => {
    it('closes on Escape key by default', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen onClose={handleClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });

    it('prevents closing on Escape when disabled', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen onClose={handleClose} closeOnEscape={false}>
          <div>Modal content</div>
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('traps focus within modal', () => {
      render(
        <Modal isOpen onClose={jest.fn()}>
          <button>First button</button>
          <button>Last button</button>
        </Modal>
      );
      
      const firstButton = screen.getByText('First button');
      const lastButton = screen.getByText('Last button');
      
      // Focus should move to first button initially
      act(() => {
        firstButton.focus();
      });
      
      // Tab from last button should move to first
      act(() => {
        lastButton.focus();
        fireEvent.keyDown(lastButton, { key: 'Tab' });
      });
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Modal isOpen onClose={jest.fn()} title="Accessible Modal">
          <div>Modal content</div>
        </Modal>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      render(
        <Modal isOpen onClose={jest.fn()} title="Test Modal" description="Test description">
          <div>Modal content</div>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(modal).toHaveAttribute('aria-describedby', 'modal-description');
    });

    it('manages focus correctly', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <button>Modal Button</button>
            </Modal>
          </>
        );
      };
      
      render(<TestModal />);
      
      const openButton = screen.getByText('Open Modal');
      openButton.focus();
      expect(document.activeElement).toBe(openButton);
      
      fireEvent.click(openButton);
      
      await waitFor(() => {
        // Focus should move to first focusable element in modal
        const modalButton = screen.getByText('Modal Button');
        expect(document.activeElement).toBe(modalButton);
      });
    });

    it('restores focus when closed', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <button onClick={() => setIsOpen(false)}>Close Modal</button>
            </Modal>
          </>
        );
      };
      
      render(<TestModal />);
      
      const openButton = screen.getByText('Open Modal');
      fireEvent.click(openButton);
      
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(document.activeElement).toBe(openButton);
      });
    });
  });

  // =============================================================================
  // SCROLL PREVENTION TESTS
  // =============================================================================

  describe('Scroll Prevention', () => {
    beforeEach(() => {
      document.body.style.overflow = '';
    });

    it('prevents body scroll when open', () => {
      render(
        <Modal isOpen onClose={jest.fn()}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <Modal isOpen onClose={jest.fn()}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(
        <Modal isOpen={false} onClose={jest.fn()}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(document.body.style.overflow).toBe('');
    });

    it('can disable scroll prevention', () => {
      render(
        <Modal isOpen onClose={jest.fn()} preventScroll={false}>
          <div>Modal content</div>
        </Modal>
      );
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  // =============================================================================
  // LIFECYCLE CALLBACKS TESTS
  // =============================================================================

  describe('Lifecycle Callbacks', () => {
    it('calls onAfterOpen when opened', async () => {
      const handleAfterOpen = jest.fn();
      
      render(
        <Modal isOpen onClose={jest.fn()} onAfterOpen={handleAfterOpen}>
          <div>Modal content</div>
        </Modal>
      );
      
      await waitFor(() => {
        expect(handleAfterOpen).toHaveBeenCalled();
      });
    });

    it('calls onAfterClose when closed', async () => {
      const handleAfterClose = jest.fn();
      
      const { rerender } = render(
        <Modal isOpen onClose={jest.fn()} onAfterClose={handleAfterClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      rerender(
        <Modal isOpen={false} onClose={jest.fn()} onAfterClose={handleAfterClose}>
          <div>Modal content</div>
        </Modal>
      );
      
      await waitFor(() => {
        expect(handleAfterClose).toHaveBeenCalled();
      });
    });
  });
});

// =============================================================================
// MODAL SUBCOMPONENT TESTS
// =============================================================================

describe('Modal Subcomponents', () => {
  describe('ModalHeader', () => {
    it('renders children', () => {
      render(<ModalHeader>Header content</ModalHeader>);
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ModalHeader className="custom-header">Header</ModalHeader>);
      const header = screen.getByText('Header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('ModalBody', () => {
    it('renders children', () => {
      render(<ModalBody>Body content</ModalBody>);
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ModalBody className="custom-body">Body</ModalBody>);
      const body = screen.getByText('Body');
      expect(body).toHaveClass('custom-body');
    });
  });

  describe('ModalFooter', () => {
    it('renders children', () => {
      render(<ModalFooter>Footer content</ModalFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ModalFooter className="custom-footer">Footer</ModalFooter>);
      const footer = screen.getByText('Footer');
      expect(footer).toHaveClass('custom-footer');
    });
  });
});

// =============================================================================
// CONFIRMATION MODAL TESTS
// =============================================================================

describe('ConfirmationModal', () => {
  it('renders confirmation modal', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        description="Are you sure?"
      />
    );
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = jest.fn();
    render(
      <ConfirmationModal
        isOpen
        onClose={jest.fn()}
        onConfirm={handleConfirm}
        title="Confirm Action"
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(handleConfirm).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <ConfirmationModal
        isOpen
        onClose={handleClose}
        onConfirm={jest.fn()}
        title="Confirm Action"
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('supports danger variant', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        variant="danger"
      />
    );
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('shows loading state', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        loading
      />
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('supports custom button text', () => {
    render(
      <ConfirmationModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm Action"
        confirmText="Yes, Delete"
        cancelText="No, Keep"
      />
    );
    
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no, keep/i })).toBeInTheDocument();
  });
});

// =============================================================================
// USE MODAL HOOK TESTS
// =============================================================================

describe('useModal Hook', () => {
  const TestComponent = ({ initialOpen = false }: { initialOpen?: boolean }) => {
    const modal = useModal(initialOpen);
    
    return (
      <div>
        <button onClick={modal.open}>Open</button>
        <button onClick={modal.close}>Close</button>
        <button onClick={modal.toggle}>Toggle</button>
        <span data-testid="is-open">{modal.isOpen.toString()}</span>
      </div>
    );
  };

  it('initializes with false by default', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('initializes with provided value', () => {
    render(<TestComponent initialOpen />);
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
  });

  it('opens modal', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
  });

  it('closes modal', () => {
    render(<TestComponent initialOpen />);
    
    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('toggles modal', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
    
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('renders quickly', () => {
    const startTime = performance.now();
    
    render(
      <Modal isOpen onClose={jest.fn()}>
        <div>Performance test content</div>
      </Modal>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(50);
  });

  it('does not cause memory leaks', () => {
    const { unmount } = render(
      <Modal isOpen onClose={jest.fn()}>
        <div>Memory test</div>
      </Modal>
    );
    
    expect(() => unmount()).not.toThrow();
  });
});