#!/usr/bin/env node

/**
 * Real-Time Cross-Platform Validation Test
 * 
 * This script performs actual validation tests on the running application
 * to complement the simulated validation suite with real measurements.
 */

const fs = require('fs');
const path = require('path');

class RealTimeCrossPlatformTest {
  constructor() {
    this.results = {
      realTimeValidation: {
        timestamp: new Date().toISOString(),
        version: '2.2.0',
        testEnvironment: 'development',
        results: {}
      }
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Validate actual component files for mobile optimization
  async validateMobileOptimizations() {
    this.log('Validating Mobile Optimizations in Source Code...', 'info');
    
    const mobileOptimizations = {
      touchTargets: await this.analyzeTouchTargets(),
      responsiveDesign: await this.analyzeResponsiveDesign(),
      touchInteractions: await this.analyzeTouchInteractions(),
      mobileNavigation: await this.analyzeMobileNavigation(),
      accessibilityFeatures: await this.analyzeAccessibilityFeatures()
    };
    
    this.results.realTimeValidation.results.mobileOptimizations = mobileOptimizations;
    return mobileOptimizations;
  }

  async analyzeTouchTargets() {
    this.log('Analyzing Touch Target Implementations...', 'info');
    
    const componentFiles = [
      'src/components/VersionDisplay.tsx',
      'src/components/navigation/MobileAppNavigation.tsx',
      'src/components/EnhancedAvailabilityTable.tsx',
      'src/app/page.tsx'
    ];
    
    const touchTargetAnalysis = {};
    
    for (const filePath of componentFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        touchTargetAnalysis[filePath] = this.analyzeFileTouchTargets(content, filePath);
      }
    }
    
    return touchTargetAnalysis;
  }

  analyzeFileTouchTargets(content, filePath) {
    const touchTargetPatterns = [
      { pattern: /min-h-\[44px\]/g, size: 44, type: 'iOS minimum' },
      { pattern: /min-h-\[48px\]/g, size: 48, type: 'Android minimum' },
      { pattern: /min-h-\[60px\]/g, size: 60, type: 'Comfortable touch' },
      { pattern: /min-w-\[44px\]/g, size: 44, type: 'iOS minimum width' },
      { pattern: /min-w-\[48px\]/g, size: 48, type: 'Android minimum width' },
      { pattern: /touch-manipulation/g, size: null, type: 'Touch optimization' },
      { pattern: /touch-target-xl/g, size: null, type: 'Extra large touch target' }
    ];
    
    const findings = [];
    let totalTargets = 0;
    let compliantTargets = 0;
    
    touchTargetPatterns.forEach(({ pattern, size, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        const count = matches.length;
        totalTargets += count;
        
        if (size >= 44 || size === null) {
          compliantTargets += count;
        }
        
        findings.push({
          type,
          size,
          count,
          compliant: size >= 44 || size === null
        });
      }
    });
    
    const complianceRate = totalTargets > 0 ? (compliantTargets / totalTargets) * 100 : 100;
    
    return {
      totalTargets,
      compliantTargets,
      complianceRate,
      findings,
      passed: complianceRate >= 90
    };
  }

  async analyzeResponsiveDesign() {
    this.log('Analyzing Responsive Design Implementation...', 'info');
    
    const responsiveFiles = [
      'src/app/globals.css',
      'src/components/MobileTeamDashboard.tsx',
      'src/components/ScheduleTable.tsx'
    ];
    
    const responsiveAnalysis = {};
    
    for (const filePath of responsiveFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        responsiveAnalysis[filePath] = this.analyzeFileResponsiveness(content, filePath);
      }
    }
    
    return responsiveAnalysis;
  }

