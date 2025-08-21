# Troubleshooting & Monitoring Guide - Navigation & Table Visibility Fixes

**Target Audience:** Support Teams, DevOps Engineers, and System Administrators  
**Focus:** Issue Resolution, Monitoring, and Preventive Maintenance  
**Last Updated:** August 20, 2025  
**Related Documentation:** [README_NAVIGATION_TABLE_FIXES.md](/Users/harel/team-availability-tracker/README_NAVIGATION_TABLE_FIXES.md)

---

## 🎯 Troubleshooting Overview

This guide provides comprehensive troubleshooting procedures, monitoring strategies, and preventive maintenance approaches for the navigation and table visibility fixes. It serves as the primary reference for support teams addressing user-reported issues and maintaining system health.

### Quick Issue Classification

| Issue Type | Severity | Response Time | Escalation Path |
|------------|----------|---------------|-----------------|
| **Navigation Cycling Returns** | CRITICAL | 15 minutes | Development Team |
| **Table Data Not Visible** | HIGH | 30 minutes | UI/UX Team |
| **Mobile Menu Unresponsive** | HIGH | 30 minutes | Mobile Team |
| **Slow Navigation Response** | MEDIUM | 2 hours | Performance Team |
| **Sprint Calculation Mismatch** | MEDIUM | 2 hours | Data Team |

---

## 🚨 Critical Issue Resolution

### Issue 1: Navigation Cycling Returns

#### Problem Identification
```
Symptoms:
❌ User reports "calendar jumps back to August when clicking forward"
❌ Date progression stops at September 1st
❌ Navigation becomes unpredictable
❌ User cannot plan future dates

User Experience:
- "I click next week but it goes backward"
- "The calendar won't let me see October"
- "Navigation is broken again"
```

#### Root Cause Analysis

**Primary Causes:**
1. **Date Validation Regression:** Code rollback or merge conflict
2. **Configuration Override:** Environment-specific configuration issues
3. **Cache Corruption:** Browser cache contains old validation logic
4. **Database Inconsistency:** Sprint configuration data corruption

#### Diagnostic Steps

```bash
# Step 1: Check application logs for validation errors
grep -i "date.*validation\|navigation.*error" /var/log/application.log

# Step 2: Verify sprint configuration in database
SELECT * FROM sprint_history WHERE sprint_start_date = '2025-08-10';

# Step 3: Check environment configuration
cat .env | grep -E "SPRINT|DATE|NAVIGATION"

# Step 4: Verify deployed code version
git log --oneline -5 | grep -E "navigation\|cycling\|date"
```

#### Resolution Procedures

**Immediate Fix (5-15 minutes):**
```typescript
// Verify date validation configuration
// File: /src/utils/validation.ts
const maxDate = new Date(now.getFullYear() + 50, 11, 31); // Should be 50 years
const minDate = new Date(2020, 0, 1); // Should be 2020

// Check for hard error returns (should NOT exist)
if (date > maxDate) {
  console.warn(`Date beyond range: ${date}`); // Should be warning, not error
  // SHOULD NOT: return { isValid: false, error: '...' };
}
```

**Verification Commands:**
```bash
# Test navigation after fix
npm test -- comprehensive-navigation-validation.test.tsx

# Quick smoke test
curl -X GET http://localhost:3000/api/health
```

**Escalation Criteria:**
- Fix doesn't resolve issue within 15 minutes
- Multiple users reporting same problem
- Database corruption suspected

### Issue 2: Table Data Hidden Behind Headers

#### Problem Identification
```
Symptoms:
❌ Table header overlaps first few rows
❌ Data not visible or partially obscured
❌ Scrolling doesn't improve visibility
❌ Professional appearance compromised

User Experience:
- "I can't see the first team member's data"
- "The header is blocking important information"
- "Table looks unprofessional"
```

#### Diagnostic Steps

```bash
# Step 1: Check CSS compilation
npm run build 2>&1 | grep -E "error\|warning.*css"

# Step 2: Verify z-index implementation
grep -r "z-30\|z-index.*30" src/components/CompactHeaderBar.tsx

# Step 3: Check table spacing classes
grep -r "mt-6.*mb-4" src/components/ScheduleTable.tsx

# Step 4: Browser developer tools verification
# Open browser console and run:
# getComputedStyle(document.querySelector('.header')).zIndex
```

#### Resolution Procedures

**CSS Z-Index Fix:**
```typescript
// CompactHeaderBar.tsx - Verify this implementation
const CompactHeaderBar = () => (
  <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-elevation-2">
    {/* Header content */}
  </div>
);
```

