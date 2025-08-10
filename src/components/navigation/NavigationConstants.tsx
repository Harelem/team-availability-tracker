/**
 * Navigation Constants
 * 
 * Centralized configuration for all mobile navigation items, routes, and permissions.
 * Provides consistent navigation structure across the entire application.
 */

import { 
  Home, 
  Calendar, 
  Users, 
  BarChart3,
  Menu,
  Settings,
  LogOut,
  User,
  Building2,
  Activity,
  Archive,
  Download,
  Shield,
  Bell,
  HelpCircle,
  Accessibility,
  Moon,
  Sun,
  RefreshCw,
  FileText,
  TrendingUp,
  Clock,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';

// Navigation Item Types
export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  onClick?: () => void;
  badge?: number;
  disabled?: boolean;
  requiresAuth?: boolean;
  permissions?: ('manager' | 'coo' | 'member')[];
  group?: 'primary' | 'secondary' | 'admin' | 'user';
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
  collapsible?: boolean;
}

// User Role Types
export type UserRole = 'member' | 'manager' | 'coo' | 'admin';

export interface NavigationUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  hebrew?: string;
  isManager?: boolean;
  isCOO?: boolean;
}

// Primary Bottom Tab Navigation
export const PRIMARY_NAVIGATION: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/',
    group: 'primary',
    requiresAuth: true
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Calendar,
    path: '/schedule',
    group: 'primary',
    requiresAuth: true
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users,
    path: '/teams',
    group: 'primary',
    requiresAuth: true
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
    group: 'primary',
    requiresAuth: true,
    permissions: ['manager', 'coo']
  },
  {
    id: 'menu',
    label: 'More',
    icon: Menu,
    group: 'primary'
  }
];

// COO-Specific Navigation Items
export const COO_NAVIGATION: NavigationItem[] = [
  {
    id: 'executive-dashboard',
    label: 'Executive',
    icon: Building2,
    path: '/executive',
    group: 'primary',
    requiresAuth: true,
    permissions: ['coo']
  },
  {
    id: 'company-analytics',
    label: 'Company Analytics',
    icon: TrendingUp,
    path: '/company-analytics',
    group: 'secondary',
    requiresAuth: true,
    permissions: ['coo']
  },
  {
    id: 'workforce-status',
    label: 'Workforce Status',
    icon: Activity,
    path: '/workforce-status',
    group: 'secondary',
    requiresAuth: true,
    permissions: ['coo']
  }
];

// Manager-Specific Navigation Items
export const MANAGER_NAVIGATION: NavigationItem[] = [
  {
    id: 'team-management',
    label: 'Team Management',
    icon: Users,
    path: '/team-management',
    group: 'secondary',
    requiresAuth: true,
    permissions: ['manager', 'coo']
  },
  {
    id: 'manager-reports',
    label: 'Reports',
    icon: FileText,
    path: '/manager-reports',
    group: 'secondary',
    requiresAuth: true,
    permissions: ['manager', 'coo']
  },
  {
    id: 'team-analytics',
    label: 'Team Analytics',
    icon: BarChart3,
    path: '/team-analytics',
    group: 'secondary',
    requiresAuth: true,
    permissions: ['manager', 'coo']
  }
];

// Secondary Navigation (Hamburger Menu)
export const SECONDARY_NAVIGATION: NavigationItem[] = [
  {
    id: 'profile',
    label: 'Profile Settings',
    icon: User,
    path: '/profile',
    group: 'user',
    requiresAuth: true
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    path: '/notifications',
    group: 'user',
    requiresAuth: true,
    badge: 0 // Will be updated dynamically
  },
  {
    id: 'export-data',
    label: 'Export Data',
    icon: Download,
    path: '/exports',
    group: 'secondary',
    requiresAuth: true,
    permissions: ['manager', 'coo']
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    path: '/archive',
    group: 'secondary',
    requiresAuth: true,
    permissions: ['manager', 'coo']
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: Accessibility,
    path: '/accessibility',
    group: 'user'
  },
  {
    id: 'help',
    label: 'Help & Support',
    icon: HelpCircle,
    path: '/help',
    group: 'user'
  },
  {
    id: 'settings',
    label: 'App Settings',
    icon: Settings,
    path: '/settings',
    group: 'admin',
    requiresAuth: true
  }
];

// Quick Actions (for floating action buttons or quick access)
export const QUICK_ACTIONS: NavigationItem[] = [
  {
    id: 'quick-schedule',
    label: 'Quick Schedule',
    icon: Clock,
    group: 'primary',
    requiresAuth: true
  },
  {
    id: 'mark-absent',
    label: 'Mark Absent',
    icon: AlertTriangle,
    group: 'primary',
    requiresAuth: true
  },
  {
    id: 'check-in',
    label: 'Check In',
    icon: CheckSquare,
    group: 'primary',
    requiresAuth: true
  },
  {
    id: 'refresh',
    label: 'Refresh Data',
    icon: RefreshCw,
    group: 'secondary'
  }
];

