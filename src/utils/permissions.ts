import { TeamMember } from '@/types';

/**
 * Simple permission system for sprint management
 * Only "Harel Mazan" can modify sprint settings
 * Everyone else has read-only access
 */

export const SPRINT_ADMIN_NAME = "Harel Mazan";

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
  const canView = user !== null;
  console.log('🔍 DEBUG: canViewSprints called', { user: user?.name, canView });
  return canView;
};

/**
 * Get permission level for user
 */
export const getSprintPermissionLevel = (user: TeamMember | null): 'none' | 'read' | 'admin' => {
  if (!user) return 'none';
  if (canManageSprints(user)) return 'admin';
  return 'read';
};