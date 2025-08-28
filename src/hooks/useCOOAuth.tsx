import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database';

interface COOAuthState {
  isCOO: boolean;
  isLoading: boolean;
  error: string | null;
  user: { id: number; name: string; hebrew: string } | null;
}

/**
 * Hook to verify COO (Nir Shilo) authentication
 * In a real app, this would check auth.uid() against user records
 * For now, this is a frontend-only check for demonstration
 */
export function useCOOAuth(): COOAuthState {
  const [state, setState] = useState<COOAuthState>({
    isCOO: false,
    isLoading: true,
    error: null,
    user: null
  });

  useEffect(() => {
    const checkCOOAccess = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // In a real app, you would:
        // 1. Get the current authenticated user from Supabase auth
        // 2. Check if their auth.uid() matches Nir Shilo's record
        // 3. Verify their role/permissions
        
        // For now, we'll simulate this by checking if Nir Shilo exists
        // In production, you'd add proper authentication
        const response = await fetch('/api/auth/check-coo', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setState({
            isCOO: data.isCOO,
            isLoading: false,
            error: null,
            user: data.user
          });
        } else {
          // Fallback for development - check if we can access Nir Shilo's record
          // This is NOT secure for production
          console.warn('🚨 Development mode: Using fallback COO check');
          
          setState({
            isCOO: true, // Allow for development
            isLoading: false,
            error: null,
            user: { id: 135, name: 'Nir Shilo', hebrew: 'ניר שילה' }
          });
        }
      } catch (error) {
        console.error('COO authentication check failed:', error);
        
        // Development fallback
        setState({
          isCOO: true, // Allow for development
          isLoading: false,
          error: null,
          user: { id: 135, name: 'Nir Shilo', hebrew: 'ניר שילה' }
        });
      }
    };

    checkCOOAccess();
  }, []);

  return state;
}

/**
 * Higher-order component to protect COO-only routes
 */
export function withCOOAuth<P extends object>(Component: React.ComponentType<P>): React.ComponentType<P> {
  const COOProtectedComponent = (props: P) => {
    const { isCOO, isLoading, error, user } = useCOOAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying COO access...</p>
          </div>
        </div>
      );
    }

    if (error || !isCOO) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl font-bold">🚫</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              This dashboard is only accessible to the COO (Nir Shilo).
            </p>
            <p className="text-sm text-gray-500">
              {error || 'You do not have the required permissions to access this page.'}
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
  
  COOProtectedComponent.displayName = `withCOOAuth(${Component.displayName || Component.name})`;
  
  return COOProtectedComponent;
}