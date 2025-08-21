# 🧪 Comprehensive Regression Test Suite - v2.1

## 📋 Master Regression Test Checklist

### What Are Regression Tests?
Regression tests ensure that new changes don't break existing functionality. They must run before EVERY deployment.

---

## 🔴 CRITICAL PATH TESTS (Must Pass 100%)

### Test Suite 1: Data Integrity Regression
**Owner: bug-fix-specialist & database-schema-auditor**

```typescript
// __tests__/regression/data-integrity.test.ts

describe('Data Integrity Regression Suite', () => {
  
  test('REG-001: Concurrent edits do not cause data loss', async () => {
    // Setup: Create 2 user sessions
    const user1 = await createSession('amit-tzriker');
    const user2 = await createSession('harel-mazan');
    
    // Both users load same schedule entry
    const entry = await getScheduleEntry('2024-07-15', 'natan-shemesh');
    
    // Simulate concurrent edits
    const promise1 = user1.updateEntry(entry.id, { hours: 0.5, reason: 'Doctor' });
    const promise2 = user2.updateEntry(entry.id, { hours: 0, reason: 'Sick' });
    
    // One should succeed, one should get conflict error
    const results = await Promise.allSettled([promise1, promise2]);
    
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    
    // Verify data integrity
    const finalEntry = await getScheduleEntry('2024-07-15', 'natan-shemesh');
    expect([0, 0.5]).toContain(finalEntry.hours);
    expect(finalEntry.version).toBeGreaterThan(entry.version);
  });

  test('REG-002: Unique constraint prevents duplicate entries', async () => {
    const duplicateEntry = {
      member_id: 'test-member-id',
      entry_date: '2024-07-15',
      hours: 1
    };
    
    await expect(createScheduleEntry(duplicateEntry)).resolves.toBeTruthy();
    await expect(createScheduleEntry(duplicateEntry)).rejects.toThrow('duplicate key');
  });

  test('REG-003: Cascade delete removes related data', async () => {
    const teamId = await createTeam('Test Team');
    const memberId = await addTeamMember(teamId, 'Test User');
    await createScheduleEntry({ member_id: memberId, date: '2024-07-15' });
    
    await deleteTeam(teamId);
    
    const member = await getTeamMember(memberId);
    const entries = await getScheduleEntries(memberId);
    
    expect(member).toBeNull();
    expect(entries).toHaveLength(0);
  });

  test('REG-004: Audit log captures all changes', async () => {
    const entryId = await createScheduleEntry({ hours: 1 });
    await updateScheduleEntry(entryId, { hours: 0.5, reason: 'Half day' });
    
    const auditLogs = await getAuditLogs(entryId);
    
    expect(auditLogs).toHaveLength(2);
    expect(auditLogs[0].action).toBe('CREATE');
    expect(auditLogs[1].action).toBe('UPDATE');
    expect(auditLogs[1].old_values.hours).toBe(1);
    expect(auditLogs[1].new_values.hours).toBe(0.5);
  });

  test('REG-005: Soft deletes preserve data', async () => {
    const entryId = await createScheduleEntry({ hours: 1 });
    await softDeleteEntry(entryId);
    
    const activeEntry = await getScheduleEntry(entryId);
    const deletedEntry = await getScheduleEntryIncludingDeleted(entryId);
    
    expect(activeEntry).toBeNull();
    expect(deletedEntry).toBeTruthy();
    expect(deletedEntry.deleted_at).toBeTruthy();
  });
});
```

### Test Suite 2: User Permissions Regression
**Owner: bug-fix-specialist & app-recovery-validator**

