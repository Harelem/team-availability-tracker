'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

// OPTIMIZED: Aggressively lazy load non-critical components to reduce TTI
const BreadcrumbNavigation = dynamic(() => import('@/components/BreadcrumbNavigation'), {
  loading: () => <MinimalLoader />,
  ssr: false
});

const MobileBreadcrumb = dynamic(() => import('@/components/MobileBreadcrumb'), {
  loading: () => <MinimalLoader />,
  ssr: false
});

// OPTIMIZED: Lazy load dashboard components with minimal loading states
const PersonalDashboard = dynamic(() => import('@/components/PersonalDashboard'), {
  loading: () => <MinimalLoader text="Loading dashboard..." />,
  ssr: false
});

// OPTIMIZED: Use React.lazy for better code splitting
const LazyManagerDashboard = React.lazy(() => import('@/components/ManagerDashboard'));

// OPTIMIZED: Lazy load team selection for faster initial load  
const TeamSelectionScreen = dynamic(() => import('@/components/TeamSelectionScreen'), {
  loading: () => <MinimalLoader text="Loading teams..." />,
  ssr: false
});

// Simple Error Boundary for ManagerDashboard
class ManagerDashboardErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ManagerDashboard Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <LoadingState 
          testId="manager-dashboard-error" 
          showText 
          text="Unable to load manager dashboard. Please refresh the page." 
        />
      );
    }
    return this.props.children;
  }
}

import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { canViewSprints, getUserRole } from '@/utils/permissions';
import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import { TeamMember, Team } from '@/types';
import { DatabaseService } from '@/lib/database';
import ClientOnly from '@/components/ClientOnly';
import LoadingState from '@/components/LoadingState';
import MinimalLoader from '@/components/MinimalLoader';

// Defer non-critical imports for better LCP
const getLogger = () => {
  if (typeof window !== 'undefined') {
    // Dynamic import for client-side only
    return import('@/utils/logger').then(module => module.default);
  }
  return Promise.resolve({ info: () => {}, warn: () => {}, error: () => {}, success: () => {} });
};

const logger = { info: () => {}, warn: () => {}, error: () => {}, success: () => {} };

