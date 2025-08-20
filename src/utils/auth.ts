/**
 * Enhanced Authentication and Authorization System
 * Replaces hardcoded names with proper RBAC, JWT tokens, and server-side security
 */

import { supabase } from '@/lib/supabase'
import { TeamMember } from '@/types'

// User roles with hierarchical permissions
export enum UserRole {
  MEMBER = 'member',
  MANAGER = 'manager', 
  ADMIN = 'admin',
  COO = 'coo'
}

// Granular permissions system
export enum Permission {
  // Schedule permissions
  READ_OWN_SCHEDULE = 'read_own_schedule',
  UPDATE_OWN_SCHEDULE = 'update_own_schedule',
  READ_TEAM_SCHEDULE = 'read_team_schedule',
  UPDATE_TEAM_SCHEDULE = 'update_team_schedule',
  READ_ALL_SCHEDULES = 'read_all_schedules',
  UPDATE_ALL_SCHEDULES = 'update_all_schedules',
  
  // Team management
  READ_TEAM_MEMBERS = 'read_team_members',
  MANAGE_TEAM_MEMBERS = 'manage_team_members',
  READ_ALL_TEAMS = 'read_all_teams',
  MANAGE_ALL_TEAMS = 'manage_all_teams',
  
  // Sprint management
  READ_SPRINTS = 'read_sprints',
  MANAGE_SPRINTS = 'manage_sprints',
  
  // Analytics and reporting
  READ_TEAM_ANALYTICS = 'read_team_analytics',
  READ_COMPANY_ANALYTICS = 'read_company_analytics',
  EXPORT_DATA = 'export_data',
  
  // Admin functions
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  SYSTEM_ADMIN = 'system_admin'
}

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.MEMBER]: [
    Permission.READ_OWN_SCHEDULE,
    Permission.UPDATE_OWN_SCHEDULE,
    Permission.READ_TEAM_MEMBERS
  ],
  [UserRole.MANAGER]: [
    Permission.READ_OWN_SCHEDULE,
    Permission.UPDATE_OWN_SCHEDULE,
    Permission.READ_TEAM_SCHEDULE,
    Permission.UPDATE_TEAM_SCHEDULE,
    Permission.READ_TEAM_MEMBERS,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.READ_SPRINTS,
    Permission.READ_TEAM_ANALYTICS,
    Permission.EXPORT_DATA
  ],
  [UserRole.ADMIN]: [
    Permission.READ_OWN_SCHEDULE,
    Permission.UPDATE_OWN_SCHEDULE,
    Permission.READ_ALL_SCHEDULES,
    Permission.UPDATE_ALL_SCHEDULES,
    Permission.READ_ALL_TEAMS,
    Permission.MANAGE_ALL_TEAMS,
    Permission.MANAGE_SPRINTS,
    Permission.READ_COMPANY_ANALYTICS,
    Permission.EXPORT_DATA,
    Permission.MANAGE_USERS
  ],
  [UserRole.COO]: [
    ...ROLE_PERMISSIONS[UserRole.ADMIN],
    Permission.MANAGE_ROLES,
    Permission.SYSTEM_ADMIN
  ]
}

// Authentication user interface
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  teamId?: number
  teamMemberId?: number
  permissions: Permission[]
  sessionToken: string
  expiresAt: number
  refreshToken?: string
}

// Session management
interface UserSession {
  id: string
  userId: string
  token: string
  refreshToken: string
  expiresAt: Date
  createdAt: Date
  lastActivity: Date
  userAgent?: string
  ipAddress?: string
}

// Rate limiting interface
interface RateLimit {
  userId: string
  action: string
  count: number
  resetTime: number
}

// In-memory stores (in production, use Redis)
const activeSessions = new Map<string, UserSession>()
const rateLimits = new Map<string, RateLimit>()
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>()

/**
 * Generate JWT-like session token (simplified for demo)
 * In production, use a proper JWT library
 */
function generateSessionToken(userId: string, role: UserRole): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    sub: userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }))
  
  // In production, use proper HMAC signing
  const signature = btoa(`${header}.${payload}.SECRET_KEY`)
  
  return `${header}.${payload}.${signature}`
}

/**
 * Validate session token
 */
function validateSessionToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [header, payload, signature] = token.split('.')
    const decodedPayload = JSON.parse(atob(payload))
    
    // Check expiration
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false }
    }
    
    // In production, verify signature
    return { valid: true, payload: decodedPayload }
  } catch {
    return { valid: false }
  }
}

/**
 * Rate limiting implementation
 */
export function checkRateLimit(
  userId: string, 
  action: string, 
  limit: number = 100, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${userId}:${action}`
  const now = Date.now()
  const resetTime = now + windowMs
  
  let rateLimit = rateLimits.get(key)
  
  if (!rateLimit || now > rateLimit.resetTime) {
    rateLimit = { userId, action, count: 0, resetTime }
    rateLimits.set(key, rateLimit)
  }
  
  rateLimit.count++
  
  const allowed = rateLimit.count <= limit
  const remaining = Math.max(0, limit - rateLimit.count)
  
  return { allowed, remaining, resetTime: rateLimit.resetTime }
}

/**
 * Enhanced authentication with proper security
 */
export class AuthService {
  /**
   * Authenticate user with email/password or session token
   */
  static async authenticateUser(
    credentials: { email?: string; password?: string; sessionToken?: string }
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      // Rate limiting check
      const clientId = credentials.email || 'anonymous'
      const rateCheck = checkRateLimit(clientId, 'auth', 5, 300000) // 5 attempts per 5 minutes
      
      if (!rateCheck.allowed) {
        return { 
          success: false, 
          error: `Too many authentication attempts. Try again in ${Math.ceil((rateCheck.resetTime - Date.now()) / 60000)} minutes.` 
        }
      }

      // Session token authentication
      if (credentials.sessionToken) {
        return await this.authenticateWithToken(credentials.sessionToken)
      }

      // Email/password authentication
      if (credentials.email && credentials.password) {
        return await this.authenticateWithCredentials(credentials.email, credentials.password)
      }

      return { success: false, error: 'Invalid authentication method' }
    } catch (error) {
      console.error('Authentication error:', error)
      return { success: false, error: 'Authentication failed' }
    }
  }

  /**
   * Authenticate with session token
   */
  private static async authenticateWithToken(token: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const session = activeSessions.get(token)
    
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        activeSessions.delete(token)
      }
      return { success: false, error: 'Session expired' }
    }

    // Update last activity
    session.lastActivity = new Date()

    // Get user details from database
    const { data: userData, error } = await supabase
      .from('user_accounts')
      .select(`
        *,
        team_members (
          id,
          name,
          team_id,
          teams (
            id,
            name
          )
        )
      `)
      .eq('id', session.userId)
      .single()

    if (error || !userData) {
      return { success: false, error: 'User not found' }
    }

    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      role: userData.role as UserRole,
      teamId: userData.team_members?.[0]?.team_id,
      teamMemberId: userData.team_members?.[0]?.id,
      permissions: ROLE_PERMISSIONS[userData.role as UserRole] || [],
      sessionToken: token,
      expiresAt: session.expiresAt.getTime()
    }

    return { success: true, user }
  }

  /**
   * Authenticate with email/password
   */
  private static async authenticateWithCredentials(
    email: string, 
    password: string
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    // Check failed attempts
    const attempts = failedAttempts.get(email)
    if (attempts && attempts.count >= 5 && Date.now() - attempts.lastAttempt < 900000) { // 15 minutes
      return { success: false, error: 'Account temporarily locked due to too many failed attempts' }
    }

    // Use Supabase Auth for password verification
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      // Record failed attempt
      const currentAttempts = failedAttempts.get(email) || { count: 0, lastAttempt: 0 }
      failedAttempts.set(email, { 
        count: currentAttempts.count + 1, 
        lastAttempt: Date.now() 
      })
      
      return { success: false, error: 'Invalid credentials' }
    }

    // Clear failed attempts on success
    failedAttempts.delete(email)

    // Get user account details
    const { data: userData, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        *,
        team_members (
          id,
          name,
          team_id,
          teams (
            id,
            name
          )
        )
      `)
      .eq('email', email)
      .single()

    if (userError || !userData) {
      return { success: false, error: 'User account not found' }
    }

    // Create session
    const sessionToken = generateSessionToken(userData.id, userData.role)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    const session: UserSession = {
      id: `session_${Date.now()}_${Math.random()}`,
      userId: userData.id,
      token: sessionToken,
      refreshToken: `refresh_${Date.now()}_${Math.random()}`,
      expiresAt,
      createdAt: new Date(),
      lastActivity: new Date()
    }

    activeSessions.set(sessionToken, session)

    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      role: userData.role as UserRole,
      teamId: userData.team_members?.[0]?.team_id,
      teamMemberId: userData.team_members?.[0]?.id,
      permissions: ROLE_PERMISSIONS[userData.role as UserRole] || [],
      sessionToken,
      expiresAt: expiresAt.getTime(),
      refreshToken: session.refreshToken
    }

    return { success: true, user }
  }

  /**
   * Logout user and invalidate session
   */
  static async logoutUser(sessionToken: string): Promise<void> {
    activeSessions.delete(sessionToken)
    
    // Also sign out from Supabase
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Error signing out from Supabase:', error)
    }
  }

  /**
   * Refresh session token
   */
  static async refreshSession(refreshToken: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    // Find session by refresh token
    const session = Array.from(activeSessions.values()).find(s => s.refreshToken === refreshToken)
    
    if (!session || session.expiresAt < new Date()) {
      return { success: false, error: 'Invalid refresh token' }
    }

    // Generate new session
    const newSessionToken = generateSessionToken(session.userId, UserRole.MEMBER) // Role will be updated below
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    // Update session
    activeSessions.delete(session.token)
    session.token = newSessionToken
    session.expiresAt = newExpiresAt
    session.lastActivity = new Date()
    activeSessions.set(newSessionToken, session)

    // Return updated user
    return await this.authenticateWithToken(newSessionToken)
  }

  /**
   * Get current user from session token
   */
  static async getCurrentUser(sessionToken: string): Promise<AuthUser | null> {
    const result = await this.authenticateWithToken(sessionToken)
    return result.success ? result.user! : null
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    const now = new Date()
    for (const [token, session] of activeSessions.entries()) {
      if (session.expiresAt < now) {
        activeSessions.delete(token)
      }
    }
  }
}

