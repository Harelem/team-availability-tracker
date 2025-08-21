# Sprint System Deployment Guide
**CRITICAL: Follow these steps in exact order**

## 🚨 Pre-Deployment Checklist

### 1. Create Backup
```bash
# Create database backup before migration
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### 2. Test Environment Verification
```bash
# Verify environment variables
echo $DATABASE_URL
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 📊 Phase 1: Database Migration

### Step 1: Apply Database Migration
```bash
# Navigate to project directory
cd /Users/harel/team-availability-tracker

# Apply the enhanced sprint system migration
psql $DATABASE_URL -f sql/enhanced-sprint-system-v2.3.0.sql
```

### Step 2: Verify Migration Success
```sql
-- Check if new tables exist
\dt enhanced_sprint_configs
\dt sprint_working_days

-- Verify current sprint view
SELECT * FROM current_enhanced_sprint;

-- Check team analytics
SELECT team_name, total_members, max_capacity_hours 
FROM team_sprint_analytics 
LIMIT 5;
```

### Step 3: Data Migration Verification
```sql
-- Check if existing schedule entries were linked to sprint
SELECT COUNT(*) as total_entries,
       COUNT(sprint_id) as linked_to_sprint,
       COUNT(*) - COUNT(sprint_id) as unlinked_entries
FROM schedule_entries;

-- Should show most entries now have sprint_id
```

## 🔧 Phase 2: Component Integration

### Step 1: Update Package Dependencies
```bash
npm install
npm audit fix
```

### Step 2: Run Tests
```bash
# Run the new sprint logic tests
npm test -- sprintLogic.test.ts

# Run existing tests to ensure no regression
npm test
```

### Step 3: Replace Components (Manual Steps)

#### A. Update COOExecutiveDashboard.tsx
Find and replace the import:
```typescript
// OLD:
import GlobalSprintSettings from './GlobalSprintSettings';

// NEW:
import EnhancedGlobalSprintSettings from './EnhancedGlobalSprintSettings';
```

Find and replace the component usage:
```typescript
// OLD:
<GlobalSprintSettings
  isOpen={showSprintSettings}
  onClose={() => setShowSprintSettings(false)}
/>

// NEW:
<EnhancedGlobalSprintSettings
  isOpen={showSprintSettings}
  onClose={() => setShowSprintSettings(false)}
  currentUser={currentUser}
  onSprintCreated={(sprint) => {
    console.log('New sprint created:', sprint);
    refreshDashboard();
  }}
/>
```

#### B. Update Team Dashboard Components
1. Replace weekly table components with FullSprintTable
2. Update data fetching to use enhancedDatabaseService
3. Implement sprint-based view instead of weekly view

## 🚀 Phase 3: Frontend Integration

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Test Core Functionality
1. **COO Sprint Management**:
   - Navigate to COO dashboard
   - Open sprint settings
   - Verify sprint configuration works
   - Test creating new sprint

2. **Manager Dashboard**:
   - Navigate to team dashboard
   - Verify sprint table displays
   - Test setting availability
   - Check manager restrictions (0.5/X only)

3. **Mobile Interface**:
   - Test on mobile device/emulator
   - Verify touch interactions
   - Check responsiveness

### Step 3: Performance Verification
```bash
# Run performance tests
npm run test:performance

# Check database query performance
npm run audit:performance
```

## 📱 Phase 4: Mobile Optimization

### Step 1: Update Mobile Components
Replace MobileScheduleView imports and usage with sprint-based versions.

### Step 2: Test Mobile Functionality
- Touch targets minimum 44px ✓
- Swipe navigation works ✓
- Modal backgrounds semi-transparent ✓
- Weekend auto-exclusion visible ✓

## 🔍 Phase 5: Validation & Testing

### Step 1: Functional Testing
```bash
# Test sprint logic
npm test -- sprintLogic.test.ts

# Test integration
npm run test:integration

# Test mobile
npm run test:mobile
```

### Step 2: Manual Testing Checklist
- [ ] COO can create sprints with working days calculation
- [ ] Weekends auto-generate as X for all users
- [ ] Managers only see 0.5/X options
- [ ] Sprint table shows entire sprint (not weekly)
- [ ] Mobile interface responsive
- [ ] Database performance acceptable
- [ ] Modal backgrounds are dimmed (not black)

## 🚨 Troubleshooting

### Database Issues
```sql
-- If migration fails, check constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'enhanced_sprint_configs'::regclass;

-- If data migration incomplete
UPDATE schedule_entries 
SET sprint_id = (SELECT id FROM enhanced_sprint_configs WHERE is_active = true LIMIT 1)
WHERE sprint_id IS NULL;
```

### Component Issues
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### Performance Issues
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM team_sprint_analytics;

-- Monitor database connections
SELECT COUNT(*) FROM pg_stat_activity;
```

## ✅ Success Verification

### Final Checklist
- [ ] Database migration successful
- [ ] All tests passing
- [ ] COO sprint creation works
- [ ] Manager dashboards show sprint data
- [ ] Mobile interface functional
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Weekend auto-exclusion working

## 🎯 Next Steps After Deployment

1. **Monitor Performance**: Check Supabase dashboard for query performance
2. **User Testing**: Have key users test the new sprint workflow
3. **Documentation**: Update user guides for sprint-based planning
4. **Feedback Collection**: Gather user feedback for iterations
5. **Performance Optimization**: Monitor and optimize based on real usage

---

**IMPORTANT**: This deployment changes the core workflow from weekly to sprint-based planning. Ensure all stakeholders are informed of the change.