**Table Spacing Fix:**
```typescript
// ScheduleTable.tsx - Verify this implementation  
const ScheduleTable = () => (
  <div className="mt-6 mb-4">
    <div className="overflow-x-auto">
      {/* Table content */}
    </div>
  </div>
);
```

**Quick Verification:**
```javascript
// Browser console test
const header = document.querySelector('.sticky');
const table = document.querySelector('table').closest('div');
console.log('Header z-index:', getComputedStyle(header).zIndex);
console.log('Table margin-top:', getComputedStyle(table).marginTop);
```

### Issue 3: Mobile Navigation Unresponsive

#### Problem Identification
```
Symptoms:
❌ Hamburger menu doesn't respond to touch
❌ Multiple taps required
❌ Menu animation doesn't trigger
❌ Mobile users cannot access navigation

User Experience:
- "The menu button doesn't work on my phone"
- "I have to tap multiple times"
- "Can't access navigation on mobile"
```

#### Diagnostic Steps

```bash
# Step 1: Check touch gesture implementation
grep -A 10 -B 5 "useTouchGestures\|onTouchEnd\|onClick" src/hooks/useTouchGestures.ts

# Step 2: Verify event handler separation
grep -r "onClick.*onTouchEnd" src/components/

# Step 3: Mobile browser testing
# Open browser dev tools mobile emulation
# Test touch events in console
```

#### Resolution Procedures

**Touch Gesture Fix:**
```typescript
// Verify proper implementation in useTouchGestures.ts
const createEventHandlers = (callback: () => void) => {
  if (isTouchDevice) {
    return {
      onTouchEnd: (e: React.TouchEvent) => {
        e.preventDefault();
        callback();
      }
    };
  } else {
    return {
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        callback();
      }
    };
  }
};
```

**Component Implementation:**
```typescript
// Mobile navigation component
const { createEventHandlers } = useTouchGestures();

return (
  <button
    {...createEventHandlers(handleMenuToggle)}
    className="hamburger-menu"
    aria-label="Toggle navigation menu"
  >
    <HamburgerIcon />
  </button>
);
```

---

## 📊 Monitoring & Alert Configuration

### Key Performance Indicators (KPIs)

#### Navigation Performance Metrics

```javascript
// Performance monitoring setup
const navigationMetrics = {
  // Response time thresholds
  navigationResponseTime: {
    target: 200,      // milliseconds
    warning: 300,     // 50% over target
    critical: 500     // 150% over target
  },
  
  // Error rate thresholds
  navigationErrorRate: {
    target: 0.01,     // 1%
    warning: 0.05,    // 5%
    critical: 0.10    // 10%
  },
  
  // User satisfaction metrics
  taskCompletionRate: {
    target: 0.90,     // 90%
    warning: 0.80,    // 80%
    critical: 0.70    // 70%
  }
};
```

#### Monitoring Implementation

```javascript
// Custom monitoring for navigation issues
function trackNavigationEvent(action, startDate, endDate, responseTime) {
  // Log performance metric
  if (responseTime > navigationMetrics.navigationResponseTime.warning) {
    console.warn(`Slow navigation: ${action} took ${responseTime}ms`);
  }
  
  // Check for cycling behavior
  if (action === 'forward' && new Date(endDate) < new Date(startDate)) {
    console.error('CRITICAL: Navigation cycling detected!');
    alert('Navigation cycling detected - escalating to development team');
  }
  
  // Send to monitoring service
  sendMetric('navigation.performance', {
    action,
    responseTime,
    startDate,
    endDate,
    timestamp: new Date().toISOString()
  });
}
```

### Alert Configuration

#### Critical Alerts

```yaml
# Alert configuration for monitoring system
alerts:
  navigation_cycling:
    description: "Navigation cycling behavior detected"
    condition: "navigation.cycling_detected > 0"
    severity: "critical"
    notification: "immediate"
    escalation: "development_team"
    
  table_visibility_errors:
    description: "Table visibility issues reported"
    condition: "ui.table_overlap_reports > 5 in 1h"
    severity: "high" 
    notification: "15_minutes"
    escalation: "ui_team"
    
  mobile_navigation_failures:
    description: "Mobile navigation failure rate high"
    condition: "mobile.navigation_failure_rate > 0.10"
    severity: "high"
    notification: "30_minutes"
    escalation: "mobile_team"
```

#### Performance Alerts

```yaml
performance_alerts:
  slow_navigation:
    description: "Navigation response time degraded"
    condition: "navigation.response_time.p95 > 500ms"
    severity: "medium"
    notification: "1_hour"
    
  high_error_rate:
    description: "Navigation error rate elevated"
    condition: "navigation.error_rate > 0.05"
    severity: "medium"
    notification: "30_minutes"
    
  memory_leak:
    description: "Memory usage growing abnormally"
    condition: "memory.growth_rate > 2MB/hour"
    severity: "medium"
    notification: "2_hours"
```

