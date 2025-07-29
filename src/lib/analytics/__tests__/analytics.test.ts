/**
 * Comprehensive Analytics Testing Suite with Benchmarks
 * 
 * Tests all analytics components including data processing, ML models,
 * predictive analytics, performance metrics, and alert system.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Import analytics modules
import { dataProcessor, HistoricalDataPoint, ProcessedTeamData } from '../dataProcessor';
import { 
  linearRegression, 
  movingAverage, 
  anomalyDetector, 
  riskAssessment,
  seasonalDecomposition 
} from '../mlModels';
import { predictiveAnalytics } from '../predictiveAnalytics';
import { performanceMetrics } from '../performanceMetrics';
import { alertSystem } from '../alertSystem';

// Test data generators
const generateMockHistoricalData = (teamId: number, sprintCount: number = 6, memberCount: number = 5): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let sprint = 1; sprint <= sprintCount; sprint++) {
    for (let member = 1; member <= memberCount; member++) {
      const sprintStart = new Date(baseDate);
      sprintStart.setDate(sprintStart.getDate() + (sprint - 1) * 14);
      
      data.push({
        date: sprintStart.toISOString(),
        teamId,
        memberId: member,
        plannedHours: 70, // 2 weeks * 5 days * 7 hours
        actualHours: 60 + Math.random() * 20, // Some variation
        utilization: 85 + Math.random() * 20, // 85-105%
        sprintNumber: sprint
      });
    }
  }
  
  return data;
};

const generateMockProcessedTeamData = (teamId: number): ProcessedTeamData => {
  const historicalData = generateMockHistoricalData(teamId);
  const utilizations = historicalData.map(d => d.utilization);
  const avgUtilization = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
  
  return {
    teamId,
    teamName: `Team ${teamId}`,
    historicalData,
    memberCount: 5,
    avgUtilization,
    velocityTrend: [240, 250, 260, 245, 255, 250], // Mock velocity data
    seasonalPatterns: [
      {
        period: 'weekly',
        pattern: [1.0, 0.9, 1.1, 0.95, 1.05, 0.8, 0.7],
        confidence: 0.7
      }
    ],
    dataQuality: {
      completeness: 0.95,
      consistency: 0.88,
      timeliness: 0.92,
      accuracy: 0.85
    }
  };
};

// Performance benchmarking utility
class PerformanceBenchmark {
  private results = new Map<string, number[]>();
  
  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    if (!this.results.has(name)) {
      this.results.set(name, []);
    }
    this.results.get(name)!.push(duration);
    
    return result;
  }
  
  getStats(name: string) {
    const times = this.results.get(name) || [];
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    return {
      count: times.length,
      average: avg,
      median,
      p95,
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }
  
  printResults() {
    console.log('\n=== Performance Benchmark Results ===');
    for (const [name, _] of this.results) {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`${name}:`);
        console.log(`  Average: ${stats.average.toFixed(2)}ms`);
        console.log(`  Median: ${stats.median.toFixed(2)}ms`);
        console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
        console.log(`  Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms`);
        console.log(`  Runs: ${stats.count}`);
        console.log('');
      }
    }
  }
}

const benchmark = new PerformanceBenchmark();

describe('Analytics System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test data
  });

  describe('Data Processor', () => {
    test('should clean data correctly', async () => {
      const rawData = [
        ...generateMockHistoricalData(1),
        // Add some invalid data
        { ...generateMockHistoricalData(1)[0], utilization: -10 }, // Invalid negative
        { ...generateMockHistoricalData(1)[0], utilization: 500 }, // Invalid too high
        { ...generateMockHistoricalData(1)[0], plannedHours: NaN }, // Invalid NaN
      ];

      const cleaned = await benchmark.measure('dataProcessor.cleanData', () => 
        dataProcessor.cleanData(rawData)
      );

      expect(cleaned.length).toBeLessThan(rawData.length);
      expect(cleaned.every(d => d.utilization >= 0 && d.utilization <= 300)).toBe(true);
      expect(cleaned.every(d => !isNaN(d.plannedHours) && !isNaN(d.actualHours))).toBe(true);
    });

    test('should generate feature vectors', async () => {
      const processedData = [
        generateMockProcessedTeamData(1),
        generateMockProcessedTeamData(2),
        generateMockProcessedTeamData(3)
      ];

      const features = await benchmark.measure('dataProcessor.generateFeatureVectors', () =>
        dataProcessor.generateFeatureVectors(processedData)
      );

      expect(features).toHaveLength(3);
      features.forEach(feature => {
        expect(feature.features).toHaveProperty('avgUtilization');
        expect(feature.features).toHaveProperty('utilizationStdDev');
        expect(feature.features).toHaveProperty('velocityTrend');
        expect(feature.features).toHaveProperty('teamStability');
        expect(feature.features.avgUtilization).toBeGreaterThan(0);
      });
    });

    test('should assess data quality correctly', () => {
      const goodData = generateMockHistoricalData(1);
      const quality = dataProcessor.assessDataQuality(goodData);

      expect(quality.completeness).toBeGreaterThan(0.9);
      expect(quality.consistency).toBeGreaterThan(0.8);
      expect(quality.timeliness).toBeGreaterThanOrEqual(0);
      expect(quality.accuracy).toBeGreaterThan(0);
    });

    test('should handle empty data gracefully', () => {
      const quality = dataProcessor.assessDataQuality([]);
      expect(quality.completeness).toBe(0);
      expect(quality.consistency).toBe(0);
      expect(quality.timeliness).toBe(0);
      expect(quality.accuracy).toBe(0);
    });
  });

  describe('ML Models', () => {
    describe('Linear Regression', () => {
      test('should train and predict correctly', async () => {
        const data = [10, 12, 14, 16, 18, 20, 22, 24];
        
        await benchmark.measure('linearRegression.train', () => {
          linearRegression.train(data);
        });

        const prediction = await benchmark.measure('linearRegression.predict', () =>
          linearRegression.predict(3)
        );

        expect(prediction.predictions).toHaveLength(3);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.trend).toBe('increasing');
        expect(prediction.predictions[0]).toBeGreaterThan(24); // Should continue trend
      });

      test('should handle insufficient data', () => {
        expect(() => linearRegression.train([1])).toThrow();
      });

      test('should calculate R-squared correctly', () => {
        const perfectData = [1, 2, 3, 4, 5]; // Perfect linear relationship
        linearRegression.train(perfectData);
        const params = linearRegression.getParameters();
        
        expect(params.rSquared).toBeCloseTo(1, 1); // Should be close to 1
        expect(params.slope).toBeCloseTo(1, 1);
      });
    });

    describe('Moving Average', () => {
      test('should calculate moving averages', async () => {
        const data = [10, 12, 14, 16, 18, 20, 22, 24];
        
        const result = await benchmark.measure('movingAverage.calculate', () =>
          movingAverage.calculate(data)
        );

        expect(result).toHaveProperty('ma3');
        expect(result).toHaveProperty('ma7');
        expect(result).toHaveProperty('ema');
        expect(result.ma3).toHaveLength(data.length);
      });

      test('should forecast using moving average', async () => {
        const data = [10, 12, 14, 16, 18, 20, 22, 24];
        
        const forecast = await benchmark.measure('movingAverage.forecast', () =>
          movingAverage.forecast(data, 3, 5)
        );

        expect(forecast.predictions).toHaveLength(3);
        expect(forecast.confidence).toBeGreaterThan(0);
        expect(forecast.confidenceIntervals.lower).toHaveLength(3);
        expect(forecast.confidenceIntervals.upper).toHaveLength(3);
      });
    });

    describe('Anomaly Detector', () => {
      test('should detect Z-score anomalies', async () => {
        const normalData = Array.from({ length: 20 }, () => 50 + Math.random() * 10);
        const dataWithAnomalies = [...normalData, 100, 5, 150]; // Add clear anomalies
        
        const anomalies = await benchmark.measure('anomalyDetector.detectZScoreAnomalies', () =>
          anomalyDetector.detectZScoreAnomalies(dataWithAnomalies)
        );

        expect(anomalies).toHaveLength(dataWithAnomalies.length);
        
        // Check that anomalies are detected in the last 3 points
        const lastThree = anomalies.slice(-3);
        expect(lastThree.some(a => a.isAnomaly)).toBe(true);
      });

      test('should detect IQR anomalies', async () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]; // 100 is clear outlier
        
        const anomalies = await benchmark.measure('anomalyDetector.detectIQRAnomalies', () =>
          anomalyDetector.detectIQRAnomalies(data)
        );

        expect(anomalies).toHaveLength(data.length);
        expect(anomalies[anomalies.length - 1].isAnomaly).toBe(true); // Last point should be anomaly
      });

      test('should handle edge cases', () => {
        expect(anomalyDetector.detectZScoreAnomalies([])).toHaveLength(0);
        expect(anomalyDetector.detectZScoreAnomalies([1, 2])).toHaveLength(0);
        expect(anomalyDetector.detectIQRAnomalies([1, 2, 3])).toHaveLength(0);
      });
    });

    describe('Risk Assessment', () => {
      test('should calculate burnout risk', async () => {
        const highRiskFeatures = {
          teamId: 1,
          features: {
            avgUtilization: 120, // High utilization
            utilizationStdDev: 25,
            velocityTrend: -0.5, // Declining
            teamStability: 0.6, // Low stability
            workloadVariability: 0.8,
            seasonalIndex: 0.5,
            historicalAccuracy: 0.7,
            memberTurnover: 0.3
          }
        };

        const risk = await benchmark.measure('riskAssessment.calculateBurnoutRisk', () =>
          riskAssessment.calculateBurnoutRisk(highRiskFeatures)
        );

        expect(risk.score).toBeGreaterThan(0.5); // Should be high risk
        expect(risk.confidence).toBeGreaterThan(0);
        expect(risk.recommendations).toBeInstanceOf(Array);
        expect(risk.recommendations.length).toBeGreaterThan(0);
      });

      test('should calculate capacity risk', async () => {
        const teamData = generateMockHistoricalData(1);
        
        const risk = await benchmark.measure('riskAssessment.calculateCapacityRisk', () =>
          riskAssessment.calculateCapacityRisk(teamData, 110) // Target 110% capacity
        );

        expect(risk.score).toBeGreaterThanOrEqual(0);
        expect(risk.score).toBeLessThanOrEqual(1);
        expect(risk.factors).toHaveProperty('overCommitmentRisk');
        expect(risk.factors).toHaveProperty('volatilityRisk');
      });
    });

    describe('Seasonal Decomposition', () => {
      test('should decompose time series', async () => {
        const seasonalData = Array.from({ length: 28 }, (_, i) => {
          const trend = i * 0.5;
          const seasonal = Math.sin((i / 7) * 2 * Math.PI) * 5; // Weekly pattern
          const noise = Math.random() * 2 - 1;
          return trend + seasonal + noise + 50;
        });

        const decomposed = await benchmark.measure('seasonalDecomposition.decompose', () =>
          seasonalDecomposition.decompose(seasonalData, 7)
        );

        expect(decomposed.values).toHaveLength(seasonalData.length);
        expect(decomposed.trend).toHaveLength(seasonalData.length);
        expect(decomposed.seasonal).toHaveLength(seasonalData.length);
        expect(decomposed.residual).toHaveLength(seasonalData.length);
        expect(decomposed.timestamps).toHaveLength(seasonalData.length);
      });
    });
  });

  describe('Predictive Analytics Engine', () => {
    test('should forecast sprint capacity', async () => {
      const forecast = await benchmark.measure('predictiveAnalytics.forecastSprintCapacity', () =>
        predictiveAnalytics.forecastSprintCapacity('1', 4)
      );

      expect(forecast.teamId).toBe(1);
      expect(forecast.forecasts).toHaveProperty('sprint1');
      expect(forecast.forecasts).toHaveProperty('sprint2');
      expect(forecast.forecasts).toHaveProperty('sprint3');
      expect(forecast.forecasts).toHaveProperty('sprint4');
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.basedOnSprints).toBeGreaterThan(0);
    });

    test('should assess burnout risk', async () => {
      const assessment = await benchmark.measure('predictiveAnalytics.assessBurnoutRisk', () =>
        predictiveAnalytics.assessBurnoutRisk('1')
      );

      expect(assessment.memberId).toBe(1);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(assessment.riskLevel);
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.predictions.burnoutProbability).toBeGreaterThanOrEqual(0);
      expect(assessment.predictions.burnoutProbability).toBeLessThanOrEqual(1);
    });

    test('should handle insufficient data gracefully', async () => {
      await expect(predictiveAnalytics.forecastSprintCapacity('999', 4))
        .rejects.toThrow('Insufficient historical data');
    });

    test('should calculate optimal team size', async () => {
      const requirements = {
        estimatedHours: 1000,
        complexity: 'medium' as const,
        skillRequirements: ['javascript', 'react', 'node.js'],
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        criticalPath: false
      };

      const recommendation = await benchmark.measure('predictiveAnalytics.calculateOptimalTeamSize', () =>
        predictiveAnalytics.calculateOptimalTeamSize(requirements)
      );

      expect(recommendation.recommendedSize).toBeGreaterThan(0);
      expect(recommendation.reasoning).toBeInstanceOf(Array);
      expect(recommendation.impactAnalysis).toHaveProperty('velocityImprovement');
      expect(recommendation.implementationPlan).toHaveProperty('timeline');
    });

    test('should predict delivery dates', async () => {
      const backlogItems = [
        {
          id: '1',
          title: 'Feature A',
          estimatedHours: 40,
          priority: 'high' as const,
          dependencies: [],
          complexity: 5,
          skillsRequired: ['javascript', 'react']
        },
        {
          id: '2',
          title: 'Feature B', 
          estimatedHours: 60,
          priority: 'medium' as const,
          dependencies: ['1'],
          complexity: 7,
          skillsRequired: ['node.js', 'database']
        }
      ];

      const prediction = await benchmark.measure('predictiveAnalytics.predictDeliveryDate', () =>
        predictiveAnalytics.predictDeliveryDate(backlogItems)
      );

      expect(prediction.items).toHaveLength(2);
      expect(prediction.predictions).toHaveProperty('optimistic');
      expect(prediction.predictions).toHaveProperty('realistic');
      expect(prediction.predictions).toHaveProperty('pessimistic');
      expect(prediction.riskFactors).toBeInstanceOf(Array);
      expect(prediction.mitigationStrategies).toBeInstanceOf(Array);
    });
  });

  describe('Performance Metrics Calculator', () => {
    test('should calculate team performance metrics', async () => {
      const metrics = await benchmark.measure('performanceMetrics.calculateTeamPerformance', () =>
        performanceMetrics.calculateTeamPerformance('1', 6)
      );

      expect(metrics.teamId).toBe(1);
      expect(metrics.velocityMetrics).toHaveProperty('currentVelocity');
      expect(metrics.utilizationMetrics).toHaveProperty('currentUtilization');
      expect(metrics.stabilityMetrics).toHaveProperty('teamStabilityScore');
      expect(metrics.efficiencyMetrics).toHaveProperty('overallEfficiency');
      expect(metrics.qualityMetrics).toHaveProperty('deliveryQuality');
      expect(metrics.overallScore.composite).toBeGreaterThan(0);
      expect(metrics.overallScore.composite).toBeLessThanOrEqual(100);
    });

    test('should calculate company performance metrics', async () => {
      const metrics = await benchmark.measure('performanceMetrics.calculateCompanyPerformance', () =>
        performanceMetrics.calculateCompanyPerformance(6)
      );

      expect(metrics.companyWideMetrics).toHaveProperty('averageVelocity');
      expect(metrics.companyWideMetrics).toHaveProperty('averageUtilization');
      expect(metrics.teamComparisons).toBeInstanceOf(Array);
      expect(metrics.performanceDistribution).toHaveProperty('excellent');
      expect(metrics.organizationalHealth).toHaveProperty('score');
    });

    test('should handle edge cases', async () => {
      await expect(performanceMetrics.calculateTeamPerformance('999', 6))
        .rejects.toThrow();
    });
  });

  describe('Alert System', () => {
    test('should run monitoring cycle', async () => {
      const alerts = await benchmark.measure('alertSystem.runMonitoringCycle', () =>
        alertSystem.runMonitoringCycle()
      );

      expect(alerts).toBeInstanceOf(Array);
      // May be empty if no alerts are triggered
      alerts.forEach(alert => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('title');
        expect(alert).toHaveProperty('description');
        expect(['info', 'low', 'medium', 'high', 'critical']).toContain(alert.severity);
      });
    });

    test('should generate insights', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const insights = await benchmark.measure('alertSystem.generateInsights', () =>
        alertSystem.generateInsights(startDate, endDate)
      );

      expect(insights.keyInsights).toBeInstanceOf(Array);
      expect(insights.trendAnalysis).toBeInstanceOf(Array);
      expect(insights.predictiveInsights).toBeInstanceOf(Array);
      expect(insights.actionableRecommendations).toBeInstanceOf(Array);
      expect(insights.riskAssessment).toHaveProperty('overallRisk');
      expect(insights.performanceSummary).toHaveProperty('companyScore');
    });

    test('should get active alerts with filters', () => {
      const alerts = alertSystem.getActiveAlerts({
        severity: ['high', 'critical'],
        category: ['capacity', 'performance']
      });

      expect(alerts).toBeInstanceOf(Array);
      // All returned alerts should match filters
      alerts.forEach(alert => {
        expect(['high', 'critical']).toContain(alert.severity);
        expect(['capacity', 'performance']).toContain(alert.category);
      });
    });

    test('should acknowledge and resolve alerts', () => {
      // This would require setting up test alerts first
      // For now, test the basic functionality
      const result = alertSystem.acknowledgeAlert('non-existent-id', 'test-user');
      expect(result).toBe(false); // Should return false for non-existent alert
    });
  });

  describe('Integration Tests', () => {
    test('should handle end-to-end analytics workflow', async () => {
      // Simulate a complete analytics workflow
      const teamId = '1';
      
      // 1. Process team data
      const processedTeams = await dataProcessor.processAllTeams();
      expect(processedTeams.length).toBeGreaterThan(0);
      
      // 2. Generate performance metrics
      const performance = await performanceMetrics.calculateTeamPerformance(teamId);
      expect(performance.teamId).toBe(1);
      
      // 3. Run predictive analytics
      const forecast = await predictiveAnalytics.forecastSprintCapacity(teamId);
      expect(forecast.teamId).toBe(1);
      
      // 4. Check for alerts
      const alerts = await alertSystem.runMonitoringCycle();
      expect(alerts).toBeInstanceOf(Array);
      
      // 5. Generate insights
      const insights = await alertSystem.generateInsights(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );
      expect(insights.keyInsights).toBeInstanceOf(Array);
    });

    test('should maintain data consistency across modules', async () => {
      const teamId = '1';
      const processedTeams = await dataProcessor.processAllTeams();
      const teamData = processedTeams.find(t => t.teamId.toString() === teamId);
      
      if (teamData) {
        const performance = await performanceMetrics.calculateTeamPerformance(teamId);
        
        // Data should be consistent between modules
        expect(performance.teamId.toString()).toBe(teamId);
        expect(performance.reportingPeriod.sprintsAnalyzed).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance requirements', async () => {
      const iterations = 10;
      
      // Run multiple iterations to get stable benchmarks
      for (let i = 0; i < iterations; i++) {
        await benchmark.measure('full_analytics_cycle', async () => {
          const teamId = '1';
          await Promise.all([
            performanceMetrics.calculateTeamPerformance(teamId),
            predictiveAnalytics.forecastSprintCapacity(teamId),
            alertSystem.runMonitoringCycle()
          ]);
        });
      }
      
      // Check that operations complete within reasonable time
      const stats = benchmark.getStats('full_analytics_cycle');
      expect(stats).not.toBeNull();
      
      if (stats) {
        // Should complete within 2 seconds on average (as per requirements)
        expect(stats.average).toBeLessThan(2000);
        
        // P95 should be reasonable
        expect(stats.p95).toBeLessThan(3000);
      }
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        benchmark.measure(`concurrent_request_${i}`, () =>
          performanceMetrics.calculateTeamPerformance((i + 1).toString())
        )
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(concurrentRequests);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.teamId).toBeGreaterThan(0);
      });
    });

    test('should cache results effectively', async () => {
      const teamId = '1';
      
      // First call - should be slower (no cache)
      const firstCall = await benchmark.measure('cache_miss', () =>
        performanceMetrics.calculateTeamPerformance(teamId)
      );
      
      // Second call - should be faster (cache hit)
      const secondCall = await benchmark.measure('cache_hit', () =>
        performanceMetrics.calculateTeamPerformance(teamId)
      );
      
      expect(firstCall.teamId).toBe(secondCall.teamId);
      
      // Cache hit should be significantly faster
      const missStats = benchmark.getStats('cache_miss');
      const hitStats = benchmark.getStats('cache_hit');
      
      if (missStats && hitStats) {
        expect(hitStats.average).toBeLessThan(missStats.average * 0.5);
      }
    });
  });
});

// Run benchmarks after all tests
afterAll(() => {
  benchmark.printResults();
});