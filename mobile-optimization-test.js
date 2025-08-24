/**
 * Mobile Optimization Testing Script
 * Tests all mobile interface improvements and functionality
 * Run this in browser console on mobile devices or mobile emulation
 */

console.log('🔍 Starting Mobile Optimization Test Suite...');

class MobileOptimizationTester {
  constructor() {
    this.testResults = {
      touchTargets: [],
      navigation: [],
      scrolling: [],
      viewMode: [],
      zIndex: [],
      dateCell: [],
      overall: []
    };
    this.isMobile = window.innerWidth <= 768;
    console.log(`📱 Device Type: ${this.isMobile ? 'Mobile' : 'Desktop'} (${window.innerWidth}px width)`);
  }

  // Test 1: Touch Target Sizes (48x48px minimum)
  testTouchTargets() {
    console.log('🎯 Testing Touch Target Sizes...');
    
    const touchElements = document.querySelectorAll(`
      button, 
      a, 
      [role="button"], 
      [aria-label*="Previous"], 
      [aria-label*="Next"], 
      [aria-label*="Current"],
      .mobile-nav-button,
      .hamburger-button
    `);

    let passed = 0;
    let failed = 0;

    touchElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const minSize = 48;
      const isValidSize = rect.width >= minSize && rect.height >= minSize;
      
      if (isValidSize) {
        passed++;
      } else {
        failed++;
        console.warn(`❌ Touch target too small:`, {
          element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          minRequired: minSize,
          ariaLabel: element.getAttribute('aria-label')
        });
      }
    });

    this.testResults.touchTargets = {
      passed,
      failed,
      total: touchElements.length,
      percentage: Math.round((passed / touchElements.length) * 100)
    };

    console.log(`✅ Touch Targets: ${passed}/${touchElements.length} (${this.testResults.touchTargets.percentage}%) meet 48x48px standard`);
  }

  // Test 2: Sprint Navigation Responsiveness
  testSprintNavigation() {
    console.log('🧭 Testing Sprint Navigation...');
    
    const navButtons = document.querySelectorAll(`
      [aria-label*="Previous"], 
      [aria-label*="Next"], 
      [aria-label*="Current"],
      [aria-label*="Sprint"]
    `);

    let responsiveButtons = 0;
    let unresponsiveButtons = 0;

    navButtons.forEach(button => {
      const hasProperTouch = button.style.touchAction === 'manipulation' || 
                            button.classList.contains('touch-manipulation');
      const hasMinSize = button.getBoundingClientRect().height >= 48;
      const hasActiveState = window.getComputedStyle(button, ':active').transform !== 'none' ||
                            button.classList.contains('active:scale-95');
      
      if (hasProperTouch && hasMinSize && hasActiveState) {
        responsiveButtons++;
      } else {
        unresponsiveButtons++;
        console.warn('❌ Navigation button not fully optimized:', {
          element: button.getAttribute('aria-label'),
          touchAction: hasProperTouch,
          minSize: hasMinSize,
          activeState: hasActiveState
        });
      }
    });

    this.testResults.navigation = {
      responsive: responsiveButtons,
      unresponsive: unresponsiveButtons,
      total: navButtons.length
    };

    console.log(`✅ Navigation: ${responsiveButtons}/${navButtons.length} buttons are fully optimized`);
  }

  // Test 3: Horizontal Scrolling Prevention
  testHorizontalScrolling() {
    console.log('📏 Testing Horizontal Scrolling...');
    
    const body = document.body;
    const html = document.documentElement;
    const hasHorizontalOverflow = body.scrollWidth > window.innerWidth || 
                                 html.scrollWidth > window.innerWidth;

    // Check for problematic elements
    const wideElements = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width > window.innerWidth + 10) { // 10px tolerance
        wideElements.push({
          tag: element.tagName,
          class: element.className,
          width: Math.round(rect.width),
          viewport: window.innerWidth
        });
      }
    });

    this.testResults.scrolling = {
      hasHorizontalScroll: hasHorizontalOverflow,
      wideElementCount: wideElements.length,
      wideElements: wideElements.slice(0, 5) // Show only first 5
    };

    if (hasHorizontalOverflow || wideElements.length > 0) {
      console.warn('❌ Horizontal scrolling issues detected:', this.testResults.scrolling);
    } else {
      console.log('✅ No horizontal scrolling detected');
    }
  }

  // Test 4: View Mode Switching
  testViewModeSwitching() {
    console.log('🔄 Testing View Mode Switching...');
    
    const viewModeButtons = document.querySelectorAll(`
      [aria-label*="Sprint view"],
      [aria-label*="Week view"],
      .view-mode-button
    `);

    let optimizedSwitchers = 0;
    
    viewModeButtons.forEach(button => {
      const hasLoadingState = button.querySelector('.animate-spin') !== null ||
                             button.classList.contains('loading');
      const hasProperAria = button.getAttribute('aria-pressed') !== null;
      const hasDisabledState = button.hasAttribute('disabled') || 
                              button.classList.contains('opacity-50');
      
      if (hasProperAria) optimizedSwitchers++;
      
      console.log(`View mode button: ${button.textContent?.trim()}`, {
        ariaPressed: hasProperAria,
        hasLoadingState,
        canBeDisabled: hasDisabledState
      });
    });

    this.testResults.viewMode = {
      optimized: optimizedSwitchers,
      total: viewModeButtons.length
    };

    console.log(`✅ View Mode: ${optimizedSwitchers}/${viewModeButtons.length} buttons have proper ARIA states`);
  }

  // Test 5: Z-Index Management
  testZIndexManagement() {
    console.log('📚 Testing Z-Index Management...');
    
    const stickyElements = document.querySelectorAll(`
      .sticky,
      .fixed,
      [class*="z-"],
      .mobile-header,
      .compact-header,
      .emergency-mobile-menu
    `);

    const zIndexIssues = [];
    const zIndexValues = [];

    stickyElements.forEach(element => {
      const zIndex = window.getComputedStyle(element).zIndex;
      const className = element.className;
      
      if (zIndex !== 'auto') {
        zIndexValues.push({
          element: element.tagName + (className ? `.${className.split(' ')[0]}` : ''),
          zIndex: parseInt(zIndex),
          position: window.getComputedStyle(element).position
        });
      }
    });

    // Sort by z-index to check for conflicts
    zIndexValues.sort((a, b) => b.zIndex - a.zIndex);
    
    // Check for potential conflicts (same z-index values)
    const zIndexGroups = {};
    zIndexValues.forEach(item => {
      if (!zIndexGroups[item.zIndex]) {
        zIndexGroups[item.zIndex] = [];
      }
      zIndexGroups[item.zIndex].push(item.element);
    });

    Object.entries(zIndexGroups).forEach(([zIndex, elements]) => {
      if (elements.length > 1) {
        zIndexIssues.push({
          zIndex: parseInt(zIndex),
          conflictingElements: elements
        });
      }
    });

    this.testResults.zIndex = {
      totalElements: zIndexValues.length,
      conflicts: zIndexIssues.length,
      hierarchy: zIndexValues.slice(0, 10) // Top 10 z-index values
    };

    if (zIndexIssues.length > 0) {
      console.warn('⚠️ Z-Index conflicts detected:', zIndexIssues);
    } else {
      console.log('✅ Z-Index hierarchy looks good');
    }
    
    console.log('Z-Index hierarchy (top 5):', zIndexValues.slice(0, 5));
  }

  // Test 6: Date Cell Touch Accuracy
  testDateCellAccuracy() {
    console.log('📅 Testing Date Cell Touch Accuracy...');
    
    const dateCells = document.querySelectorAll(`
      .date-cell,
      .day-cell,
      .schedule-day,
      .status-button,
      .work-option-button,
      [class*="day-action-button"]
    `);

    let accurateCells = 0;
    let inadequateCells = 0;

    dateCells.forEach(cell => {
      const rect = cell.getBoundingClientRect();
      const minTouchTarget = 60; // Larger than standard for date cells
      const isAccurate = rect.width >= minTouchTarget && rect.height >= minTouchTarget;
      
      if (isAccurate) {
        accurateCells++;
      } else {
        inadequateCells++;
      }
    });

    this.testResults.dateCell = {
      accurate: accurateCells,
      inadequate: inadequateCells,
      total: dateCells.length,
      percentage: dateCells.length > 0 ? Math.round((accurateCells / dateCells.length) * 100) : 100
    };

    console.log(`✅ Date Cells: ${accurateCells}/${dateCells.length} (${this.testResults.dateCell.percentage}%) meet enhanced touch standards`);
  }

  // Test 7: Mobile-Specific Features
  testMobileFeatures() {
    console.log('📱 Testing Mobile-Specific Features...');
    
    const mobileFeatures = {
      emergencyMenu: document.querySelector('.emergency-mobile-menu') !== null,
      mobileCards: document.querySelector('.mobile-schedule-card') !== null,
      touchManipulation: document.querySelectorAll('[style*="touch-action: manipulation"]').length > 0,
      hapticFeedback: typeof navigator.vibrate === 'function',
      pullToRefresh: document.querySelector('[class*="pull"]') !== null
    };

    const activeFeatures = Object.values(mobileFeatures).filter(Boolean).length;
    const totalFeatures = Object.keys(mobileFeatures).length;

    this.testResults.mobileFeatures = {
      ...mobileFeatures,
      activeCount: activeFeatures,
      totalCount: totalFeatures,
      percentage: Math.round((activeFeatures / totalFeatures) * 100)
    };

    console.log('📱 Mobile Features Status:', mobileFeatures);
    console.log(`✅ Mobile Features: ${activeFeatures}/${totalFeatures} (${this.testResults.mobileFeatures.percentage}%) active`);
  }

  // Run All Tests
  runAllTests() {
    console.log('🚀 Running Complete Mobile Optimization Test Suite...\n');
    
    this.testTouchTargets();
    this.testSprintNavigation();
    this.testHorizontalScrolling();
    this.testViewModeSwitching();
    this.testZIndexManagement();
    this.testDateCellAccuracy();
    this.testMobileFeatures();
    
    this.generateSummaryReport();
  }

  // Generate Summary Report
  generateSummaryReport() {
    console.log('\n📊 MOBILE OPTIMIZATION TEST SUMMARY');
    console.log('=====================================');
    
    const summary = {
      touchTargets: this.testResults.touchTargets.percentage >= 90,
      navigation: this.testResults.navigation.responsive >= this.testResults.navigation.total * 0.9,
      scrolling: !this.testResults.scrolling.hasHorizontalScroll && this.testResults.scrolling.wideElementCount === 0,
      viewMode: this.testResults.viewMode.optimized >= this.testResults.viewMode.total * 0.8,
      zIndex: this.testResults.zIndex.conflicts === 0,
      dateCell: this.testResults.dateCell.percentage >= 85,
      mobileFeatures: this.testResults.mobileFeatures.percentage >= 70
    };

    const passedTests = Object.values(summary).filter(Boolean).length;
    const totalTests = Object.keys(summary).length;
    const overallScore = Math.round((passedTests / totalTests) * 100);

    console.log(`Overall Score: ${overallScore}% (${passedTests}/${totalTests} categories passed)`);
    console.log('\nDetailed Results:');
    console.log(`✅ Touch Targets: ${this.testResults.touchTargets.percentage}% meet accessibility standards`);
    console.log(`${summary.navigation ? '✅' : '❌'} Navigation: ${this.testResults.navigation.responsive}/${this.testResults.navigation.total} buttons optimized`);
    console.log(`${summary.scrolling ? '✅' : '❌'} Scrolling: ${this.testResults.scrolling.hasHorizontalScroll ? 'Issues detected' : 'No horizontal scrolling'}`);
    console.log(`${summary.viewMode ? '✅' : '❌'} View Mode: ${this.testResults.viewMode.optimized}/${this.testResults.viewMode.total} switchers optimized`);
    console.log(`${summary.zIndex ? '✅' : '❌'} Z-Index: ${this.testResults.zIndex.conflicts} conflicts found`);
    console.log(`${summary.dateCell ? '✅' : '❌'} Date Cells: ${this.testResults.dateCell.percentage}% meet enhanced standards`);
    console.log(`${summary.mobileFeatures ? '✅' : '❌'} Mobile Features: ${this.testResults.mobileFeatures.percentage}% active`);
    
    if (overallScore >= 85) {
      console.log('\n🎉 EXCELLENT! Mobile optimization is highly effective.');
    } else if (overallScore >= 70) {
      console.log('\n👍 GOOD! Mobile optimization is working well with minor improvements needed.');
    } else {
      console.log('\n⚠️ NEEDS WORK! Several mobile optimization issues need attention.');
    }

    console.log('\n💡 Test completed! Check console warnings above for specific issues to fix.');
    console.log('📝 Run this test again after making improvements to track progress.');
    
    return {
      overallScore,
      passedTests,
      totalTests,
      details: this.testResults,
      recommendations: this.generateRecommendations(summary)
    };
  }

  generateRecommendations(summary) {
    const recommendations = [];

    if (!summary.touchTargets) {
      recommendations.push('Increase touch target sizes to minimum 48x48px for better accessibility');
    }
    if (!summary.navigation) {
      recommendations.push('Add proper touch-action: manipulation and active states to navigation buttons');
    }
    if (!summary.scrolling) {
      recommendations.push('Fix horizontal scrolling by constraining element widths and using proper responsive design');
    }
    if (!summary.viewMode) {
      recommendations.push('Add proper ARIA states and loading indicators to view mode switchers');
    }
    if (!summary.zIndex) {
      recommendations.push('Resolve z-index conflicts to prevent interface overlapping issues');
    }
    if (!summary.dateCell) {
      recommendations.push('Increase date cell sizes to at least 60x60px for better finger tap accuracy');
    }
    if (!summary.mobileFeatures) {
      recommendations.push('Implement more mobile-specific features like haptic feedback and touch gestures');
    }

    return recommendations;
  }
}

// Auto-run the tests when script is loaded
if (typeof window !== 'undefined') {
  const tester = new MobileOptimizationTester();
  window.mobileOptimizationTest = () => tester.runAllTests();
  
  console.log('📱 Mobile Optimization Tester loaded!');
  console.log('💡 Run window.mobileOptimizationTest() to test all mobile optimizations');
  console.log('🔍 Or run individual tests: tester.testTouchTargets(), tester.testSprintNavigation(), etc.');
  
  // Auto-run if on mobile
  if (tester.isMobile) {
    console.log('📱 Mobile device detected - running tests automatically...');
    setTimeout(() => tester.runAllTests(), 1000);
  }
}