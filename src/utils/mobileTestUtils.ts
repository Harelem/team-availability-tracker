/**
 * Mobile Testing and Validation Utilities
 * 
 * Provides comprehensive testing tools for mobile experience validation
 */

// Touch target validation
export interface TouchTargetTest {
  element: HTMLElement;
  width: number;
  height: number;
  meetsMinimum: boolean;
  isComfortable: boolean;
  issues: string[];
}

// Performance test results
export interface MobilePerformanceTest {
  loadTime: number;
  interactionDelay: number;
  bundleSize: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  recommendations: string[];
}

// Screen size test configuration
export interface ScreenSizeConfig {
  name: string;
  width: number;
  height: number;
  devicePixelRatio: number;
  userAgent: string;
}

export const MOBILE_TEST_DEVICES: ScreenSizeConfig[] = [
  // iPhone devices
  {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    devicePixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPhone 12',
    width: 390,
    height: 844,
    devicePixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPhone 12 Pro Max',
    width: 428,
    height: 926,
    devicePixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  // Android devices
  {
    name: 'Galaxy S21',
    width: 360,
    height: 800,
    devicePixelRatio: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
  },
  {
    name: 'Pixel 5',
    width: 393,
    height: 851,
    devicePixelRatio: 2.75,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36'
  },
  // Tablet devices
  {
    name: 'iPad',
    width: 768,
    height: 1024,
    devicePixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPad Pro',
    width: 834,
    height: 1194,
    devicePixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  }
];

export class MobileTester {
  private results: Map<string, any> = new Map();

  /**
   * Test all touch targets on the page
   */
  async testTouchTargets(): Promise<TouchTargetTest[]> {
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
    );

    const tests: TouchTargetTest[] = [];

    interactiveElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const computedStyle = getComputedStyle(element as HTMLElement);
      
      // Get actual touch target size (including padding)
      const paddingTop = parseInt(computedStyle.paddingTop) || 0;
      const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
      const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
      const paddingRight = parseInt(computedStyle.paddingRight) || 0;
      
      const touchWidth = rect.width + paddingLeft + paddingRight;
      const touchHeight = rect.height + paddingTop + paddingBottom;
      
      const issues: string[] = [];
      
      if (touchWidth < 44) issues.push(`Width ${touchWidth}px is below 44px minimum`);
      if (touchHeight < 44) issues.push(`Height ${touchHeight}px is below 44px minimum`);
      
      tests.push({
        element: element as HTMLElement,
        width: touchWidth,
        height: touchHeight,
        meetsMinimum: touchWidth >= 44 && touchHeight >= 44,
        isComfortable: touchWidth >= 48 && touchHeight >= 48,
        issues
      });
    });

    this.results.set('touchTargets', tests);
    return tests;
  }

  /**
   * Test mobile performance metrics
   */
  async testPerformance(): Promise<MobilePerformanceTest> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const loadTime = navigation.loadEventEnd - navigation.fetchStart;
    
    // Measure interaction delay
    const interactionStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, 0));
    const interactionDelay = performance.now() - interactionStart;

    // Estimate bundle size (simplified)
    const bundleSize = this.estimateBundleSize();

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (loadTime > 3000) {
      issues.push('Load time exceeds 3 seconds');
      recommendations.push('Optimize bundle size and implement code splitting');
    }

    if (interactionDelay > 100) {
      issues.push('Interaction delay is too high');
      recommendations.push('Reduce JavaScript execution time');
    }

    if (bundleSize > 250) {
      issues.push('Bundle size is large');
      recommendations.push('Implement tree shaking and lazy loading');
    }

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (issues.length >= 3) grade = 'F';
    else if (issues.length >= 2) grade = 'D';
    else if (issues.length >= 1) grade = 'C';
    else if (loadTime > 1500) grade = 'B';

    const result: MobilePerformanceTest = {
      loadTime,
      interactionDelay,
      bundleSize,
      grade,
      issues,
      recommendations
    };

    this.results.set('performance', result);
    return result;
  }

  /**
   * Test responsive design across different screen sizes
   */
  async testScreenSizes(): Promise<Map<string, any>> {
    const results = new Map();

    for (const device of MOBILE_TEST_DEVICES) {
      // Simulate viewport change
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const originalContent = viewportMeta?.getAttribute('content');

      // Test at device dimensions
      Object.defineProperty(window, 'innerWidth', { value: device.width, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: device.height, configurable: true });

      // Dispatch resize event
      window.dispatchEvent(new Event('resize'));

      // Wait for layout to update
      await new Promise(resolve => requestAnimationFrame(resolve));

      const testResult = {
        device: device.name,
        hasOverflow: this.checkForHorizontalOverflow(),
        hasScrollIssues: this.checkScrollPerformance(),
        touchTargetsValid: await this.quickTouchTargetCheck(),
        readabilityScore: this.calculateReadabilityScore()
      };

      results.set(device.name, testResult);
    }

    this.results.set('screenSizes', results);
    return results;
  }

  /**
   * Run comprehensive mobile test suite
   */
  async runFullSuite(): Promise<Map<string, any>> {
    console.group('📱 Running Mobile Test Suite');

    try {
      console.log('Testing touch targets...');
      await this.testTouchTargets();

      console.log('Testing performance...');
      await this.testPerformance();

      console.log('Testing screen sizes...');
      await this.testScreenSizes();

      console.log('✅ All tests completed');
      return this.results;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const touchTargets = this.results.get('touchTargets') || [];
    const performance = this.results.get('performance');
    const screenSizes = this.results.get('screenSizes') || new Map();

    const failedTargets = touchTargets.filter((t: TouchTargetTest) => !t.meetsMinimum);
    
    let report = '📱 Mobile Experience Test Report\n';
    report += '=====================================\n\n';
    
    // Touch targets section
    report += '🎯 Touch Targets:\n';
    report += `- Total tested: ${touchTargets.length}\n`;
    report += `- Passed minimum (44px): ${touchTargets.length - failedTargets.length}\n`;
    report += `- Failed: ${failedTargets.length}\n`;
    if (failedTargets.length > 0) {
      report += '- Issues:\n';
      failedTargets.forEach((target: TouchTargetTest) => {
        report += `  • ${target.issues.join(', ')}\n`;
      });
    }
    report += '\n';

    // Performance section
    if (performance) {
      report += '⚡ Performance:\n';
      report += `- Grade: ${performance.grade}\n`;
      report += `- Load Time: ${performance.loadTime}ms\n`;
      report += `- Bundle Size: ${performance.bundleSize}KB\n`;
      if (performance.issues.length > 0) {
        report += '- Issues:\n';
        performance.issues.forEach((issue: string) => {
          report += `  • ${issue}\n`;
        });
        report += '- Recommendations:\n';
        performance.recommendations.forEach((rec: string) => {
          report += `  • ${rec}\n`;
        });
      }
      report += '\n';
    }

    // Screen sizes section
    report += '📱 Screen Size Compatibility:\n';
    screenSizes.forEach((result: any, device: string) => {
      const status = result.hasOverflow || result.hasScrollIssues || !result.touchTargetsValid ? '❌' : '✅';
      report += `${status} ${device}: `;
      const issues = [];
      if (result.hasOverflow) issues.push('overflow');
      if (result.hasScrollIssues) issues.push('scroll issues');
      if (!result.touchTargetsValid) issues.push('touch target issues');
      report += issues.length > 0 ? issues.join(', ') : 'All good';
      report += '\n';
    });

    return report;
  }

  // Private helper methods
  private estimateBundleSize(): number {
    // Simplified estimation based on script tags
    const scripts = document.querySelectorAll('script[src]');
    return scripts.length * 50; // Rough estimate
  }

  private checkForHorizontalOverflow(): boolean {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  }

  private checkScrollPerformance(): boolean {
    // Check if smooth scrolling is supported
    return !('scrollBehavior' in document.documentElement.style);
  }

  private async quickTouchTargetCheck(): Promise<boolean> {
    const targets = await this.testTouchTargets();
    return targets.every(t => t.meetsMinimum);
  }

  private calculateReadabilityScore(): number {
    // Simple readability check based on font sizes
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    let smallTextCount = 0;
    
    textElements.forEach(element => {
      const fontSize = parseInt(getComputedStyle(element).fontSize);
      if (fontSize < 14) smallTextCount++;
    });

    return Math.max(0, 100 - (smallTextCount / textElements.length) * 100);
  }
}

