/**
 * Analytics Web Worker Hook
 * 
 * Provides a React hook for managing analytics web worker operations
 * with automatic lifecycle management and performance optimization.
 */

import { useRef, useEffect, useCallback, useState } from 'react';

interface WorkerMessage {
  id: string;
  method: string;
  params: any;
}

interface WorkerResponse {
  id: string;
  result: any;
  fromCache: boolean;
  error?: string;
}

interface UseAnalyticsWorkerConfig {
  enableWorker?: boolean; // Whether to use web worker or fallback to main thread
  workerTimeout?: number; // Timeout for worker operations in ms
  maxConcurrentOperations?: number; // Maximum number of concurrent operations
}

interface AnalyticsWorkerMethods {
  calculateStatistics: (data: number[]) => Promise<any>;
  calculateLinearRegression: (xData: number[], yData: number[]) => Promise<any>;
  calculateMovingAverage: (data: number[], windowSize: number) => Promise<any>;
  detectAnomalies: (data: number[], threshold?: number) => Promise<any>;
  forecastValues: (data: number[], periods: number) => Promise<any>;
  runMonteCarloSimulation: (config: any) => Promise<any>;
  calculateCapacityMetrics: (teamData: any) => Promise<any>;
  clearCache: () => Promise<any>;
}

export function useAnalyticsWorker(
  config: UseAnalyticsWorkerConfig = {}
): {
  worker: AnalyticsWorkerMethods;
  isWorkerSupported: boolean;
  isWorkerReady: boolean;
  pendingOperations: number;
  cacheHitRate: number;
  terminateWorker: () => void;
} {
  const {
    enableWorker = true,
    workerTimeout = 30000, // 30 seconds
    maxConcurrentOperations = 5
  } = config;

  const workerRef = useRef<Worker | null>(null);
  const pendingOperationsRef = useRef(new Map<string, any>());
  const requestIdRef = useRef(0);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });

  const isWorkerSupported = typeof Worker !== 'undefined';

  // Initialize worker
  useEffect(() => {
    if (!enableWorker || !isWorkerSupported) return;

    try {
      workerRef.current = new Worker('/workers/analytics-worker.js');
      
      workerRef.current.onmessage = (e) => {
        const { id, result, fromCache, ready, error } = e.data;
        
        if (ready) {
          setIsWorkerReady(true);
          // Initialize worker with config
          const initMessage: WorkerMessage = {
            id: 'init',
            method: 'initialize',
            params: { cacheSize: 50, cacheTimeout: 5 * 60 * 1000 }
          };
          workerRef.current?.postMessage(initMessage);
          return;
        }
        
        if (id && pendingOperationsRef.current.has(id)) {
          const { resolve, reject, timeoutId } = pendingOperationsRef.current.get(id);
          
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          // Remove from pending operations
          pendingOperationsRef.current.delete(id);
          setPendingOperations(prev => prev - 1);
          
          // Update cache stats
          setCacheStats(prev => ({
            hits: prev.hits + (fromCache ? 1 : 0),
            misses: prev.misses + (fromCache ? 0 : 1)
          }));
          
          if (error || result?.error) {
            reject(new Error(error || result.error));
          } else {
            resolve(result);
          }
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Analytics Worker Error:', error);
        setIsWorkerReady(false);
      };
      
    } catch (error) {
      console.error('Failed to initialize analytics worker:', error);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setIsWorkerReady(false);
    };
  }, [enableWorker, isWorkerSupported]);

  // Generic method to call worker functions
  const callWorkerMethod = useCallback(
    async (method: string, params: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        // Check if we should use worker
        if (!enableWorker || !isWorkerSupported || !workerRef.current || !isWorkerReady) {
          // Fallback to main thread computation
          reject(new Error('Worker not available - fallback to main thread'));
          return;
        }

        // Check concurrent operations limit
        if (pendingOperationsRef.current.size >= maxConcurrentOperations) {
          reject(new Error('Maximum concurrent operations exceeded'));
          return;
        }

        const id = `req_${++requestIdRef.current}`;
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          if (pendingOperationsRef.current.has(id)) {
            pendingOperationsRef.current.delete(id);
            setPendingOperations(prev => prev - 1);
            reject(new Error(`Worker operation timed out: ${method}`));
          }
        }, workerTimeout);

        // Store promise handlers
        pendingOperationsRef.current.set(id, { resolve, reject, timeoutId });
        setPendingOperations(prev => prev + 1);

        // Send message to worker
        const message: WorkerMessage = { id, method, params };
        workerRef.current!.postMessage(message);
      });
    },
    [enableWorker, isWorkerSupported, isWorkerReady, maxConcurrentOperations, workerTimeout]
  );

  // Main thread fallback implementations
  const fallbackMethods = {
    calculateStatistics: async (data: number[]) => {
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
      const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
      const stdDev = Math.sqrt(variance);
      
      const sorted = [...data].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      return {
        mean,
        median,
        variance,
        stdDev,
        min: Math.min(...data),
        max: Math.max(...data),
        count: data.length
      };
    },

    calculateLinearRegression: async (xData: number[], yData: number[]) => {
      const n = xData.length;
      if (n < 2) throw new Error('Insufficient data points');

      const sumX = xData.reduce((sum, x) => sum + x, 0);
      const sumY = yData.reduce((sum, y) => sum + y, 0);
      const sumXY = xData.reduce((sum, x, i) => sum + x * yData[i], 0);
      const sumXX = xData.reduce((sum, x) => sum + x * x, 0);

      const denominator = n * sumXX - sumX * sumX;
      if (denominator === 0) throw new Error('No variance in X data');

      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;

      return { slope, intercept };
    },

    calculateMovingAverage: async (data: number[], windowSize: number) => {
      const result = [];
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = data.slice(start, i + 1);
        const average = window.reduce((sum, val) => sum + val, 0) / window.length;
        result.push(average);
      }
      return { movingAverage: result };
    },

    detectAnomalies: async (data: number[], threshold = 2.5) => {
      const stats = await fallbackMethods.calculateStatistics(data);
      const anomalies = data.map((value, index) => {
        const zScore = stats.stdDev !== 0 ? Math.abs((value - stats.mean) / stats.stdDev) : 0;
        return {
          index,
          value,
          zScore,
          isAnomaly: zScore > threshold,
          severity: zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low'
        };
      });
      return { anomalies, anomalyCount: anomalies.filter(a => a.isAnomaly).length };
    },

    forecastValues: async (data: number[], periods: number) => {
      const xData = data.map((_, i) => i);
      const regression = await fallbackMethods.calculateLinearRegression(xData, data);
      
      const forecasts = [];
      const lastIndex = data.length - 1;
      
      for (let i = 1; i <= periods; i++) {
        const futureX = lastIndex + i;
        const forecast = regression.slope * futureX + regression.intercept;
        forecasts.push(forecast);
      }

      return {
        forecasts,
        trend: regression.slope > 0.1 ? 'increasing' : regression.slope < -0.1 ? 'decreasing' : 'stable'
      };
    },

    runMonteCarloSimulation: async (config: any) => {
      const { iterations = 1000, baseValue = 100, volatility = 0.1, periods = 10 } = config;
      const finalValues = [];
      
      for (let sim = 0; sim < iterations; sim++) {
        let value = baseValue;
        for (let period = 1; period < periods; period++) {
          const randomShock = (Math.random() - 0.5) * 2 * volatility;
          value = Math.max(0, value * (1 + randomShock));
        }
        finalValues.push(value);
      }
      
      finalValues.sort((a, b) => a - b);
      return {
        percentiles: {
          p10: finalValues[Math.floor(iterations * 0.1)],
          p50: finalValues[Math.floor(iterations * 0.5)],
          p90: finalValues[Math.floor(iterations * 0.9)]
        }
      };
    },

    calculateCapacityMetrics: async (teamData: any) => {
      if (!teamData?.historicalData) {
        throw new Error('Invalid team data');
      }
      
      const utilizations = teamData.historicalData.map((d: any) => d.utilization);
      const stats = await fallbackMethods.calculateStatistics(utilizations);
      
      return {
        teamId: teamData.teamId,
        teamName: teamData.teamName,
        utilizationStats: stats,
        riskScore: stats.mean > 100 ? 0.8 : 0.2,
        riskLevel: stats.mean > 100 ? 'high' : 'low'
      };
    },

    clearCache: async () => {
      return { success: true, message: 'Cache cleared (main thread)' };
    }
  };

  // Worker methods with fallback
  const workerMethods: AnalyticsWorkerMethods = {
    calculateStatistics: async (data: number[]) => {
      try {
        return await callWorkerMethod('calculateStatistics', { data });
      } catch (error) {
        console.warn('Worker fallback for calculateStatistics:', error);
        return await fallbackMethods.calculateStatistics(data);
      }
    },

    calculateLinearRegression: async (xData: number[], yData: number[]) => {
      try {
        return await callWorkerMethod('calculateLinearRegression', { xData, yData });
      } catch (error) {
        console.warn('Worker fallback for calculateLinearRegression:', error);
        return await fallbackMethods.calculateLinearRegression(xData, yData);
      }
    },

    calculateMovingAverage: async (data: number[], windowSize: number) => {
      try {
        return await callWorkerMethod('calculateMovingAverage', { data, windowSize });
      } catch (error) {
        console.warn('Worker fallback for calculateMovingAverage:', error);
        return await fallbackMethods.calculateMovingAverage(data, windowSize);
      }
    },

    detectAnomalies: async (data: number[], threshold?: number) => {
      try {
        return await callWorkerMethod('detectAnomalies', { data, threshold });
      } catch (error) {
        console.warn('Worker fallback for detectAnomalies:', error);
        return await fallbackMethods.detectAnomalies(data, threshold || 2.5);
      }
    },

    forecastValues: async (data: number[], periods: number) => {
      try {
        return await callWorkerMethod('forecastValues', { data, periods });
      } catch (error) {
        console.warn('Worker fallback for forecastValues:', error);
        return await fallbackMethods.forecastValues(data, periods);
      }
    },

    runMonteCarloSimulation: async (config: any) => {
      try {
        return await callWorkerMethod('runMonteCarloSimulation', config);
      } catch (error) {
        console.warn('Worker fallback for runMonteCarloSimulation:', error);
        return await fallbackMethods.runMonteCarloSimulation(config);
      }
    },

    calculateCapacityMetrics: async (teamData: any) => {
      try {
        return await callWorkerMethod('calculateCapacityMetrics', { teamData });
      } catch (error) {
        console.warn('Worker fallback for calculateCapacityMetrics:', error);
        return await fallbackMethods.calculateCapacityMetrics(teamData);
      }
    },

    clearCache: async () => {
      try {
        return await callWorkerMethod('clearCache', {});
      } catch (error) {
        console.warn('Worker fallback for clearCache:', error);
        return await fallbackMethods.clearCache();
      }
    }
  };

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsWorkerReady(false);
    }
  }, []);

  const cacheHitRate = cacheStats.hits + cacheStats.misses > 0 
    ? cacheStats.hits / (cacheStats.hits + cacheStats.misses) 
    : 0;

  return {
    worker: workerMethods,
    isWorkerSupported,
    isWorkerReady,
    pendingOperations,
    cacheHitRate,
    terminateWorker
  };
}