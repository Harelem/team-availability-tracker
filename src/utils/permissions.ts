import { TeamMember, COOUser } from '@/types';

/**
 * Simple permission system for sprint management and COO dashboard access
 * Only "Harel Mazan" can modify sprint settings
 * Only "Nir Shilo" can access COO dashboard
 * Everyone else has read-only access
 */

export const SPRINT_ADMIN_NAME = "Harel Mazan";
export const COO_NAME = "Nir Shilo";

/**
 * Check if user can modify sprint settings
 */
export const canManageSprints = (user: TeamMember | null): boolean => {
  if (!user) return false;
  return user.name === SPRINT_ADMIN_NAME;
};

/**
 * Check if user can view sprint information (everyone can)
 */
export const canViewSprints = (user: TeamMember | null): boolean => {
  return user !== null;
};

/**
 * Check if user can access COO dashboard
 */
export const canAccessCOODashboard = (user: TeamMember | null): boolean => {
  if (!user) return false;
  return user.name === COO_NAME || user.name === SPRINT_ADMIN_NAME; // Admin can also access COO dashboard
};

/**
 * Check if user is COO
 */
export const isCOO = (user: TeamMember | null): boolean => {
  if (!user) return false;
  return user.name === COO_NAME;
};

/**
 * Get permission level for user
 */
export const getSprintPermissionLevel = (user: TeamMember | null): 'none' | 'read' | 'admin' => {
  if (!user) return 'none';
  if (canManageSprints(user)) return 'admin';
  return 'read';
};

/**
 * Get user role for display
 */
export const getUserRole = (user: TeamMember | null): string => {
  if (!user) return 'User';
  if (user.name === COO_NAME) return 'COO';
  if (user.name === SPRINT_ADMIN_NAME) return 'Admin';
  if (user.id === -1) return 'COO'; // Virtual COO user
  if (user.isManager) return 'Manager';
  return 'Member';
};

/**
 * Check if user is COO (including virtual COO users)
 */
export const isCOOUser = (user: TeamMember | null): boolean => {
  if (!user) return false;
  return user.name === COO_NAME || user.id === -1; // Virtual COO user has ID -1
};

/**
 * Check if user has manager-level permissions (including COO)
 */
export const hasManagerPermissions = (user: TeamMember | null): boolean => {
  if (!user) return false;
  return user.isManager || isCOOUser(user);
};

/**
 * Check if user can access manager-specific quick reasons
 */
export const canAccessManagerQuickReasons = (user: TeamMember | null): boolean => {
  if (!user) return false;
  return user.isManager || user.is_manager || user.role === 'manager' || isCOOUser(user);
};

/**
 * Check if COO user can export executive reports
 */
export const canExportCOOReports = (cooUser: COOUser | null): boolean => {
  if (!cooUser) return false;
  return cooUser.name === COO_NAME || cooUser.name === SPRINT_ADMIN_NAME;
};

/**
 * Validate COO user permissions for specific actions
 */
export const validateCOOPermissions = (cooUser: COOUser | null, action: 'export' | 'view' | 'dashboard'): boolean => {
  if (!cooUser) return false;
  
  switch (action) {
    case 'export':
      return canExportCOOReports(cooUser);
    case 'view':
    case 'dashboard':
      return cooUser.name === COO_NAME || cooUser.name === SPRINT_ADMIN_NAME;
    default:
      return false;
  }
};

/**
 * URL-based permission validation for route access
 */
export const validateRouteAccess = (route: string, user?: TeamMember | COOUser | null): boolean => {
  switch (route) {
    case '/executive':
      // Only COO users can access executive dashboard
      if (!user) return false;
      return 'title' in user || // COOUser has title property
             user.name === COO_NAME || 
             user.name === SPRINT_ADMIN_NAME;
    
    case '/':
      // Team routes are open to all authenticated users
      return true;
    
    default:
      // Allow access to other routes by default
      return true;
  }
};

/**
 * Redirect logic for unauthorized route access
 */
export const getRedirectForUnauthorizedAccess = (
  attemptedRoute: string, 
  user?: TeamMember | COOUser | null
): string | null => {
  if (!validateRouteAccess(attemptedRoute, user)) {
    switch (attemptedRoute) {
      case '/executive':
        // Redirect to team selection if trying to access executive without permission
        return '/';
      default:
        return null;
    }
  }
  return null;
};

/**
 * Check if current user should be redirected based on their role and current route
 */
export const shouldRedirectBasedOnRole = (
  currentRoute: string,
  user: TeamMember | COOUser | null
): string | null => {
  if (!user) return null;
  
  // No automatic redirects - let users choose their preferred access
  // This allows COO users to access both team and executive dashboards
  return null;
};