// Navigation Groups
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: 'primary',
    label: 'Main Navigation',
    items: PRIMARY_NAVIGATION
  },
  {
    id: 'coo',
    label: 'Executive Functions',
    items: COO_NAVIGATION,
    collapsible: true
  },
  {
    id: 'manager',
    label: 'Management Tools',
    items: MANAGER_NAVIGATION,
    collapsible: true
  },
  {
    id: 'secondary',
    label: 'Additional Features',
    items: SECONDARY_NAVIGATION,
    collapsible: true
  },
  {
    id: 'quick',
    label: 'Quick Actions',
    items: QUICK_ACTIONS,
    collapsible: false
  }
];

// Helper Functions
export const hasPermission = (
  item: NavigationItem, 
  userRole: UserRole,
  isManager?: boolean,
  isCOO?: boolean
): boolean => {
  // If no permissions specified, allow access
  if (!item.permissions || item.permissions.length === 0) {
    return true;
  }

  // Check user role permissions
  if (item.permissions.includes(userRole as any)) {
    return true;
  }

  // Check manager permission
  if (isManager && item.permissions.includes('manager')) {
    return true;
  }

  // Check COO permission
  if (isCOO && item.permissions.includes('coo')) {
    return true;
  }

  return false;
};

export const filterNavigationByPermissions = (
  items: NavigationItem[],
  user: NavigationUser
): NavigationItem[] => {
  return items.filter(item => {
    // Skip auth check for non-auth required items
    if (!item.requiresAuth) {
      return true;
    }

    // Check permissions
    return hasPermission(item, user.role, user.isManager, user.isCOO);
  });
};

export const getNavigationItemsForUser = (user: NavigationUser) => {
  const primaryItems = filterNavigationByPermissions(PRIMARY_NAVIGATION, user);
  const secondaryItems = filterNavigationByPermissions(SECONDARY_NAVIGATION, user);
  const cooItems = filterNavigationByPermissions(COO_NAVIGATION, user);
  const managerItems = filterNavigationByPermissions(MANAGER_NAVIGATION, user);
  const quickActions = filterNavigationByPermissions(QUICK_ACTIONS, user);

  // Add COO items to primary navigation if user is COO
  if (user.isCOO) {
    // Insert COO dashboard before analytics
    const analyticsIndex = primaryItems.findIndex(item => item.id === 'analytics');
    if (analyticsIndex !== -1) {
      primaryItems.splice(analyticsIndex, 0, COO_NAVIGATION[0]); // Executive dashboard
    }
  }

  return {
    primary: primaryItems,
    secondary: secondaryItems,
    coo: cooItems,
    manager: managerItems,
    quickActions
  };
};

// Route Constants
export const ROUTES = {
  HOME: '/',
  SCHEDULE: '/schedule',
  TEAMS: '/teams',
  ANALYTICS: '/analytics',
  EXECUTIVE: '/executive',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  HELP: '/help',
  EXPORTS: '/exports',
  ARCHIVE: '/archive',
  ACCESSIBILITY: '/accessibility',
  NOTIFICATIONS: '/notifications',
  TEAM_MANAGEMENT: '/team-management',
  COMPANY_ANALYTICS: '/company-analytics',
  WORKFORCE_STATUS: '/workforce-status',
  MANAGER_REPORTS: '/manager-reports',
  TEAM_ANALYTICS: '/team-analytics'
} as const;

// Mobile Breakpoints
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280
} as const;

// Navigation Timing Constants
export const ANIMATION_DURATION = {
  FAST: 150,
  MEDIUM: 300,
  SLOW: 500
} as const;

// Touch Target Sizes
export const TOUCH_TARGETS = {
  MINIMUM: 44, // iOS/Android minimum recommended
  COMFORTABLE: 48, // Comfortable touch target
  LARGE: 56 // Large touch target for primary actions
} as const;

export default {
  PRIMARY_NAVIGATION,
  SECONDARY_NAVIGATION,
  COO_NAVIGATION,
  MANAGER_NAVIGATION,
  QUICK_ACTIONS,
  NAVIGATION_GROUPS,
  ROUTES,
  BREAKPOINTS,
  ANIMATION_DURATION,
  TOUCH_TARGETS,
  hasPermission,
  filterNavigationByPermissions,
  getNavigationItemsForUser
};