/**
 * Permission checking utilities
 */
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission))
}

export function hasAllPermissions(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission))
}

export function canAccessTeam(user: AuthUser, teamId: number): boolean {
  // COO and Admin can access all teams
  if (user.role === UserRole.COO || user.role === UserRole.ADMIN) {
    return true
  }
  
  // Users can access their own team
  if (user.teamId === teamId) {
    return true
  }
  
  // Managers can access teams they manage (would need additional logic)
  return false
}

export function canEditSchedule(user: AuthUser, targetUserId: number, teamId: number): boolean {
  // Users can edit their own schedule
  if (user.teamMemberId === targetUserId) {
    return hasPermission(user, Permission.UPDATE_OWN_SCHEDULE)
  }
  
  // Managers can edit their team's schedules
  if (user.teamId === teamId && user.role === UserRole.MANAGER) {
    return hasPermission(user, Permission.UPDATE_TEAM_SCHEDULE)
  }
  
  // Admins and COO can edit any schedule
  if (user.role === UserRole.ADMIN || user.role === UserRole.COO) {
    return hasPermission(user, Permission.UPDATE_ALL_SCHEDULES)
  }
  
  return false
}

/**
 * Middleware for protecting routes
 */
export function requireAuth() {
  return async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authentication token provided' })
      }

      const token = authHeader.substring(7)
      const user = await AuthService.getCurrentUser(token)
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }

      // Rate limiting
      const rateCheck = checkRateLimit(user.id, 'api', 1000, 60000) // 1000 requests per minute
      if (!rateCheck.allowed) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000)
        })
      }

      req.user = user
      next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      return res.status(500).json({ error: 'Authentication failed' })
    }
  }
}

/**
 * Middleware for checking specific permissions
 */
export function requirePermission(permission: Permission) {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        userRole: req.user.role
      })
    }

    next()
  }
}

/**
 * Middleware for checking role requirements
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient role permissions',
        required: allowedRoles,
        userRole: req.user.role
      })
    }

    next()
  }
}

// Cleanup expired sessions every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    AuthService.cleanupExpiredSessions()
  }, 60 * 60 * 1000)
}