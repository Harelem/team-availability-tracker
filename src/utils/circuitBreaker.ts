/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascade failures by failing fast when a service is having issues
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast - not allowing requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;  // Number of failures before opening
  recoveryTimeout: number;   // Time to wait before trying again (ms)
  successThreshold: number;  // Number of successes needed to close circuit
  timeout: number;          // Request timeout (ms)
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  uptime: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private readonly startTime: number;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {
    this.startTime = Date.now();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      
      if (timeSinceLastFailure < this.options.recoveryTimeout) {
        const error = new Error(`Circuit breaker '${this.name}' is OPEN - failing fast`);
        console.warn(`⚡ ${error.message}`);
        throw error;
      } else {
        // Try to recover - move to half-open
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        console.log(`⚡ Circuit breaker '${this.name}' moving to HALF_OPEN state`);
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn, this.options.timeout);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Circuit breaker '${this.name}' request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        console.log(`✅ Circuit breaker '${this.name}' recovered - moving to CLOSED state`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      console.error(`❌ Circuit breaker '${this.name}' opened due to ${this.failureCount} failures`);
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`🔄 Circuit breaker '${this.name}' manually reset to CLOSED state`);
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }
}

/**
 * Request deduplication manager
 */
export class RequestDeduplicator {
  private readonly activeRequests = new Map<string, Promise<any>>();

  /**
   * Execute a request with deduplication
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in progress
    if (this.activeRequests.has(key)) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return this.activeRequests.get(key) as Promise<T>;
    }

    // Create new request
    const promise = fn()
      .finally(() => {
        // Clean up completed request
        this.activeRequests.delete(key);
      });

    this.activeRequests.set(key, promise);
    return promise;
  }

  /**
   * Cancel all active requests
   */
  cancelAll(): void {
    this.activeRequests.clear();
    console.log('🛑 All active requests cancelled');
  }

  /**
   * Get active request count
   */
  getActiveCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get active request keys
   */
  getActiveKeys(): string[] {
    return Array.from(this.activeRequests.keys());
  }
}

// Global circuit breakers for critical services
export const databaseCircuitBreaker = new CircuitBreaker('Database', {
  failureThreshold: 5,           // Allow more failures for complex queries
  recoveryTimeout: 60000,        // 1 minute recovery time
  successThreshold: 1,
  timeout: 30000                 // 30 seconds for complex queries
});

// COO-specific circuit breaker for dashboard operations
export const cooDashboardCircuitBreaker = new CircuitBreaker('COODashboard', {
  failureThreshold: 5,
  recoveryTimeout: 60000,        // 1 minute recovery time
  successThreshold: 1,
  timeout: 45000                 // 45 seconds for COO dashboard
});

export const schemaValidationCircuitBreaker = new CircuitBreaker('SchemaValidation', {
  failureThreshold: 2,
  recoveryTimeout: 60000,  // 1 minute
  successThreshold: 1,
  timeout: 5000  // 5 seconds
});

// Global request deduplicator
export const globalRequestDeduplicator = new RequestDeduplicator();

export default {
  CircuitBreaker,
  RequestDeduplicator,
  databaseCircuitBreaker,
  cooDashboardCircuitBreaker,
  schemaValidationCircuitBreaker,
  globalRequestDeduplicator
};