// Utility functions for manual testing
export const MobileTestUtils = {
  // Test if element meets touch target requirements
  testElement: (element: HTMLElement): TouchTargetTest => {
    const rect = element.getBoundingClientRect();
    const issues: string[] = [];
    
    if (rect.width < 44) issues.push(`Width ${rect.width}px is below 44px minimum`);
    if (rect.height < 44) issues.push(`Height ${rect.height}px is below 44px minimum`);
    
    return {
      element,
      width: rect.width,
      height: rect.height,
      meetsMinimum: rect.width >= 44 && rect.height >= 44,
      isComfortable: rect.width >= 48 && rect.height >= 48,
      issues
    };
  },

  // Highlight problematic touch targets on the page
  highlightTouchTargetIssues: () => {
    const style = document.createElement('style');
    style.textContent = `
      .touch-target-issue {
        outline: 2px solid red !important;
        background-color: rgba(255, 0, 0, 0.1) !important;
      }
      .touch-target-issue::after {
        content: 'Touch target too small';
        position: absolute;
        background: red;
        color: white;
        padding: 2px 4px;
        font-size: 10px;
        z-index: 9999;
      }
    `;
    document.head.appendChild(style);

    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"]'
    );

    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        element.classList.add('touch-target-issue');
      }
    });

    console.log('🎯 Touch target issues highlighted in red');
  },

  // Log performance metrics to console
  logPerformanceMetrics: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      console.group('📊 Mobile Performance Metrics');
      console.log('Load Time:', Math.round(nav.loadEventEnd - nav.fetchStart) + 'ms');
      console.log('DOM Content Loaded:', Math.round(nav.domContentLoadedEventEnd - nav.fetchStart) + 'ms');
      
      const fcp = paint.find(p => p.name === 'first-contentful-paint');
      if (fcp) console.log('First Contentful Paint:', Math.round(fcp.startTime) + 'ms');

      if ('memory' in performance) {
        const mem = (performance as any).memory;
        console.log('Memory Usage:', Math.round(mem.usedJSHeapSize / 1024 / 1024) + 'MB');
      }
      console.groupEnd();
    }
  }
};

export default MobileTester;