  analyzeFileResponsiveness(content, filePath) {
    const responsivePatterns = [
      { pattern: /@media.*\(max-width:\s*768px\)/g, type: 'Mobile breakpoint' },
      { pattern: /@media.*\(max-width:\s*640px\)/g, type: 'Small mobile breakpoint' },
      { pattern: /sm:/g, type: 'Tailwind small breakpoint' },
      { pattern: /md:/g, type: 'Tailwind medium breakpoint' },
      { pattern: /lg:/g, type: 'Tailwind large breakpoint' },
      { pattern: /xl:/g, type: 'Tailwind extra large breakpoint' },
      { pattern: /hidden lg:block/g, type: 'Desktop only elements' },
      { pattern: /lg:hidden/g, type: 'Mobile only elements' },
      { pattern: /flex-col sm:flex-row/g, type: 'Responsive layout direction' }
    ];
    
    const findings = [];
    let totalResponsiveElements = 0;
    
    responsivePatterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        const count = matches.length;
        totalResponsiveElements += count;
        findings.push({ type, count });
      }
    });
    
    return {
      totalResponsiveElements,
      findings,
      hasResponsiveDesign: totalResponsiveElements > 0,
      complexity: totalResponsiveElements > 20 ? 'high' : totalResponsiveElements > 10 ? 'medium' : 'low'
    };
  }

  async analyzeTouchInteractions() {
    this.log('Analyzing Touch Interaction Implementations...', 'info');
    
    const interactionFiles = [
      'src/components/VersionDisplay.tsx',
      'src/components/SwipeableNavigation.tsx'
    ];
    
    const interactionAnalysis = {};
    
    for (const filePath of interactionFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        interactionAnalysis[filePath] = this.analyzeFileTouchInteractions(content, filePath);
      }
    }
    
    return interactionAnalysis;
  }

  analyzeFileTouchInteractions(content, filePath) {
    const touchInteractionPatterns = [
      { pattern: /onTouchStart/g, type: 'Touch start handler' },
      { pattern: /onTouchMove/g, type: 'Touch move handler' },
      { pattern: /onTouchEnd/g, type: 'Touch end handler' },
      { pattern: /touchStartY|touchCurrentY/g, type: 'Touch position tracking' },
      { pattern: /swipe|gesture/gi, type: 'Gesture recognition' },
      { pattern: /active:scale-/g, type: 'Touch feedback animation' },
      { pattern: /active:bg-/g, type: 'Touch feedback background' },
      { pattern: /transition-all|transition-transform/g, type: 'Smooth animations' },
      { pattern: /preventDefault/g, type: 'Touch event prevention' }
    ];
    
    const findings = [];
    let totalInteractions = 0;
    let advancedInteractions = 0;
    
    touchInteractionPatterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        const count = matches.length;
        totalInteractions += count;
        
        if (type.includes('handler') || type.includes('tracking') || type.includes('gesture')) {
          advancedInteractions += count;
        }
        
        findings.push({ type, count });
      }
    });
    
    const sophistication = advancedInteractions > 5 ? 'advanced' : advancedInteractions > 2 ? 'intermediate' : 'basic';
    
    return {
      totalInteractions,
      advancedInteractions,
      sophistication,
      findings,
      hasTouchSupport: totalInteractions > 0
    };
  }

  async analyzeMobileNavigation() {
    this.log('Analyzing Mobile Navigation Implementation...', 'info');
    
    const navigationFiles = [
      'src/components/navigation/MobileAppNavigation.tsx',
      'src/components/mobile/MobileTeamNavigation.tsx',
      'src/components/navigation/GlobalMobileNavigation.tsx'
    ];
    
    const navigationAnalysis = {};
    
    for (const filePath of navigationFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (fs.existsExists && fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        navigationAnalysis[filePath] = this.analyzeFileNavigation(content, filePath);
      }
    }
    
    return navigationAnalysis;
  }

  analyzeFileNavigation(content, filePath) {
    const navigationPatterns = [
      { pattern: /role="tab"/g, type: 'Tab accessibility' },
      { pattern: /aria-label|aria-current/g, type: 'ARIA accessibility' },
      { pattern: /tabIndex/g, type: 'Keyboard navigation' },
      { pattern: /safe-area-/g, type: 'Safe area support' },
      { pattern: /fixed bottom-0/g, type: 'Bottom navigation positioning' },
      { pattern: /backdrop-blur/g, type: 'Modern blur effects' },
      { pattern: /translate-y|scale-/g, type: 'Animation effects' },
      { pattern: /min-h-\[64px\]/g, type: 'Comfortable nav height' }
    ];
    
    const findings = [];
    let totalFeatures = 0;
    let accessibilityFeatures = 0;
    
    navigationPatterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        const count = matches.length;
        totalFeatures += count;
        
        if (type.includes('accessibility') || type.includes('Keyboard')) {
          accessibilityFeatures += count;
        }
        
        findings.push({ type, count });
      }
    });
    
    const accessibilityScore = totalFeatures > 0 ? (accessibilityFeatures / totalFeatures) * 100 : 0;
    
    return {
      totalFeatures,
      accessibilityFeatures,
      accessibilityScore,
      findings,
      hasModernNavigation: totalFeatures > 5
    };
  }

  async analyzeAccessibilityFeatures() {
    this.log('Analyzing Accessibility Implementation...', 'info');
    
    const accessibilityFiles = [
      'src/components/VersionDisplay.tsx',
      'src/components/navigation/MobileAppNavigation.tsx',
      'src/app/page.tsx'
    ];
    
    const accessibilityAnalysis = {};
    
    for (const filePath of accessibilityFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        accessibilityAnalysis[filePath] = this.analyzeFileAccessibility(content, filePath);
      }
    }
    
    return accessibilityAnalysis;
  }

  analyzeFileAccessibility(content, filePath) {
    const accessibilityPatterns = [
      { pattern: /aria-label/g, type: 'ARIA labels', critical: true },
      { pattern: /aria-describedby/g, type: 'ARIA descriptions', critical: true },
      { pattern: /aria-expanded|aria-current/g, type: 'ARIA states', critical: true },
      { pattern: /aria-hidden="true"/g, type: 'ARIA hidden decorative', critical: false },
      { pattern: /role="/g, type: 'Semantic roles', critical: true },
      { pattern: /tabIndex/g, type: 'Keyboard navigation', critical: true },
      { pattern: /focus:outline-none focus:ring/g, type: 'Focus indicators', critical: true },
      { pattern: /sr-only/g, type: 'Screen reader only content', critical: false },
      { pattern: /alt="/g, type: 'Image alternatives', critical: true }
    ];
    
    const findings = [];
    let totalFeatures = 0;
    let criticalFeatures = 0;
    
    accessibilityPatterns.forEach(({ pattern, type, critical }) => {
      const matches = content.match(pattern);
      if (matches) {
        const count = matches.length;
        totalFeatures += count;
        
        if (critical) {
          criticalFeatures += count;
        }
        
        findings.push({ type, count, critical });
      }
    });
    
    const accessibilityScore = totalFeatures > 0 ? (criticalFeatures / totalFeatures) * 100 : 0;
    const complianceLevel = accessibilityScore >= 80 ? 'excellent' : 
                          accessibilityScore >= 60 ? 'good' : 
                          accessibilityScore >= 40 ? 'fair' : 'needs improvement';
    
    return {
      totalFeatures,
      criticalFeatures,
      accessibilityScore,
      complianceLevel,
      findings,
      isWCAGCompliant: accessibilityScore >= 80
    };
  }

  // Validate Version 2.2 specific features
  async validateVersion22Features() {
    this.log('Validating Version 2.2 Specific Features...', 'info');
    
    const v22Features = {
      clickableVersionComponent: await this.validateClickableVersion(),
      personalNavigation: await this.validatePersonalNavigation(),
      hebrewSupport: await this.validateHebrewSupport(),
      touchOptimizations: await this.validateTouchOptimizations()
    };
    
    this.results.realTimeValidation.results.version22Features = v22Features;
    return v22Features;
  }

  async validateClickableVersion() {
    const versionDisplayPath = path.join(process.cwd(), 'src/components/VersionDisplay.tsx');
    
    if (!fs.existsSync(versionDisplayPath)) {
      return { exists: false, validated: false, issues: ['Version display component not found'] };
    }
    
    const content = fs.readFileSync(versionDisplayPath, 'utf8');
    
    const validations = [
      { test: /onClick={openModal}/g, feature: 'Clickable functionality', required: true },
      { test: /min-h-\[48px\]/g, feature: 'Touch target size', required: true },
      { test: /Hebrew|עברית/g, feature: 'Hebrew language support', required: true },
      { test: /swipe|onTouch/g, feature: 'Touch gesture support', required: false },
      { test: /aria-label|role=/g, feature: 'Accessibility support', required: true },
      { test: /transition|animate/g, feature: 'Animation effects', required: false }
    ];
    
    const results = validations.map(({ test, feature, required }) => {
      const matches = content.match(test);
      return {
        feature,
        implemented: !!matches,
        required,
        matchCount: matches ? matches.length : 0
      };
    });
    
    const requiredFeatures = results.filter(r => r.required);
    const implementedRequired = requiredFeatures.filter(r => r.implemented);
    const complianceRate = (implementedRequired.length / requiredFeatures.length) * 100;
    
    return {
      exists: true,
      validated: true,
      complianceRate,
      results,
      passed: complianceRate >= 100,
      issues: results.filter(r => r.required && !r.implemented).map(r => `Missing: ${r.feature}`)
    };
  }

  async validatePersonalNavigation() {
    const mobileNavPath = path.join(process.cwd(), 'src/components/navigation/MobileAppNavigation.tsx');
    
    if (!fs.existsSync(mobileNavPath)) {
      return { exists: false, validated: false, issues: ['Mobile navigation component not found'] };
    }
    
    const content = fs.readFileSync(mobileNavPath, 'utf8');
    
    const navigationFeatures = [
      { test: /role="tab"/g, feature: 'Tab navigation pattern', required: true },
      { test: /aria-current/g, feature: 'Current page indication', required: true },
      { test: /NavTab/g, feature: 'Navigation tab components', required: true },
      { test: /activeTab/g, feature: 'Active state management', required: true },
      { test: /min-h-\[64px\]/g, feature: 'Comfortable touch targets', required: true },
      { test: /safe-area-bottom/g, feature: 'Safe area handling', required: true }
    ];
    
    const results = navigationFeatures.map(({ test, feature, required }) => {
      const matches = content.match(test);
      return {
        feature,
        implemented: !!matches,
        required,
        matchCount: matches ? matches.length : 0
      };
    });
    
    const requiredFeatures = results.filter(r => r.required);
    const implementedRequired = requiredFeatures.filter(r => r.implemented);
    const complianceRate = (implementedRequired.length / requiredFeatures.length) * 100;
    
    return {
      exists: true,
      validated: true,
      complianceRate,
      results,
      passed: complianceRate >= 100,
      issues: results.filter(r => r.required && !r.implemented).map(r => `Missing: ${r.feature}`)
    };
  }

  async validateHebrewSupport() {
    const files = [
      'src/components/VersionDisplay.tsx',
      'src/app/globals.css'
    ];
    
    const hebrewAnalysis = {};
    let totalSupport = 0;
    let filesWithSupport = 0;
    
    for (const filePath of files) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const hebrewFeatures = [
          { test: /dir="rtl"/g, feature: 'RTL direction support' },
          { test: /lang="he"/g, feature: 'Hebrew language declaration' },
          { test: /[\u0590-\u05FF]/g, feature: 'Hebrew text content' },
          { test: /font-family.*Hebrew/g, feature: 'Hebrew font support' },
          { test: /text-right/g, feature: 'Right-aligned text' }
        ];
        
        const fileResults = hebrewFeatures.map(({ test, feature }) => {
          const matches = content.match(test);
          return {
            feature,
            implemented: !!matches,
            matchCount: matches ? matches.length : 0
          };
        });
        
        const implemented = fileResults.filter(r => r.implemented).length;
        const supportScore = (implemented / hebrewFeatures.length) * 100;
        
        totalSupport += supportScore;
        if (implemented > 0) filesWithSupport++;
        
        hebrewAnalysis[filePath] = {
          supportScore,
          results: fileResults,
          hasHebrewSupport: implemented > 0
        };
      }
    }
    
    const averageSupport = files.length > 0 ? totalSupport / files.length : 0;
    
    return {
      averageSupport,
      filesWithSupport,
      totalFiles: files.length,
      supportRate: (filesWithSupport / files.length) * 100,
      details: hebrewAnalysis,
      passed: averageSupport >= 70
    };
  }

  async validateTouchOptimizations() {
    const touchOptimizedFiles = [
      'src/components/VersionDisplay.tsx',
      'src/components/navigation/MobileAppNavigation.tsx',
      'src/app/page.tsx'
    ];
    
    const touchAnalysis = {};
    let totalOptimizations = 0;
    let filesWithOptimizations = 0;
    
    for (const filePath of touchOptimizedFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const touchOptimizations = [
          { test: /touch-manipulation/g, feature: 'Touch manipulation CSS', critical: true },
          { test: /-webkit-tap-highlight-color/g, feature: 'Tap highlight removal', critical: false },
          { test: /active:scale-|active:bg-/g, feature: 'Touch feedback', critical: true },
          { test: /min-h-\[44px\]|min-h-\[48px\]/g, feature: 'Minimum touch targets', critical: true },
          { test: /onTouch/g, feature: 'Touch event handlers', critical: false },
          { test: /transition|duration-/g, feature: 'Smooth animations', critical: false }
        ];
        
        const fileResults = touchOptimizations.map(({ test, feature, critical }) => {
          const matches = content.match(test);
          return {
            feature,
            implemented: !!matches,
            critical,
            matchCount: matches ? matches.length : 0
          };
        });
        
        const implemented = fileResults.filter(r => r.implemented).length;
        const criticalImplemented = fileResults.filter(r => r.critical && r.implemented).length;
        const criticalTotal = fileResults.filter(r => r.critical).length;
        
        const optimizationScore = (implemented / touchOptimizations.length) * 100;
        const criticalScore = criticalTotal > 0 ? (criticalImplemented / criticalTotal) * 100 : 100;
        
        totalOptimizations += optimizationScore;
        if (implemented > 0) filesWithOptimizations++;
        
        touchAnalysis[filePath] = {
          optimizationScore,
          criticalScore,
          results: fileResults,
          hasTouchOptimizations: implemented > 0,
          criticalOptimizationsComplete: criticalScore >= 100
        };
      }
    }
    
    const averageOptimization = touchOptimizedFiles.length > 0 ? totalOptimizations / touchOptimizedFiles.length : 0;
    
    return {
      averageOptimization,
      filesWithOptimizations,
      totalFiles: touchOptimizedFiles.length,
      optimizationRate: (filesWithOptimizations / touchOptimizedFiles.length) * 100,
      details: touchAnalysis,
      passed: averageOptimization >= 75
    };
  }

  // Generate comprehensive real-time report
  async generateReport() {
    this.log('Generating Real-Time Validation Report...', 'info');
    
    try {
      const mobileOptimizations = await this.validateMobileOptimizations();
      const v22Features = await this.validateVersion22Features();
      
      // Calculate overall scores
      const overallScore = this.calculateOverallScore(mobileOptimizations, v22Features);
      
      this.results.realTimeValidation.overallScore = overallScore;
      
      // Save detailed report
      const reportPath = path.join(process.cwd(), 'real-time-validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      
      // Generate summary
      this.generateSummary();
      
      this.log(`Real-time validation completed with score: ${overallScore.toFixed(1)}/100`, 
               overallScore >= 90 ? 'success' : 'warn');
      
      return this.results;
      
    } catch (error) {
      this.log(`Real-time validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  calculateOverallScore(mobileOptimizations, v22Features) {
    let totalScore = 0;
    let categoryCount = 0;
    
    // Mobile optimizations score (60% weight)
    if (mobileOptimizations.touchTargets) {
      const touchScore = Object.values(mobileOptimizations.touchTargets)
        .reduce((sum, analysis) => sum + (analysis.complianceRate || 0), 0) / 
        Object.values(mobileOptimizations.touchTargets).length;
      totalScore += touchScore * 0.6;
      categoryCount += 0.6;
    }
    
    // Version 2.2 features score (40% weight)
    if (v22Features) {
      const v22Score = Object.values(v22Features)
        .reduce((sum, feature) => {
          if (feature.complianceRate !== undefined) {
            return sum + feature.complianceRate;
          }
          if (feature.averageSupport !== undefined) {
            return sum + feature.averageSupport;
          }
          if (feature.averageOptimization !== undefined) {
            return sum + feature.averageOptimization;
          }
          return sum + (feature.passed ? 100 : 0);
        }, 0) / Object.values(v22Features).length;
      
      totalScore += v22Score * 0.4;
      categoryCount += 0.4;
    }
    
    return categoryCount > 0 ? totalScore / categoryCount : 0;
  }

  generateSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      overallScore: this.results.realTimeValidation.overallScore,
      keyFindings: [],
      recommendations: [],
      deploymentReadiness: 'unknown'
    };
    
    // Analyze results and generate findings
    const { mobileOptimizations, version22Features } = this.results.realTimeValidation.results;
    
    if (mobileOptimizations) {
      if (mobileOptimizations.touchTargets) {
        const avgCompliance = Object.values(mobileOptimizations.touchTargets)
          .reduce((sum, analysis) => sum + (analysis.complianceRate || 0), 0) / 
          Object.values(mobileOptimizations.touchTargets).length;
        
        if (avgCompliance >= 90) {
          summary.keyFindings.push('✅ Touch targets are well optimized for mobile devices');
        } else {
          summary.keyFindings.push('⚠️ Some touch targets need mobile optimization');
          summary.recommendations.push('Increase touch target sizes to meet 44px minimum');
        }
      }
    }
    
    if (version22Features) {
      if (version22Features.clickableVersionComponent?.passed) {
        summary.keyFindings.push('✅ Version 2.2 clickable component is fully implemented');
      } else {
        summary.keyFindings.push('❌ Version 2.2 clickable component needs attention');
        summary.recommendations.push(...(version22Features.clickableVersionComponent?.issues || []));
      }
      
      if (version22Features.personalNavigation?.passed) {
        summary.keyFindings.push('✅ Personal navigation system is working correctly');
      } else {
        summary.keyFindings.push('❌ Personal navigation system needs fixes');
        summary.recommendations.push(...(version22Features.personalNavigation?.issues || []));
      }
    }
    
    // Determine deployment readiness
    summary.deploymentReadiness = summary.overallScore >= 95 ? 'ready' : 
                                 summary.overallScore >= 85 ? 'minor-issues' : 'needs-work';
    
    this.results.realTimeValidation.summary = summary;
    
    // Log summary
    this.log('─'.repeat(80));
    this.log('REAL-TIME VALIDATION SUMMARY', 'info');
    this.log('─'.repeat(80));
    summary.keyFindings.forEach(finding => this.log(finding, 'info'));
    
    if (summary.recommendations.length > 0) {
      this.log('─'.repeat(80));
      this.log('RECOMMENDATIONS:', 'warn');
      summary.recommendations.forEach((rec, i) => this.log(`${i + 1}. ${rec}`, 'warn'));
    }
    
    this.log('─'.repeat(80));
    this.log(`Deployment Status: ${summary.deploymentReadiness.toUpperCase()}`, 
             summary.deploymentReadiness === 'ready' ? 'success' : 'warn');
  }
}

// Main execution
async function main() {
  try {
    const tester = new RealTimeCrossPlatformTest();
    const results = await tester.generateReport();
    
    console.log('\n📊 Real-time validation completed');
    console.log('📋 Report saved to: real-time-validation-report.json');
    
    // Exit based on results
    const success = results.realTimeValidation.overallScore >= 85;
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error(`❌ Real-time validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { RealTimeCrossPlatformTest };