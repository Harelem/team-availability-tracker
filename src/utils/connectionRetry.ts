/**
 * Connection Retry Utility
 * 
 * Provides robust connection retry logic for real-time features,
 * WebSocket connections, and database operations with intelligent
 * backoff and recovery strategies.
 */

import { debug, warn, error as logError } from '@/utils/debugLogger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  latency: number;
  lastCheck: number;
  consecutiveFailures: number;
  lastError?: string;
}

export class ConnectionRetryService {
  private static instance: ConnectionRetryService;
  private connectionHealth = new Map<string, ConnectionHealth>();
  private activeRetries = new Map<string, Promise<any>>();

  static getInstance(): ConnectionRetryService {
    if (!ConnectionRetryService.instance) {
      ConnectionRetryService.instance = new ConnectionRetryService();
    }
    return ConnectionRetryService.instance;
  }

  /**
   * Retry an operation with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    operationId?: string
  ): Promise<T> {
    const {
      maxRetries = 5,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true,
      shouldRetry = this.defaultShouldRetry,
      onRetry
    } = options;

    // Prevent duplicate retries for the same operation
    if (operationId && this.activeRetries.has(operationId)) {
      debug(`Reusing active retry for operation: ${operationId}`);
      return this.activeRetries.get(operationId)!;
    }

    const retryPromise = this.executeRetry(
      operation,
      { maxRetries, initialDelay, maxDelay, backoffFactor, jitter, shouldRetry, onRetry },
      operationId
    );

    if (operationId) {
      this.activeRetries.set(operationId, retryPromise);
      retryPromise.finally(() => this.activeRetries.delete(operationId));
    }

    return retryPromise;
  }

  private async executeRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions & Required<Pick<RetryOptions, 'maxRetries' | 'initialDelay' | 'maxDelay' | 'backoffFactor' | 'jitter' | 'shouldRetry'>>,
    operationId?: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const latency = Date.now() - startTime;
        
        // Update connection health on success
        if (operationId) {
          this.updateConnectionHealth(operationId, {
            isHealthy: true,
            latency,
            lastCheck: Date.now(),
            consecutiveFailures: 0
          });
        }
        
        if (attempt > 0) {
          debug(`Operation succeeded after ${attempt} retries: ${operationId || 'unknown'}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Update connection health on failure
        if (operationId) {
          const currentHealth = this.connectionHealth.get(operationId);
          this.updateConnectionHealth(operationId, {
            isHealthy: false,
            latency: -1,
            lastCheck: Date.now(),
            consecutiveFailures: (currentHealth?.consecutiveFailures || 0) + 1,
            lastError: error instanceof Error ? error.message : String(error)
          });
        }

        // Check if we should retry this error
        if (attempt >= options.maxRetries || !options.shouldRetry(error, attempt)) {
          logError(`Operation failed permanently after ${attempt} attempts: ${operationId || 'unknown'}`, error);
          throw error;
        }

        // Calculate delay with exponential backoff
        const baseDelay = Math.min(
          options.initialDelay * Math.pow(options.backoffFactor, attempt),
          options.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitterAmount = options.jitter ? Math.random() * baseDelay * 0.1 : 0;
        const delay = baseDelay + jitterAmount;

        warn(`Retrying operation (${attempt + 1}/${options.maxRetries + 1}) after ${delay}ms: ${operationId || 'unknown'}`);
        
        // Call retry callback
        if (options.onRetry) {
          options.onRetry(attempt + 1, delay, error);
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Default retry logic for common errors
   */
  private defaultShouldRetry(error: any, attempt: number): boolean {
    // Don't retry after too many attempts
    if (attempt >= 5) return false;

    // Retry network errors
    if (error?.name === 'NetworkError' || error?.message?.includes('network')) return true;
    
    // Retry timeout errors
    if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) return true;
    
    // Retry WebSocket connection errors
    if (error?.message?.includes('websocket') || error?.message?.includes('WebSocket')) return true;
    
    // Retry Supabase connection errors
    if (error?.message?.includes('Failed to fetch') || 
        error?.message?.includes('Connection refused') ||
        error?.message?.includes('ECONNREFUSED')) return true;
    
    // Retry temporary server errors (5xx)
    if (error?.status >= 500 && error?.status < 600) return true;
    
    // Retry rate limiting (429)
    if (error?.status === 429) return true;
    
    // Don't retry client errors (4xx except 429)
    if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) return false;
    
    return false;
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(operationId: string): ConnectionHealth | null {
    return this.connectionHealth.get(operationId) || null;
  }

  /**
   * Update connection health metrics
   */
  private updateConnectionHealth(operationId: string, health: ConnectionHealth): void {
    this.connectionHealth.set(operationId, health);
  }

  /**
   * Check if a connection is healthy
   */
  isConnectionHealthy(operationId: string, maxFailures = 3): boolean {
    const health = this.connectionHealth.get(operationId);
    if (!health) return true; // Unknown state is considered healthy
    
    return health.isHealthy && health.consecutiveFailures < maxFailures;
  }

  /**
   * Reset connection health for an operation
   */
  resetConnectionHealth(operationId: string): void {
    this.connectionHealth.delete(operationId);
    debug(`Reset connection health for: ${operationId}`);
  }

  /**
   * Get all connection health statuses
   */
  getAllConnectionHealth(): Map<string, ConnectionHealth> {
    return new Map(this.connectionHealth);
  }

  /**
   * Clean up old health entries
   */
  cleanupOldEntries(maxAge = 5 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, health] of this.connectionHealth) {
      if (now - health.lastCheck > maxAge) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => {
      this.connectionHealth.delete(key);
      debug(`Cleaned up old health entry: ${key}`);
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry wrapper for Supabase realtime subscriptions
   */
  createRealtimeRetryWrapper<T>(
    subscriptionFn: () => T,
    subscriptionId: string,
    options: RetryOptions = {}
  ): () => Promise<T> {
    return () => this.retryOperation(
      () => Promise.resolve(subscriptionFn()),
      {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        shouldRetry: (error) => {
          // Retry WebSocket connection errors
          return error?.message?.includes('websocket') || 
                 error?.message?.includes('WebSocket') ||
                 error?.message?.includes('connection');
        },
        onRetry: (attempt, delay) => {
          debug(`Retrying realtime subscription ${subscriptionId} (attempt ${attempt}) after ${delay}ms`);
        },
        ...options
      },
      `realtime_${subscriptionId}`
    );
  }

  /**
   * Create a retry wrapper for database operations
   */
  createDatabaseRetryWrapper<T>(
    operationFn: () => Promise<T>,
    operationId: string,
    options: RetryOptions = {}
  ): () => Promise<T> {
    return () => this.retryOperation(
      operationFn,
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 5000,
        ...options
      },
      `db_${operationId}`
    );
  }
}

// Export singleton instance
export const connectionRetry = ConnectionRetryService.getInstance();