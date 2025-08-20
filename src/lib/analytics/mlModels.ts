/**
 * Machine Learning Models for Analytics
 * 
 * Implements statistical and ML algorithms for forecasting, anomaly detection,
 * and predictive analytics using historical team data.
 */

import { HistoricalDataPoint, TimeSeriesData, FeatureVector } from './dataProcessor';

// Prediction interfaces
export interface ForecastResult {
  predictions: number[];
  confidenceIntervals: { lower: number[]; upper: number[] };
  confidence: number; // Overall confidence score 0-1
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalAdjusted: boolean;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  anomalyScore: number; // 0-1, higher = more anomalous
  expectedRange: { min: number; max: number };
  detectionMethod: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predictions: number[];
  residuals: number[];
}

export interface RiskScore {
  score: number; // 0-1, higher = higher risk
  factors: { [key: string]: number };
  confidence: number;
  recommendations: string[];
}

/**
 * Linear Regression Model for trend analysis and forecasting
 */
export class LinearRegressionModel {
  private slope: number = 0;
  private intercept: number = 0;
  private rSquared: number = 0;
  private trained: boolean = false;

  /**
   * Train the model with historical data
   */
  train(data: number[]): void {
    if (data.length < 2) {
      throw new Error('Insufficient data for training (minimum 2 points required)');
    }

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;

    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      if (xi !== undefined && yi !== undefined) {
        numerator += (xi - xMean) * (yi - yMean);
        denominator += Math.pow(xi - xMean, 2);
      }
    }

    this.slope = denominator !== 0 ? numerator / denominator : 0;
    this.intercept = yMean - this.slope * xMean;

    // Calculate R-squared
    const predictions = x.map(xi => this.slope * xi + this.intercept);
    const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = y.reduce((sum, yi, i) => {
      const pred = predictions[i];
      return pred !== undefined ? sum + Math.pow(yi - pred, 2) : sum;
    }, 0);
    
    this.rSquared = totalSumSquares !== 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    this.trained = true;
  }

  /**
   * Make predictions for future time points
   */
  predict(steps: number): ForecastResult {
    if (!this.trained) {
      throw new Error('Model must be trained before making predictions');
    }

    const predictions: number[] = [];
    const confidenceIntervals: { lower: number[], upper: number[] } = { lower: [], upper: [] };
    
    // Standard error calculation for confidence intervals
    const standardError = Math.sqrt(1 - this.rSquared) * Math.abs(this.slope);
    const zScore = 1.96; // 95% confidence interval

    for (let i = 0; i < steps; i++) {
      const prediction = this.slope * i + this.intercept;
      const margin = zScore * standardError * Math.sqrt(1 + (1/steps));
      
      predictions.push(prediction);
      confidenceIntervals.lower.push(prediction - margin);
      confidenceIntervals.upper.push(prediction + margin);
    }

    const trend = this.slope > 0.1 ? 'increasing' : 
                  this.slope < -0.1 ? 'decreasing' : 'stable';

    return {
      predictions,
      confidenceIntervals,
      confidence: Math.max(0, this.rSquared),
      trend,
      seasonalAdjusted: false
    };
  }

  /**
   * Get model parameters
   */
  getParameters(): RegressionResult {
    if (!this.trained) {
      throw new Error('Model must be trained first');
    }

    return {
      slope: this.slope,
      intercept: this.intercept,
      rSquared: this.rSquared,
      predictions: [],
      residuals: []
    };
  }
}

/**
 * Moving Average Model for smoothing and trend analysis
 */
export class MovingAverageModel {
  private windowSizes: number[];
  private data: number[] = [];

  constructor(windowSizes: number[] = [3, 7, 14]) {
    this.windowSizes = windowSizes.sort((a, b) => a - b);
  }

  /**
   * Calculate moving averages for different window sizes
   */
  calculate(data: number[]): { [key: string]: number[] } {
    this.data = data;
    const result: { [key: string]: number[] } = {};

    for (const window of this.windowSizes) {
      const ma = this.simpleMovingAverage(data, window);
      result[`ma${window}`] = ma;
    }

    // Exponential moving average
    result['ema'] = this.exponentialMovingAverage(data, 0.3);

    return result;
  }