```typescript
// __tests__/regression/permissions.test.ts

describe('Permission System Regression Suite', () => {
  
  test('REG-006: Regular users can only edit own data', async () => {
    const regularUser = await loginAs('yotam-sever');
    
    // Should succeed - own data
    await expect(
      regularUser.updateSchedule('yotam-sever', '2024-07-15', 0.5)
    ).resolves.toBeTruthy();
    
    // Should fail - other's data
    await expect(
      regularUser.updateSchedule('ido-keller', '2024-07-15', 0.5)
    ).rejects.toThrow('Permission denied');
  });

  test('REG-007: Managers can edit entire team', async () => {
    const manager = await loginAs('amit-tzriker'); // Product team manager
    
    // Can edit team members
    await expect(
      manager.updateSchedule('natan-shemesh', '2024-07-15', 0)
    ).resolves.toBeTruthy();
    
    // Cannot edit other teams
    await expect(
      manager.updateSchedule('yotam-sever', '2024-07-15', 0) // Different team
    ).rejects.toThrow('Permission denied');
  });

  test('REG-008: COO has read-only access to all teams', async () => {
    const coo = await loginAs('nir-shilah');
    
    // Can view all teams
    const allTeams = await coo.getAllTeamsData();
    expect(allTeams).toHaveLength(5);
    
    // Cannot edit any data
    await expect(
      coo.updateSchedule('anyone', '2024-07-15', 1)
    ).rejects.toThrow('Read-only access');
  });

  test('REG-009: Sprint manager can modify sprint settings', async () => {
    const sprintManager = await loginAs('harel-mazan');
    
    await expect(
      sprintManager.updateSprintDates('2024-07-14', '2024-07-28')
    ).resolves.toBeTruthy();
    
    const regularUser = await loginAs('yotam-sever');
    await expect(
      regularUser.updateSprintDates('2024-07-14', '2024-07-28')
    ).rejects.toThrow('Permission denied');
  });
});
```

### Test Suite 3: Critical User Journeys
**Owner: test-coverage-specialist & ui-polish-specialist**

```typescript
// __tests__/regression/user-journeys.test.ts

describe('Critical User Journey Regression Suite', () => {
  
  test('REG-010: New user complete flow', async () => {
    const page = await browser.newPage();
    
    // 1. Land on homepage
    await page.goto('/');
    await expect(page).toHaveSelector('[data-testid="team-selector"]');
    
    // 2. Select team and user
    await page.select('[data-testid="team-selector"]', 'product');
    await page.select('[data-testid="user-selector"]', 'natan-shemesh');
    
    // 3. View current week
    await expect(page).toHaveSelector('[data-testid="current-week"]');
    
    // 4. Edit availability
    await page.click('[data-testid="day-monday"]');
    await page.click('[data-testid="day-tuesday"]');
    await page.select('[data-testid="day-tuesday-status"]', '0.5');
    await page.type('[data-testid="reason-input"]', 'Doctor appointment');
    
    // 5. Verify save
    await page.waitForSelector('[data-testid="save-success"]');
    
    // 6. Navigate weeks
    await page.click('[data-testid="next-week"]');
    await page.click('[data-testid="previous-week"]');
    
    // 7. Verify persistence
    await page.reload();
    const mondayStatus = await page.$eval(
      '[data-testid="day-monday"]',
      el => el.dataset.status
    );
    expect(mondayStatus).toBe('0');
  });

  test('REG-011: Manager team management flow', async () => {
    const manager = await loginAs('amit-tzriker');
    
    // Add new team member
    const newMember = await manager.addTeamMember({
      name_english: 'John Doe',
      name_hebrew: 'ג׳ון דו',
      email: 'john@company.com'
    });
    
    // Edit team member schedule
    await manager.editMemberSchedule(newMember.id, '2024-07-15', 0.5);
    
    // Export team data
    const exportData = await manager.exportTeamData('current-sprint');
    expect(exportData.rows).toBeGreaterThan(0);
    
    // Remove team member
    await manager.removeTeamMember(newMember.id);
    
    // Verify removal
    const members = await manager.getTeamMembers();
    expect(members).not.toContainEqual(expect.objectContaining({ id: newMember.id }));
  });

  test('REG-012: COO dashboard performance', async () => {
    const startTime = Date.now();
    const coo = await loginAs('nir-shilah');
    
    // Load dashboard with all teams
    const dashboard = await coo.loadDashboard();
    const loadTime = Date.now() - startTime;
    
    // Must load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Verify all teams present
    expect(dashboard.teams).toHaveLength(5);
    expect(dashboard.totalMembers).toBeGreaterThan(20);
    
    // Export all teams
    const exportStartTime = Date.now();
    const exportData = await coo.exportAllTeams();
    const exportTime = Date.now() - exportStartTime;
    
    expect(exportTime).toBeLessThan(5000);
    expect(exportData.sheets).toHaveLength(6); // 5 teams + summary
  });
});
```

