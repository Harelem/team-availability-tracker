/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  PWAInstallPrompt, 
  IOSInstallInstructions,
  usePWAInstall 
} from '@/components/pwa/PWAInstallPrompt';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock beforeinstallprompt event
interface MockBeforeInstallPromptEvent {
  preventDefault: jest.Mock;
  prompt: jest.Mock;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

describe('PWAInstallPrompt', () => {
  let mockEvent: MockBeforeInstallPromptEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    mockEvent = {
      preventDefault: jest.fn(),
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    };

    // Mock matchMedia for standalone detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should not render when no install prompt is available', () => {
    const { container } = render(<PWAInstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when already dismissed', () => {
    mockLocalStorage.getItem.mockReturnValue('true');
    const { container } = render(<PWAInstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when already in standalone mode', () => {
    // Mock standalone mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { container } = render(<PWAInstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should render install prompt when conditions are met', async () => {
    const { rerender } = render(<PWAInstallPrompt />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      event.preventDefault = mockEvent.preventDefault;
      event.prompt = mockEvent.prompt;
      event.userChoice = mockEvent.userChoice;
      window.dispatchEvent(event);
    });

    rerender(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('Install Team Tracker')).toBeInTheDocument();
    });

    expect(screen.getByText('Get the full app experience')).toBeInTheDocument();
    expect(screen.getByText('Works offline with cached data')).toBeInTheDocument();
    expect(screen.getByText('Receive push notifications')).toBeInTheDocument();
    expect(screen.getByText('Faster loading and performance')).toBeInTheDocument();
    expect(screen.getByText('Secure and always up-to-date')).toBeInTheDocument();
  });

  it('should call install when install button is clicked', async () => {
    const onInstall = jest.fn();
    const { rerender } = render(<PWAInstallPrompt onInstall={onInstall} />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      event.preventDefault = mockEvent.preventDefault;
      event.prompt = mockEvent.prompt;
      event.userChoice = mockEvent.userChoice;
      window.dispatchEvent(event);
    });

    rerender(<PWAInstallPrompt onInstall={onInstall} />);

    await waitFor(() => {
      expect(screen.getByText('Install App')).toBeInTheDocument();
    });

    const installButton = screen.getByText('Install App');
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockEvent.prompt).toHaveBeenCalled();
    });

    // Wait for userChoice to resolve
    await act(async () => {
      await mockEvent.userChoice;
    });

    expect(onInstall).toHaveBeenCalled();
  });

  it('should dismiss prompt when dismiss button is clicked', async () => {
    const onDismiss = jest.fn();
    const { rerender } = render(<PWAInstallPrompt onDismiss={onDismiss} />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      event.preventDefault = mockEvent.preventDefault;
      event.prompt = mockEvent.prompt;
      event.userChoice = mockEvent.userChoice;
      window.dispatchEvent(event);
    });

    rerender(<PWAInstallPrompt onDismiss={onDismiss} />);

    await waitFor(() => {
      expect(screen.getByText('Not now')).toBeInTheDocument();
    });

    const dismissButton = screen.getByText('Not now');
    fireEvent.click(dismissButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', 'true');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should handle installation errors gracefully', async () => {
    const mockErrorEvent = {
      preventDefault: jest.fn(),
      prompt: jest.fn().mockRejectedValue(new Error('Installation failed')),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' })
    };

    const { rerender } = render(<PWAInstallPrompt />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      Object.assign(event, mockErrorEvent);
      window.dispatchEvent(event);
    });

    rerender(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('Install App')).toBeInTheDocument();
    });

    const installButton = screen.getByText('Install App');
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockErrorEvent.prompt).toHaveBeenCalled();
    });

    // Should not crash on error
    expect(screen.getByText('Install App')).toBeInTheDocument();
  });
});

describe('IOSInstallInstructions', () => {
  it('should render iOS installation instructions', () => {
    const onClose = jest.fn();
    render(<IOSInstallInstructions onClose={onClose} />);

    expect(screen.getByText('Install on iOS')).toBeInTheDocument();
    expect(screen.getByText(/Tap the.*Share.*button/)).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
    expect(screen.getByText(/Customize the name.*Add/)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<IOSInstallInstructions onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i }) || 
                       screen.getAllByRole('button').find(btn => 
                         btn.querySelector('svg') // X icon
                       );

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should call onClose when Got it button is clicked', () => {
    const onClose = jest.fn();
    render(<IOSInstallInstructions onClose={onClose} />);

    const gotItButton = screen.getByText('Got it');
    fireEvent.click(gotItButton);

    expect(onClose).toHaveBeenCalled();
  });
});

describe('usePWAInstall hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should return correct initial state', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('should detect standalone mode', () => {
    // Mock standalone mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(true);
  });

  it('should detect iOS standalone mode', () => {
    // Mock iOS standalone
    Object.defineProperty(window.navigator, 'standalone', {
      writable: true,
      value: true,
    });

    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.isInstalled).toBe(true);
  });

  it('should update canInstall when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePWAInstall());

    expect(result.current.canInstall).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('should update state when app is installed', () => {
    const { result } = renderHook(() => usePWAInstall());

    // First set canInstall to true
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });

    expect(result.current.canInstall).toBe(true);
    expect(result.current.isInstalled).toBe(false);

    // Then simulate installation
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(true);
  });
});

describe('Accessibility', () => {
  it('should have proper ARIA attributes and roles', async () => {
    const { rerender } = render(<PWAInstallPrompt />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      event.preventDefault = jest.fn();
      event.prompt = jest.fn();
      event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      window.dispatchEvent(event);
    });

    rerender(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('Install Team Tracker')).toBeInTheDocument();
    });

    // Check that buttons are properly labeled
    const installButton = screen.getByRole('button', { name: /install app/i });
    const dismissButton = screen.getByRole('button', { name: /not now/i });
    
    expect(installButton).toBeInTheDocument();
    expect(dismissButton).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const { rerender } = render(<PWAInstallPrompt />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      event.preventDefault = jest.fn();
      event.prompt = jest.fn();
      event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      window.dispatchEvent(event);
    });

    rerender(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('Install Team Tracker')).toBeInTheDocument();
    });

    // Test keyboard navigation
    const installButton = screen.getByRole('button', { name: /install app/i });
    
    // Focus should be manageable
    installButton.focus();
    expect(installButton).toHaveFocus();
  });
});