### Health Check Endpoints

#### Navigation System Health Check

```typescript
// API endpoint: /api/health/navigation
export default function navigationHealthCheck(req, res) {
  const healthChecks = {
    // Date validation system
    dateValidation: checkDateValidationSystem(),
    
    // Sprint configuration consistency
    sprintConfig: checkSprintConfigConsistency(),
    
    // Navigation response time
    performance: checkNavigationPerformance(),
    
    // Mobile touch system
    mobileTouch: checkMobileTouchSystem()
  };
  
  const overallHealth = Object.values(healthChecks)
    .every(check => check.status === 'healthy');
  
  res.status(overallHealth ? 200 : 503).json({
    status: overallHealth ? 'healthy' : 'degraded',
    checks: healthChecks,
    timestamp: new Date().toISOString()
  });
}

function checkDateValidationSystem() {
  try {
    // Test critical navigation path
    const testDate = new Date('2025-09-01');
    const validation = validateNavigationDate(testDate);
    
    return {
      status: 'healthy',
      responseTime: validation.responseTime,
      message: 'Date validation working correctly'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Date validation system failure'
    };
  }
}
```

---

## 🔍 Diagnostic Tools & Scripts

### Automated Diagnostic Scripts

#### Navigation Issue Diagnosis

```bash
#!/bin/bash
# diagnose-navigation-issues.sh

echo "🔍 Navigation System Diagnostics"
echo "================================"

# Check application health
echo "1. Checking application health..."
curl -s http://localhost:3000/api/health/navigation | jq .

# Verify database sprint configuration
echo "2. Checking sprint configuration..."
psql -d $DATABASE_URL -c "
  SELECT sprint_start_date, sprint_end_date, is_active 
  FROM sprint_history 
  WHERE sprint_start_date >= '2025-08-01' 
  ORDER BY sprint_start_date;
"

# Check for navigation errors in logs
echo "3. Checking recent navigation errors..."
tail -n 100 /var/log/application.log | grep -E "navigation|cycling|date" | tail -10

# Test navigation performance
echo "4. Testing navigation performance..."
node scripts/test-navigation-performance.js

# Verify CSS compilation
echo "5. Checking CSS compilation..."
npm run build 2>&1 | grep -E "error|warning" || echo "✅ No CSS issues found"

echo "✅ Diagnostics complete"
```

#### Mobile Touch Diagnosis

```javascript
// mobile-touch-diagnostics.js
async function diagnoseMobileTouchIssues() {
  console.log('📱 Mobile Touch Diagnostics');
  console.log('===========================');
  
  // Check touch device detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  console.log(`Touch device detected: ${isTouchDevice}`);
  
  // Test touch event handlers
  const menuButton = document.querySelector('.hamburger-menu');
  if (menuButton) {
    const events = getEventListeners(menuButton);
    console.log('Event listeners:', events);
    
    // Check for conflicting events
    const hasOnClick = events.click && events.click.length > 0;
    const hasOnTouch = events.touchend && events.touchend.length > 0;
    
    if (hasOnClick && hasOnTouch) {
      console.warn('⚠️ Potential conflict: Both click and touch events detected');
    } else {
      console.log('✅ Event configuration looks correct');
    }
  }
  
  // Test touch response time
  let touchStartTime;
  menuButton?.addEventListener('touchstart', () => {
    touchStartTime = performance.now();
  });
  
  menuButton?.addEventListener('touchend', () => {
    const responseTime = performance.now() - touchStartTime;
    console.log(`Touch response time: ${responseTime}ms`);
    
    if (responseTime > 100) {
      console.warn('⚠️ Touch response time slower than target (100ms)');
    } else {
      console.log('✅ Touch response time within target');
    }
  });
}
```

### User Issue Investigation

#### Support Ticket Analysis Template

