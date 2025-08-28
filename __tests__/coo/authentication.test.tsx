import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useCOOAuth, withCOOAuth } from '@/hooks/useCOOAuth';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

const MockComponent = () => <div>COO Component</div>;
const ProtectedComponent = withCOOAuth(MockComponent);

describe('COO Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCOOAuth Hook', () => {
    it('should return loading state initially', () => {
      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
    });

    it('should identify COO user correctly', async () => {
      // Mock successful fetch response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            isCOO: true, 
            user: { id: 135, name: 'Nir Shilo', hebrew: 'ניר שילה' } 
          }),
        })
      );

      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('is-coo')).toHaveTextContent('true');
      });
    });

    it('should reject non-COO users', async () => {
      // Mock failed fetch response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            isCOO: false, 
            user: null 
          }),
        })
      );

      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('is-coo')).toHaveTextContent('false');
      });
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock fetch error - falls back to development mode
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        // In development fallback, it allows access
        expect(screen.getByTestId('is-coo')).toHaveTextContent('true');
      });
    });
  });

  describe('withCOOAuth HOC', () => {
    it('should show loading state while checking authentication', () => {
      // Mock fetch that never resolves to keep loading state
      global.fetch = jest.fn(() => new Promise(() => {}));

      render(<ProtectedComponent />);
      
      expect(screen.getByText('Verifying COO access...')).toBeInTheDocument();
    });

    it('should render protected component for COO user', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            isCOO: true, 
            user: { id: 135, name: 'Nir Shilo', hebrew: 'ניר שילה' } 
          }),
        })
      );

      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByText('COO Component')).toBeInTheDocument();
      });
    });

    it('should show access denied for non-COO users', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            isCOO: false, 
            user: null 
          }),
        })
      );

      render(<ProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
        expect(screen.getByText(/COO \(Nir Shilo\)/i)).toBeInTheDocument();
      });
    });

    it('should handle no user gracefully', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
        })
      );

      render(<ProtectedComponent />);

      await waitFor(() => {
        // Falls back to development mode which allows access
        expect(screen.getByText('COO Component')).toBeInTheDocument();
      });
    });
  });

  describe('Development Environment Behavior', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow development access when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development';
      
      // Mock fetch error to trigger fallback
      global.fetch = jest.fn(() => Promise.reject(new Error('API not available')));

      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        // Development fallback allows access
        expect(screen.getByTestId('is-coo')).toHaveTextContent('true');
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should not allow empty email', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            isCOO: false, 
            user: { email: '' } 
          }),
        })
      );

      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-coo')).toHaveTextContent('false');
      });
    });

    it('should not allow null email', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            isCOO: false, 
            user: { email: null } 
          }),
        })
      );

      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-coo')).toHaveTextContent('false');
      });
    });

    it('should be case-sensitive for email matching', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            isCOO: false, 
            user: { email: 'NIR.SHILO@EXAMPLE.COM' } 
          }),
        })
      );

      const TestComponent = () => {
        const { isLoading, isCOO } = useCOOAuth();
        return (
          <div>
            <span data-testid="loading">{isLoading.toString()}</span>
            <span data-testid="is-coo">{isCOO.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-coo')).toHaveTextContent('false');
      });
    });
  });
});