  /**
   * Forecast using moving average
   */
  forecast(data: number[], steps: number, window: number = 7): ForecastResult {
    const ma = this.simpleMovingAverage(data, window);
    const lastValues = ma.slice(-window);
    const avgValue = lastValues.reduce((sum, val) => sum + val, 0) / lastValues.length;
    
    // Simple forecast: extend last moving average value
    const predictions = new Array(steps).fill(avgValue);
    
    // Calculate confidence based on recent volatility
    const recentVariance = this.calculateVariance(lastValues);
    const confidence = Math.max(0, 1 - (recentVariance / (avgValue * avgValue)));
    
    // Confidence intervals based on standard deviation
    const stdDev = Math.sqrt(recentVariance);
    const margin = 1.96 * stdDev; // 95% confidence
    
    return {
      predictions,
      confidenceIntervals: {
        lower: predictions.map(p => p - margin),
        upper: predictions.map(p => p + margin)
      },
      confidence,
      trend: 'stable',
      seasonalAdjusted: false
    };
  }

  private simpleMovingAverage(data: number[], window: number): number[] {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      result.push(avg);
    }
    return result;
  }

  private exponentialMovingAverage(data: number[], alpha: number = 0.3): number[] {
    if (data.length === 0) return [];
    
    const firstValue = data[0];
    if (firstValue === undefined) return [];
    
    const ema = [firstValue];
    for (let i = 1; i < data.length; i++) {
      const dataValue = data[i];
      const prevEma = ema[i - 1];
      if (dataValue !== undefined && prevEma !== undefined) {
        const newEma = alpha * dataValue + (1 - alpha) * prevEma;
        ema.push(newEma);
      }
    }
    return ema;
  }

  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }
}

/**
 * Anomaly Detection using statistical methods
 */
export class AnomalyDetector {
  private zscore_threshold: number = 2.5;
  private iqr_multiplier: number = 1.5;

  /**
   * Z-Score based anomaly detection
   */
  detectZScoreAnomalies(data: number[]): AnomalyResult[] {
    if (data.length < 3) return [];

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return data.map((value, index) => {
      const zScore = stdDev !== 0 ? Math.abs((value - mean) / stdDev) : 0;
      const isAnomaly = zScore > this.zscore_threshold;
      const anomalyScore = Math.min(1, zScore / (this.zscore_threshold * 2));
      
      const severity = zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low';

      return {
        isAnomaly,
        anomalyScore,
        expectedRange: {
          min: mean - this.zscore_threshold * stdDev,
          max: mean + this.zscore_threshold * stdDev
        },
        detectionMethod: 'z-score',
        severity
      };
    });
  }

  /**
   * IQR (Interquartile Range) based anomaly detection
   */
  detectIQRAnomalies(data: number[]): AnomalyResult[] {
    if (data.length < 4) return [];

    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    
    if (q1 === undefined || q3 === undefined) {
      return data.map((_, index) => ({
        value: data[index] || 0,
        isAnomaly: false,
        anomalyScore: 0,
        expectedRange: { min: 0, max: 100 },
        detectionMethod: 'iqr' as const,
        severity: 'low' as const
      }));
    }
    
    const iqr = q3 - q1;
    
    const lowerBound = q1 - this.iqr_multiplier * iqr;
    const upperBound = q3 + this.iqr_multiplier * iqr;

    return data.map(value => {
      const isAnomaly = value < lowerBound || value > upperBound;
      const distance = Math.min(
        Math.abs(value - lowerBound),
        Math.abs(value - upperBound)
      );
      const anomalyScore = isAnomaly ? Math.min(1, distance / (iqr * 2)) : 0;
      
      const severity = distance > iqr * 2 ? 'high' : distance > iqr ? 'medium' : 'low';

      return {
        isAnomaly,
        anomalyScore,
        expectedRange: { min: lowerBound, max: upperBound },
        detectionMethod: 'iqr',
        severity
      };
    });
  }

