# Centralized State Management System

This document describes the centralized state management system that has been implemented to replace scattered `useState` calls throughout the application.

## Overview

The centralized state management system provides:
- **Unified State Structure**: All application state is managed in a single, typed structure
- **Specialized Hooks**: Purpose-built hooks for different aspects of the application
- **Real-time Debugging**: DevTools integration and debugging utilities
- **Performance Optimization**: Optimized re-rendering and state updates
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Architecture

### Core Components

1. **State Types** (`src/types/state.ts`)
   - Comprehensive type definitions for all state shapes
   - Action types for state updates
   - Selector interfaces

2. **State Reducer** (`src/lib/appState.ts`)
   - Pure reducer function handling all state transitions
   - Action creators and selectors
   - Performance monitoring integration

3. **Context Provider** (`src/contexts/AppStateContext.tsx`)
   - React context provider wrapping the application
   - DevTools integration
   - Error boundary support

4. **Specialized Hooks** (`src/hooks/useAppState.ts`)
   - Purpose-built hooks for different state domains
   - Optimized selectors and actions

## Quick Start

### 1. Wrap Your Application

```tsx
import { AppStateProvider } from '@/contexts/AppStateContext';

function App() {
  return (
    <AppStateProvider>
      <YourAppComponents />
    </AppStateProvider>
  );
}
```

### 2. Use Specialized Hooks

```tsx
import { useLoadingState, useTeamsState, useNotifications } from '@/hooks/useAppState';

function MyComponent() {
  const { dashboard: isLoading, setDashboardLoading } = useLoadingState();
  const { teams, setTeams, selectedTeam, selectTeam } = useTeamsState();
  const { showSuccess, showError } = useNotifications();

  // Use the state and actions as needed
  // ...
}
```

## Available Hooks

### Core State Hooks

- `useLoadingState()` - Manage loading states for different parts of the app
- `useErrorState()` - Manage error states and error handling
- `useModalState()` - Control modal open/close states
- `useNavigationState()` - Manage navigation and active tabs
- `useNotifications()` - Show success/error/warning notifications

### Data State Hooks

- `useTeamsState()` - Manage teams data and selection
- `useMembersState()` - Manage team members data
- `useSprintsState()` - Manage sprint information
- `useSchedulesState()` - Manage schedule data and entries
- `useDashboardState()` - Manage dashboard data and charts

### Utility Hooks

- `useUserState()` - Manage current user and permissions
- `useCacheState()` - Manage cache timestamps and invalidation
- `useRefreshUtilities()` - Trigger data refresh operations

## Migration Guide

### Before (Old Pattern)
```tsx
function MyComponent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Component logic...
}
```

### After (Centralized State)
```tsx
function MyComponent() {
  const { dashboard: loading, setDashboardLoading } = useLoadingState();
  const { dashboard: error, setDashboardError } = useErrorState();
  const { teams, setTeams } = useTeamsState();
  
  // Component logic...
}
```

## Debugging and Development

### DevTools Integration

The state system includes Redux DevTools integration for development:

1. Install Redux DevTools browser extension
2. Open DevTools and navigate to Redux tab
3. Monitor state changes in real-time

### Debug Utilities

Access debug utilities in the browser console:

```javascript
// Access global debug utilities
window.__TEAM_TRACKER_DEBUG__.inspectState();
window.__TEAM_TRACKER_DEBUG__.getPerformanceMetrics();
window.__TEAM_TRACKER_DEBUG__.exportState();

// Validate state system
window.__validateStateSystem();
```

### State Inspector Hook

```tsx
import { useStateDebugger } from '@/contexts/AppStateContext';

function DebugComponent() {
  const debug = useStateDebugger();
  
  const handleInspect = () => {
    debug.inspectState();
    debug.analyzePerformance();
    debug.showHistory();
  };
  
  // ...
}
```

## Performance Considerations

### Optimized Re-rendering

The system is designed to minimize unnecessary re-renders:

