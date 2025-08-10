# Centralized Error Handling System

## Overview

The Team Availability Tracker now features a comprehensive centralized error handling system that provides consistent error classification, recovery mechanisms, user-friendly messaging, and detailed debugging capabilities.

## Architecture

### Core Components

1. **Error Types System** (`src/types/errors.ts`)
   - Comprehensive error classification hierarchy
   - Severity levels (Critical, High, Medium, Low, Info)
   - Recovery strategies (Retry, Refresh, Fallback, etc.)
   - Predefined error codes and user messages

2. **Centralized Error Handler** (`src/utils/errorHandler.ts`)
   - Automatic error classification
   - Retry logic with exponential backoff
   - Error recovery mechanisms
   - Structured error logging and reporting

3. **Error Boundary Components** (`src/components/ErrorBoundary.tsx`)
   - React error boundaries for different levels (Page, Section, Component)
   - Graceful fallback UI with recovery options
   - Automatic error recovery attempts

4. **Error Boundary Hook** (`src/hooks/useErrorBoundary.tsx`)
   - Programmatic error handling for functional components
   - Async operation error handling
   - Integration with centralized error system

5. **Error Display Components** (`src/components/ui/ErrorDisplay.tsx`)
   - Standardized error UI components
   - Multiple variants (inline, card, banner, modal)
   - Context-aware error messaging

## Usage Examples

### Basic Error Handling with Hook

```typescript
import { useErrorBoundary } from '@/hooks/useErrorBoundary';

function MyComponent() {
  const errorBoundary = useErrorBoundary({
    enableRecovery: true,
    maxRetries: 3,
    context: { component: 'MyComponent' }
  });

  const handleAsyncOperation = async () => {
    try {
      const result = await someAsyncOperation();
      return result;
    } catch (error) {
      await errorBoundary.captureError(error, { action: 'async_operation' });
    }
  };

  if (errorBoundary.hasError) {
    return (
      <ErrorDisplay
        error={errorBoundary.error}
        onRetry={errorBoundary.retry}
        onDismiss={errorBoundary.dismiss}
      />
    );
  }

  return <div>Component content</div>;
}
```

### Database Service Integration

```typescript
import { handleError, retryOperation } from '@/utils/errorHandler';
import { ErrorCategory } from '@/types/errors';

export const DatabaseService = {
  async getData() {
    try {
      const operation = async () => {
        const { data, error } = await supabase.from('table').select('*');
        if (error) throw new Error(error.message);
        return data;
      };

      return await retryOperation(operation, {
        enabled: true,
        maxAttempts: 3,
        retryableErrors: [ErrorCategory.DATABASE, ErrorCategory.NETWORK]
      });
    } catch (error) {
      const appError = await handleError(error, {
        component: 'DatabaseService',
        action: 'getData'
      });
      throw appError;
    }
  }
};
```

### Component-Level Error Boundaries

```typescript
import ErrorBoundary, { SectionErrorBoundary } from '@/components/ErrorBoundary';

function MyApp() {
  return (
    <ErrorBoundary level="page">
      <Header />
      <SectionErrorBoundary>
        <MainContent />
      </SectionErrorBoundary>
      <Footer />
    </ErrorBoundary>
  );
}
```

## Error Categories

- **Network**: Connection issues, timeouts, API failures
- **Database**: Query failures, connection issues, constraint violations
- **Validation**: Input validation, format errors, required field issues
- **Authentication**: Token expiration, invalid credentials, session issues
- **Authorization**: Permission denied, access control violations
- **Business Logic**: Rule violations, data conflicts, operation restrictions
- **UI**: Component rendering errors, state management issues
- **System**: Configuration errors, memory issues, unknown errors

## Recovery Strategies

- **Retry**: Automatic retry with exponential backoff
- **Refresh**: Reload current view or data
- **Fallback**: Use cached/default data
- **Redirect**: Navigate to different page
- **Reset**: Reset component state
- **Manual**: User intervention required
- **Graceful Degradation**: Reduce functionality but continue

## Error Severity Levels

- **Critical**: App-breaking errors requiring immediate attention
- **High**: Major functionality impacted, app remains usable
- **Medium**: Minor functionality issues
- **Low**: Warnings or minor issues
- **Info**: Informational messages

## Configuration

The error handler can be configured globally:

```typescript
import { errorHandler } from '@/utils/errorHandler';

// Configure error handling behavior
const config = {
  enableRetry: true,
  maxRetries: 3,
  enableLogging: true,
  enableUserNotifications: true,
  enableErrorReporting: true
};
```

## Best Practices

1. **Use Appropriate Error Boundaries**: Place error boundaries at strategic levels (page, section, component)

2. **Provide Context**: Always provide meaningful context when capturing errors

3. **Handle Async Operations**: Use the async operation hook for handling promises

4. **User-Friendly Messages**: Rely on the centralized system for consistent messaging

5. **Error Recovery**: Implement appropriate recovery strategies for different error types

6. **Debugging Information**: Enable detailed error information in development

## Integration Points

### Existing Components Updated

- `COOExecutiveDashboard`: Enhanced with centralized error handling
- `DatabaseService`: Updated with retry logic and proper error classification
- Application Layout: Added page-level error boundary

### State Management Integration

The error handling system integrates with the existing centralized state management:

```typescript
// Enhanced ErrorState in src/types/state.ts
export interface ErrorState {
  global: AppError | string | null;
  dashboard: AppError | string | null;
  // ... other domain-specific errors
}

export interface EnhancedErrorState extends ErrorState {
  errorHistory: Array<{
    error: AppError;
    timestamp: Date;
    resolved: boolean;
  }>;
  recoveryAttempts: Record<string, {
    count: number;
    lastAttempt: Date;
    successful: boolean;
  }>;
  // ... additional metadata
}
```

## Monitoring and Analytics

The system provides built-in error tracking and analytics:

- Error frequency and patterns
- Recovery success rates
- User impact assessment
- Performance impact monitoring

## Future Enhancements

- Integration with external error reporting services (Sentry, LogRocket)
- Advanced error pattern detection
- Predictive error prevention
- Enhanced mobile error handling
- Real-time error monitoring dashboard

## Testing

The error handling system includes comprehensive error scenarios:

- Network failures and timeouts
- Database connection issues
- Validation failures
- Authentication errors
- Component rendering errors

## Migration Guide

For existing components, follow this migration pattern:

1. Import the error handling utilities
2. Replace manual try-catch with centralized error handling
3. Add error boundaries at appropriate levels
4. Use standardized error display components
5. Test error scenarios and recovery flows

This centralized error handling system ensures consistent, user-friendly error experiences while providing developers with powerful debugging and recovery capabilities.