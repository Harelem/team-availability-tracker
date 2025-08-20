'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Emergency Mobile Menu Component
 * Ultra-simple mobile menu that cannot fail - bypasses all complex systems
 * Designed for emergency recovery when main navigation is broken
 */
export default function EmergencyMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Client-side only rendering to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Don't render on server to avoid hydration mismatch
  if (!isClient) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 bg-white border-b z-50 p-4 min-h-[64px]"
        style={{ touchAction: 'manipulation' }}
      />
    );
  }

  // Safe navigation function with error handling
  const navigateTo = (path: string) => {
    try {
      setIsOpen(false);
      router.push(path);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to window.location if router fails
      window.location.href = path;
    }
  };

  // Close menu when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Simple hamburger header */}
      <div 
        className="fixed top-0 left-0 right-0 bg-white border-b p-4"
        style={{ 
          touchAction: 'manipulation',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1100, // Higher than any existing mobile navigation
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95"
          style={{ 
            touchAction: 'manipulation', 
            minWidth: '48px', 
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer'
          }}
          aria-label="Navigation menu"
          type="button"
        >
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          )}
        </button>
        
        <div className="flex-1 px-4">
          <h1 className="text-base font-bold text-gray-900 truncate tracking-tight">
            Team Availability Tracker
          </h1>
        </div>
        
        {/* Connection indicator */}
        <div 
          className="w-2 h-2 rounded-full bg-green-500"
          title="Connected"
        />
      </div>
      
      {/* Full-screen menu overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1050 // Below header but above everything else
          }}
          onClick={handleBackdropClick}
          aria-hidden="true"
        >
          <div 
            className="bg-white h-full w-80 max-w-[85vw] overflow-y-auto"
            style={{
              paddingTop: '64px', // Account for header
              touchAction: 'manipulation'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-1">
              
              {/* Main Navigation */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Navigation</h2>
                <div className="space-y-1">
                  
                  <button
                    onClick={() => navigateTo('/')}
                    className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors ${
                      pathname === '/' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{ 
                      touchAction: 'manipulation',
                      minHeight: '48px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      <polyline points="9,22 9,12 15,12 15,22"/>
                    </svg>
                    Dashboard
                  </button>
                  
                  <button
                    onClick={() => navigateTo('/?tab=teams')}
                    className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors ${
                      pathname?.includes('teams') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{ 
                      touchAction: 'manipulation',
                      minHeight: '48px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    Teams
                  </button>
                  
                  <button
                    onClick={() => navigateTo('/executive')}
                    className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors ${
                      pathname?.includes('executive') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{ 
                      touchAction: 'manipulation',
                      minHeight: '48px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3v18h18"/>
                      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                    </svg>
                    Executive Dashboard
                  </button>
                  
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mb-6 pt-4 border-t border-gray-200">
                <h2 className="text-sm font-semibold text-gray-500 mb-3 tracking-wide uppercase">Quick Actions</h2>
                <div className="space-y-1">
                  
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.reload();
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    style={{ 
                      touchAction: 'manipulation',
                      minHeight: '48px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10"/>
                      <polyline points="1 20 1 14 7 14"/>
                      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0022.49 15"/>
                    </svg>
                    Refresh Page
                  </button>
                  
                  <button
                    onClick={() => {
                      try {
                        window.history.back();
                        setIsOpen(false);
                      } catch (error) {
                        navigateTo('/');
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    style={{ 
                      touchAction: 'manipulation',
                      minHeight: '48px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Go Back
                  </button>
                  
                </div>
              </div>
              
              {/* Emergency Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-700">
                    <strong>Emergency Mobile Menu</strong><br/>
                    Simplified navigation for mobile recovery mode.
                  </p>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </>
  );
}