- **Selective Updates**: Only components using changed state re-render
- **Memoized Selectors**: Selectors are memoized to prevent recalculation
- **Batched Updates**: Multiple state changes are batched together

### Memory Management

- **Automatic Cleanup**: Old notifications and history entries are automatically cleaned
- **Cache Invalidation**: Stale cache entries are automatically invalidated
- **Lazy Loading**: Heavy components are loaded only when needed

## Testing

### Unit Tests

Run the integration tests to verify the system:

```bash
npm test src/tests/state-integration.test.ts
```

### Validation

Validate the state system setup:

```tsx
import { validateStateSystem } from '@/utils/validateStateSystem';

const result = validateStateSystem();
console.log(result);
```

## Common Patterns

### Loading States

```tsx
function DataComponent() {
  const { dashboard: loading, setDashboardLoading } = useLoadingState();
  const { showError } = useNotifications();
  
  const loadData = async () => {
    setDashboardLoading(true);
    try {
      const data = await fetchData();
      // Handle success
    } catch (error) {
      showError('Load Error', 'Failed to load data');
    } finally {
      setDashboardLoading(false);
    }
  };
}
```

### Modal Management

```tsx
function ComponentWithModal() {
  const { teamDetail } = useModalState();
  
  const handleOpenModal = (teamId: number) => {
    teamDetail.open(teamId);
  };
  
  return (
    <>
      <button onClick={() => handleOpenModal(1)}>
        Open Team Modal
      </button>
      
      <TeamModal 
        isOpen={teamDetail.isOpen}
        onClose={teamDetail.close}
      />
    </>
  );
}
```

### Form State

```tsx
function FormComponent() {
  const { showSuccess, showError } = useNotifications();
  const { setTeams } = useTeamsState();
  
  const handleSubmit = async (data: FormData) => {
    try {
      const newTeam = await createTeam(data);
      setTeams(prevTeams => [...prevTeams, newTeam]);
      showSuccess('Success', 'Team created successfully');
    } catch (error) {
      showError('Error', 'Failed to create team');
    }
  };
}
```

## Migration Status

### Completed Migrations

- ✅ **COOExecutiveDashboard**: Fully migrated to centralized state
- ✅ **ScheduleTable**: Migrated with centralized state hooks
- ✅ **Core State System**: All infrastructure components completed

### Remaining Migrations

Components that still need migration:
- MobileCOODashboard
- TeamDetailModal
- ConsolidatedAnalytics (partial)
- Various modal components

### Migration Checklist

For each component migration:

1. [ ] Replace `useState` calls with appropriate hooks
2. [ ] Update loading/error handling to use centralized state
3. [ ] Migrate modal state management
4. [ ] Update data fetching to use centralized patterns
5. [ ] Test component functionality
6. [ ] Verify no performance regressions

## Troubleshooting

### Common Issues

1. **Hook not found**: Ensure component is wrapped with `AppStateProvider`
2. **State not updating**: Check that actions are being called correctly
3. **Performance issues**: Use the performance debugging utilities
4. **Type errors**: Ensure state types are properly imported

### Debug Steps

1. Check browser console for state system validation
2. Use Redux DevTools to monitor state changes
3. Run integration tests to verify system integrity
4. Use performance profiler to identify bottlenecks

## Best Practices

1. **Use Appropriate Hooks**: Choose the most specific hook for your needs
2. **Batch State Updates**: Group related state changes together
3. **Handle Errors Gracefully**: Always provide error handling
4. **Monitor Performance**: Use debugging tools to track performance
5. **Type Safety**: Leverage TypeScript for compile-time safety

## Future Enhancements

Planned improvements:
- State persistence to localStorage
- Advanced caching strategies
- Real-time synchronization
- Advanced performance monitoring
- State time-travel debugging

## Support

For questions or issues:
1. Check this documentation
2. Run the validation utility
3. Use the debugging tools
4. Review the integration tests