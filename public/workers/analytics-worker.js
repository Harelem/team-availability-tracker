/**
 * Analytics Web Worker
 * 
 * Performs heavy analytics computations in a separate thread to avoid
 * blocking the main UI thread and improve user experience.
 */

// Analytics computation functions
class AnalyticsWorker {
  constructor() {
    this.cache = new Map();
    this.initialized = false;
  }

  // Initialize the worker with base data
  initialize(config = {}) {
    this.config = {
      cacheSize: config.cacheSize || 100,
      cacheTimeout: config.cacheTimeout || 5 * 60 * 1000, // 5 minutes
      ...config
    };
    this.initialized = true;
    return { success: true, message: 'Analytics worker initialized' };
  }

  // Statistical calculations
  calculateStatistics(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { error: 'Invalid data provided' };
    }

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
  }

  // Linear regression calculation
  calculateLinearRegression(xData, yData) {
    if (!Array.isArray(xData) || !Array.isArray(yData) || xData.length !== yData.length) {
      return { error: 'Invalid or mismatched data arrays' };
    }

    const n = xData.length;
    if (n < 2) {
      return { error: 'Insufficient data points for regression' };
    }

    const sumX = xData.reduce((sum, x) => sum + x, 0);
    const sumY = yData.reduce((sum, y) => sum + y, 0);
    const sumXY = xData.reduce((sum, x, i) => sum + x * yData[i], 0);
    const sumXX = xData.reduce((sum, x) => sum + x * x, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
      return { error: 'Cannot calculate regression - no variance in X' };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const totalSumSquares = yData.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const predictions = xData.map(x => slope * x + intercept);
    const residualSumSquares = yData.reduce((sum, y, i) => sum + Math.pow(y - predictions[i], 2), 0);
    const rSquared = totalSumSquares !== 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return {
      slope,
      intercept,
      rSquared,
      predictions
    };
  }

  // Moving average calculation
  calculateMovingAverage(data, windowSize) {
    if (!Array.isArray(data) || windowSize <= 0 || windowSize > data.length) {
      return { error: 'Invalid data or window size' };
    }

    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(average);
    }

    return { movingAverage: result };
  }

  // Anomaly detection using Z-score
  detectAnomalies(data, threshold = 2.5) {
    if (!Array.isArray(data) || data.length < 3) {
      return { error: 'Insufficient data for anomaly detection' };
    }

    const stats = this.calculateStatistics(data);
    if (stats.error) return stats;

    const anomalies = data.map((value, index) => {
      const zScore = stats.stdDev !== 0 ? Math.abs((value - stats.mean) / stats.stdDev) : 0;
      const isAnomaly = zScore > threshold;
      
      return {
        index,
        value,
        zScore,
        isAnomaly,
        severity: zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low'
      };
    });

    return {
      anomalies,
      anomalyCount: anomalies.filter(a => a.isAnomaly).length,
      threshold
    };
  }

  // Forecast using simple linear regression
  forecastValues(historicalData, periods) {
    if (!Array.isArray(historicalData) || periods <= 0) {
      return { error: 'Invalid parameters for forecasting' };
    }

    const xData = historicalData.map((_, i) => i);
    const yData = historicalData;
    
    const regression = this.calculateLinearRegression(xData, yData);
    if (regression.error) return regression;

    const forecasts = [];
    const lastIndex = historicalData.length - 1;
    
    for (let i = 1; i <= periods; i++) {
      const futureX = lastIndex + i;
      const forecast = regression.slope * futureX + regression.intercept;
      forecasts.push(forecast);
    }

    return {
      forecasts,
      confidence: regression.rSquared,
      trend: regression.slope > 0.1 ? 'increasing' : regression.slope < -0.1 ? 'decreasing' : 'stable'
    };
  }

  // Monte Carlo simulation
  runMonteCarloSimulation(config) {
    const {
      iterations = 1000,
      baseValue = 100,
      volatility = 0.1,
      trend = 0,
      periods = 10
    } = config;

    const simulations = [];
    
    for (let sim = 0; sim < iterations; sim++) {
      const path = [baseValue];
      
      for (let period = 1; period < periods; period++) {
        const randomShock = (Math.random() - 0.5) * 2 * volatility;
        const nextValue = path[period - 1] * (1 + trend + randomShock);
        path.push(Math.max(0, nextValue)); // Ensure non-negative values
      }
      
      simulations.push(path);
    }

    // Calculate percentiles
    const finalValues = simulations.map(sim => sim[sim.length - 1]).sort((a, b) => a - b);
    const percentiles = {
      p10: finalValues[Math.floor(iterations * 0.1)],
      p25: finalValues[Math.floor(iterations * 0.25)],
      p50: finalValues[Math.floor(iterations * 0.5)],
      p75: finalValues[Math.floor(iterations * 0.75)],
      p90: finalValues[Math.floor(iterations * 0.9)]
    };

    return {
      simulations: simulations.slice(0, 10), // Return only first 10 for data transfer efficiency
      percentiles,
      statistics: this.calculateStatistics(finalValues)
    };
  }

  // Complex capacity calculation
  calculateCapacityMetrics(teamData) {
    if (!teamData || !Array.isArray(teamData.historicalData)) {
      return { error: 'Invalid team data structure' };
    }

    const data = teamData.historicalData;
    const utilizations = data.map(d => d.utilization);
    const velocities = data.map(d => d.actualHours);

    // Basic statistics
    const utilizationStats = this.calculateStatistics(utilizations);
    const velocityStats = this.calculateStatistics(velocities);

    // Trend analysis
    const utilizationTrend = this.forecastValues(utilizations, 3);
    const velocityTrend = this.forecastValues(velocities, 3);

    // Anomaly detection
    const utilizationAnomalies = this.detectAnomalies(utilizations);
    const velocityAnomalies = this.detectAnomalies(velocities);

    // Capacity efficiency calculation
    const optimalRange = [80, 95]; // 80-95% utilization is optimal
    const optimalCount = utilizations.filter(u => u >= optimalRange[0] && u <= optimalRange[1]).length;
    const capacityEfficiency = optimalCount / utilizations.length;

    // Risk assessment
    const avgUtilization = utilizationStats.mean;
    const utilizationVolatility = utilizationStats.stdDev / utilizationStats.mean;
    
    const riskScore = Math.min(1, Math.max(0,
      (avgUtilization > 100 ? 0.4 : 0) + // Over-utilization risk
      (utilizationVolatility > 0.3 ? 0.3 : 0) + // Volatility risk
      (velocityTrend.trend === 'decreasing' ? 0.3 : 0) // Declining velocity risk
    ));

    return {
      teamId: teamData.teamId,
      teamName: teamData.teamName,
      utilizationStats,
      velocityStats,
      utilizationTrend,
      velocityTrend,
      utilizationAnomalies: utilizationAnomalies.anomalies?.filter(a => a.isAnomaly) || [],
      velocityAnomalies: velocityAnomalies.anomalies?.filter(a => a.isAnomaly) || [],
      capacityEfficiency,
      riskScore,
      riskLevel: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
      recommendations: this.generateRecommendations(avgUtilization, utilizationVolatility, velocityTrend.trend)
    };
  }

  generateRecommendations(avgUtilization, volatility, velocityTrend) {
    const recommendations = [];

    if (avgUtilization > 95) {
      recommendations.push('Reduce team workload to prevent burnout');
    } else if (avgUtilization < 70) {
      recommendations.push('Consider increasing team utilization');
    }

    if (volatility > 0.3) {
      recommendations.push('Improve capacity planning consistency');
    }

    if (velocityTrend === 'decreasing') {
      recommendations.push('Investigate factors causing velocity decline');
    }

    if (recommendations.length === 0) {
      recommendations.push('Team performance is within optimal parameters');
    }

    return recommendations;
  }

  // Cache management
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCached(key, data) {
    // Implement LRU cache eviction
    if (this.cache.size >= this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    return { success: true, message: 'Cache cleared' };
  }
}

