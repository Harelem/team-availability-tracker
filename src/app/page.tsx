'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import TeamSelectionScreen from '@/components/TeamSelectionScreen';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import MobileBreadcrumb from '@/components/MobileBreadcrumb';

// CRITICAL FIX: Direct imports to eliminate originalFactory undefined errors
import PersonalDashboard from '@/components/PersonalDashboard';
import ManagerDashboard from '@/components/ManagerDashboard';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { canViewSprints, getUserRole } from '@/utils/permissions';
import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import { TeamMember, Team } from '@/types';
import { DatabaseService } from '@/lib/database';
import { verifyEnvironmentConfiguration } from '@/utils/deploymentSafety';
import { performDataPersistenceCheck, verifyDatabaseState } from '@/utils/dataPreservation';
import { validateDatabaseSchema } from '@/utils/schemaValidator';
import { loadOfflineData, saveOfflineData, initializeOfflineMode, getErrorMessage } from '@/utils/errorRecovery';
import { useIsMobile } from '@/hooks/useIsMobile';
import ClientOnly from '@/components/ClientOnly';
import LoadingState from '@/components/LoadingState';
import logger from '@/utils/logger';

function HomeContent() {
  const { selectedTeam, setSelectedTeam } = useTeam();
  const { isMobile, isLoading: isMobileLoading, isHydrated } = useIsMobile();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [backgroundDataLoaded, setBackgroundDataLoaded] = useState(false);

  // Background data loading for non-critical operations
  const loadBackgroundData = useCallback(async () => {
    if (backgroundDataLoaded) return;
    
    try {
      
      // Load non-critical data in background
      const backgroundTasks = [
        performDataPersistenceCheck(),
        verifyDatabaseState()
      ];
      
      const [dataChecks, dbState] = await Promise.allSettled(backgroundTasks);
      
      // Log background data results
      if (dataChecks && dataChecks.status === 'fulfilled' && Array.isArray(dataChecks.value)) {
        const criticalIssues = dataChecks.value.filter((check: any) => check.status === 'FAIL');
        if (criticalIssues.length > 0) {
          logger.warn(`Background: Critical data issues detected: ${criticalIssues.length}`, 'database');
        }
      }
      
      setBackgroundDataLoaded(true);
      
    } catch (error) {
      logger.warn('Background data loading failed (non-critical)', 'database', error);
    }
  }, [backgroundDataLoaded]);

  // Client-side initialization for offline mode
  useEffect(() => {
    // Initialize offline mode listeners
    initializeOfflineMode();
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
        logger.info('Loading teams from database', 'database');
        
        // Direct call to DatabaseService without complex wrappers
        const teamsData = await DatabaseService.getTeams();
        
        if (!mounted) return;
        
        // Set teams immediately - even if empty, that's valid
        setTeams(teamsData || []);
        
        if (teamsData && teamsData.length > 0) {
          logger.success(`Successfully loaded ${teamsData.length} teams`);
          
          // Save to offline storage for future use
          saveOfflineData(teamsData);
        } else {
          logger.warn('No teams found in database - this may be expected for new installations', 'database');
        }
        
        // BACKGROUND: Run validation and other checks non-blocking
        setTimeout(() => {
          if (mounted) {
            // Run schema validation in background - just for logging
            validateDatabaseSchema().then(result => {
              if (!result.isValid) {
                logger.warn('Schema validation warnings (non-blocking)', 'validation', result.errors);
              } else {
                logger.success('Schema validation passed');
              }
            }).catch(err => {
              logger.warn('Schema validation check failed (non-critical)', 'validation', err);
            });
            
            // Load other background data
            loadBackgroundData();
          }
        }, 100);
        
      } catch (error) {
        if (!mounted) return;
        
        const errorMessage = getErrorMessage(error);
        logger.error('Failed to load teams', 'database', errorMessage);
        
        // FALLBACK: Try offline mode only for real failures
        try {
          const offlineData = loadOfflineData();
          if (offlineData && offlineData.teams && offlineData.teams.length > 0) {
            logger.info('Using offline data - some information may not be current', 'mobile');
            setTeams(offlineData.teams);
          } else {
            logger.warn('No offline data available', 'mobile');
            setTeams([]);
          }
        } catch (fallbackError) {
          logger.error('Offline fallback also failed', 'mobile', fallbackError);
          setTeams([]);
        }
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
  }, []);
  
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

        const members = await Promise.race([membersPromise, timeoutPromise]) as any;
        
        if (!mounted) return;
        clearTimeout(timeoutId);
        
        setTeamMembers(members);
      } catch (error) {
        if (!mounted) return;
        
        logger.error(`Error loading team members for team: ${selectedTeam?.name}`, 'database', error);
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
        logger.warn(`Team with ID ${teamId} not found in available teams`);
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

  // Team loading state - hydration safe
  if (selectedTeam && loading) {
    return <LoadingState testId="team-members-loading" />;
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
        
        {/* User Type Detection and Dashboard Rendering - FIXED: Direct component imports */}
        <div suppressHydrationWarning={true}>
          {canViewSprints(selectedUser) && selectedTeam && selectedUser && (
            <GlobalSprintProvider teamId={selectedTeam.id}>
              {selectedUser.isManager ? (
                <ManagerDashboard 
                  user={selectedUser}
                  team={selectedTeam}
                  teamMembers={teamMembers}
                />
              ) : (
                <PersonalDashboard 
                  user={selectedUser}
                  team={selectedTeam}
                  teamMembers={teamMembers}
                />
              )}
            </GlobalSprintProvider>
          )}
          
          {/* Show basic dashboard without sprint features if user can't view sprints */}
          {!canViewSprints(selectedUser) && selectedTeam && selectedUser && (
            selectedUser.isManager ? (
              <ManagerDashboard 
                user={selectedUser}
                team={selectedTeam}
                teamMembers={teamMembers}
              />
            ) : (
              <PersonalDashboard 
                user={selectedUser}
                team={selectedTeam}
                teamMembers={teamMembers}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <TeamProvider>
      <Suspense fallback={<LoadingState testId="suspense-loading" />}>
        <HomeContent />
      </Suspense>
    </TeamProvider>
  );
}