/**
 * Push Notifications Hook
 * 
 * Client-side hook for managing push notification subscriptions,
 * permissions, and user preferences in the browser.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCommonAnnouncements } from '@/components/accessibility/ScreenReaderAnnouncements';

// Types
interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isServiceWorkerReady: boolean;
}

interface PushNotificationHookReturn {
  // Permission state
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  testNotification: () => Promise<boolean>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

// VAPID public key (should match the server-side key)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLrRBhN_j8NfKY6FZ0KtM7DEOz1LV5nSc9-NjMQm5rbz4QQhfIGj1tY';

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Main push notifications hook
 */
export function usePushNotifications(userId?: string): PushNotificationHookReturn {
  const [permission, setPermission] = useState<NotificationPermissionState>({
    permission: 'default',
    isSupported: false,
    isServiceWorkerReady: false
  });
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { announceSuccess, announceError } = useCommonAnnouncements();

  // Check for push notification support and service worker readiness
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      );

      let isServiceWorkerReady = false;
      if (isSupported) {
        try {
          const registration = await navigator.serviceWorker.ready;
          isServiceWorkerReady = !!registration;
        } catch (error) {
          console.error('Service worker not ready:', error);
        }
      }

      setPermission({
        permission: isSupported ? Notification.permission : 'denied',
        isSupported,
        isServiceWorkerReady
      });

      // Check if already subscribed
      if (isSupported && isServiceWorkerReady) {
        await checkSubscriptionStatus();
      }
    };

    checkSupport();
  }, []);

  // Check current subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!permission.isSupported) {
      setError('Push notifications are not supported in this browser');
      announceError('Push notifications are not supported in this browser');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await Notification.requestPermission();
      
      setPermission(prev => ({ ...prev, permission: result }));

      if (result === 'granted') {
        announceSuccess('Notification permission granted');
        return true;
      } else if (result === 'denied') {
        setError('Notification permission was denied. Please enable notifications in your browser settings.');
        announceError('Notification permission was denied');
        return false;
      } else {
        setError('Notification permission request was dismissed');
        return false;
      }
    } catch (error) {
      const errorMessage = 'Failed to request notification permission';
      setError(errorMessage);
      announceError(errorMessage);
      console.error('Permission request error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [permission.isSupported, announceSuccess, announceError]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      setError('User ID is required for subscription');
      return false;
    }

    if (!permission.isSupported || !permission.isServiceWorkerReady) {
      setError('Push notifications are not available');
      return false;
    }

    if (permission.permission !== 'granted') {
      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        return false;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      if (subscription) {
        // Convert subscription to our format
        const subscriptionData: PushSubscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          }
        };

        // Send subscription to server
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            subscription: subscriptionData
          })
        });

        if (!response.ok) {
          throw new Error('Failed to register subscription with server');
        }

        setIsSubscribed(true);
        announceSuccess('Successfully subscribed to push notifications');
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe to push notifications';
      setError(errorMessage);
      announceError(errorMessage);
      console.error('Subscription error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, permission, requestPermission, announceSuccess, announceError]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      setError('User ID is required for unsubscription');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Unsubscribe from server
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        console.warn('Failed to unregister subscription from server');
      }

      setIsSubscribed(false);
      announceSuccess('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      const errorMessage = 'Failed to unsubscribe from push notifications';
      setError(errorMessage);
      announceError(errorMessage);
      console.error('Unsubscription error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, announceSuccess, announceError]);

  // Send test notification
  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!userId || !isSubscribed) {
      setError('Must be subscribed to send test notification');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      announceSuccess('Test notification sent');
      return true;
    } catch (error) {
      const errorMessage = 'Failed to send test notification';
      setError(errorMessage);
      announceError(errorMessage);
      console.error('Test notification error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, isSubscribed, announceSuccess, announceError]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
    error,
    clearError
  };
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications/preferences/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setError('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: any) => {
    if (!userId) return false;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications/preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPreferences)
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      setError('Failed to update notification preferences');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    updatePreferences,
    loadPreferences,
    isLoading,
    error
  };
}

// Utility function
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return window.btoa(binary);
}

export default usePushNotifications;