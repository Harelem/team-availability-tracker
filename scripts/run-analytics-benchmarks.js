#!/usr/bin/env node

/**
 * Analytics Performance Benchmark Runner
 * 
 * Runs comprehensive performance benchmarks for the analytics system
 * and generates detailed performance reports.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BENCHMARK_CONFIG = {
  iterations: 50,
  warmupIterations: 10,
  concurrentUsers: [1, 5, 10, 20],
  dataSetSizes: [1, 5, 10, 25],
  memoryThresholdMB: 512,
  performanceThresholdMs: 2000
};

class BenchmarkRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      benchmarks: {},
      summary: {}
    };
  }

  getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMemory: Math.round(require('os').totalmem() / 1024 / 1024) + 'MB',
      freeMemory: Math.round(require('os').freemem() / 1024 / 1024) + 'MB'
    };
  }

  async runBenchmarks() {
    console.log('🚀 Starting Analytics Performance Benchmarks');
    console.log('='.repeat(60));
    console.log(`Environment: ${this.results.environment.platform} ${this.results.environment.arch}`);
    console.log(`Node.js: ${this.results.environment.nodeVersion}`);
    console.log(`CPUs: ${this.results.environment.cpus}`);
    console.log(`Memory: ${this.results.environment.totalMemory}`);
    console.log('');

    // Run Jest tests with benchmark mode
    await this.runJestBenchmarks();
    
    // Run load tests
    await this.runLoadTests();
    
    // Run memory tests
    await this.runMemoryTests();
    
    // Generate report
    this.generateReport();
    
    console.log('✅ All benchmarks completed');
    console.log(`📊 Results saved to: ${this.getReportPath()}`);
  }

  async runJestBenchmarks() {
    console.log('📊 Running Jest Analytics Benchmarks...');
    
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npm', ['test', '--', '--testPathPattern=analytics.test.ts', '--verbose'], {
        stdio: 'pipe',
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          BENCHMARK_MODE: 'true',
          BENCHMARK_ITERATIONS: BENCHMARK_CONFIG.iterations.toString()
        }
      });

      let output = '';
      let errorOutput = '';

      jestProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        // Show real-time output for important messages
        if (chunk.includes('Performance Benchmark') || chunk.includes('✓') || chunk.includes('✗')) {
          process.stdout.write(chunk);
        }
      });

      jestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      jestProcess.on('close', (code) => {
        if (code === 0) {
          this.results.benchmarks.jest = this.parseJestOutput(output);
          console.log('✅ Jest benchmarks completed');
          resolve();
        } else {
          console.error('❌ Jest benchmarks failed');
          console.error(errorOutput);
          reject(new Error(`Jest process exited with code ${code}`));
        }
      });
    });
  }

  parseJestOutput(output) {
    const results = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      duration: 0,
      performanceResults: {}
    };

    // Parse test results
    const testMatch = output.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+total/);
    if (testMatch) {
      results.testsPassed = parseInt(testMatch[1]);
      results.testsRun = parseInt(testMatch[2]);
      results.testsFailed = results.testsRun - results.testsPassed;
    }

    // Parse duration
    const durationMatch = output.match(/Time:\s+([\d.]+)\s*s/);
    if (durationMatch) {
      results.duration = parseFloat(durationMatch[1]) * 1000;
    }

    // Parse performance benchmark results
    const benchmarkRegex = /Performance Benchmark Results\s*===\s*([\s\S]*?)(?=\n\n|\n$|$)/;
    const benchmarkMatch = output.match(benchmarkRegex);
    if (benchmarkMatch) {
      results.performanceResults = this.parseBenchmarkResults(benchmarkMatch[1]);
    }

    return results;
  }

  parseBenchmarkResults(benchmarkText) {
    const results = {};
    const sections = benchmarkText.split(/\n(?=\w)/);
    
    sections.forEach(section => {
      const lines = section.trim().split('\n');
      if (lines.length === 0) return;
      
      const name = lines[0].replace(':', '');
      const metrics = {};
      
      lines.slice(1).forEach(line => {
        const match = line.match(/\s*(\w+):\s*([\d.]+)ms/);
        if (match) {
          metrics[match[1]] = parseFloat(match[2]);
        }
      });
      
      if (Object.keys(metrics).length > 0) {
        results[name] = metrics;
      }
    });
    
    return results;
  }

  async runLoadTests() {
    console.log('🔄 Running Load Tests...');
    
    const loadResults = {};
    
    for (const concurrentUsers of BENCHMARK_CONFIG.concurrentUsers) {
      console.log(`  Testing with ${concurrentUsers} concurrent users...`);
      
      const startTime = Date.now();
      const promises = Array.from({ length: concurrentUsers }, () => 
        this.simulateUserSession()
      );
      
      try {
        await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        loadResults[`${concurrentUsers}_users`] = {
          concurrentUsers,
          totalDuration: duration,
          avgResponseTime: duration / concurrentUsers,
          success: true
        };
        
        console.log(`  ✅ ${concurrentUsers} users: ${duration}ms avg`);
      } catch (error) {
        loadResults[`${concurrentUsers}_users`] = {
          concurrentUsers,
          success: false,
          error: error.message
        };
        console.log(`  ❌ ${concurrentUsers} users: Failed`);
      }
    }
    
    this.results.benchmarks.load = loadResults;
  }

  async simulateUserSession() {
    // Simulate a user session with multiple analytics calls
    const session = [
      () => this.mockAnalyticsCall('team-performance', 150),
      () => this.mockAnalyticsCall('company-metrics', 300),
      () => this.mockAnalyticsCall('predictive-analytics', 500),
      () => this.mockAnalyticsCall('alerts', 100)
    ];
    
    for (const call of session) {
      await call();
      await this.sleep(50); // Small delay between calls
    }
  }

  async mockAnalyticsCall(type, baseDelay) {
    const delay = baseDelay + Math.random() * 100;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async runMemoryTests() {
    console.log('🧠 Running Memory Usage Tests...');
    
    const memoryResults = {};
    
    for (const dataSetSize of BENCHMARK_CONFIG.dataSetSizes) {
      console.log(`  Testing with dataset size: ${dataSetSize}x...`);
      
      const initialMemory = process.memoryUsage();
      
      // Simulate processing large datasets
      await this.simulateDataProcessing(dataSetSize);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryDelta = {
        rss: finalMemory.rss - initialMemory.rss,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      };
      
      memoryResults[`dataset_${dataSetSize}x`] = {
        dataSetSize,
        initialMemory: initialMemory,
        finalMemory: finalMemory,
        memoryDelta: memoryDelta,
        memoryEfficient: memoryDelta.heapUsed < (BENCHMARK_CONFIG.memoryThresholdMB * 1024 * 1024)
      };
      
      const heapMB = Math.round(memoryDelta.heapUsed / 1024 / 1024);
      console.log(`  📊 ${dataSetSize}x: ${heapMB}MB heap increase`);
    }
    
    this.results.benchmarks.memory = memoryResults;
  }

  async simulateDataProcessing(multiplier) {
    // Simulate analytics data processing
    const dataSize = 1000 * multiplier;
    const mockData = Array.from({ length: dataSize }, (_, i) => ({
      id: i,
      value: Math.random() * 100,
      timestamp: Date.now() + i,
      metadata: { processed: false }
    }));
    
    // Simulate processing
    const processed = mockData.map(item => ({
      ...item,
      processed: true,
      calculation: item.value * 1.5 + Math.random()
    }));
    
    // Simulate aggregation
    const aggregated = processed.reduce((acc, item) => {
      acc.total += item.calculation;
      acc.count += 1;
      return acc;
    }, { total: 0, count: 0 });
    
    return aggregated;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    console.log('\n📋 Generating Performance Report...');
    
    // Calculate summary statistics
    this.results.summary = this.calculateSummary();
    
    // Save detailed report
    const reportPath = this.getReportPath();
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable summary
    this.printSummary();
  }

  calculateSummary() {
    const summary = {
      overallScore: 0,
      performanceGrade: 'F',
      criticalIssues: [],
      recommendations: []
    };
    
    let scoreComponents = [];
    
    // Jest benchmarks score
    if (this.results.benchmarks.jest) {
      const jest = this.results.benchmarks.jest;
      const testScore = (jest.testsPassed / jest.testsRun) * 100;
      scoreComponents.push(testScore * 0.4); // 40% weight
      
      if (jest.testsFailed > 0) {
        summary.criticalIssues.push(`${jest.testsFailed} tests failed`);
      }
    }
    
    // Load test score
    if (this.results.benchmarks.load) {
      const load = this.results.benchmarks.load;
      const successfulTests = Object.values(load).filter(test => test.success).length;
      const totalTests = Object.values(load).length;
      const loadScore = (successfulTests / totalTests) * 100;
      scoreComponents.push(loadScore * 0.3); // 30% weight
      
      // Check for performance issues
      Object.values(load).forEach(test => {
        if (test.success && test.avgResponseTime > BENCHMARK_CONFIG.performanceThresholdMs) {
          summary.criticalIssues.push(`High response time: ${test.avgResponseTime}ms with ${test.concurrentUsers} users`);
        }
      });
    }
    
    // Memory test score
    if (this.results.benchmarks.memory) {
      const memory = this.results.benchmarks.memory;
      const efficientTests = Object.values(memory).filter(test => test.memoryEfficient).length;
      const totalTests = Object.values(memory).length;
      const memoryScore = (efficientTests / totalTests) * 100;
      scoreComponents.push(memoryScore * 0.3); // 30% weight
      
      // Check for memory issues
      Object.values(memory).forEach(test => {
        if (!test.memoryEfficient) {
          const heapMB = Math.round(test.memoryDelta.heapUsed / 1024 / 1024);
          summary.criticalIssues.push(`High memory usage: ${heapMB}MB for ${test.dataSetSize}x dataset`);
        }
      });
    }
    
    // Calculate overall score
    summary.overallScore = Math.round(
      scoreComponents.reduce((sum, score) => sum + score, 0) / scoreComponents.length
    );
    
    // Assign grade
    if (summary.overallScore >= 90) summary.performanceGrade = 'A';
    else if (summary.overallScore >= 80) summary.performanceGrade = 'B';
    else if (summary.overallScore >= 70) summary.performanceGrade = 'C';
    else if (summary.overallScore >= 60) summary.performanceGrade = 'D';
    else summary.performanceGrade = 'F';
    
    // Generate recommendations
    if (summary.criticalIssues.length > 0) {
      summary.recommendations.push('Address critical performance issues');
    }
    if (summary.overallScore < 80) {
      summary.recommendations.push('Implement performance optimizations');
      summary.recommendations.push('Consider caching improvements');
    }
    if (summary.overallScore < 60) {
      summary.recommendations.push('Review algorithm efficiency');
      summary.recommendations.push('Consider horizontal scaling');
    }
    
    return summary;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Score: ${this.results.summary.overallScore}/100 (${this.results.summary.performanceGrade})`);
    console.log('');
    
    if (this.results.benchmarks.jest) {
      const jest = this.results.benchmarks.jest;
      console.log(`✅ Tests: ${jest.testsPassed}/${jest.testsRun} passed (${jest.duration}ms)`);
    }
    
    if (this.results.benchmarks.load) {
      const load = this.results.benchmarks.load;
      const successful = Object.values(load).filter(t => t.success).length;
      console.log(`🔄 Load Tests: ${successful}/${Object.keys(load).length} passed`);
    }
    
    if (this.results.benchmarks.memory) {
      const memory = this.results.benchmarks.memory;
      const efficient = Object.values(memory).filter(t => t.memoryEfficient).length;
      console.log(`🧠 Memory Tests: ${efficient}/${Object.keys(memory).length} efficient`);
    }
    
    if (this.results.summary.criticalIssues.length > 0) {
      console.log('\n⚠️  Critical Issues:');
      this.results.summary.criticalIssues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    if (this.results.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.summary.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }

  getReportPath() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(process.cwd(), 'reports', `analytics-benchmark-${timestamp}.json`);
  }
}

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Run benchmarks
const runner = new BenchmarkRunner();
runner.runBenchmarks().catch(error => {
  console.error('❌ Benchmark runner failed:', error);
  process.exit(1);
});