function HomeContent() {
  const { selectedTeam, setSelectedTeam } = useTeam();
  
  // OPTIMIZED: Fast inline mobile detection to avoid dynamic imports during render
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Direct mobile detection without dynamic imports
    const checkMobile = () => window.innerWidth < 768;
    setIsMobile(checkMobile());
    
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Removed isMounted state to prevent hydration mismatches
  
  // Router removed as unused
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // PERFORMANCE: Create stable references for PersonalDashboard props to prevent unnecessary re-renders
  const stableSelectedUser = useMemo(() => selectedUser, [selectedUser?.id, selectedUser?.name, selectedUser?.isManager]);
  const stableSelectedTeam = useMemo(() => selectedTeam, [selectedTeam?.id, selectedTeam?.name]);
  const stableTeamMembers = useMemo(() => teamMembers, [teamMembers.length, teamMembers.map(m => m.id).join(',')]);

  // DEBUG: Track when stable refs are recreated
  useEffect(() => {
    console.log('🔄 STABLE PROPS: Selected user reference updated:', {
      userId: stableSelectedUser?.id,
      userName: stableSelectedUser?.name,
      isManager: stableSelectedUser?.isManager
    });
  }, [stableSelectedUser]);
  
  useEffect(() => {
    console.log('🔄 STABLE PROPS: Team members reference updated:', {
      memberCount: stableTeamMembers.length,
      memberIds: stableTeamMembers.map(m => m.id)
    });
  }, [stableTeamMembers]);
  
  // DEBUG: Track prop changes to PersonalDashboard
  useEffect(() => {
    console.log('🏠 PAGE STATE: selectedUser changed:', {
      userId: selectedUser?.id,
      userName: selectedUser?.name,
      hasUser: !!selectedUser
    });
  }, [selectedUser]);
  
  useEffect(() => {
    console.log('🏠 PAGE STATE: teamMembers changed:', {
      memberCount: teamMembers.length,
      memberIds: teamMembers.map(m => m.id)
    });
  }, [teamMembers]);
  
  useEffect(() => {
    console.log('🏠 PAGE STATE: selectedTeam changed:', {
      teamId: selectedTeam?.id,
      teamName: selectedTeam?.name,
      hasTeam: !!selectedTeam
    });
  }, [selectedTeam]);
  const searchParams = useSearchParams();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [backgroundDataLoaded, setBackgroundDataLoaded] = useState(false);

  // OPTIMIZED: Simplified background data loading to reduce bundle size
  const loadBackgroundData = useCallback(async () => {
    if (backgroundDataLoaded) return;
    
    try {
      // Defer non-critical background operations even further
      setTimeout(async () => {
        try {
          const { performDataPersistenceCheck } = await import('@/utils/dataPreservation');
          await performDataPersistenceCheck();
          setBackgroundDataLoaded(true);
        } catch (error) {
          console.warn('Background data loading failed (non-critical)', error);
          setBackgroundDataLoaded(true); // Set anyway to prevent retries
        }
      }, 2000); // Delay 2 seconds after initial load
      
    } catch (error) {
      console.warn('Background data loading failed (non-critical)', error);
      setBackgroundDataLoaded(true);
    }
  }, [backgroundDataLoaded]);

  // Client-side initialization for offline mode - dynamically loaded
  useEffect(() => {
    // Initialize offline mode listeners after component mount
    import('@/utils/errorRecovery').then(({ initializeOfflineMode }) => {
      initializeOfflineMode();
    }).catch(error => {
      console.warn('Failed to initialize offline mode:', error);
    });
  }, []);

  // Load initial data (teams only) with timeout protection
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadInitialData = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        
        // SIMPLIFIED: Direct team loading without blocking validation
        console.log('Loading teams from database');
        
        // Direct call to DatabaseService without complex wrappers
        const teamsData = await DatabaseService.getTeams();
        
        if (!mounted) return;
        
        // Set teams immediately - even if empty, that's valid
        setTeams(teamsData || []);
        
        if (teamsData && teamsData.length > 0) {
          console.log(`Successfully loaded ${teamsData.length} teams`);
          
          // Save to offline storage for future use - dynamically loaded
          import('@/utils/errorRecovery').then(({ saveOfflineData }) => {
            saveOfflineData(teamsData);
          }).catch(error => {
            console.warn('Failed to save offline data (non-critical)', error);
          });
        } else {
          console.warn('No teams found in database - this may be expected for new installations');
        }
        
        // BACKGROUND: Run validation and other checks non-blocking with dynamic imports
        setTimeout(() => {
          if (mounted) {
            // Run schema validation in background - dynamically loaded
            import('@/utils/schemaValidator').then(({ validateDatabaseSchema }) => {
              validateDatabaseSchema().then(result => {
                if (!result.isValid) {
                  console.warn('Schema validation warnings (non-blocking)', result.errors);
                } else {
                  console.log('Schema validation passed');
                }
              }).catch(err => {
                console.warn('Schema validation check failed (non-critical)', err);
              });
            }).catch(err => {
              console.warn('Failed to load schema validator (non-critical)', err);
            });
            
            // Load other background data
            loadBackgroundData();
          }
        }, 100);
        
      } catch (error) {
        if (!mounted) return;
        
        // Dynamically import error utilities for fallback
        import('@/utils/errorRecovery').then(({ getErrorMessage, loadOfflineData, saveOfflineData }) => {
          const errorMessage = getErrorMessage(error);
          console.error('Failed to load teams', errorMessage);
          
          // FALLBACK: Try offline mode only for real failures
          try {
            const offlineData = loadOfflineData();
            if (offlineData && offlineData.teams && offlineData.teams.length > 0) {
              console.log('Using offline data - some information may not be current');
              setTeams(offlineData.teams);
            } else {
              console.warn('No offline data available');
              setTeams([]);
            }
          } catch (fallbackError) {
            console.error('Offline fallback also failed', fallbackError);
            setTeams([]);
          }
        }).catch(fallbackImportError => {
          console.error('Failed to load error recovery utilities', fallbackImportError);
          setTeams([]);
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [loadBackgroundData]);
  
  // Load team members when a team is selected with timeout protection - OPTIMIZED
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadTeamMembers = async () => {
      if (!selectedTeam || !mounted) return;
      
      try {
        setLoading(true);
        
        // Fast parallel loading with 2-second timeout 
        const membersPromise = DatabaseService.getTeamMembers(selectedTeam.id);
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Team members loading timeout after 2 seconds for team: ${selectedTeam.name}`)), 2000);
        });

        const members = await Promise.race([membersPromise, timeoutPromise]) as TeamMember[];
        
        if (!mounted) return;
        clearTimeout(timeoutId);
        
        setTeamMembers(members);
      } catch (error) {
        if (!mounted) return;
        
        console.error(`Error loading team members for team: ${selectedTeam?.name}`, error);
        // Show meaningful error but don't block UI
        setTeamMembers([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
        clearTimeout(timeoutId);
      }
    };

    loadTeamMembers();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [selectedTeam]);

  // Reset selected user when team changes
  useEffect(() => {
    setSelectedUser(null);
  }, [selectedTeam]);

  // Handle URL parameters for team navigation
  useEffect(() => {
    if (!searchParams) return;
    
    const teamParam = searchParams.get('team');
    
    if (teamParam && teams.length > 0 && !selectedTeam) {
      const teamId = parseInt(teamParam);
      const targetTeam = teams.find(team => team.id === teamId);
      
      if (targetTeam) {
        setSelectedTeam(targetTeam);
      } else {
        console.warn(`Team with ID ${teamId} not found in available teams`);
      }
    }
  }, [searchParams, teams, selectedTeam, setSelectedTeam]);

  // Handler functions for team flow - optimized with useCallback
  const handleTeamSelect = useCallback((team: Team) => {
    setSelectedTeam(team);
  }, [setSelectedTeam]);

  const handleBackToSelection = useCallback(() => {
    // Return to team selection
    setSelectedTeam(null);
    setSelectedUser(null);
  }, [setSelectedTeam]);

  // Show team selection if no team selected
  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeamSelectionScreen 
          teams={teams}
          onTeamSelect={handleTeamSelect}
        />
      </div>
    );
  }

  // Show loading state during initial data loading only
  if (loading && teams.length === 0) {
    return <LoadingState mode="fullscreen" testId="initial-loading" />;
  }

  // Team loading state - use fullscreen mode for consistency
  if (selectedTeam && loading) {
    return <LoadingState mode="fullscreen" testId="team-members-loading" />;
  }

  // Show user selection for selected team
  if (selectedTeam && !selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 shadow-md max-w-md w-full">
            {/* Desktop back button */}
            <ClientOnly>
              {!isMobile && (
                <div className="mb-4">
                  <button
                    onClick={handleBackToSelection}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] touch-manipulation active:bg-gray-100 px-2 py-2 rounded"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back to Selection</span>
                  </button>
                </div>
              )}
            </ClientOnly>
            
            {/* Mobile Breadcrumb - only show on mobile when not using header */}
            <ClientOnly>
              {isMobile && (
                <MobileBreadcrumb
                  selectedTeam={selectedTeam}
                  selectedUser={selectedUser}
                  onNavigateToTeamSelection={handleBackToSelection}
                  onNavigateToMemberSelection={() => setSelectedUser(null)}
                />
              )}
            </ClientOnly>
            
            {/* Desktop Breadcrumb */}
            <div className="hidden lg:block">
              <BreadcrumbNavigation
                selectedTeam={selectedTeam}
                selectedUser={selectedUser}
                onNavigateToTeamSelection={handleBackToSelection}
                onNavigateToMemberSelection={() => setSelectedUser(null)}
              />
            </div>
            
            {/* Header content - adjust for mobile vs desktop */}
            <ClientOnly fallback={
              <div className="text-center mb-6">
                <Calendar className="text-blue-600 w-12 h-12 mx-auto mb-3" />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {selectedTeam?.name}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">Select your name to continue:</p>
              </div>
            }>
              <div className="text-center mb-6">
                {!isMobile && (
                  <>
                    <Calendar className="text-blue-600 w-12 h-12 mx-auto mb-3" />
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {selectedTeam?.name}
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">Select your name to continue:</p>
                  </>
                )}
                {isMobile && (
                  <div className="pt-4">
                    <p className="text-gray-600 text-base">Choose your profile:</p>
                  </div>
                )}
              </div>
            </ClientOnly>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedUser(member)}
                  className="w-full flex items-center gap-3 p-3 sm:p-4 text-left bg-gray-50 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors min-h-[60px] touch-target-xl"
                >
                  <User className="text-gray-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{member.name}</div>
                    <div className="text-xs sm:text-sm text-gray-500 truncate">{member.hebrew}</div>
                    {member.isManager && (
                      <div className="text-xs text-blue-600 bg-blue-100 inline-block px-2 py-0.5 rounded mt-1">Manager</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header will be handled inside dashboard components */}

      {/* Desktop Layout */}
      <div className="max-w-7xl mx-auto p-2 sm:p-6">
        <div className="hidden lg:flex flex-col gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
            {/* Desktop Breadcrumb */}
            <BreadcrumbNavigation
              selectedTeam={selectedTeam}
              selectedUser={selectedUser}
              onNavigateToTeamSelection={handleBackToSelection}
              onNavigateToMemberSelection={() => setSelectedUser(null)}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Calendar className="text-blue-600 w-5 h-5 sm:w-8 sm:h-8" />
                  <span className="truncate">Team Availability</span>
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <p className="text-sm sm:text-base text-gray-600 truncate">
                    <strong>{selectedTeam?.name}</strong> • Welcome, <strong>{selectedUser?.name}</strong>
                    <span className="text-blue-600 ml-1">({getUserRole(selectedUser)})</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="bg-gray-200 text-gray-700 px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors text-sm sm:text-base min-h-[44px] touch-manipulation shrink-0"
                  >
                    Switch User
                  </button>
                  <button
                    onClick={handleBackToSelection}
                    className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base min-h-[44px] touch-manipulation shrink-0"
                  >
                    Change Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* User Type Detection and Dashboard Rendering with Suspense boundaries */}
        <div suppressHydrationWarning={true}>
          <Suspense fallback={<LoadingState mode="inline" testId="dashboard-suspense-loading" showText text="Loading dashboard..." />}>
            {canViewSprints(selectedUser) && selectedTeam && selectedUser && (
              <GlobalSprintProvider teamId={selectedTeam.id}>
                <Suspense fallback={<LoadingState mode="inline" testId="sprint-dashboard-loading" showText text="Loading sprint data..." />}>
                  {selectedUser.isManager ? (
                    <React.Suspense fallback={<LoadingState mode="inline" testId="manager-dashboard-loading" showText text="Loading manager dashboard..." />}>
                      <ManagerDashboardErrorBoundary>
                        <LazyManagerDashboard 
                          user={stableSelectedUser}
                          team={stableSelectedTeam}
                          teamMembers={stableTeamMembers}
                        />
                      </ManagerDashboardErrorBoundary>
                    </React.Suspense>
                  ) : (
                    <PersonalDashboard 
                      user={stableSelectedUser}
                      team={stableSelectedTeam}
                      teamMembers={stableTeamMembers}
                    />
                  )}
                </Suspense>
              </GlobalSprintProvider>
            )}
            
            {/* Show basic dashboard without sprint features if user can't view sprints */}
            {!canViewSprints(selectedUser) && selectedTeam && selectedUser && (
              <Suspense fallback={<LoadingState mode="inline" testId="basic-dashboard-loading" showText text="Loading dashboard..." />}>
                {selectedUser.isManager ? (
                  <React.Suspense fallback={<LoadingState mode="inline" testId="manager-dashboard-basic-loading" showText text="Loading manager dashboard..." />}>
                    <ManagerDashboardErrorBoundary>
                      <LazyManagerDashboard 
                        user={stableSelectedUser}
                        team={stableSelectedTeam}
                        teamMembers={stableTeamMembers}
                      />
                    </ManagerDashboardErrorBoundary>
                  </React.Suspense>
                ) : (
                  <PersonalDashboard 
                    user={stableSelectedUser}
                    team={stableSelectedTeam}
                    teamMembers={stableTeamMembers}
                  />
                )}
              </Suspense>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <TeamProvider>
      <div suppressHydrationWarning={true}>
        <Suspense fallback={<LoadingState mode="fullscreen" testId="suspense-loading" />}>
          <HomeContent />
        </Suspense>
      </div>
    </TeamProvider>
  );
}