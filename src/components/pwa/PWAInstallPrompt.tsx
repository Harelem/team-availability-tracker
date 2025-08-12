'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  Smartphone,
  Monitor,
  Wifi,
  Clock,
  Bell,
  Shield,
  Zap
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function PWAInstallPrompt({ 
  onInstall, 
  onDismiss, 
  className = '' 
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed/standalone
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode || isIOSStandalone);
    };

    checkStandalone();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      
      // Show prompt after a short delay if not already dismissed
      setTimeout(() => {
        if (!localStorage.getItem('pwa-install-dismissed')) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
      
      // Show success message
      showInstallSuccessToast();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        onInstall?.();
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    onDismiss?.();
  };

  const showInstallSuccessToast = () => {
    // Create a temporary toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    toast.innerHTML = `
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>App installed successfully!</span>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  // Don't show if already installed or dismissed
  if (isStandalone || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-6 z-50 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Download className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Install Team Tracker
            </h3>
            <p className="text-sm text-gray-600">
              Get the full app experience
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-3 text-sm text-gray-700">
          <Wifi className="h-4 w-4 text-green-500" />
          <span>Works offline with cached data</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-700">
          <Bell className="h-4 w-4 text-blue-500" />
          <span>Receive push notifications</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-700">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span>Faster loading and performance</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-700">
          <Shield className="h-4 w-4 text-purple-500" />
          <span>Secure and always up-to-date</span>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isInstalling ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Installing...
            </div>
          ) : (
            'Install App'
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

// iOS-specific install instructions
export function IOSInstallInstructions({ 
  onClose, 
  className = '' 
}: { 
  onClose: () => void; 
  className?: string; 
}) {
  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-t-lg md:rounded-lg p-6 w-full md:w-96 md:max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Install on iOS
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Tap the <strong>Share</strong> button at the bottom of Safari
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Customize the name if desired and tap <strong>"Add"</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800 font-medium">
              The app will appear on your home screen like a native app!
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// Hook for managing PWA installation
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandaloneMode || isIOSStandalone);
    };

    checkInstalled();

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { canInstall, isInstalled };
}

export default PWAInstallPrompt;