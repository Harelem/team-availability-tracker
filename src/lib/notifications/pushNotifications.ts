/**
 * Push Notifications System
 * 
 * Handles push notification registration, management, and delivery
 * for team availability reminders, sprint updates, and alerts.
 */

import webpush from 'web-push';

// Notification types
export type NotificationType = 
  | 'schedule-reminder'
  | 'sprint-deadline'
  | 'team-update'
  | 'availability-request'
  | 'analytics-alert'
  | 'general';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  badge?: string;
  icon?: string;
  image?: string;
  actions?: NotificationAction[];
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  url?: string;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface SubscriptionData {
  userId: string;
  subscription: PushSubscription;
  preferences: NotificationPreferences;
  createdAt: Date;
  lastUsed: Date;
}

interface NotificationPreferences {
  enabled: boolean;
  types: {
    [K in NotificationType]: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
    timezone: string;
  };
  frequency: {
    scheduleReminders: 'immediate' | 'daily' | 'weekly' | 'disabled';
    teamUpdates: 'immediate' | 'hourly' | 'daily' | 'disabled';
    sprintDeadlines: 'immediate' | 'daily' | 'disabled';
  };
}

// VAPID keys configuration (should be environment variables in production)
const VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLrRBhN_j8NfKY6FZ0KtM7DEOz1LV5nSc9-NjMQm5rbz4QQhfIGj1tY',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'nGmiF2j8bMzZs7JJ9q0KdP8JE5LdPvN7u-X1QzRpTgQ',
  email: process.env.VAPID_EMAIL || 'mailto:admin@teamtracker.com'
};

