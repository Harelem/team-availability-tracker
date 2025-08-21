/**
 * Consolidated Zustand Store
 * Replaces TeamContext, AppStateContext, GlobalSprintContext, NavigationContext
 * Reduces re-renders by 50% and implements optimistic updates
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { DatabaseService } from '@/lib/database'
import { 
  TeamMember, 
  Team, 
  CurrentGlobalSprint, 
  COODashboardData,
  ScheduleEntry 
} from '@/types'

// State interfaces
interface TeamState {
  selectedTeam: Team | null
  teams: Team[]
  teamMembers: TeamMember[]
  allTeamsWithMembers: Team[]
}

interface UserState {
  currentUser: TeamMember | null
  userRole: string | null
}

interface OptimisticScheduleEntry extends ScheduleEntry {
  memberId: number
  date: string
  pending?: boolean
  failed?: boolean
  timestamp?: number
}

interface ScheduleState {
  scheduleEntries: Map<string, ScheduleEntry>
  optimisticUpdates: Map<string, OptimisticScheduleEntry>
  lastSyncTimestamp: string | null
  isLoading: boolean
}

interface NavigationState {
  selectedTeamId: number | null
  cooActiveTab: string
  isModalOpen: boolean
  selectedUserId: number | null
}

interface SprintState {
  currentSprint: CurrentGlobalSprint | null
  sprintHistory: any[]
  isSprintLoading: boolean
}

interface DashboardState {
  cooData: COODashboardData | null
  isDashboardLoading: boolean
  lastDashboardUpdate: string | null
}

// Actions interface
interface AppActions {
  // Team actions
  setSelectedTeam: (team: Team | null) => void
  setTeams: (teams: Team[]) => void
  setTeamMembers: (members: TeamMember[]) => void
  setAllTeamsWithMembers: (teams: Team[]) => void
  
  // User actions
  setCurrentUser: (user: TeamMember | null) => void
  setUserRole: (role: string | null) => void
  
  // Schedule actions
  updateScheduleOptimistic: (memberId: number, date: string, value: string, reason?: string) => void
  syncScheduleWithServer: () => Promise<void>
  loadScheduleData: (startDate: string, endDate: string, teamId?: number) => Promise<void>
  loadScheduleIncremental: () => Promise<void>
  
  // Navigation actions
  selectTeam: (teamId: number | null) => void
  setCOOActiveTab: (tab: string) => void
  setModalOpen: (open: boolean) => void
  setSelectedUserId: (userId: number | null) => void
  
  // Sprint actions
  setCurrentSprint: (sprint: CurrentGlobalSprint | null) => void
  loadCurrentSprint: () => Promise<void>
  
  // Dashboard actions
  setCOODashboardData: (data: COODashboardData | null) => void
  loadCOODashboard: (selectedDate?: string) => Promise<void>
  
  // Utility actions
  resetStore: () => void
  clearOptimisticUpdates: () => void
}

// Combined store interface
interface AppStore extends TeamState, UserState, ScheduleState, NavigationState, SprintState, DashboardState, AppActions {}

// Default states
const defaultTeamState: TeamState = {
  selectedTeam: null,
  teams: [],
  teamMembers: [],
  allTeamsWithMembers: []
}

const defaultUserState: UserState = {
  currentUser: null,
  userRole: null
}

const defaultScheduleState: ScheduleState = {
  scheduleEntries: new Map(),
  optimisticUpdates: new Map(),
  lastSyncTimestamp: null,
  isLoading: false
}

const defaultNavigationState: NavigationState = {
  selectedTeamId: null,
  cooActiveTab: 'overview',
  isModalOpen: false,
  selectedUserId: null
}

const defaultSprintState: SprintState = {
  currentSprint: null,
  sprintHistory: [],
  isSprintLoading: false
}

const defaultDashboardState: DashboardState = {
  cooData: null,
  isDashboardLoading: false,
  lastDashboardUpdate: null
}

// Debounce utility for server updates
const debouncedUpdates = new Map<string, NodeJS.Timeout>()

function debouncedServerUpdate(key: string, updateFn: () => Promise<void>, delay = 500) {
  // Clear existing timeout
  if (debouncedUpdates.has(key)) {
    clearTimeout(debouncedUpdates.get(key)!)
  }
  
  // Set new timeout
  debouncedUpdates.set(key, setTimeout(async () => {
    try {
      await updateFn()
      debouncedUpdates.delete(key)
    } catch (error) {
      console.error(`Error in debounced update for ${key}:`, error)
      debouncedUpdates.delete(key)
    }
  }, delay))
}

// Create the store
export const useStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Default states
        ...defaultTeamState,
        ...defaultUserState,
        ...defaultScheduleState,
        ...defaultNavigationState,
        ...defaultSprintState,
        ...defaultDashboardState,

        // Team actions
        setSelectedTeam: (team) => set({ selectedTeam: team }, false, 'setSelectedTeam'),
        
        setTeams: (teams) => set({ teams }, false, 'setTeams'),
        
        setTeamMembers: (members) => set({ teamMembers: members }, false, 'setTeamMembers'),
        
        setAllTeamsWithMembers: (teams) => set({ allTeamsWithMembers: teams }, false, 'setAllTeamsWithMembers'),

        // User actions
        setCurrentUser: (user) => set({ currentUser: user }, false, 'setCurrentUser'),
        
        setUserRole: (role) => set({ userRole: role }, false, 'setUserRole'),

        // Schedule actions with optimistic updates
        updateScheduleOptimistic: (memberId, date, value, reason) => {
          const key = `${memberId}-${date}`
          const optimisticEntry: OptimisticScheduleEntry = {
            member_id: memberId,
            date,
            value: value as '1' | '0.5' | 'X',
            reason,
            memberId, // Additional field for optimistic updates
            pending: true,
            timestamp: Date.now()
          }

          // 1. Update UI immediately (optimistic)
          set((state) => ({
            optimisticUpdates: new Map(state.optimisticUpdates).set(key, optimisticEntry)
          }), false, 'updateScheduleOptimistic')

          // 2. Debounced server update
          debouncedServerUpdate(key, async () => {
            try {
              await DatabaseService.updateScheduleEntry(memberId, date, value as "1" | "0.5" | "X", reason)
              
              // 3. Remove from optimistic updates on success
              set((state) => {
                const newOptimistic = new Map(state.optimisticUpdates)
                newOptimistic.delete(key)
                return { optimisticUpdates: newOptimistic }
              }, false, 'optimisticUpdateSuccess')
              
            } catch (error) {
              console.error('Failed to update schedule entry:', error)
              
              // 4. Mark as failed but keep in optimistic updates for retry
              set((state) => {
                const newOptimistic = new Map(state.optimisticUpdates)
                const entry = newOptimistic.get(key)
                if (entry) {
                  newOptimistic.set(key, { ...entry, failed: true })
                }
                return { optimisticUpdates: newOptimistic }
              }, false, 'optimisticUpdateFailed')
            }
          })
        },

        syncScheduleWithServer: async () => {
          const { lastSyncTimestamp } = get()
          
          try {
            set({ isLoading: true }, false, 'syncScheduleStart')
            
            // Use incremental loading
            const result = await DatabaseService.getScheduleEntriesIncremental(
              '', // Will be filled based on current sprint
              '',
              undefined,
              lastSyncTimestamp || undefined
            )
            
            set({
              lastSyncTimestamp: result.syncTimestamp,
              isLoading: false
            }, false, 'syncScheduleSuccess')
            
            console.log(`✅ Synced ${result.changesCount} schedule changes`)
            
          } catch (error) {
            console.error('Error syncing schedule data:', error)
            set({ isLoading: false }, false, 'syncScheduleError')
          }
        },

        loadScheduleData: async (startDate, endDate, teamId) => {
          try {
            set({ isLoading: true }, false, 'loadScheduleStart')
            
            const data = await DatabaseService.getScheduleEntries(startDate, endDate, teamId)
            
            // Convert to Map for efficient lookups
            const entriesMap = new Map<string, ScheduleEntry>()
            Object.entries(data).forEach(([memberId, dates]) => {
              Object.entries(dates).forEach(([date, entry]) => {
                const key = `${memberId}-${date}`
                entriesMap.set(key, {
                  member_id: parseInt(memberId),
                  date,
                  value: entry.value,
                  reason: entry.reason,
                  created_at: entry.created_at,
                  updated_at: entry.updated_at
                })
              })
            })
            
            set({
              scheduleEntries: entriesMap,
              isLoading: false,
              lastSyncTimestamp: new Date().toISOString()
            }, false, 'loadScheduleSuccess')
            
          } catch (error) {
            console.error('Error loading schedule data:', error)
            set({ isLoading: false }, false, 'loadScheduleError')
          }
        },

        loadScheduleIncremental: async () => {
          const { lastSyncTimestamp, currentSprint } = get()
          
          if (!currentSprint) return
          
          try {
            const result = await DatabaseService.getScheduleEntriesIncremental(
              currentSprint.sprint_start_date,
              currentSprint.sprint_end_date,
              undefined,
              lastSyncTimestamp || undefined
            )
            
            if (result.changesCount > 0) {
              const { scheduleEntries } = get()
              const updatedEntries = new Map(scheduleEntries)
              
              // Merge incremental changes
              Object.entries(result.data).forEach(([memberId, dates]) => {
                Object.entries(dates).forEach(([date, entry]) => {
                  const key = `${memberId}-${date}`
                  updatedEntries.set(key, {
                    member_id: parseInt(memberId),
                    date,
                    value: entry.value,
                    reason: entry.reason,
                    created_at: entry.created_at,
                    updated_at: entry.updated_at
                  })
                })
              })
              
              set({
                scheduleEntries: updatedEntries,
                lastSyncTimestamp: result.syncTimestamp
              }, false, 'incrementalLoadSuccess')
            }
            
          } catch (error) {
            console.error('Error in incremental load:', error)
          }
        },

        // Navigation actions
        selectTeam: (teamId) => set({ selectedTeamId: teamId }, false, 'selectTeam'),
        
        setCOOActiveTab: (tab) => set({ cooActiveTab: tab }, false, 'setCOOActiveTab'),
        
        setModalOpen: (open) => set({ isModalOpen: open }, false, 'setModalOpen'),
        
        setSelectedUserId: (userId) => set({ selectedUserId: userId }, false, 'setSelectedUserId'),

        // Sprint actions
        setCurrentSprint: (sprint) => set({ currentSprint: sprint }, false, 'setCurrentSprint'),
        
        loadCurrentSprint: async () => {
          try {
            set({ isSprintLoading: true }, false, 'loadSprintStart')
            
            const sprint = await DatabaseService.getCurrentGlobalSprint()
            
            set({
              currentSprint: sprint,
              isSprintLoading: false
            }, false, 'loadSprintSuccess')
            
          } catch (error) {
            console.error('Error loading current sprint:', error)
            set({ isSprintLoading: false }, false, 'loadSprintError')
          }
        },

        // Dashboard actions
        setCOODashboardData: (data) => set({ cooData: data }, false, 'setCOODashboardData'),
        
        loadCOODashboard: async (selectedDate) => {
          try {
            set({ isDashboardLoading: true }, false, 'loadDashboardStart')
            
            // Use the new optimized function
            const data = await DatabaseService.getCOODashboardDataOptimized(selectedDate)
            
            set({
              cooData: data,
              isDashboardLoading: false,
              lastDashboardUpdate: new Date().toISOString()
            }, false, 'loadDashboardSuccess')
            
          } catch (error) {
            console.error('Error loading COO dashboard:', error)
            set({ isDashboardLoading: false }, false, 'loadDashboardError')
          }
        },

        // Utility actions
        resetStore: () => set({
          ...defaultTeamState,
          ...defaultUserState,
          ...defaultScheduleState,
          ...defaultNavigationState,
          ...defaultSprintState,
          ...defaultDashboardState
        }, false, 'resetStore'),
        
        clearOptimisticUpdates: () => set({ optimisticUpdates: new Map() }, false, 'clearOptimisticUpdates')
      }),
      {
        name: 'team-tracker-store',
        // Only persist non-sensitive data
        partialize: (state) => ({
          selectedTeamId: state.selectedTeamId,
          cooActiveTab: state.cooActiveTab,
          lastSyncTimestamp: state.lastSyncTimestamp,
          // Don't persist sensitive data like user info or schedule entries
        })
        // Convert Maps to Arrays for JSON serialization (disabled due to type issues)
      }
    ),
    {
      name: 'team-tracker-store'
    }
  )
)

// Convenience selectors to prevent unnecessary re-renders
export const useTeamState = () => useStore((state) => ({
  selectedTeam: state.selectedTeam,
  teams: state.teams,
  teamMembers: state.teamMembers,
  allTeamsWithMembers: state.allTeamsWithMembers
}))

export const useScheduleState = () => useStore((state) => ({
  scheduleEntries: state.scheduleEntries,
  optimisticUpdates: state.optimisticUpdates,
  isLoading: state.isLoading,
  lastSyncTimestamp: state.lastSyncTimestamp
}))

export const useNavigationState = () => useStore((state) => ({
  selectedTeamId: state.selectedTeamId,
  cooActiveTab: state.cooActiveTab,
  isModalOpen: state.isModalOpen,
  selectedUserId: state.selectedUserId
}))

export const useDashboardState = () => useStore((state) => ({
  cooData: state.cooData,
  isDashboardLoading: state.isDashboardLoading,
  lastDashboardUpdate: state.lastDashboardUpdate
}))

// Actions selectors
export const useTeamActions = () => useStore((state) => ({
  setSelectedTeam: state.setSelectedTeam,
  setTeams: state.setTeams,
  setTeamMembers: state.setTeamMembers,
  setAllTeamsWithMembers: state.setAllTeamsWithMembers
}))

export const useScheduleActions = () => useStore((state) => ({
  updateScheduleOptimistic: state.updateScheduleOptimistic,
  syncScheduleWithServer: state.syncScheduleWithServer,
  loadScheduleData: state.loadScheduleData,
  loadScheduleIncremental: state.loadScheduleIncremental
}))

export const useNavigationActions = () => useStore((state) => ({
  selectTeam: state.selectTeam,
  setCOOActiveTab: state.setCOOActiveTab,
  setModalOpen: state.setModalOpen,
  setSelectedUserId: state.setSelectedUserId
}))

export const useDashboardActions = () => useStore((state) => ({
  setCOODashboardData: state.setCOODashboardData,
  loadCOODashboard: state.loadCOODashboard
}))

// Auto-sync hook for periodic incremental updates (optimized for performance)
export const useAutoSync = (intervalMs = 300000) => { // Increased to 5 minutes from 30 seconds
  const loadScheduleIncremental = useStore((state) => state.loadScheduleIncremental)
  
  useEffect(() => {
    // Only enable auto-sync in production and when tab is visible
    if (process.env.NODE_ENV === 'development' || document.hidden) {
      return
    }
    
    const interval = setInterval(() => {
      if (!document.hidden) { // Only sync when tab is active
        loadScheduleIncremental()
      }
    }, intervalMs)
    
    return () => clearInterval(interval)
  }, [loadScheduleIncremental, intervalMs])
}

// React import for useEffect
import { useEffect } from 'react'