```
Support Ticket Investigation Template
====================================

User Information:
- User ID: [user_id]
- Browser: [browser_version]
- Device: [device_type]
- OS: [operating_system]
- Screen Size: [resolution]

Issue Details:
- Reported Issue: [user_description]
- Steps to Reproduce: [reproduction_steps]
- Expected Behavior: [expected_outcome]
- Actual Behavior: [actual_outcome]

Technical Investigation:
1. Navigation Cycling Check:
   □ Verified date validation limits
   □ Checked sprint configuration consistency
   □ Tested critical September 1st navigation
   □ Confirmed no backward cycling occurs

2. Table Visibility Check:
   □ Verified header z-index (should be z-30)
   □ Confirmed table spacing (mt-6 mb-4)
   □ Tested across different screen sizes
   □ Checked responsive design implementation

3. Mobile Touch Check:
   □ Verified touch device detection
   □ Confirmed event handler separation
   □ Tested touch response time (<100ms)
   □ Validated across mobile browsers

Browser Console Logs:
[paste_relevant_console_output]

Network Activity:
[paste_relevant_network_requests]

Resolution:
□ Issue reproduced and fixed
□ User issue was configuration-related
□ User education provided
□ Escalated to development team
□ Known limitation documented

Follow-up Required:
□ Monitor for similar reports
□ Update documentation
□ Schedule user follow-up
□ Report bug to development team
```

---

## 🛠️ Preventive Maintenance

### Regular Health Checks

#### Daily Monitoring Checklist

```
Daily Navigation System Health Check
===================================

Automated Checks (Run at 09:00 UTC):
□ Navigation response time < 200ms average
□ Error rate < 1% over last 24 hours
□ No navigation cycling incidents reported
□ Mobile touch success rate > 95%
□ Table visibility complaints = 0

Manual Verification (Weekly):
□ Cross-browser navigation testing
□ Mobile device spot checks
□ Performance metric review
□ User feedback analysis
□ Documentation updates needed

Alert Review:
□ No critical alerts in last 24 hours
□ Warning alerts investigated and resolved
□ Escalations handled appropriately
□ Performance trends within targets
```

#### Monthly Deep Analysis

```
Monthly Navigation System Review
===============================

Performance Analysis:
- Navigation response time trends
- Error rate patterns and causes
- User satisfaction score changes
- Mobile vs desktop usage patterns

Issue Pattern Analysis:
- Common user complaints categorization
- Support ticket volume trends
- Resolution time improvements
- Preventive measure effectiveness

System Optimization:
- Performance bottleneck identification
- Code optimization opportunities
- Infrastructure scaling needs
- Monitoring enhancement requirements

User Experience Review:
- Navigation usage pattern analysis
- Feature adoption rate changes
- User feedback sentiment analysis
- Training/documentation gap identification
```

### Proactive Issue Prevention

#### Code Quality Monitoring

```bash
#!/bin/bash
# navigation-quality-check.sh

echo "🔍 Navigation Code Quality Check"
echo "==============================="

# Check for navigation cycling prevention
echo "1. Verifying date validation implementation..."
grep -n "maxDate.*getFullYear.*50" src/utils/validation.ts > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Date validation properly configured (50 year range)"
else
  echo "❌ Date validation may be incorrect - check configuration"
fi

# Verify table spacing implementation
echo "2. Checking table spacing classes..."
grep -n "mt-6.*mb-4" src/components/ScheduleTable.tsx > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Table spacing properly implemented"
else
  echo "❌ Table spacing classes missing or incorrect"
fi

# Check header z-index
echo "3. Verifying header z-index configuration..."
grep -n "z-30" src/components/CompactHeaderBar.tsx > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Header z-index properly configured"
else
  echo "❌ Header z-index missing or incorrect"
fi

# Verify touch gesture separation
echo "4. Checking touch gesture implementation..."
grep -A 5 -B 5 "createEventHandlers" src/hooks/useTouchGestures.ts | grep -E "onClick|onTouchEnd" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Touch gesture separation implemented"
else
  echo "❌ Touch gesture implementation may be incorrect"
fi

echo "✅ Quality check complete"
```

#### Performance Regression Detection

```javascript
// performance-regression-monitor.js
const performanceBaselines = {
  navigationResponseTime: 150, // ms baseline
  tableRenderTime: 650,       // ms baseline
  mobileToouchResponse: 75,   // ms baseline
  memoryUsage: 98            // MB baseline
};

function detectPerformanceRegression() {
  const currentMetrics = getCurrentPerformanceMetrics();
  const regressions = [];
  
  Object.keys(performanceBaselines).forEach(metric => {
    const baseline = performanceBaselines[metric];
    const current = currentMetrics[metric];
    const threshold = baseline * 1.2; // 20% degradation threshold
    
    if (current > threshold) {
      regressions.push({
        metric,
        baseline,
        current,
        degradation: ((current - baseline) / baseline * 100).toFixed(1) + '%'
      });
    }
  });
  
  if (regressions.length > 0) {
    console.warn('⚠️ Performance regressions detected:', regressions);
    // Alert development team
    sendAlert('performance_regression', regressions);
  }
  
  return regressions;
}
```

---

## 📚 Knowledge Base