### Test Suite 4: Real-time & Performance
**Owner: performance-optimizer & database-enhancement-specialist**

```typescript
// __tests__/regression/performance.test.ts

describe('Performance Regression Suite', () => {
  
  test('REG-013: Page load under 2 seconds', async () => {
    const metrics = await measurePageLoad('/');
    
    expect(metrics.FCP).toBeLessThan(1500); // First Contentful Paint
    expect(metrics.LCP).toBeLessThan(2000); // Largest Contentful Paint
    expect(metrics.TTI).toBeLessThan(3000); // Time to Interactive
    expect(metrics.CLS).toBeLessThan(0.1);  // Cumulative Layout Shift
  });

  test('REG-014: Handle 100 concurrent users', async () => {
    const users = await Promise.all(
      Array.from({ length: 100 }, (_, i) => 
        createSession(`user-${i}`)
      )
    );
    
    const startTime = Date.now();
    const results = await Promise.allSettled(
      users.map(user => user.loadSchedule())
    );
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(95); // 95% success rate
    expect(totalTime).toBeLessThan(5000); // All complete within 5 seconds
  });

  test('REG-015: Real-time sync latency', async () => {
    const user1 = await createSession('user1');
    const user2 = await createSession('user2');
    
    // User2 subscribes to changes
    const updatePromise = new Promise(resolve => {
      user2.onScheduleUpdate(resolve);
    });
    
    // User1 makes change
    const changeTime = Date.now();
    await user1.updateSchedule('2024-07-15', 0.5);
    
    // User2 receives update
    await updatePromise;
    const syncTime = Date.now() - changeTime;
    
    expect(syncTime).toBeLessThan(1000); // Under 1 second
  });

  test('REG-016: No memory leaks after extended use', async () => {
    const page = await browser.newPage();
    await page.goto('/');
    
    const initialMemory = await page.evaluate(() => 
      performance.memory.usedJSHeapSize
    );
    
    // Simulate 1 hour of usage
    for (let i = 0; i < 60; i++) {
      await page.click('[data-testid="next-week"]');
      await page.click('[data-testid="previous-week"]');
      await page.evaluate(() => {
        // Force garbage collection if available
        if (window.gc) window.gc();
      });
      await page.waitForTimeout(1000);
    }
    
    const finalMemory = await page.evaluate(() => 
      performance.memory.usedJSHeapSize
    );
    
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
  });
});
```

### Test Suite 5: Mobile Experience
**Owner: mobile-optimization-specialist**

```typescript
// __tests__/regression/mobile.test.ts

describe('Mobile Experience Regression Suite', () => {
  
  test('REG-017: Touch targets minimum 44x44px', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 }); // iPhone 12
    await page.goto('/');
    
    const buttons = await page.$eval('button, a, [role="button"]', elements =>
      elements.map(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );
    
    buttons.forEach(button => {
      expect(button.width).toBeGreaterThanOrEqual(44);
      expect(button.height).toBeGreaterThanOrEqual(44);
    });
  });

  test('REG-018: Mobile gesture support', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('/');
    
    // Test swipe navigation
    await page.evaluate(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 300, clientY: 400 }]
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100, clientY: 400 }]
      });
      
      document.dispatchEvent(touchStart);
      document.dispatchEvent(touchEnd);
    });
    
    // Should navigate to next week
    await expect(page).toHaveSelector('[data-testid="week-indicator"]:has-text("Next Week")');
  });

  test('REG-019: Table scrolls horizontally on mobile', async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('/');
    
    const tableScrollable = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="schedule-table"]');
      return table.scrollWidth > table.clientWidth;
    });
    
    expect(tableScrollable).toBe(true);
  });
});
```

### Test Suite 6: Error Recovery
**Owner: app-recovery-validator**

