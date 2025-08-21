/**
 * Error Recovery and Offline Mode
 * 
 * Provides graceful degradation when database connections fail
 */

import { Team, TeamMember } from '@/types';

export interface OfflineData {
  teams: Team[];
  members: { [teamId: number]: TeamMember[] };
  lastUpdated: number;
  version: string;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;  // Base delay in milliseconds
  maxDelay: number;   // Maximum delay cap
  backoffFactor: number; // Exponential backoff multiplier
}

export interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromOfflineMode?: boolean;
  retriesAttempted?: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffFactor: 2
};

const OFFLINE_STORAGE_KEY = 'team_availability_offline_data';
const OFFLINE_DATA_VERSION = '1.0.0';
const OFFLINE_DATA_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save data to offline storage
 */
export function saveOfflineData(teams: Team[], members: { [teamId: number]: TeamMember[] } = {}): void {
  if (typeof window === 'undefined') return;

  try {
    const offlineData: OfflineData = {
      teams,
      members,
      lastUpdated: Date.now(),
      version: OFFLINE_DATA_VERSION
    };

    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(offlineData));
    console.log(`💾 Offline data saved: ${teams.length} teams, ${Object.keys(members).length} team member sets`);
  } catch (error) {
    console.error('Failed to save offline data:', error);
  }
}

/**
 * Load data from offline storage
 */
export function loadOfflineData(): OfflineData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!stored) return null;

    const offlineData: OfflineData = JSON.parse(stored);
    
    // Check if data is too old
    const dataAge = Date.now() - offlineData.lastUpdated;
    if (dataAge > OFFLINE_DATA_EXPIRY) {
      console.warn('⏰ Offline data expired, removing...');
      clearOfflineData();
      return null;
    }

    // Check version compatibility
    if (offlineData.version !== OFFLINE_DATA_VERSION) {
      console.warn('📦 Offline data version mismatch, clearing...');
      clearOfflineData();
      return null;
    }

    console.log(`📱 Offline data loaded: ${offlineData.teams.length} teams from ${new Date(offlineData.lastUpdated).toLocaleString()}`);
    return offlineData;
  } catch (error) {
    console.error('Failed to load offline data:', error);
    return null;
  }
}

/**
 * Clear offline storage
 */
export function clearOfflineData(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    console.log('🗑️ Offline data cleared');
  } catch (error) {
    console.error('Failed to clear offline data:', error);
  }
}

/**
 * Check if offline data is available
 */
export function isOfflineDataAvailable(): boolean {
  return loadOfflineData() !== null;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<RecoveryResult<T>> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const data = await operation();
      
      if (attempt > 0) {
        console.log(`✅ Operation succeeded after ${attempt} retries`);
      }
      
      return {
        success: true,
        data,
        retriesAttempted: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === options.maxRetries) {
        console.error(`❌ Operation failed after ${options.maxRetries} retries:`, lastError.message);
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        options.baseDelay * Math.pow(options.backoffFactor, attempt),
        options.maxDelay
      );
      
      console.warn(`⚠️ Attempt ${attempt + 1}/${options.maxRetries + 1} failed, retrying in ${delay}ms:`, lastError.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    retriesAttempted: options.maxRetries
  };
}

/**
 * Safe operation with offline fallback
 */
export async function safeOperationWithOffline<T>(
  operation: () => Promise<T>,
  offlineFallback: () => T | null,
  operationName: string,
  retryOptions?: RetryOptions
): Promise<RecoveryResult<T>> {
  console.log(`🔄 Starting safe operation: ${operationName}`);

  // First try with retries
  const result = await retryWithBackoff(operation, retryOptions);
  
  if (result.success) {
    return result;
  }

  // If operation failed, try offline fallback
  console.warn(`⚠️ ${operationName} failed, attempting offline fallback...`);
  
  try {
    const offlineData = offlineFallback();
    
    if (offlineData !== null) {
      console.log(`📱 ${operationName} using offline data`);
      return {
        success: true,
        data: offlineData,
        fromOfflineMode: true,
        retriesAttempted: result.retriesAttempted
      };
    } else {
      console.error(`❌ No offline data available for ${operationName}`);
    }
  } catch (error) {
    console.error(`❌ Offline fallback failed for ${operationName}:`, error);
  }

  return {
    success: false,
    error: result.error || 'Operation failed and no offline data available',
    retriesAttempted: result.retriesAttempted
  };
}

/**
 * Load teams with offline fallback
 */
export async function loadTeamsWithFallback(
  loadTeamsOperation: () => Promise<Team[]>
): Promise<RecoveryResult<Team[]>> {
  return safeOperationWithOffline(
    loadTeamsOperation,
    () => {
      const offlineData = loadOfflineData();
      return offlineData ? offlineData.teams : null;
    },
    'Load Teams'
  );
}

/**
 * Load team members with offline fallback
 */
export async function loadTeamMembersWithFallback(
  teamId: number,
  loadMembersOperation: () => Promise<TeamMember[]>
): Promise<RecoveryResult<TeamMember[]>> {
  return safeOperationWithOffline(
    loadMembersOperation,
    () => {
      const offlineData = loadOfflineData();
      return offlineData?.members[teamId] || null;
    },
    `Load Team Members (${teamId})`
  );
}

/**
 * Network connectivity checker
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true; // Assume online in server context
  }
  
  return navigator.onLine;
}

/**
 * Wait for network connection
 */
export function waitForOnline(timeout: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      resolve(false);
    }, timeout);

    const onlineHandler = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onlineHandler);
      resolve(true);
    };

    window.addEventListener('online', onlineHandler);
  });
}

/**
 * Enhanced error messages for users
 */
export function getErrorMessage(error: any, fromOffline?: boolean): string {
  if (fromOffline) {
    return "Using offline data. Some information may not be current. Check your connection and refresh to get the latest data.";
  }

  if (typeof error === 'string') return error;
  
  if (error instanceof Error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      return "Database configuration issue detected. Please contact support.";
    }
    
    if (error.message.includes('timeout')) {
      return "Request timed out. Please check your connection and try again.";
    }
    
    if (error.message.includes('Circuit breaker')) {
      return "Service temporarily unavailable. Please try again in a moment.";
    }
    
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Initialize offline mode listeners
 */
export function initializeOfflineMode(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('🌐 Network connection restored');
  });

  window.addEventListener('offline', () => {
    console.log('📱 Network connection lost - offline mode activated');
  });

  // Log initial connection status
  console.log(`🌐 Initial connection status: ${isOnline() ? 'Online' : 'Offline'}`);
}

export default {
  saveOfflineData,
  loadOfflineData,
  clearOfflineData,
  isOfflineDataAvailable,
  retryWithBackoff,
  safeOperationWithOffline,
  loadTeamsWithFallback,
  loadTeamMembersWithFallback,
  isOnline,
  waitForOnline,
  getErrorMessage,
  initializeOfflineMode
};