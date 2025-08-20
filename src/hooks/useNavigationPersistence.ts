/**
 * Navigation State Persistence Hook
 * Stores navigation state in localStorage to maintain state across page reloads
 */

import { useEffect, useState } from 'react'

interface NavigationState {
  menuOpen: boolean
  selectedTeamId: number | null
  selectedUserId: number | null
  cooActiveTab: string
  lastRoute: string
}

const DEFAULT_STATE: NavigationState = {
  menuOpen: false,
  selectedTeamId: null,
  selectedUserId: null,
  cooActiveTab: 'overview',
  lastRoute: '/'
}

const STORAGE_KEY = 'team-tracker-navigation'

/**
 * Hook to persist navigation state across sessions
 */
export function useNavigationPersistence() {
  const [navState, setNavState] = useState<NavigationState>(DEFAULT_STATE)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setNavState({ ...DEFAULT_STATE, ...parsed })
        }
      } catch (error) {
        console.warn('Failed to load navigation state from localStorage:', error)
      } finally {
        setIsHydrated(true)
      }
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(navState))
      } catch (error) {
        console.warn('Failed to save navigation state to localStorage:', error)
      }
    }
  }, [navState, isHydrated])

  // Individual setters for convenience
  const setMenuOpen = (open: boolean) => {
    setNavState(prev => ({ ...prev, menuOpen: open }))
  }

  const setSelectedTeamId = (teamId: number | null) => {
    setNavState(prev => ({ ...prev, selectedTeamId: teamId }))
  }

  const setSelectedUserId = (userId: number | null) => {
    setNavState(prev => ({ ...prev, selectedUserId: userId }))
  }

  const setCooActiveTab = (tab: string) => {
    setNavState(prev => ({ ...prev, cooActiveTab: tab }))
  }

  const setLastRoute = (route: string) => {
    setNavState(prev => ({ ...prev, lastRoute: route }))
  }

  const resetNavigation = () => {
    setNavState(DEFAULT_STATE)
  }

  return {
    // State
    navState,
    isHydrated,
    
    // Individual getters (SSR-safe)
    menuOpen: isHydrated ? navState.menuOpen : false,
    selectedTeamId: isHydrated ? navState.selectedTeamId : null,
    selectedUserId: isHydrated ? navState.selectedUserId : null,
    cooActiveTab: isHydrated ? navState.cooActiveTab : 'overview',
    lastRoute: isHydrated ? navState.lastRoute : '/',

    // Setters
    setMenuOpen,
    setSelectedTeamId,
    setSelectedUserId,
    setCooActiveTab,
    setLastRoute,
    resetNavigation
  }
}

/**
 * Hook specifically for mobile menu state
 */
export function useMobileMenuState() {
  const [menuOpen, setMenuOpen] = useState(() => {
    // SSR-safe initialization
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('navMenuOpen') === 'true'
      } catch {
        return false
      }
    }
    return false
  })

  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem('navMenuOpen', menuOpen.toString())
      } catch (error) {
        console.warn('Failed to persist menu state:', error)
      }
    }
  }, [menuOpen, isHydrated])

  const toggleMenu = () => setMenuOpen(prev => !prev)
  const openMenu = () => setMenuOpen(true)
  const closeMenu = () => setMenuOpen(false)

  return {
    menuOpen: isHydrated ? menuOpen : false,
    isHydrated,
    setMenuOpen,
    toggleMenu,
    openMenu,
    closeMenu
  }
}

/**
 * Hook for persisting COO dashboard preferences
 */
export function useCOODashboardPreferences() {
  const [preferences, setPreferences] = useState({
    activeTab: 'overview',
    selectedDate: new Date().toISOString().split('T')[0],
    showDetails: true,
    refreshInterval: 30000, // 30 seconds
    autoRefresh: true
  })

  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('coo-dashboard-prefs')
        if (stored) {
          const parsed = JSON.parse(stored)
          setPreferences(prev => ({ ...prev, ...parsed }))
        }
      } catch (error) {
        console.warn('Failed to load COO dashboard preferences:', error)
      } finally {
        setIsHydrated(true)
      }
    }
  }, [])

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem('coo-dashboard-prefs', JSON.stringify(preferences))
      } catch (error) {
        console.warn('Failed to save COO dashboard preferences:', error)
      }
    }
  }, [preferences, isHydrated])

  const updatePreferences = (updates: Partial<typeof preferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }

  return {
    preferences: isHydrated ? preferences : {
      activeTab: 'overview',
      selectedDate: new Date().toISOString().split('T')[0],
      showDetails: true,
      refreshInterval: 30000,
      autoRefresh: true
    },
    isHydrated,
    updatePreferences,
    setActiveTab: (tab: string) => updatePreferences({ activeTab: tab }),
    setSelectedDate: (date: string) => updatePreferences({ selectedDate: date }),
    setShowDetails: (show: boolean) => updatePreferences({ showDetails: show }),
    setAutoRefresh: (auto: boolean) => updatePreferences({ autoRefresh: auto }),
    setRefreshInterval: (interval: number) => updatePreferences({ refreshInterval: interval })
  }
}