```typescript
// __tests__/regression/error-recovery.test.ts

describe('Error Recovery Regression Suite', () => {
  
  test('REG-020: Recovers from component errors', async () => {
    const page = await browser.newPage();
    await page.goto('/');
    
    // Inject error into component
    await page.evaluate(() => {
      window.forceComponentError = true;
    });
    
    // Trigger error
    await page.click('[data-testid="trigger-error"]');
    
    // Should show error boundary
    await expect(page).toHaveSelector('[data-testid="error-boundary"]');
    
    // Should have retry button
    await page.click('[data-testid="retry-button"]');
    
    // Should recover
    await expect(page).toHaveSelector('[data-testid="schedule-grid"]');
  });

  test('REG-021: Recovers unsaved changes after refresh', async () => {
    const page = await browser.newPage();
    await page.goto('/');
    
    // Make changes
    await page.click('[data-testid="day-monday"]');
    await page.type('[data-testid="reason-input"]', 'Test reason');
    
    // Refresh before save completes
    await page.reload();
    
    // Should show recovery banner
    await expect(page).toHaveSelector('[data-testid="recovery-banner"]');
    
    // Should restore changes
    const reason = await page.$eval(
      '[data-testid="reason-input"]',
      el => el.value
    );
    expect(reason).toBe('Test reason');
  });

  test('REG-022: Handles network disconnection gracefully', async () => {
    const page = await browser.newPage();
    await page.goto('/');
    
    // Go offline
    await page.setOfflineMode(true);
    
    // Should show offline indicator
    await expect(page).toHaveSelector('[data-testid="offline-indicator"]');
    
    // Make changes while offline
    await page.click('[data-testid="day-tuesday"]');
    
    // Go back online
    await page.setOfflineMode(false);
    
    // Should sync automatically
    await expect(page).toHaveSelector('[data-testid="sync-success"]');
  });
});
```

---

## 🔄 Continuous Regression Testing

### GitHub Actions Workflow
```yaml
# .github/workflows/regression-tests.yml

name: Regression Test Suite

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  regression-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        test-suite: [
          'data-integrity',
          'permissions',
          'user-journeys',
          'performance',
          'mobile',
          'error-recovery'
        ]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup test database
        run: |
          npm run db:test:setup
          npm run db:test:seed
          
      - name: Run regression suite - ${{ matrix.test-suite }}
        run: npm run test:regression:${{ matrix.test-suite }}
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: regression-test-results-${{ matrix.test-suite }}
          path: test-results/
          
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./test-results/summary.json');
            const comment = `
              ## Regression Test Results: ${{ matrix.test-suite }}
              
              ✅ Passed: ${results.passed}
              ❌ Failed: ${results.failed}
              ⏭️ Skipped: ${results.skipped}
              
              ${results.failed > 0 ? '### Failed Tests:\n' + results.failures.join('\n') : ''}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

---

## 📊 Regression Test Metrics Dashboard

### Key Metrics to Track
```typescript
interface RegressionMetrics {
  // Test Health
  totalTests: number;
  passingTests: number;
  failingTests: number;
  flakyTests: number;
  averageRunTime: number;
  
  // Coverage
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  
  // Performance
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Reliability
  crashRate: number;
  errorRate: number;
  recoverySuccessRate: number;
  
  // Trends
  testsTrend: 'improving' | 'stable' | 'degrading';
  performanceTrend: 'improving' | 'stable' | 'degrading';
  coverageTrend: 'improving' | 'stable' | 'degrading';
}
```

---

## ✅ Regression Test Sign-off Checklist

Before any deployment, ALL of these must be checked:

- [ ] All CRITICAL PATH tests passing (100%)
- [ ] No performance regression (metrics within thresholds)
- [ ] Mobile tests passing on real devices
- [ ] Error recovery tests passing
- [ ] Security tests passing
- [ ] No new TypeScript errors
- [ ] No new ESLint warnings
- [ ] Code coverage hasn't decreased
- [ ] Load test with expected traffic passed
- [ ] Manual smoke test completed
- [ ] Rollback procedure tested
- [ ] Monitoring alerts configured

---

## 🚨 When Regression Tests Fail

### Immediate Actions
1. **Stop deployment** - Do not proceed
2. **Identify scope** - Which tests failed?
3. **Check history** - When did they last pass?
4. **Find root cause** - What changed?
5. **Fix or revert** - Fix forward or roll back
6. **Re-run suite** - Verify fix works
7. **Update tests** - If behavior intentionally changed

### Regression Test Maintenance
- Review flaky tests weekly
- Update tests when requirements change
- Add new tests for each bug fix
- Remove obsolete tests quarterly
- Optimize slow tests monthly

---

*This regression suite must pass 100% before v2.1 launch. Each agent contributes tests for their area.*