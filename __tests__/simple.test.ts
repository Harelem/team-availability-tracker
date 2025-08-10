/**
 * Simple test to verify Jest setup
 */

describe('Simple Test', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have proper environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });
});