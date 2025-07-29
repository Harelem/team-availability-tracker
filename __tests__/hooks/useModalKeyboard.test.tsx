/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';

// Mock focus-related methods
const mockFocus = jest.fn();
const mockBlur = jest.fn();

// Create mock elements
const createMockElement = (tagName: string = 'button'): HTMLElement => {
  const element = document.createElement(tagName);
  element.focus = mockFocus;
  element.blur = mockBlur;
  element.tabIndex = 0;
  return element;
};

describe('useModalKeyboard', () => {
  let mockModalRef: React.RefObject<HTMLDivElement>;
  let mockElements: HTMLElement[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFocus.mockClear();
    mockBlur.mockClear();

    // Create mock modal element
    const modalElement = document.createElement('div');
    mockModalRef = { current: modalElement };

    // Create mock focusable elements
    mockElements = [
      createMockElement('button'),
      createMockElement('input'),
      createMockElement('select'),
      createMockElement('a')
    ];

    // Mock querySelectorAll to return our mock elements
    jest.spyOn(modalElement, 'querySelectorAll').mockReturnValue(
      mockElements as any as NodeListOf<Element>
    );

    // Mock document.activeElement
    Object.defineProperty(document, 'activeElement', {
      writable: true,
      configurable: true,
      value: document.body
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(false, onClose)
    );

    expect(result.current.focusedElementIndex).toBe(0);
    expect(result.current.modalRef.current).toBeNull();
    expect(result.current.focusableElements).toEqual([]);
    expect(typeof result.current.handleKeyDown).toBe('function');
    expect(typeof result.current.setFocusedElement).toBe('function');
  });

  it('should focus first element when modal opens', () => {
    const onClose = jest.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useModalKeyboard(isOpen, onClose),
      { initialProps: { isOpen: false } }
    );

    // Mock the modal ref
    result.current.modalRef.current = mockModalRef.current;

    // Open the modal
    rerender({ isOpen: true });

    // Should focus the first element
    expect(mockFocus).toHaveBeenCalledTimes(1);
    expect(result.current.focusableElements).toHaveLength(4);
  });

  it('should handle Escape key press', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { closeOnEscape: true })
    );

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    
    act(() => {
      result.current.handleKeyDown(escapeEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close on Escape when closeOnEscape is false', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { closeOnEscape: false })
    );

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    
    act(() => {
      result.current.handleKeyDown(escapeEvent);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should handle Tab key navigation forward', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: true })
    );

    // Mock the modal ref and focusable elements
    result.current.modalRef.current = mockModalRef.current;
    
    // Simulate having focusable elements
    act(() => {
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false });
      result.current.handleKeyDown(tabEvent);
    });

    expect(result.current.focusedElementIndex).toBe(1);
  });

  it('should handle Shift+Tab key navigation backward', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: true })
    );

    // Mock the modal ref
    result.current.modalRef.current = mockModalRef.current;

    // Start at second element
    act(() => {
      result.current.setFocusedElement(1);
    });

    act(() => {
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      result.current.handleKeyDown(shiftTabEvent);
    });

    expect(result.current.focusedElementIndex).toBe(0);
  });

  it('should wrap focus to end when tabbing forward from last element', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: true })
    );

    result.current.modalRef.current = mockModalRef.current;

    // Start at last element (index 3)
    act(() => {
      result.current.setFocusedElement(3);
    });

    act(() => {
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false });
      result.current.handleKeyDown(tabEvent);
    });

    expect(result.current.focusedElementIndex).toBe(0);
  });

  it('should wrap focus to beginning when shift+tabbing from first element', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: true })
    );

    result.current.modalRef.current = mockModalRef.current;

    // Start at first element (index 0)
    expect(result.current.focusedElementIndex).toBe(0);

    act(() => {
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      result.current.handleKeyDown(shiftTabEvent);
    });

    expect(result.current.focusedElementIndex).toBe(3); // Last element
  });

  it('should handle arrow key navigation', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: true })
    );

    result.current.modalRef.current = mockModalRef.current;

    // ArrowDown should move to next element
    act(() => {
      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(arrowDownEvent);
    });

    expect(result.current.focusedElementIndex).toBe(1);

    // ArrowUp should move to previous element
    act(() => {
      const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      result.current.handleKeyDown(arrowUpEvent);
    });

    expect(result.current.focusedElementIndex).toBe(0);
  });

  it('should handle Home and End keys', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: true })
    );

    result.current.modalRef.current = mockModalRef.current;

    // End key should go to last element
    act(() => {
      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      result.current.handleKeyDown(endEvent);
    });

    expect(result.current.focusedElementIndex).toBe(3);

    // Home key should go to first element
    act(() => {
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      result.current.handleKeyDown(homeEvent);
    });

    expect(result.current.focusedElementIndex).toBe(0);
  });

  it('should not trap focus when trapFocus is false', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: false })
    );

    result.current.modalRef.current = mockModalRef.current;

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    
    act(() => {
      result.current.handleKeyDown(tabEvent);
    });

    // Should not change focused element when trapFocus is false
    expect(result.current.focusedElementIndex).toBe(0);
  });

  it('should restore focus when modal closes', () => {
    const onClose = jest.fn();
    const activeElement = document.createElement('button');
    activeElement.focus = mockFocus;
    
    // Set up active element before modal opens
    Object.defineProperty(document, 'activeElement', {
      value: activeElement,
      configurable: true
    });

    const { rerender } = renderHook(
      ({ isOpen }) => useModalKeyboard(isOpen, onClose, { restoreFocus: true }),
      { initialProps: { isOpen: false } }
    );

    // Open modal
    rerender({ isOpen: true });

    // Close modal
    rerender({ isOpen: false });

    // Should restore focus to original element
    expect(mockFocus).toHaveBeenCalled();
  });

  it('should not restore focus when restoreFocus is false', () => {
    const onClose = jest.fn();
    const activeElement = document.createElement('button');
    activeElement.focus = mockFocus;
    
    Object.defineProperty(document, 'activeElement', {
      value: activeElement,
      configurable: true
    });

    const { rerender } = renderHook(
      ({ isOpen }) => useModalKeyboard(isOpen, onClose, { restoreFocus: false }),
      { initialProps: { isOpen: false } }
    );

    // Clear previous focus calls
    mockFocus.mockClear();

    // Open modal
    rerender({ isOpen: true });

    // Close modal
    rerender({ isOpen: false });

    // Should not restore focus
    expect(mockFocus).not.toHaveBeenCalled();
  });

  it('should handle click outside modal', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { closeOnOutsideClick: true })
    );

    const modalElement = document.createElement('div');
    result.current.modalRef.current = modalElement;

    // Create click event outside modal
    const outsideElement = document.createElement('div');
    const clickEvent = new MouseEvent('mousedown') as any;
    Object.defineProperty(clickEvent, 'target', { value: outsideElement });

    // Simulate click outside
    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close on click inside modal', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { closeOnOutsideClick: true })
    );

    const modalElement = document.createElement('div');
    const insideElement = document.createElement('button');
    modalElement.appendChild(insideElement);
    result.current.modalRef.current = modalElement;

    // Create click event inside modal
    const clickEvent = new MouseEvent('mousedown') as any;
    Object.defineProperty(clickEvent, 'target', { value: insideElement });

    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should not close on outside click when closeOnOutsideClick is false', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { closeOnOutsideClick: false })
    );

    const modalElement = document.createElement('div');
    result.current.modalRef.current = modalElement;

    const outsideElement = document.createElement('div');
    const clickEvent = new MouseEvent('mousedown') as any;
    Object.defineProperty(clickEvent, 'target', { value: outsideElement });

    act(() => {
      document.dispatchEvent(clickEvent);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', () => {
    const onClose = jest.fn();
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { result, unmount } = renderHook(() => 
      useModalKeyboard(true, onClose, { closeOnOutsideClick: true })
    );

    // Mock modal ref
    result.current.modalRef.current = document.createElement('div');

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should handle empty focusable elements array', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useModalKeyboard(true, onClose, { trapFocus: true })
    );

    // Mock modal with no focusable elements
    const modalElement = document.createElement('div');
    jest.spyOn(modalElement, 'querySelectorAll').mockReturnValue(
      [] as any as NodeListOf<Element>
    );
    result.current.modalRef.current = modalElement;

    // Should handle tab without crashing
    act(() => {
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      result.current.handleKeyDown(tabEvent);
    });

    expect(result.current.focusedElementIndex).toBe(0);
    expect(result.current.focusableElements).toEqual([]);
  });

  it('should update focusable elements when modal content changes', () => {
    const onClose = jest.fn();
    const { result, rerender } = renderHook(() => 
      useModalKeyboard(true, onClose)
    );

    const modalElement = document.createElement('div');
    
    // Initially no elements
    jest.spyOn(modalElement, 'querySelectorAll').mockReturnValue(
      [] as any as NodeListOf<Element>
    );
    
    result.current.modalRef.current = modalElement;
    rerender();

    expect(result.current.focusableElements).toEqual([]);

    // Add elements
    jest.spyOn(modalElement, 'querySelectorAll').mockReturnValue(
      mockElements as any as NodeListOf<Element>
    );
    
    rerender();

    expect(result.current.focusableElements).toHaveLength(4);
  });
});