  /**
   * Isolation Forest approximation for multivariate anomaly detection
   */
  detectPatternAnomalies(features: FeatureVector[]): AnomalyResult[] {
    if (features.length === 0) return [];

    // Simple implementation: detect outliers in multi-dimensional space
    const results: AnomalyResult[] = [];
    
    // Calculate centroid and average distances
    const firstFeature = features[0];
    if (!firstFeature) {
      return features.map(f => ({
        value: f.features.avgUtilization,
        isAnomaly: false,
        anomalyScore: 0,
        expectedRange: { min: 0, max: 100 },
        detectionMethod: 'multivariate',
        severity: 'low' as const
      }));
    }
    
    const dimensions = Object.keys(firstFeature.features);
    const centroid: { [key: string]: number } = {};
    
    dimensions.forEach(dim => {
      const values = features.map(f => f.features[dim as keyof typeof f.features]);
      centroid[dim] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    // Calculate distances from centroid
    const distances = features.map(feature => {
      let distanceSquared = 0;
      dimensions.forEach(dim => {
        const centroidValue = centroid[dim];
        if (centroidValue !== undefined) {
          const diff = feature.features[dim as keyof typeof feature.features] - centroidValue;
          distanceSquared += diff * diff;
        }
      });
      return Math.sqrt(distanceSquared);
    });

    const meanDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const stdDevDistance = Math.sqrt(
      distances.reduce((sum, d) => sum + Math.pow(d - meanDistance, 2), 0) / distances.length
    );

    const threshold = meanDistance + 2 * stdDevDistance;

    distances.forEach(distance => {
      const isAnomaly = distance > threshold;
      const anomalyScore = Math.min(1, distance / (threshold * 1.5));
      const severity = distance > threshold * 1.5 ? 'high' : 
                      distance > threshold * 1.2 ? 'medium' : 'low';

      results.push({
        isAnomaly,
        anomalyScore,
        expectedRange: { min: 0, max: threshold },
        detectionMethod: 'isolation-forest-approx',
        severity
      });
    });

    return results;
  }
}

/**
 * Risk Assessment Model using weighted scoring
 */
export class RiskAssessmentModel {
  private weights: { [key: string]: number } = {
    avgUtilization: 0.25,
    utilizationStdDev: 0.20,
    velocityTrend: 0.15,
    teamStability: 0.15,
    workloadVariability: 0.10,
    memberTurnover: 0.10,
    historicalAccuracy: 0.05
  };

  /**
   * Calculate burnout risk score for a team member or team
   */
  calculateBurnoutRisk(features: FeatureVector): RiskScore {
    const factors: { [key: string]: number } = {};
    let weightedScore = 0;

    // Utilization risk (high utilization = higher risk)
    const utilizationRisk = Math.min(1, features.features.avgUtilization / 150);
    factors.utilizationRisk = utilizationRisk;
    weightedScore += utilizationRisk * (this.weights.avgUtilization || 0);

    // Variability risk (high variability = higher risk)
    const variabilityRisk = Math.min(1, features.features.workloadVariability);
    factors.variabilityRisk = variabilityRisk;
    weightedScore += variabilityRisk * (this.weights.workloadVariability || 0);

    // Stability risk (low stability = higher risk)
    const stabilityRisk = Math.max(0, 1 - features.features.teamStability);
    factors.stabilityRisk = stabilityRisk;
    weightedScore += stabilityRisk * (this.weights.teamStability || 0);

    // Turnover risk (high turnover = higher risk)
    const turnoverRisk = Math.min(1, features.features.memberTurnover * 2);
    factors.turnoverRisk = turnoverRisk;
    weightedScore += turnoverRisk * (this.weights.memberTurnover || 0);

    // Trend risk (declining velocity = higher risk)
    const trendRisk = features.features.velocityTrend < 0 ? 
      Math.min(1, Math.abs(features.features.velocityTrend) / 10) : 0;
    factors.trendRisk = trendRisk;
    weightedScore += trendRisk * (this.weights.velocityTrend || 0);

    const recommendations = this.generateBurnoutRecommendations(factors);
    const confidence = features.features.historicalAccuracy;

    return {
      score: Math.max(0, Math.min(1, weightedScore)),
      factors,
      confidence,
      recommendations
    };
  }

  /**
   * Calculate capacity risk for delivery commitments
   */
  calculateCapacityRisk(teamData: HistoricalDataPoint[], targetCapacity: number): RiskScore {
    const recentUtilizations = teamData
      .slice(-6) // Last 6 data points
      .map(d => d.utilization);
    
    const avgUtilization = recentUtilizations.reduce((sum, u) => sum + u, 0) / recentUtilizations.length;
    const utilizationStdDev = Math.sqrt(
      recentUtilizations.reduce((sum, u) => sum + Math.pow(u - avgUtilization, 2), 0) / recentUtilizations.length
    );

    const factors: { [key: string]: number } = {};

    // Over-commitment risk
    const overCommitmentRisk = Math.max(0, (targetCapacity - avgUtilization) / 100);
    factors.overCommitmentRisk = overCommitmentRisk;

    // Volatility risk
    const volatilityRisk = Math.min(1, utilizationStdDev / 50);
    factors.volatilityRisk = volatilityRisk;

    // Historical accuracy risk
    const accuracyRisk = Math.max(0, 1 - (avgUtilization / 100));
    factors.accuracyRisk = accuracyRisk;

    const score = (overCommitmentRisk * 0.5 + volatilityRisk * 0.3 + accuracyRisk * 0.2);
    const confidence = recentUtilizations.length >= 3 ? 0.8 : 0.5;

    return {
      score: Math.max(0, Math.min(1, score)),
      factors,
      confidence,
      recommendations: this.generateCapacityRecommendations(factors)
    };
  }

  private generateBurnoutRecommendations(factors: { [key: string]: number }): string[] {
    const recommendations: string[] = [];

    if ((factors.utilizationRisk || 0) > 0.7) {
      recommendations.push('Consider reducing workload or adding team members');
    }
    if ((factors.variabilityRisk || 0) > 0.6) {
      recommendations.push('Implement better workload planning and distribution');
    }
    if ((factors.stabilityRisk || 0) > 0.5) {
      recommendations.push('Focus on team retention and stability initiatives');
    }
    if ((factors.turnoverRisk || 0) > 0.4) {
      recommendations.push('Investigate causes of team member turnover');
    }
    if ((factors.trendRisk || 0) > 0.3) {
      recommendations.push('Address factors causing declining team velocity');
    }

    if (recommendations.length === 0) {
      recommendations.push('Team appears to be operating within healthy parameters');
    }

    return recommendations;
  }

  private generateCapacityRecommendations(factors: { [key: string]: number }): string[] {
    const recommendations: string[] = [];

    if ((factors.overCommitmentRisk || 0) > 0.6) {
      recommendations.push('Reduce sprint commitments or add capacity');
    }
    if ((factors.volatilityRisk || 0) > 0.5) {
      recommendations.push('Improve capacity planning consistency');
    }
    if ((factors.accuracyRisk || 0) > 0.4) {
      recommendations.push('Review and improve estimation processes');
    }

    return recommendations;
  }
}

/**
 * Seasonal Decomposition Model
 */
export class SeasonalDecompositionModel {
  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  decompose(data: number[], period: number): TimeSeriesData {
    const n = data.length;
    const timestamps = data.map((_, i) => 
      new Date(Date.now() - (n - i) * 24 * 60 * 60 * 1000).toISOString()
    );

    // Calculate trend using centered moving average
    const trend = this.calculateTrend(data, period);
    
    // Remove trend to get detrended data
    const detrended = data.map((val, i) => val - (trend[i] || 0));
    
    // Calculate seasonal component
    const seasonal = this.calculateSeasonal(detrended, period);
    
    // Calculate residual
    const residual = data.map((val, i) => val - (trend[i] || 0) - (seasonal[i] || 0));

    return {
      timestamps,
      values: data,
      trend,
      seasonal,
      residual
    };
  }

  private calculateTrend(data: number[], period: number): number[] {
    const trend = [];
    const halfPeriod = Math.floor(period / 2);

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfPeriod);
      const end = Math.min(data.length, i + halfPeriod + 1);
      const slice = data.slice(start, end);
      const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      trend.push(avg);
    }

    return trend;
  }

  private calculateSeasonal(detrended: number[], period: number): number[] {
    const seasonal = new Array(detrended.length);
    const seasonalAverages = new Array(period).fill(0);
    const seasonalCounts = new Array(period).fill(0);

    // Calculate average for each seasonal position
    detrended.forEach((value, index) => {
      const seasonIndex = index % period;
      seasonalAverages[seasonIndex] += value;
      seasonalCounts[seasonIndex]++;
    });

    // Normalize seasonal averages
    for (let i = 0; i < period; i++) {
      if (seasonalCounts[i] > 0) {
        seasonalAverages[i] /= seasonalCounts[i];
      }
    }

    // Apply seasonal pattern to all data points
    detrended.forEach((_, index) => {
      seasonal[index] = seasonalAverages[index % period];
    });

    return seasonal;
  }
}

// Export model instances
export const linearRegression = new LinearRegressionModel();
export const movingAverage = new MovingAverageModel();
export const anomalyDetector = new AnomalyDetector();
export const riskAssessment = new RiskAssessmentModel();
export const seasonalDecomposition = new SeasonalDecompositionModel();