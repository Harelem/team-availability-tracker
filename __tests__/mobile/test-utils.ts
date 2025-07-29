/**
 * Mobile Testing Utilities
 * 
 * Utility functions for testing mobile interactions, gestures, and responsive behavior.
 */

import { fireEvent } from '@testing-library/react';

// Mock viewport dimensions
export function resizeWindow(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Trigger resize event
  fireEvent(window, new Event('resize'));
}

// Create mock touch event
export function createMockTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: Array<{ clientX: number; clientY: number }> = []
): TouchEvent {
  const touchList = touches.map(touch => ({
    ...touch,
    identifier: Math.floor(Math.random() * 1000),
    target: document.body,
    radiusX: 20,
    radiusY: 20,
    rotationAngle: 0,
    force: 1,
  })) as Touch[];

  return new TouchEvent(type, {
    touches: touchList,
    targetTouches: touchList,
    changedTouches: touchList,
    bubbles: true,
    cancelable: true,
  });
}

// Simulate swipe gesture
export async function createMockSwipeGesture(
  element: Element,
  direction: 'left' | 'right' | 'up' | 'down',
  distance: number = 100,
  duration: number = 300
): Promise<void> {
  const startCoordinates = { x: 200, y: 200 };
  const endCoordinates = { ...startCoordinates };

  switch (direction) {
    case 'left':
      endCoordinates.x -= distance;
      break;
    case 'right':
      endCoordinates.x += distance;
      break;
    case 'up':
      endCoordinates.y -= distance;
      break;
    case 'down':
      endCoordinates.y += distance;
      break;
  }

  // Touch start
  fireEvent.touchStart(element, {
    touches: [{ clientX: startCoordinates.x, clientY: startCoordinates.y }],
  });

  // Simulate intermediate touch moves for realistic gesture
  const steps = 5;
  const stepX = (endCoordinates.x - startCoordinates.x) / steps;
  const stepY = (endCoordinates.y - startCoordinates.y) / steps;
  const stepDuration = duration / steps;

  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepDuration));
    
    fireEvent.touchMove(element, {
      touches: [{
        clientX: startCoordinates.x + (stepX * i),
        clientY: startCoordinates.y + (stepY * i),
      }],
    });
  }

  // Touch end
  fireEvent.touchEnd(element, {
    changedTouches: [{ clientX: endCoordinates.x, clientY: endCoordinates.y }],
  });
}

// Simulate pinch gesture
export async function createMockPinchGesture(
  element: Element,
  startDistance: number = 100,
  endDistance: number = 200,
  duration: number = 500
): Promise<void> {
  const centerX = 200;
  const centerY = 200;

  // Calculate touch positions
  const getInitialTouches = (distance: number) => [
    { clientX: centerX - distance / 2, clientY: centerY },
    { clientX: centerX + distance / 2, clientY: centerY },
  ];

  const startTouches = getInitialTouches(startDistance);
  const endTouches = getInitialTouches(endDistance);

  // Touch start with two fingers
  fireEvent.touchStart(element, {
    touches: startTouches,
  });

  // Simulate pinch movement
  const steps = 10;
  const stepDuration = duration / steps;

  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepDuration));
    
    const progress = i / steps;
    const currentDistance = startDistance + (endDistance - startDistance) * progress;
    const currentTouches = getInitialTouches(currentDistance);

    fireEvent.touchMove(element, {
      touches: currentTouches,
    });
  }

  // Touch end
  fireEvent.touchEnd(element, {
    changedTouches: endTouches,
  });
}

// Simulate long press
export async function createMockLongPress(
  element: Element,
  duration: number = 500,
  coordinates: { x: number; y: number } = { x: 100, y: 100 }
): Promise<void> {
  // Touch start
  fireEvent.touchStart(element, {
    touches: [{ clientX: coordinates.x, clientY: coordinates.y }],
  });

  // Wait for long press duration
  await new Promise(resolve => setTimeout(resolve, duration));

  // Touch end
  fireEvent.touchEnd(element, {
    changedTouches: [{ clientX: coordinates.x, clientY: coordinates.y }],
  });
}

// Mock device orientation change
export function mockOrientationChange(orientation: 'portrait' | 'landscape'): void {
  const angle = orientation === 'portrait' ? 0 : 90;
  
  Object.defineProperty(screen, 'orientation', {
    writable: true,
    value: {
      angle,
      type: orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary',
    },
  });

  // Also update window dimensions
  if (orientation === 'landscape') {
    resizeWindow(667, 375); // Typical mobile landscape
  } else {
    resizeWindow(375, 667); // Typical mobile portrait
  }

  // Fire orientation change event
  fireEvent(window, new Event('orientationchange'));
}

