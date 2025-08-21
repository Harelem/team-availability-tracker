'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  Settings, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface NotificationPreferences {
  alerts: boolean;
  reminders: boolean;
  achievements: boolean;
  team_updates: boolean;
  system_updates: boolean;
}

interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  timestamp: Date;
  read: boolean;
  type: 'alert' | 'reminder' | 'achievement' | 'team_update' | 'system_update';
}

interface PushNotificationManagerProps {
  onNotificationClick?: (notification: PushNotification) => void;
  onPermissionChange?: (granted: boolean) => void;
  className?: string;
}

export function PushNotificationManager({
  onNotificationClick,
  onPermissionChange,
  className = ''
}: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    alerts: true,
    reminders: true,
    achievements: true,
    team_updates: true,
    system_updates: false
  });
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Check notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default'
      });
      
      onPermissionChange?.(currentPermission === 'granted');
    }
  }, [onPermissionChange]);

  // Check for existing push subscription
  useEffect(() => {
    checkPushSubscription();
  }, []);

  const checkPushSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setSubscription(subscription);
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      setPermission({
        granted,
        denied: permission === 'denied',
        default: permission === 'default'
      });
      
      onPermissionChange?.(granted);
      
      if (granted) {
        await subscribeToPushNotifications();
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribeToPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error('VAPID public key not configured');
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      setSubscription(subscription);
      setIsSubscribed(true);

      // Send subscription to server
      await sendSubscriptionToServer(subscription);
      
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (subscription) {
      try {
        await subscription.unsubscribe();
        setSubscription(null);
        setIsSubscribed(false);
        
        // Remove subscription from server
        await removeSubscriptionFromServer(subscription);
      } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
      }
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          preferences
        }),
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  };

  const removeSubscriptionFromServer = async (subscription: PushSubscription) => {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        }),
      });
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    // Save to localStorage
    localStorage.setItem('notification-preferences', JSON.stringify(updatedPreferences));

    // Update server if subscribed
    if (isSubscribed && subscription) {
      try {
        await fetch('/api/notifications/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            preferences: updatedPreferences
          }),
        });
      } catch (error) {
        console.error('Error updating preferences:', error);
      }
    }
  };

  const showNotification = useCallback((notification: Omit<PushNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: PushNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50

    // Show browser notification if permission granted and preference enabled
    if (permission.granted && (preferences as any)[notification.type]) {
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-72x72.png',
        data: notification.data,
        tag: newNotification.id,
        requireInteraction: notification.type === 'alert'
      });

      browserNotification.onclick = () => {
        onNotificationClick?.(newNotification);
        browserNotification.close();
        markAsRead(newNotification.id);
      };

      // Auto close after 5 seconds for non-critical notifications
      if (notification.type !== 'alert') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    }
  }, [permission.granted, preferences, onNotificationClick]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: PushNotification['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'achievement':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'reminder':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {permission.granted && isSubscribed ? (
          <BellRing className="h-6 w-6" />
        ) : permission.denied ? (
          <BellOff className="h-6 w-6" />
        ) : (
          <Bell className="h-6 w-6" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showSettings && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Permission Status */}
            <div className="mt-3">
              {permission.denied ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <BellOff className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Notifications Blocked
                      </p>
                      <p className="text-sm text-red-600">
                        Enable in browser settings to receive alerts
                      </p>
                    </div>
                  </div>
                </div>
              ) : permission.default ? (
                <button
                  onClick={requestNotificationPermission}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Enable Notifications
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Notifications Enabled
                        </p>
                        <p className="text-sm text-green-600">
                          {isSubscribed ? 'Push notifications active' : 'Setting up...'}
                        </p>
                      </div>
                    </div>
                    {isSubscribed && (
                      <button
                        onClick={unsubscribeFromPushNotifications}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          {permission.granted && (
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Notification Types
              </h4>
              <div className="space-y-2">
                {Object.entries(preferences).map(([key, enabled]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => updatePreferences({ [key]: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {key.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Recent Notifications */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length > 0 ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Recent Notifications
                  </h4>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-200">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        onNotificationClick?.(notification);
                        markAsRead(notification.id);
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {notification.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to convert VAPID key
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

// Hook for managing push notifications
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default'
      });
    }
  }, []);

  return {
    isSupported,
    permission,
    canRequestPermission: permission.default,
    isBlocked: permission.denied
  };
}

export default PushNotificationManager;