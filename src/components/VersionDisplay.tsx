'use client';

import { useState } from 'react';

/**
 * Version Display Component for Mobile Emergency Debugging
 * Shows current app version and build timestamp to verify cache invalidation
 */
export default function VersionDisplay() {
  const [isVisible, setIsVisible] = useState(false);
  
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '2.2.0';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || Date.now();
  const buildDate = new Date(parseInt(buildTime.toString())).toLocaleString();
  
  return (
    <>
      {/* Version toggle button - fixed position for debugging */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg opacity-30 hover:opacity-100 transition-opacity"
        title="Show version info"
      >
        v{appVersion}
      </button>

      {/* Version info modal */}
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Version Info</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-gray-700">App Version:</div>
                <div className="text-blue-600 font-mono">v{appVersion}</div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700">Build Time:</div>
                <div className="text-green-600 font-mono text-xs">{buildDate}</div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700">Build ID:</div>
                <div className="text-purple-600 font-mono text-xs">build-{buildTime}</div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700">Cache Status:</div>
                <div className="text-orange-600 text-xs">Emergency cache invalidation active</div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700">User Agent:</div>
                <div className="text-gray-500 text-xs break-all">
                  {typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 60) + '...' : 'Server-side'}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700">Screen Size:</div>
                <div className="text-gray-500 text-xs">
                  {typeof window !== 'undefined' 
                    ? `${window.innerWidth}x${window.innerHeight}` 
                    : 'Unknown'}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="w-full bg-blue-600 text-white text-sm py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Force Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}