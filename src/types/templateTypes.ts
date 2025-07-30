/**
 * TypeScript interfaces for Availability Templates System
 * 
 * Defines types for template management, pattern storage, and hook interactions
 */

// =============================================================================
// CORE TEMPLATE INTERFACES
// =============================================================================

export interface AvailabilityTemplate {
  id: string;
  name: string;
  description?: string;
  pattern: WeeklyPattern;
  isPublic: boolean;
  createdBy: number;
  teamId?: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPattern {
  sun: number;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  reason?: string; // Optional reason for the entire pattern
}

// =============================================================================
// TEMPLATE CREATION & EDITING
// =============================================================================

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  pattern: WeeklyPattern;
  isPublic?: boolean;
  teamId?: number;
}

export interface UpdateTemplateRequest {
  id: string;
  name?: string;
  description?: string;
  pattern?: WeeklyPattern;
  isPublic?: boolean;
}

// =============================================================================
// HOOK INTERFACES
// =============================================================================

export interface UseAvailabilityTemplatesReturn {
  templates: AvailabilityTemplate[];
  isLoading: boolean;
  error: string | null;
  
  // Template operations
  saveTemplate: (template: CreateTemplateRequest) => Promise<AvailabilityTemplate>;
  updateTemplate: (update: UpdateTemplateRequest) => Promise<AvailabilityTemplate>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
  useTemplate: (templateId: string) => Promise<void>;
  
  // Utility functions
  refetch: () => Promise<void>;
  clearError: () => void;
}

export interface TemplateFilters {
  teamId?: number;
  createdBy?: number;
  isPublic?: boolean;
  searchQuery?: string;
  sortBy?: 'name' | 'usage_count' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface TemplateManagerProps {
  onApplyTemplate: (pattern: WeeklyPattern) => void;
  currentWeekPattern?: WeeklyPattern;
  teamId?: number;
  currentUserId?: number;
  className?: string;
}

export interface TemplateCardProps {
  template: AvailabilityTemplate;
  onApply: (template: AvailabilityTemplate) => void;
  onEdit?: (template: AvailabilityTemplate) => void;
  onDelete?: (templateId: string) => void;
  showActions?: boolean;
  isOwner?: boolean;
  className?: string;
}

export interface TemplatePatternPreviewProps {
  pattern: WeeklyPattern;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: CreateTemplateRequest) => void;
  initialPattern?: WeeklyPattern;
  teamId?: number;
  isLoading?: boolean;
}

// =============================================================================
// TEMPLATE STATISTICS & ANALYTICS
// =============================================================================

export interface TemplateUsageStats {
  templateId: string;
  templateName: string;
  totalUsage: number;
  recentUsage: number; // Usage in last 30 days
  userCount: number; // Number of unique users
  teamUsage: { teamId: number; teamName: string; usage: number }[];
}

export interface PatternAnalysis {
  pattern: WeeklyPattern;
  totalHours: number;
  workingDays: number;
  efficiency: number; // 0-1 score based on distribution
  balance: number; // 0-1 score for work-life balance
  commonality: number; // How common this pattern is (0-1)
}

// =============================================================================
// DATABASE INTEGRATION
// =============================================================================

export interface TemplateQueryOptions {
  includeUsage?: boolean;
  includeCreatorInfo?: boolean;
  filters?: TemplateFilters;
  limit?: number;
  offset?: number;
}

export interface TemplateSearchResult {
  templates: AvailabilityTemplate[];
  totalCount: number;
  hasMore: boolean;
}

// =============================================================================
// VALIDATION & ERRORS
// =============================================================================

export interface TemplateValidationError {
  field: keyof CreateTemplateRequest | keyof UpdateTemplateRequest;
  message: string;
  code: string;
}

export interface TemplateError {
  type: 'validation' | 'network' | 'permission' | 'not_found' | 'conflict';
  message: string;
  details?: TemplateValidationError[];
  code?: string;
}

// =============================================================================
// PATTERN UTILITIES
// =============================================================================

export interface DayPatternInfo {
  day: keyof Omit<WeeklyPattern, 'reason'>;
  label: string;
  shortLabel: string;
  value: number;
  hours: number;
  status: 'full' | 'half' | 'off';
  color: string;
}

export interface PatternSummary {
  totalHours: number;
  workingDays: number;
  pattern: WeeklyPattern;
  dayBreakdown: DayPatternInfo[];
  isValid: boolean;
  warnings: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const WORK_VALUES = {
  FULL: 1,
  HALF: 0.5,
  OFF: 0,
  SICK: 'X' // Special case handled separately
} as const;

export const HOURS_PER_DAY = {
  [WORK_VALUES.FULL]: 7,
  [WORK_VALUES.HALF]: 3.5,
  [WORK_VALUES.OFF]: 0,
} as const;

export const DAY_LABELS = {
  sun: { full: 'Sunday', short: 'Sun', abbr: 'S', hebrew: 'ראשון' },
  mon: { full: 'Monday', short: 'Mon', abbr: 'M', hebrew: 'שני' },
  tue: { full: 'Tuesday', short: 'Tue', abbr: 'T', hebrew: 'שלישי' },
  wed: { full: 'Wednesday', short: 'Wed', abbr: 'W', hebrew: 'רביעי' },
  thu: { full: 'Thursday', short: 'Thu', abbr: 'R', hebrew: 'חמישי' },
  fri: { full: 'Friday', short: 'Fri', abbr: 'F', hebrew: 'שישי' },
  sat: { full: 'Saturday', short: 'Sat', abbr: 'S', hebrew: 'שבת' },
} as const;

export const TEMPLATE_LIMITS = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TEMPLATES_PER_USER: 50,
  MAX_TEMPLATES_PER_TEAM: 100,
} as const;

// Israeli work week configuration
export const ISRAELI_WORK_WEEK = {
  WORKING_DAYS: ['sun', 'mon', 'tue', 'wed', 'thu'] as const,
  WEEKEND_DAYS: ['fri', 'sat'] as const,
  HOURS_PER_WORKING_DAY: 7,
  WORKING_DAYS_PER_WEEK: 5
} as const;

// =============================================================================
// TYPE GUARDS
// =============================================================================

export const isValidWorkValue = (value: unknown): value is number => {
  return typeof value === 'number' && [0, 0.5, 1].includes(value);
};

export const isValidWeeklyPattern = (pattern: unknown): pattern is WeeklyPattern => {
  if (!pattern || typeof pattern !== 'object') return false;
  
  const p = pattern as Record<string, unknown>;
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  return days.every(day => 
    day in p && isValidWorkValue(p[day])
  );
};

export const isAvailabilityTemplate = (obj: unknown): obj is AvailabilityTemplate => {
  if (!obj || typeof obj !== 'object') return false;
  
  const template = obj as Record<string, unknown>;
  
  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.isPublic === 'boolean' &&
    typeof template.createdBy === 'number' &&
    typeof template.usageCount === 'number' &&
    typeof template.createdAt === 'string' &&
    typeof template.updatedAt === 'string' &&
    isValidWeeklyPattern(template.pattern)
  );
};