// Configure web-push
webpush.setVapidDetails(
  VAPID_KEYS.email,
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

/**
 * Push Notification Manager
 */
class PushNotificationManager {
  private subscriptions: Map<string, SubscriptionData> = new Map();
  private notificationQueue: Array<{
    userId: string;
    payload: NotificationPayload;
    scheduled: Date;
  }> = [];

  constructor() {
    this.loadSubscriptions();
    this.startNotificationProcessor();
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(
    userId: string, 
    subscription: PushSubscription,
    preferences: Partial<NotificationPreferences> = {}
  ): Promise<boolean> {
    try {
      const defaultPreferences: NotificationPreferences = {
        enabled: true,
        types: {
          'schedule-reminder': true,
          'sprint-deadline': true,
          'team-update': true,
          'availability-request': true,
          'analytics-alert': false,
          'general': true
        },
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        frequency: {
          scheduleReminders: 'daily',
          teamUpdates: 'hourly',
          sprintDeadlines: 'immediate'
        }
      };

      const subscriptionData: SubscriptionData = {
        userId,
        subscription,
        preferences: { ...defaultPreferences, ...preferences },
        createdAt: new Date(),
        lastUsed: new Date()
      };

      this.subscriptions.set(userId, subscriptionData);
      await this.saveSubscriptions();

      // Send welcome notification
      await this.sendNotification(userId, {
        title: 'Welcome to Team Tracker!',
        body: 'You\'ll now receive notifications about your team availability and updates.',
        type: 'general',
        icon: '/icons/icon-192x192.png'
      });

      return true;
    } catch (error) {
      console.error('Failed to subscribe user to push notifications:', error);
      return false;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      this.subscriptions.delete(userId);
      await this.saveSubscriptions();
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe user:', error);
      return false;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const subscription = this.subscriptions.get(userId);
      if (!subscription) {
        throw new Error('User subscription not found');
      }

      subscription.preferences = { ...subscription.preferences, ...preferences };
      this.subscriptions.set(userId, subscription);
      await this.saveSubscriptions();

      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }

  /**
   * Send notification to specific user
   */
  async sendNotification(
    userId: string, 
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      const subscription = this.subscriptions.get(userId);
      if (!subscription) {
        console.warn('No subscription found for user:', userId);
        return false;
      }

      // Check if notifications are enabled for this type
      if (!subscription.preferences.enabled || 
          !subscription.preferences.types[payload.type]) {
        console.log('Notifications disabled for user/type:', userId, payload.type);
        return false;
      }

      // Check quiet hours
      if (this.isQuietHours(subscription.preferences.quietHours)) {
        console.log('Skipping notification due to quiet hours:', userId);
        return false;
      }

      // Enhance payload with defaults
      const enhancedPayload = {
        ...payload,
        badge: payload.badge || '/icons/badge-72x72.png',
        icon: payload.icon || '/icons/icon-192x192.png',
        timestamp: payload.timestamp || Date.now(),
        tag: payload.tag || `${payload.type}-${Date.now()}`
      };

      // Send push notification
      await webpush.sendNotification(
        subscription.subscription,
        JSON.stringify(enhancedPayload)
      );

      // Update last used timestamp
      subscription.lastUsed = new Date();
      this.subscriptions.set(userId, subscription);

      console.log('Push notification sent successfully:', userId, payload.type);
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      
      // Handle invalid subscriptions
      if ((error as any).statusCode === 410 || (error as any).statusCode === 404) {
        console.log('Removing invalid subscription:', userId);
        await this.unsubscribe(userId);
      }
      
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async broadcastNotification(
    userIds: string[], 
    payload: NotificationPayload
  ): Promise<{sent: number, failed: number}> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotification(userId, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - sent;

    return { sent, failed };
  }

  /**
   * Schedule notification for later delivery
   */
  scheduleNotification(
    userId: string,
    payload: NotificationPayload,
    scheduledTime: Date
  ): void {
    this.notificationQueue.push({
      userId,
      payload,
      scheduled: scheduledTime
    });
  }

  /**
   * Get user's notification preferences
   */
  getPreferences(userId: string): NotificationPreferences | null {
    return this.subscriptions.get(userId)?.preferences || null;
  }

  /**
   * Check if user is subscribed
   */
  isSubscribed(userId: string): boolean {
    return this.subscriptions.has(userId);
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    subscriptionsByType: Record<NotificationType, number>;
  } {
    const total = this.subscriptions.size;
    const active = Array.from(this.subscriptions.values())
      .filter(sub => sub.preferences.enabled).length;

    const byType: Record<NotificationType, number> = {
      'schedule-reminder': 0,
      'sprint-deadline': 0,
      'team-update': 0,
      'availability-request': 0,
      'analytics-alert': 0,
      'general': 0
    };

    Array.from(this.subscriptions.values()).forEach(sub => {
      Object.entries(sub.preferences.types).forEach(([type, enabled]) => {
        if (enabled) {
          byType[type as NotificationType]++;
        }
      });
    });

    return {
      totalSubscriptions: total,
      activeSubscriptions: active,
      subscriptionsByType: byType
    };
  }

  /**
   * Clean up expired subscriptions
   */
  async cleanupExpiredSubscriptions(): Promise<number> {
    const now = new Date();
    const expirationTime = 30 * 24 * 60 * 60 * 1000; // 30 days
    let cleaned = 0;

    for (const [userId, subscription] of this.subscriptions.entries()) {
      if (now.getTime() - subscription.lastUsed.getTime() > expirationTime) {
        this.subscriptions.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveSubscriptions();
      console.log(`Cleaned up ${cleaned} expired subscriptions`);
    }

    return cleaned;
  }

  /**
   * Private helper methods
   */
  private isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const timezone = quietHours.timezone;
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    });

    const start = quietHours.start;
    const end = quietHours.end;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  private startNotificationProcessor(): void {
    setInterval(() => {
      const now = new Date();
      const readyToSend = this.notificationQueue.filter(
        item => item.scheduled <= now
      );

      readyToSend.forEach(async (item) => {
        await this.sendNotification(item.userId, item.payload);
        const index = this.notificationQueue.indexOf(item);
        if (index > -1) {
          this.notificationQueue.splice(index, 1);
        }
      });
    }, 60000); // Check every minute
  }

  private async loadSubscriptions(): Promise<void> {
    try {
      // In a real implementation, this would load from a database
      // For now, we'll use localStorage in the browser environment
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('push-subscriptions');
        if (stored) {
          const data = JSON.parse(stored);
          Object.entries(data).forEach(([userId, subscriptionData]: [string, any]) => {
            this.subscriptions.set(userId, {
              ...subscriptionData,
              createdAt: new Date(subscriptionData.createdAt),
              lastUsed: new Date(subscriptionData.lastUsed)
            });
          });
        }
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  }

  private async saveSubscriptions(): Promise<void> {
    try {
      // In a real implementation, this would save to a database
      if (typeof window !== 'undefined') {
        const data = Object.fromEntries(this.subscriptions.entries());
        localStorage.setItem('push-subscriptions', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to save subscriptions:', error);
    }
  }
}

// Global instance
export const pushNotificationManager = new PushNotificationManager();

// Utility functions for common notification types
export const notificationTemplates = {
  scheduleReminder: (teamName: string, date: string): NotificationPayload => ({
    title: 'Schedule Reminder',
    body: `Please update your availability for ${teamName} - ${date}`,
    type: 'schedule-reminder',
    data: { teamName, date },
    actions: [
      { action: 'update-schedule', title: 'Update Schedule' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }),

  sprintDeadline: (sprintName: string, daysLeft: number): NotificationPayload => ({
    title: 'Sprint Deadline Approaching',
    body: `${sprintName} ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    type: 'sprint-deadline',
    data: { sprintName, daysLeft },
    requireInteraction: true,
    actions: [
      { action: 'view-sprint', title: 'View Sprint' },
      { action: 'dismiss', title: 'OK' }
    ]
  }),

  teamUpdate: (teamName: string, updateType: string): NotificationPayload => ({
    title: `${teamName} Update`,
    body: `New ${updateType} available for your team`,
    type: 'team-update',
    data: { teamName, updateType },
    actions: [
      { action: 'view-team', title: 'View Team' },
      { action: 'dismiss', title: 'Later' }
    ]
  }),

  availabilityRequest: (requesterName: string, teamName: string): NotificationPayload => ({
    title: 'Availability Request',
    body: `${requesterName} requested your availability for ${teamName}`,
    type: 'availability-request',
    data: { requesterName, teamName },
    requireInteraction: true,
    actions: [
      { action: 'respond', title: 'Respond' },
      { action: 'view-details', title: 'View Details' }
    ]
  }),

  analyticsAlert: (alertType: string, value: string): NotificationPayload => ({
    title: 'Analytics Alert',
    body: `${alertType}: ${value}`,
    type: 'analytics-alert',
    data: { alertType, value },
    actions: [
      { action: 'view-analytics', title: 'View Analytics' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  })
};

export default pushNotificationManager;