### Common User Questions & Answers

#### Q: "Why does navigation seem slower than before?"

**A:** The navigation fixes prioritize accuracy over speed, but response times should still be under 200ms. If navigation feels slow:

1. **Check Network:** Slow internet can affect perceived performance
2. **Clear Cache:** Browser cache may contain old JavaScript
3. **Update Browser:** Ensure you're using a supported browser version
4. **Report Performance:** If consistently slow, report with browser details

**Escalation:** If response time consistently > 500ms, escalate to performance team.

#### Q: "Table data is still partially hidden on my screen"

**A:** This may be a screen size or zoom level issue:

1. **Check Zoom Level:** Ensure browser zoom is 100%
2. **Screen Resolution:** Minimum supported resolution is 1024x768
3. **Browser Compatibility:** Verify you're using a supported browser
4. **Responsive Design:** Try resizing browser window

**Escalation:** If issue persists on supported configurations, escalate to UI team.

#### Q: "Mobile menu still doesn't work on my device"

**A:** Mobile navigation issues can be device-specific:

1. **Device Support:** Verify device supports touch events
2. **Browser Version:** Ensure mobile browser is up-to-date
3. **Touch Sensitivity:** Try firm, quick taps on menu button
4. **Clear App Data:** Clear browser cache and app data

**Escalation:** If issue affects multiple users or persists after troubleshooting, escalate to mobile team.

### Troubleshooting Decision Tree

```
Navigation Issue Reported
    │
    ├─ Navigation Cycling?
    │  ├─ YES → Check date validation config → Fix/Escalate
    │  └─ NO → Continue to next check
    │
    ├─ Table Data Hidden?
    │  ├─ YES → Check z-index/spacing → Fix CSS/Escalate
    │  └─ NO → Continue to next check
    │
    ├─ Mobile Menu Unresponsive?
    │  ├─ YES → Check touch events → Fix/Escalate
    │  └─ NO → Continue to next check
    │
    ├─ Performance Issue?
    │  ├─ YES → Check metrics → Optimize/Escalate
    │  └─ NO → General troubleshooting
    │
    └─ Other Issue → Document and escalate
```

---

## 🚀 Emergency Response Procedures

### Critical Issue Response (0-15 minutes)

```
CRITICAL: Navigation cycling has returned
========================================

Immediate Actions:
1. Acknowledge issue receipt within 5 minutes
2. Verify issue scope (single user vs widespread)
3. Check recent deployments for code changes
4. Implement emergency rollback if needed
5. Notify development team immediately

Communication:
- Update status page if widespread
- Notify affected users via email/notification
- Provide workaround if available
- Set expectations for resolution time

Technical Response:
- Run diagnostic scripts immediately
- Check database configuration
- Verify environment variables
- Test fix in staging before production
```

### High Priority Response (15-60 minutes)

```
HIGH: Table visibility or mobile navigation issues
=================================================

Response Timeline:
- Acknowledge: 15 minutes
- Initial assessment: 30 minutes  
- Resolution or escalation: 60 minutes

Actions:
1. Gather detailed reproduction steps
2. Test across multiple browsers/devices
3. Implement quick CSS or configuration fixes
4. Verify fix doesn't break other functionality
5. Monitor for related issues

Follow-up:
- Document issue and resolution
- Update knowledge base if needed
- Schedule follow-up with user
- Review prevention opportunities
```

---

## 🏁 Troubleshooting Conclusion

This troubleshooting and monitoring guide provides comprehensive support for maintaining the navigation and table visibility fixes. The guide ensures:

### Support Team Readiness
- **Clear Issue Classification:** Quick identification and prioritization
- **Step-by-Step Procedures:** Consistent resolution approaches
- **Escalation Paths:** Clear communication channels for complex issues
- **Knowledge Base:** Common questions and proven solutions

### Proactive Monitoring
- **Automated Health Checks:** Continuous system monitoring
- **Performance Baselines:** Clear targets and thresholds
- **Alert Configuration:** Immediate notification of critical issues
- **Preventive Maintenance:** Regular system health validation

### Quality Assurance
- **Diagnostic Tools:** Automated issue detection and analysis
- **Emergency Procedures:** Rapid response for critical problems
- **Documentation Standards:** Clear communication and knowledge transfer
- **Continuous Improvement:** Regular review and optimization of support processes

The implementation provides robust support infrastructure ensuring high availability and user satisfaction while maintaining the quality improvements achieved through the navigation and table visibility fixes.

---

*Troubleshooting & Monitoring Guide maintained by Support Engineering Team*  
*For urgent issues or escalation procedures, contact the development team or use established alert channels*