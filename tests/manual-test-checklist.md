# Manual Testing Checklist

## Pre-Test Setup
- [ ] Clear browser cache and cookies
- [ ] Clear localStorage and sessionStorage: `localStorage.clear(); sessionStorage.clear();`
- [ ] Use fresh incognito/private window
- [ ] Have test accounts ready: regular user, manager
- [ ] Test on actual mobile devices (not just DevTools)
- [ ] Check for console errors at every step

## Core Functionality Tests

### Authentication & Access (Fixed in Bug Report #27)
- [ ] User can access team selection page without 401 errors
- [ ] Team selection loads without database connection errors
- [ ] User can select their team successfully
- [ ] User can select their name from team list
- [ ] System remembers user selection in localStorage
- [ ] No 401 errors in browser console during initial load
- [ ] No 404 errors for removed COO tables (team_stats, etc.)
- [ ] WebSocket connection establishes successfully
- [ ] Connection string doesn't contain %0A or other malformed characters

### Hour Reporting - Regular User
- [ ] User can view their own schedule (week view)
- [ ] User can view their own schedule (sprint view)
- [ ] User can click on a day to change status
- [ ] Full day (7 hours) saves correctly and immediately
- [ ] Half day (3.5 hours) requires and saves reason properly
- [ ] Absent (0 hours) requires and saves reason properly
- [ ] Changes reflect immediately in UI without page refresh
- [ ] Changes persist after page refresh
- [ ] No console errors during hour updates
- [ ] Real-time updates work between browser tabs

### Hour Reporting - Manager
- [ ] Manager can view all team members in their team
- [ ] Manager can edit any team member's hours
- [ ] Manager changes save correctly to database
- [ ] Manager can add/edit reasons for team members
- [ ] Team overview shows accurate aggregated data
- [ ] Manager cannot access other teams' data (verify in network tab)

### Data Persistence Between Views (CRITICAL FIX - Bug Report #28)
- [ ] Report hours for specific date in week view
- [ ] Switch to sprint view - same hours appear correctly (NO DISAPPEARING DATA)
- [ ] Modify hours in sprint view
- [ ] Switch back to week view - changes persist correctly
- [ ] Navigate to different week, then back - data consistent across both views
- [ ] Refresh page - data remains consistent in both week and sprint views
- [ ] No duplicate entries created by view switching (check database)
- [ ] No extra API calls triggered by navigation mode switching

### Sprint Navigation (Fixed in Bug Report #25)
- [ ] Previous week/sprint button works with single tap (no multiple taps needed)
- [ ] Next week/sprint button works with single tap
- [ ] Navigation buttons respond immediately without delay
- [ ] Date range displays correctly for current period
- [ ] Navigation works consistently in both week and sprint modes
- [ ] No infinite loops or state update chain errors in console
- [ ] No "Maximum update depth exceeded" errors

## Mobile-Specific Tests (Primary User Base - CRITICAL)

### Device Testing Matrix
Test on actual devices - NOT browser DevTools:
- [ ] iPhone Safari (iOS 15+)
- [ ] iPhone Safari (iOS 14)
- [ ] Android Chrome (Android 10+)
- [ ] iPad Safari
- [ ] Android Tablet Chrome

### Mobile Navigation (Fixed in Bug Reports #10-15)
- [ ] Hamburger menu opens/closes without issues
- [ ] No white screen overlays when menu opens
- [ ] Menu closes when tapping backdrop
- [ ] No hydration errors in console during menu interactions
- [ ] Only single navigation system visible (no competing menus)
- [ ] All navigation buttons are tappable with finger
- [ ] Touch targets meet 44x44px minimum size requirement
- [ ] No horizontal scrolling anywhere in the app

### Mobile Touch Interactions (Fixed in Bug Report #41)
- [ ] All buttons respond to single finger tap (no multi-tap needed)
- [ ] Navigation arrows respond to touch immediately
- [ ] Touch events don't conflict with scroll gestures
- [ ] Haptic feedback works on supported devices
- [ ] Visual feedback shows on button press (active states)
- [ ] No accidental activations during scrolling

### Mobile UX Quality
- [ ] Touch targets meet accessibility guidelines (48x48px minimum)
- [ ] Text readable without pinch-zooming
- [ ] Buttons provide clear visual feedback on tap
- [ ] Scrolling is smooth without lag
- [ ] No layout shifts during interactions
- [ ] Loading states show during operations
- [ ] Error messages are clearly visible on small screens

### Mobile Cache & PWA (Fixed in Bug Report #40)
- [ ] App updates properly on mobile devices
- [ ] Cache invalidation works (check with force refresh)
- [ ] Service worker updates correctly
- [ ] PWA install prompt appears appropriately
- [ ] Offline functionality works as expected