// Initialize worker instance
const analyticsWorker = new AnalyticsWorker();

// Message handler
self.onmessage = function(e) {
  const { id, method, params } = e.data;
  
  try {
    let result;
    
    // Check cache first for cacheable operations
    const cacheableOperations = ['calculateCapacityMetrics', 'calculateStatistics', 'forecastValues'];
    if (cacheableOperations.includes(method)) {
      const cacheKey = `${method}_${JSON.stringify(params)}`;
      const cached = analyticsWorker.getCached(cacheKey);
      if (cached) {
        self.postMessage({ id, result: cached, fromCache: true });
        return;
      }
    }

    // Execute the requested method
    switch (method) {
      case 'initialize':
        result = analyticsWorker.initialize(params);
        break;
      case 'calculateStatistics':
        result = analyticsWorker.calculateStatistics(params.data);
        break;
      case 'calculateLinearRegression':
        result = analyticsWorker.calculateLinearRegression(params.xData, params.yData);
        break;
      case 'calculateMovingAverage':
        result = analyticsWorker.calculateMovingAverage(params.data, params.windowSize);
        break;
      case 'detectAnomalies':
        result = analyticsWorker.detectAnomalies(params.data, params.threshold);
        break;
      case 'forecastValues':
        result = analyticsWorker.forecastValues(params.data, params.periods);
        break;
      case 'runMonteCarloSimulation':
        result = analyticsWorker.runMonteCarloSimulation(params);
        break;
      case 'calculateCapacityMetrics':
        result = analyticsWorker.calculateCapacityMetrics(params.teamData);
        break;
      case 'clearCache':
        result = analyticsWorker.clearCache();
        break;
      default:
        result = { error: `Unknown method: ${method}` };
    }

    // Cache the result if it's a cacheable operation and successful
    if (cacheableOperations.includes(method) && result && !result.error) {
      const cacheKey = `${method}_${JSON.stringify(params)}`;
      analyticsWorker.setCached(cacheKey, result);
    }

    self.postMessage({ id, result, fromCache: false });
  } catch (error) {
    self.postMessage({ 
      id, 
      result: { error: error.message || 'Unknown error occurred' },
      fromCache: false 
    });
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('Analytics Worker Error:', error);
  self.postMessage({ 
    error: 'Worker error occurred',
    details: error.message 
  });
};

// Notify that worker is ready
self.postMessage({ ready: true, message: 'Analytics worker ready' });