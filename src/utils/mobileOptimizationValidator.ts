/**
 * Mobile Optimization Validator
 * 
 * This utility helps validate that mobile optimizations are working correctly
 * across different screen sizes and touch interactions.
 */

export interface TouchTargetValidationResult {
  element: HTMLElement;
  isValid: boolean;
  actualSize: { width: number; height: number };
  issues: string[];
}

export interface MobileOptimizationReport {
  touchTargets: TouchTargetValidationResult[];
  viewportHandling: {
    hasViewportMeta: boolean;
    viewportContent: string | null;
    issues: string[];
  };
  touchInteractions: {
    hasTouchManipulation: number;
    totalInteractiveElements: number;
    issues: string[];
  };
  responsiveBreakpoints: {
    testedBreakpoints: number[];
    workingBreakpoints: number[];
    issues: string[];
  };
  overallScore: number;
  recommendations: string[];
}

/**
 * Validates that interactive elements meet minimum touch target requirements
 */
export function validateTouchTargets(): TouchTargetValidationResult[] {
  const results: TouchTargetValidationResult[] = [];
  
  // Find all interactive elements
  const interactiveSelectors = [
    'button',
    'a[href]',
    '[role="button"]',
    '[onclick]',
    'input[type="button"]',
    'input[type="submit"]',
    '[tabindex]:not([tabindex="-1"])'
  ];
  
  const elements = document.querySelectorAll<HTMLElement>(
    interactiveSelectors.join(', ')
  );
  
  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    // Get minimum dimensions including padding and border
    const minWidth = parseFloat(computedStyle.minWidth) || rect.width;
    const minHeight = parseFloat(computedStyle.minHeight) || rect.height;
    
    const issues: string[] = [];
    const minTouchTarget = 44; // iOS/Android minimum
    
    if (minWidth < minTouchTarget) {
      issues.push(`Width ${Math.round(minWidth)}px is below ${minTouchTarget}px minimum`);
    }
    
    if (minHeight < minTouchTarget) {
      issues.push(`Height ${Math.round(minHeight)}px is below ${minTouchTarget}px minimum`);
    }
    
    // Check for touch-manipulation
    const touchAction = computedStyle.touchAction;
    if (touchAction !== 'manipulation' && !touchAction.includes('manipulation')) {
      issues.push('Missing touch-manipulation for better touch response');
    }
    
    results.push({
      element,
      isValid: issues.length === 0,
      actualSize: { width: minWidth, height: minHeight },
      issues
    });
  });
  
  return results;
}

/**
 * Validates viewport configuration for mobile devices
 */
export function validateViewportHandling(): MobileOptimizationReport['viewportHandling'] {
  const issues: string[] = [];
  const viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  
  if (!viewportMeta) {
    issues.push('Missing viewport meta tag');
    return {
      hasViewportMeta: false,
      viewportContent: null,
      issues
    };
  }
  
  const content = viewportMeta.content;
  const requiredSettings = ['width=device-width', 'initial-scale=1'];
  
  requiredSettings.forEach(setting => {
    if (!content.includes(setting)) {
      issues.push(`Viewport missing required setting: ${setting}`);
    }
  });
  
  // Check for problematic settings
  if (content.includes('user-scalable=no')) {
    issues.push('Consider allowing user scaling for accessibility');
  }
  
  return {
    hasViewportMeta: true,
    viewportContent: content,
    issues
  };
}

/**
 * Validates touch interaction optimizations
 */
export function validateTouchInteractions(): MobileOptimizationReport['touchInteractions'] {
  const issues: string[] = [];
  const interactiveElements = document.querySelectorAll(
    'button, a[href], [role="button"], [onclick], input[type="button"], input[type="submit"]'
  );
  
  let touchManipulationCount = 0;
  
  interactiveElements.forEach(element => {
    const style = window.getComputedStyle(element);
    if (style.touchAction === 'manipulation' || style.touchAction.includes('manipulation')) {
      touchManipulationCount++;
    }
  });
  
  const percentage = (touchManipulationCount / interactiveElements.length) * 100;
  
  if (percentage < 80) {
    issues.push(`Only ${Math.round(percentage)}% of interactive elements have touch-manipulation`);
  }
  
  return {
    hasTouchManipulation: touchManipulationCount,
    totalInteractiveElements: interactiveElements.length,
    issues
  };
}

/**
 * Tests responsive breakpoints
 */