## Data Integrity & Persistence (CRITICAL)
- [ ] Update hours and refresh page - data persists exactly
- [ ] Update in one browser, check in another - data syncs in real-time
- [ ] Real-time updates work between different users
- [ ] Database contains correct values (check Supabase dashboard)
- [ ] No duplicate schedule entries created
- [ ] Date ranges calculate correctly across weeks/sprints
- [ ] Sprint boundaries handle correctly (week endings/beginnings)
- [ ] Data consistency maintained across all view modes

## Error Handling & Recovery (Based on Bug Reports #1-5)
- [ ] App handles network disconnection gracefully
- [ ] App recovers automatically when network returns
- [ ] Authentication errors show clear user messages (not technical jargon)
- [ ] Database errors don't crash the interface
- [ ] Invalid data inputs are handled properly with user feedback
- [ ] No infinite loading states occur
- [ ] Error boundaries prevent complete app crashes
- [ ] Retry mechanisms work for failed requests

## Performance Tests (Optimizations from Bug Reports #6-8)
- [ ] Page loads in under 3 seconds on mobile networks
- [ ] Interactions respond within 200ms
- [ ] No lag when switching between week/sprint views
- [ ] No memory leaks after extended use (check DevTools Memory tab)
- [ ] Real-time subscriptions don't accumulate
- [ ] Bundle size is optimized for mobile networks
- [ ] Service worker caching improves subsequent loads

## Hydration & SSR (Critical fixes from Bug Reports #11-15)
- [ ] No hydration mismatch errors in console
- [ ] Mobile detection works consistently between server/client
- [ ] No className conflicts during hydration
- [ ] Components render identically on server and client
- [ ] Page loads work with JavaScript disabled (progressive enhancement)

## Accessibility Tests
- [ ] Screen reader can navigate the interface
- [ ] All interactive elements have proper ARIA labels
- [ ] Keyboard navigation works throughout (Tab, Enter, Escape)
- [ ] Color contrast meets WCAG guidelines
- [ ] Focus indicators are clearly visible
- [ ] Touch targets meet minimum size requirements (44px)
- [ ] Text scaling works properly up to 200%

## Regression Prevention (Based on Fixed Bugs)
- [ ] No 401 authentication errors during normal usage
- [ ] No 404 errors for removed COO functionality
- [ ] No infinite state update loops in navigation
- [ ] No data disappearing when switching views
- [ ] No mobile navigation conflicts or white screens
- [ ] No hydration errors on mobile devices
- [ ] No cache invalidation issues on mobile browsers
- [ ] No touch interaction failures

## Critical User Workflows End-to-End
### New User First Experience
1. [ ] Access application URL
2. [ ] Load team selection page
3. [ ] Select team from dropdown
4. [ ] Select user name from team members
5. [ ] Navigate to personal schedule
6. [ ] Report hours for current day
7. [ ] Verify data saves and persists

### Manager Daily Workflow
1. [ ] Login and select team
2. [ ] View team availability overview
3. [ ] Edit team member hours
4. [ ] Add reasons for absences/half days
5. [ ] Switch between week and sprint views
6. [ ] Verify all changes persist correctly

### Mobile User Workflow
1. [ ] Access app on mobile device
2. [ ] Use hamburger menu for navigation
3. [ ] Report hours using touch interface
4. [ ] Switch between views (week/sprint)
5. [ ] Verify responsive design and usability

## Console Error Monitoring
Throughout all testing, monitor browser console for:
- [ ] No authentication (401) errors
- [ ] No database (404/500) errors  
- [ ] No hydration mismatch warnings
- [ ] No infinite loop/state update errors
- [ ] No WebSocket connection failures
- [ ] No service worker errors
- [ ] No JavaScript runtime errors

## Performance Monitoring
During testing, monitor:
- [ ] Network requests are optimized (no unnecessary calls)
- [ ] Memory usage stays stable during extended use
- [ ] CPU usage remains reasonable during interactions
- [ ] Bundle size is appropriate for mobile networks
- [ ] Cache hit ratios are high for returning users

## Test Results Documentation
For each failed test:
1. Document exact steps to reproduce
2. Include browser/device information
3. Capture console errors/warnings
4. Note any workarounds discovered
5. Classify severity (Critical/High/Medium/Low)

## Pass/Fail Criteria
**Critical (Must Pass):**
- Authentication works without errors
- Data persists between view switches
- Mobile navigation is fully functional
- No hydration errors occur
- Core hour reporting functionality works

**High Priority:**
- Real-time updates work correctly
- Performance meets mobile standards
- Error handling is user-friendly
- Accessibility standards are met

**Testing Complete When:**
- All Critical tests pass
- All High Priority tests pass
- No new console errors introduced
- Mobile experience is fully functional
- Data integrity is maintained across all workflows