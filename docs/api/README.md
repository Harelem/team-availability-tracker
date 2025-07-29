# API Documentation

Complete API reference for the Team Availability Tracker analytics system, data models, and core functionality.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Core Data Models](#core-data-models)
- [Analytics API](#analytics-api)
- [Team Management API](#team-management-api)
- [Schedule Management API](#schedule-management-api)
- [Notification API](#notification-api)
- [Utilities & Helpers](#utilities--helpers)
- [Error Handling](#error-handling)
- [WebSocket Events](#websocket-events)

## 🔐 Authentication

All API endpoints require authentication using Supabase JWT tokens.

### Authentication Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### User Context
```typescript
interface AuthUser {
  id: string;
  email: string;
  role: 'team_member' | 'manager' | 'coo';
  team_id?: string;
  permissions: string[];
}
```

## 📊 Core Data Models

### Team Member
```typescript
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'developer' | 'designer' | 'manager' | 'qa' | 'product_manager';
  team_id: string;
  start_date: string;
  is_active: boolean;
  availability_status: 'available' | 'pto' | 'sick' | 'meeting' | 'focused';
  hours_per_day: number;
  created_at: string;
  updated_at: string;
}
```

### Team
```typescript
interface Team {
  id: string;
  name: string;
  description?: string;
  manager_id: string;
  created_at: string;
  updated_at: string;
  settings: {
    default_hours_per_day: number;
    sprint_length_days: number;
    focus_factor: number;
  };
}
```

### Sprint
```typescript
interface Sprint {
  id: string;
  name: string;
  team_id: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  planned_capacity: number;
  actual_capacity?: number;
  story_points_planned: number;
  story_points_completed?: number;
  created_at: string;
  updated_at: string;
}
```

### Schedule Entry
```typescript
interface ScheduleEntry {
  id: string;
  member_id: string;
  date: string;
  value: "1" | "0.5" | "X"; // Full day, Half day, Off
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

### Performance Metrics
```typescript
interface PerformanceMetrics {
  team_id: string;
  sprint_id?: string;
  period_start: string;
  period_end: string;
  velocity: {
    current: number;
    average: number;
    trend: number;
  };
  utilization: {
    current: number;
    target: number;
    variance: number;
  };
  stability: {
    team_turnover: number;
    consistency_score: number;
  };
  quality: {
    delivery_accuracy: number;
    estimation_accuracy: number;
  };
  overall_score: number;
  calculated_at: string;
}
```

### Alert
```typescript
interface Alert {
  id: string;
  type: 'capacity' | 'performance' | 'burnout' | 'quality' | 'system';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  team_id?: string;
  member_id?: string;
  metric_value?: number;
  threshold_value?: number;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}
```

## 📈 Analytics API

### Get Team Performance
```http
GET /api/analytics/teams/{teamId}/performance
```

**Query Parameters:**
- `period`: `sprint` | `week` | `month` | `quarter` (default: `sprint`)
- `sprints`: Number of sprints to analyze (default: `6`)
- `include_predictions`: boolean (default: `false`)

**Response:**
```typescript
interface TeamPerformanceResponse {
  team_id: string;
  period: {
    start_date: string;
    end_date: string;
    sprints_analyzed: number;
  };
  metrics: PerformanceMetrics;
  trends: {
    velocity_trend: number[];
    utilization_trend: number[];
    quality_trend: number[];
  };
  predictions?: {
    next_sprint_velocity: number;
    capacity_forecast: number;
    risk_factors: string[];
  };
  recommendations: string[];
}
```

### Get Company-wide Analytics
```http
GET /api/analytics/company
```

**Query Parameters:**
- `period`: `week` | `month` | `quarter` (default: `month`)
- `include_teams`: boolean (default: `true`)

**Response:**
```typescript
interface CompanyAnalyticsResponse {
  period: {
    start_date: string;
    end_date: string;
  };
  overview: {
    total_teams: number;
    active_members: number;
    average_utilization: number;
    overall_health_score: number;
  };
  performance: {
    velocity_by_team: Array<{
      team_id: string;
      team_name: string;
      velocity: number;
      trend: number;
    }>;
    utilization_distribution: {
      under_utilized: number;
      optimal: number;
      over_utilized: number;
    };
    quality_metrics: {
      on_time_delivery: number;
      estimation_accuracy: number;
    };
  };
  alerts: {
    active_count: number;
    by_severity: Record<string, number>;
    recent: Alert[];
  };
  insights: string[];
}
```

### Generate Capacity Forecast
```http
POST /api/analytics/teams/{teamId}/forecast
```

**Request Body:**
```typescript
interface ForecastRequest {
  sprints_ahead: number;
  scenario?: 'optimistic' | 'realistic' | 'pessimistic';
  include_risk_analysis: boolean;
}
```

**Response:**
```typescript
interface ForecastResponse {
  team_id: string;
  forecasts: Record<string, {
    sprint_number: number;
    predicted_velocity: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
    capacity_hours: number;
    risk_factors: string[];
  }>;
  model_accuracy: number;
  recommendations: string[];
}
```

### Burnout Risk Assessment
```http
GET /api/analytics/teams/{teamId}/burnout-risk
```

**Response:**
```typescript
interface BurnoutRiskResponse {
  team_id: string;
  overall_risk_score: number; // 0-1
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  member_risks: Array<{
    member_id: string;
    member_name: string;
    risk_score: number;
    risk_factors: string[];
    recommendations: string[];
  }>;
  team_factors: {
    workload_variability: number;
    overtime_frequency: number;
    velocity_inconsistency: number;
    team_stability: number;
  };
  historical_patterns: {
    burnout_incidents: number;
    recovery_time_avg: number;
  };
  preventive_measures: string[];
}
```

### Get Real-time Insights
```http
GET /api/analytics/insights
```

**Query Parameters:**
- `team_id`: Filter by specific team
- `severity`: Filter by alert severity
- `category`: Filter by insight category
- `limit`: Number of insights to return (default: 10)

**Response:**
```typescript
interface InsightsResponse {
  insights: Array<{
    id: string;
    type: 'alert' | 'trend' | 'recommendation' | 'achievement';
    severity: 'info' | 'warning' | 'error' | 'success';
    title: string;
    description: string;
    team_id?: string;
    team_name?: string;
    metric_value?: number;
    change_percentage?: number;
    actionable: boolean;
    actions?: Array<{
      id: string;
      label: string;
      endpoint: string;
      method: string;
    }>;
    timestamp: string;
  }>;
  total_count: number;
  has_more: boolean;
}
```

## 👥 Team Management API

### List Teams
```http
GET /api/teams
```

**Response:**
```typescript
interface TeamsResponse {
  teams: Array<Team & {
    member_count: number;
    manager_name: string;
    current_sprint?: {
      id: string;
      name: string;
      status: string;
    };
  }>;
  total_count: number;
}
```

### Get Team Details
```http
GET /api/teams/{teamId}
```

**Response:**
```typescript
interface TeamDetailsResponse {
  team: Team;
  members: TeamMember[];
  current_sprint?: Sprint;
  recent_performance: PerformanceMetrics;
  active_alerts: Alert[];
}
```

### Update Team Settings
```http
PATCH /api/teams/{teamId}
```

**Request Body:**
```typescript
interface UpdateTeamRequest {
  name?: string;
  description?: string;
  settings?: Partial<Team['settings']>;
}
```

## 📅 Schedule Management API

### Get Schedule
```http
GET /api/teams/{teamId}/schedule
```

**Query Parameters:**
- `start_date`: ISO date string
- `end_date`: ISO date string
- `member_id`: Filter by specific member

**Response:**
```typescript
interface ScheduleResponse {
  team_id: string;
  period: {
    start_date: string;
    end_date: string;
  };
  schedule: Array<{
    date: string;
    entries: Array<{
      member_id: string;
      member_name: string;
      value: "1" | "0.5" | "X";
      notes?: string;
    }>;
    total_capacity: number;
    utilization_percentage: number;
  }>;
  summary: {
    total_planned_hours: number;
    total_available_hours: number;
    utilization_rate: number;
    off_days_count: number;
  };
}
```

### Update Schedule Entry
```http
POST /api/schedule/entries
```

**Request Body:**
```typescript
interface UpdateScheduleRequest {
  member_id: string;
  date: string;
  value: "1" | "0.5" | "X";
  notes?: string;
}
```

### Bulk Update Schedule
```http
POST /api/schedule/bulk-update
```

**Request Body:**
```typescript
interface BulkScheduleUpdate {
  team_id: string;
  updates: Array<{
    member_id: string;
    date: string;
    value: "1" | "0.5" | "X";
    notes?: string;
  }>;
}
```

## 🔔 Notification API

### Get Notifications
```http
GET /api/notifications
```

**Query Parameters:**
- `unread_only`: boolean
- `type`: Notification type filter
- `limit`: Number of notifications (default: 20)

**Response:**
```typescript
interface NotificationsResponse {
  notifications: Array<{
    id: string;
    type: 'alert' | 'reminder' | 'update' | 'achievement';
    title: string;
    message: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
  }>;
  unread_count: number;
}
```

### Subscribe to Push Notifications
```http
POST /api/notifications/subscribe
```

**Request Body:**
```typescript
interface SubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  preferences: {
    alerts: boolean;
    reminders: boolean;
    achievements: boolean;
  };
}
```

## 🛠️ Utilities & Helpers

### Calculation Service
```typescript
// Calculate sprint potential
function calculateSprintPotential(input: {
  teamMembers: number;
  sprintDays: number;
  hoursPerDay: number;
}): number;

// Calculate adjusted capacity
function calculateAdjustedCapacity(input: {
  baseCapacity: number;
  focusFactor: number;
  vacationHours: number;
  meetingHours: number;
}): number;

// Calculate team utilization
function calculateTeamUtilization(input: {
  actualHours: number;
  availableHours: number;
}): number;
```

### Data Transformers
```typescript
// Transform capacity data for charts
function transformSprintCapacityData(
  sprints: Sprint[]
): ChartDataPoint[];

// Transform utilization data
function transformUtilizationDistributionData(
  teams: Array<{ name: string; utilization: number }>
): UtilizationDistributionData[];
```

### Date Utilities
```typescript
// Calculate working days between dates
function calculateWorkingDaysBetween(
  startDate: Date,
  endDate: Date
): number;

// Get sprint date range
function getSprintDateRange(
  startDate: Date,
  lengthInDays: number
): { start: Date; end: Date };
```

## ❌ Error Handling

### Standard Error Response
```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}
```

### Common Error Codes
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## 🔄 WebSocket Events

### Connection
```javascript
// Connect to real-time updates
const ws = new WebSocket('wss://api.example.com/ws');
```

### Event Types
```typescript
interface WebSocketEvent {
  type: 'alert' | 'schedule_update' | 'performance_update' | 'team_update';
  data: any;
  timestamp: string;
}
```

### Subscribe to Team Events
```javascript
ws.send(JSON.stringify({
  action: 'subscribe',
  channel: `team:${teamId}`,
  events: ['alerts', 'schedule_updates']
}));
```

### Real-time Alert
```typescript
interface AlertEvent {
  type: 'alert';
  data: {
    alert: Alert;
    team_id: string;
    affected_members?: string[];
  };
}
```

## 🔍 Query Examples

### Complex Analytics Query
```http
GET /api/analytics/teams/123/performance?period=quarter&include_predictions=true&sprints=12
```

### Multi-team Comparison
```http
POST /api/analytics/compare
```

```json
{
  "team_ids": ["123", "456", "789"],
  "metrics": ["velocity", "utilization", "quality"],
  "period": "month"
}
```

### Custom Insight Generation
```http
POST /api/analytics/insights/generate
```

```json
{
  "team_id": "123",
  "analysis_type": "capacity_planning",
  "parameters": {
    "upcoming_sprints": 4,
    "include_risk_factors": true,
    "scenario": "realistic"
  }
}
```

## 📖 Usage Examples

### JavaScript/TypeScript Client
```typescript
import { ApiClient } from './api-client';

const client = new ApiClient({
  baseURL: 'https://api.example.com',
  token: 'your-jwt-token'
});

// Get team performance
const performance = await client.analytics.getTeamPerformance('123', {
  period: 'sprint',
  sprints: 6
});

// Subscribe to real-time insights
client.insights.subscribe((insight) => {
  console.log('New insight:', insight);
});
```

### React Hook Example
```typescript
function useTeamAnalytics(teamId: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const performance = await api.analytics.getTeamPerformance(teamId);
        setData(performance);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [teamId]);

  return { data, loading };
}
```

---

## 📚 Additional Resources

- [Authentication Guide](./auth.md)
- [Rate Limiting](./rate-limiting.md)
- [Webhook Documentation](./webhooks.md)
- [SDK Documentation](./sdk.md)
- [Migration Guide](./migration.md)

For more detailed examples and integration guides, visit our [Developer Portal](https://developers.example.com).