export function validateResponsiveBreakpoints(): MobileOptimizationReport['responsiveBreakpoints'] {
  const issues: string[] = [];
  const testBreakpoints = [320, 375, 414, 768, 1024, 1200]; // Common mobile/tablet/desktop sizes
  const workingBreakpoints: number[] = [];
  
  // This is a simplified test - in a real scenario you'd test layout changes
  testBreakpoints.forEach(width => {
    // Check if CSS media queries exist for this breakpoint
    const hasMediaQuery = Array.from(document.styleSheets).some(sheet => {
      try {
        return Array.from(sheet.cssRules || []).some(rule => {
          if (rule.type === CSSRule.MEDIA_RULE) {
            const mediaRule = rule as CSSMediaRule;
            return mediaRule.conditionText.includes(`${width}px`) ||
                   mediaRule.conditionText.includes(`${width / 16}rem`);
          }
          return false;
        });
      } catch (e) {
        // Cross-origin stylesheets may throw errors
        return false;
      }
    });
    
    if (hasMediaQuery) {
      workingBreakpoints.push(width);
    }
  });
  
  if (workingBreakpoints.length < 3) {
    issues.push('Insufficient responsive breakpoints detected');
  }
  
  return {
    testedBreakpoints: testBreakpoints,
    workingBreakpoints,
    issues
  };
}

/**
 * Generates a comprehensive mobile optimization report
 */
export function generateMobileOptimizationReport(): MobileOptimizationReport {
  console.log('🔍 Generating Mobile Optimization Report...');
  
  const touchTargets = validateTouchTargets();
  const viewportHandling = validateViewportHandling();
  const touchInteractions = validateTouchInteractions();
  const responsiveBreakpoints = validateResponsiveBreakpoints();
  
  // Calculate overall score (0-100)
  const touchTargetScore = (touchTargets.filter(t => t.isValid).length / touchTargets.length) * 25;
  const viewportScore = viewportHandling.issues.length === 0 ? 25 : 15;
  const touchScore = (touchInteractions.hasTouchManipulation / touchInteractions.totalInteractiveElements) * 25;
  const responsiveScore = (responsiveBreakpoints.workingBreakpoints.length / responsiveBreakpoints.testedBreakpoints.length) * 25;
  
  const overallScore = Math.round(touchTargetScore + viewportScore + touchScore + responsiveScore);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (touchTargetScore < 20) {
    recommendations.push('Add min-h-[44px] min-w-[44px] to interactive elements');
  }
  
  if (viewportHandling.issues.length > 0) {
    recommendations.push('Fix viewport meta tag configuration');
  }
  
  if (touchScore < 20) {
    recommendations.push('Add touch-manipulation to interactive elements');
  }
  
  if (responsiveScore < 15) {
    recommendations.push('Implement more responsive breakpoints');
  }
  
  if (overallScore > 80) {
    recommendations.push('Excellent mobile optimization! Consider testing on real devices.');
  } else if (overallScore > 60) {
    recommendations.push('Good mobile optimization with room for improvement.');
  } else {
    recommendations.push('Significant mobile optimization needed.');
  }
  
  const report: MobileOptimizationReport = {
    touchTargets,
    viewportHandling,
    touchInteractions,
    responsiveBreakpoints,
    overallScore,
    recommendations
  };
  
  console.log('📊 Mobile Optimization Report Generated:', {
    score: overallScore,
    touchTargets: touchTargets.length,
    validTouchTargets: touchTargets.filter(t => t.isValid).length,
    touchInteractionCoverage: `${Math.round((touchInteractions.hasTouchManipulation / touchInteractions.totalInteractiveElements) * 100)}%`
  });
  
  return report;
}

/**
 * Displays the mobile optimization report in the console with formatting
 */
export function displayMobileOptimizationReport(report: MobileOptimizationReport): void {
  console.group('📱 Mobile Optimization Report');
  
  console.log(`🎯 Overall Score: ${report.overallScore}/100`);
  
  console.group('👆 Touch Targets');
  const validTargets = report.touchTargets.filter(t => t.isValid).length;
  console.log(`✅ Valid: ${validTargets}/${report.touchTargets.length}`);
  
  report.touchTargets
    .filter(t => !t.isValid)
    .slice(0, 5) // Show first 5 issues
    .forEach(target => {
      console.warn(`❌ ${target.element.tagName.toLowerCase()}:`, target.issues.join(', '));
    });
  console.groupEnd();
  
  console.group('📱 Viewport & Touch');
  console.log(`Viewport: ${report.viewportHandling.hasViewportMeta ? '✅' : '❌'}`);
  console.log(`Touch Coverage: ${Math.round((report.touchInteractions.hasTouchManipulation / report.touchInteractions.totalInteractiveElements) * 100)}%`);
  console.groupEnd();
  
  console.group('💡 Recommendations');
  report.recommendations.forEach(rec => console.log(`• ${rec}`));
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Quick mobile optimization test that can be run in browser console
 */
export function quickMobileTest(): MobileOptimizationReport {
  const report = generateMobileOptimizationReport();
  displayMobileOptimizationReport(report);
  
  // Also return the report for programmatic use
  return report;
}

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).quickMobileTest = quickMobileTest;
  (window as any).mobileOptimizationReport = generateMobileOptimizationReport;
}