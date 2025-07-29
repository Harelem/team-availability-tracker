'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  BarChart3,
  Users,
  Settings,
  Download,
  Wifi,
  WifiOff,
  Bell,
  Smartphone,
  Monitor,
  Tablet,
  Clock,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';

// PWA Shortcuts component
interface PWAShortcut {
  name: string;
  short_name: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface PWAShortcutsProps {
  shortcuts?: PWAShortcut[];
  onShortcutClick?: (shortcut: PWAShortcut) => void;
  className?: string;
}

export function PWAShortcuts({ 
  shortcuts = [], 
  onShortcutClick,
  className = '' 
}: PWAShortcutsProps) {
  const defaultShortcuts: PWAShortcut[] = [
    {
      name: 'View Schedule',
      short_name: 'Schedule',
      description: 'View and edit your team schedule',
      url: '/schedule',
      icon: Calendar
    },
    {
      name: 'Analytics',
      short_name: 'Analytics',
      description: 'View team performance analytics',
      url: '/analytics',
      icon: BarChart3
    },
    {
      name: 'Team Management',
      short_name: 'Teams',
      description: 'Manage team members and settings',
      url: '/teams',
      icon: Users
    },
    {
      name: 'Settings',
      short_name: 'Settings',
      description: 'App settings and preferences',
      url: '/settings',
      icon: Settings
    }
  ];

  const displayShortcuts = shortcuts.length > 0 ? shortcuts : defaultShortcuts;

  const handleShortcutClick = (shortcut: PWAShortcut) => {
    onShortcutClick?.(shortcut);
    // Navigate to the shortcut URL
    window.location.href = shortcut.url;
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {displayShortcuts.map((shortcut) => {
        const Icon = shortcut.icon;
        
        return (
          <button
            key={shortcut.url}
            onClick={() => handleShortcutClick(shortcut)}
            className="relative bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {shortcut.short_name}
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  {shortcut.description}
                </p>
              </div>
            </div>
            
            {shortcut.badge && shortcut.badge > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {shortcut.badge > 99 ? '99+' : shortcut.badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// PWA Status indicator
export function PWAStatus({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check if running as PWA
    const checkPWAStatus = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode || isIOSStandalone);
    };
    
    checkPWAStatus();

    // Check for install prompt
    const handleBeforeInstallPrompt = () => {
      setInstallPromptAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      {/* Online/Offline Status */}
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-green-700">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-orange-500" />
            <span className="text-orange-700">Offline</span>
          </>
        )}
      </div>

      {/* PWA Status */}
      <div className="flex items-center space-x-2">
        {isStandalone ? (
          <>
            <Smartphone className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700">App Mode</span>
          </>
        ) : installPromptAvailable ? (
          <>
            <Download className="h-4 w-4 text-purple-500" />
            <span className="text-purple-700">Can Install</span>
          </>
        ) : (
          <>
            <Monitor className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">Browser</span>
          </>
        )}
      </div>
    </div>
  );
}

// PWA Features showcase
export function PWAFeaturesShowcase({ className = '' }: { className?: string }) {
  const features = [
    {
      icon: Wifi,
      title: 'Offline Access',
      description: 'Work without internet connection using cached data',
      color: 'text-green-500'
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Receive real-time alerts and updates',
      color: 'text-blue-500'
    },
    {
      icon: Zap,
      title: 'Fast Performance',
      description: 'Optimized loading with service worker caching',
      color: 'text-yellow-500'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'HTTPS-only with secure data handling',
      color: 'text-purple-500'
    },
    {
      icon: RefreshCw,
      title: 'Auto Updates',
      description: 'Always up-to-date without manual updates',
      color: 'text-indigo-500'
    },
    {
      icon: Smartphone,
      title: 'Native Feel',
      description: 'App-like experience on any device',
      color: 'text-pink-500'
    }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {features.map((feature) => {
        const Icon = feature.icon;
        
        return (
          <div key={feature.title} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 ${feature.color}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// PWA Installation Guide
export function PWAInstallationGuide({ className = '' }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<'chrome' | 'safari' | 'firefox'>('chrome');

  const installGuides = {
    chrome: {
      title: 'Chrome / Edge / Opera',
      icon: Monitor,
      steps: [
        'Click the install icon (⊕) in the address bar',
        'Click "Install Team Availability Tracker"',
        'The app will be added to your applications'
      ]
    },
    safari: {
      title: 'Safari (iOS/macOS)',
      icon: Smartphone,
      steps: [
        'Tap the Share button (□↗)',
        'Select "Add to Home Screen" or "Add to Dock"',
        'Customize the name and tap "Add"'
      ]
    },
    firefox: {
      title: 'Firefox',
      icon: Monitor,
      steps: [
        'Click the menu button (☰)',
        'Select "Install This Site as an App"',
        'Follow the installation prompts'
      ]
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Installation Guide
        </h3>
        
        {/* Browser Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {Object.entries(installGuides).map(([key, guide]) => {
            const Icon = guide.icon;
            
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{guide.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {installGuides[activeTab].steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-semibold">
                  {index + 1}
                </span>
              </div>
              <p className="text-gray-700">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Download className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Benefits of installing:
              </p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Faster loading and better performance</li>
                <li>• Works offline with cached data</li>
                <li>• Push notifications for important updates</li>
                <li>• Native app-like experience</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// PWA Update Notification
export function PWAUpdateNotification({ 
  onUpdate, 
  onDismiss, 
  className = '' 
}: { 
  onUpdate: () => void; 
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white rounded-lg shadow-xl p-4 z-50 ${className}`}>
      <div className="flex items-start space-x-3">
        <RefreshCw className="h-6 w-6 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">
            App Update Available
          </h3>
          <p className="text-sm text-blue-100 mb-3">
            A new version of the app is ready to install with improvements and bug fixes.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded font-medium text-sm hover:bg-blue-50 transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={onDismiss}
              className="text-blue-100 hover:text-white px-3 py-1 text-sm transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PWAShortcuts;