// Mock device pixel ratio for testing high-DPI displays
export function mockDevicePixelRatio(ratio: number): void {
  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    configurable: true,
    value: ratio,
  });
}

// Mock network connection for testing offline scenarios
export function mockNetworkConnection(online: boolean, connectionType?: string): void {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: online,
  });

  if ('connection' in navigator) {
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: {
        effectiveType: connectionType || '4g',
        downlink: online ? 10 : 0,
        rtt: online ? 50 : 0,
        saveData: false,
      },
    });
  }

  // Fire online/offline events
  fireEvent(window, new Event(online ? 'online' : 'offline'));
}

// Mock CSS media queries
export function mockMediaQuery(query: string, matches: boolean): jest.Mock {
  const mockMatchMedia = jest.fn().mockImplementation(() => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });

  return mockMatchMedia;
}

// Mock intersection observer for testing scroll-based interactions
export function mockIntersectionObserver(): {
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
  trigger: (entries: Partial<IntersectionObserverEntry>[]) => void;
} {
  const observe = jest.fn();
  const unobserve = jest.fn();
  const disconnect = jest.fn();
  
  let callback: IntersectionObserverCallback;

  const mockIntersectionObserver = jest.fn().mockImplementation((cb) => {
    callback = cb;
    return {
      observe,
      unobserve,
      disconnect,
    };
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: mockIntersectionObserver,
  });

  const trigger = (entries: Partial<IntersectionObserverEntry>[]) => {
    if (callback) {
      callback(entries as IntersectionObserverEntry[], {} as IntersectionObserver);
    }
  };

  return {
    observe,
    unobserve,
    disconnect,
    trigger,
  };
}

// Mock getBoundingClientRect for testing element positioning
export function mockGetBoundingClientRect(
  element: Element,
  rect: Partial<DOMRect>
): void {
  const defaultRect = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  };

  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    ...defaultRect,
    ...rect,
    toJSON: jest.fn(),
  });
}

// Test specific viewport configurations
export const viewportSizes = {
  mobile: {
    small: { width: 320, height: 568 }, // iPhone SE
    medium: { width: 375, height: 667 }, // iPhone 8
    large: { width: 414, height: 896 }, // iPhone 11 Pro Max
  },
  tablet: {
    portrait: { width: 768, height: 1024 }, // iPad
    landscape: { width: 1024, height: 768 }, // iPad landscape
  },
  desktop: {
    small: { width: 1024, height: 768 },
    medium: { width: 1440, height: 900 },
    large: { width: 1920, height: 1080 },
  },
};

// Helper to test component across multiple viewports
export async function testAcrossViewports(
  testFn: (viewport: { width: number; height: number }) => Promise<void> | void,
  viewports: Array<{ width: number; height: number }> = [
    viewportSizes.mobile.small,
    viewportSizes.mobile.medium,
    viewportSizes.tablet.portrait,
    viewportSizes.desktop.medium,
  ]
): Promise<void> {
  for (const viewport of viewports) {
    resizeWindow(viewport.width, viewport.height);
    await testFn(viewport);
  }
}

// Mock performance API for testing performance metrics
export function mockPerformanceAPI(): void {
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
    },
  });
}

// Mock requestAnimationFrame for testing animations
export function mockAnimationFrame(): {
  request: jest.Mock;
  cancel: jest.Mock;
  flush: () => void;
} {
  const callbacks: Array<{ id: number; callback: FrameRequestCallback }> = [];
  let nextId = 1;

  const request = jest.fn().mockImplementation((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.push({ id, callback });
    return id;
  });

  const cancel = jest.fn().mockImplementation((id: number) => {
    const index = callbacks.findIndex(cb => cb.id === id);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  });

  const flush = () => {
    const now = performance.now();
    const callbacksToExecute = [...callbacks];
    callbacks.length = 0;
    callbacksToExecute.forEach(({ callback }) => callback(now));
  };

  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: request,
  });

  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: cancel,
  });

  return { request, cancel, flush };
}

export default {
  resizeWindow,
  createMockTouchEvent,
  createMockSwipeGesture,
  createMockPinchGesture,
  createMockLongPress,
  mockOrientationChange,
  mockDevicePixelRatio,
  mockNetworkConnection,
  mockMediaQuery,
  mockIntersectionObserver,
  mockGetBoundingClientRect,
  viewportSizes,
  testAcrossViewports,
  mockPerformanceAPI,
  mockAnimationFrame,
};

// Add a test to satisfy Jest's requirement
describe('Mobile Test Utils', () => {
  test('should export all utility functions', () => {
    expect(resizeWindow).toBeDefined();
    expect(createMockTouchEvent).toBeDefined();
    expect(createMockSwipeGesture).toBeDefined();
    expect(mockMediaQuery).toBeDefined();
    expect(viewportSizes).toBeDefined();
  });
});