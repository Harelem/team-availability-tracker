'use client';

import { useState, useEffect } from 'react';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import ScheduleTable from '@/components/ScheduleTable';
import TeamSelectionScreen from '@/components/TeamSelectionScreen';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import MobileBreadcrumb from '@/components/MobileBreadcrumb';
import COOExecutiveDashboard from '@/components/COOExecutiveDashboard';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { canViewSprints, getUserRole } from '@/utils/permissions';
import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import { TeamMember, COOUser, AccessMode, Team } from '@/types';
import { DatabaseService } from '@/lib/database';
import { verifyEnvironmentConfiguration } from '@/utils/deploymentSafety';
import { performDataPersistenceCheck, verifyDatabaseState } from '@/utils/dataPreservation';

function HomeContent() {
  const { selectedTeam, setSelectedTeam } = useTeam();
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New access mode state
  const [accessMode, setAccessMode] = useState<AccessMode>(null);
  const [cooUser, setCooUser] = useState<COOUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [cooUsers, setCooUsers] = useState<COOUser[]>([]);

  // Load initial data (teams and COO users)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        console.log('🚀 Starting application with SAFE data preservation...');
        
        // CRITICAL: Verify environment configuration first
        const envVerification = verifyEnvironmentConfiguration();
        if (!envVerification.isConfigValid) {
          console.error('🚨 Environment configuration issues detected!');
          envVerification.warnings.forEach(warning => {
            console.warn(`⚠️ ${warning}`);
          });
        }
        
        // CRITICAL: Check existing data before any operations
        console.log('🔍 Performing data persistence verification...');
        const dataChecks = await performDataPersistenceCheck();
        const criticalIssues = dataChecks.filter(check => check.status === 'FAIL');
        
        if (criticalIssues.length > 0) {
          console.error('🚨 Critical data issues detected!');
          criticalIssues.forEach(issue => {
            console.error(`❌ ${issue.check}: ${issue.data}`);
          });
        }
        
        // CRITICAL: Verify current database state
        const dbState = await verifyDatabaseState();
        if (dbState.totalScheduleEntries > 0) {
          console.log('🔒 CRITICAL: User schedule data exists - PRESERVATION MODE ENABLED');
          console.log(`📊 Protecting: ${dbState.totalScheduleEntries} schedule entries, ${dbState.totalTeamMembers} members`);
        }
        
        // CRITICAL: Use safe initialization that preserves existing data
        const [teamsResult, membersResult] = await Promise.all([
          DatabaseService.safeInitializeTeams(),
          DatabaseService.safeInitializeTeamMembers()
        ]);
        
        // Log data preservation results
        if (teamsResult.preserved) {
          console.log('🔒 TEAMS DATA PRESERVED:', teamsResult.message);
        } else {
          console.log('🆕 Teams initialized:', teamsResult.message);
        }
        
        if (membersResult.preserved) {
          console.log('🔒 MEMBER DATA PRESERVED:', membersResult.message);
        } else {
          console.log('🆕 Members initialized:', membersResult.message);
        }
        
        // Load teams and COO users in parallel
        const [teamsData, cooUsersData] = await Promise.all([
          DatabaseService.getTeams(),
          DatabaseService.getCOOUsers()
        ]);
        
        setTeams(teamsData);
        setCooUsers(cooUsersData);
        
        console.log(`✅ Application initialized successfully with ${teamsData.length} teams`);
      } catch (error) {
        console.error('❌ Error loading initial data:', error);
        setTeams([]);
        setCooUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);
  
  // Load team members when a team is selected
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedTeam || accessMode !== 'team') return;
      
      try {
        setLoading(true);
        const members = await DatabaseService.getTeamMembers(selectedTeam.id);
        setTeamMembers(members);
      } catch (error) {
        console.error('Error loading team members:', error);
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, [selectedTeam, accessMode]);

  // Reset states when access mode changes
  useEffect(() => {
    setSelectedUser(null);
  }, [selectedTeam, accessMode]);

  // Handler functions for the new flow
  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setAccessMode('team');
  };

  const handleCOOAccess = (user: COOUser) => {
    setCooUser(user);
    setAccessMode('coo');
  };

  const handleBackToSelection = () => {
    setAccessMode(null);
    setSelectedTeam(null);
    setSelectedUser(null);
    setCooUser(null);
  };

  // Routing logic based on access mode
  if (!accessMode) {
    return (
      <TeamSelectionScreen 
        teams={teams}
        cooUsers={cooUsers}
        onTeamSelect={handleTeamSelect}
        onCOOAccess={handleCOOAccess}
      />
    );
  }

  // COO Dashboard Access
  if (accessMode === 'coo' && cooUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalSprintProvider>
          <COOExecutiveDashboard 
            currentUser={cooUser}
            onBack={handleBackToSelection}
          />
        </GlobalSprintProvider>
      </div>
    );
  }

  // Team access mode - user selection
  if (accessMode === 'team' && selectedTeam && loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-6"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Team access mode - show user selection
  if (accessMode === 'team' && selectedTeam && !selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-md max-w-md w-full">
          {/* Back button */}
          <div className="mb-4">
            <button
              onClick={handleBackToSelection}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Selection</span>
            </button>
          </div>
          
          {/* Mobile Breadcrumb */}
          <MobileBreadcrumb
            selectedTeam={selectedTeam}
            selectedUser={selectedUser}
            onNavigateToTeamSelection={handleBackToSelection}
            onNavigateToMemberSelection={() => setSelectedUser(null)}
          />
          
          {/* Desktop Breadcrumb */}
          <div className="hidden lg:block">
            <BreadcrumbNavigation
              selectedTeam={selectedTeam}
              selectedUser={selectedUser}
              onNavigateToTeamSelection={handleBackToSelection}
              onNavigateToMemberSelection={() => setSelectedUser(null)}
            />
          </div>
          
          <div className="text-center mb-6">
            <Calendar className="text-blue-600 w-12 h-12 mx-auto mb-3" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {selectedTeam?.name}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">Select your name to continue:</p>
          </div>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedUser(member)}
                className="w-full flex items-center gap-3 p-3 sm:p-4 text-left bg-gray-50 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors min-h-[60px] touch-manipulation"
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
            {/* Mobile Breadcrumb */}
            <MobileBreadcrumb
              selectedTeam={selectedTeam}
              selectedUser={selectedUser}
              onNavigateToTeamSelection={handleBackToSelection}
              onNavigateToMemberSelection={() => setSelectedUser(null)}
            />
            
            {/* Desktop Breadcrumb */}
            <div className="hidden lg:block">
              <BreadcrumbNavigation
                selectedTeam={selectedTeam}
                selectedUser={selectedUser}
                onNavigateToTeamSelection={handleBackToSelection}
                onNavigateToMemberSelection={() => setSelectedUser(null)}
              />
            </div>
            
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
                    className="bg-gray-200 text-gray-700 px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors text-xs sm:text-base min-h-[40px] touch-manipulation shrink-0"
                  >
                    Switch User
                  </button>
                  <button
                    onClick={handleBackToSelection}
                    className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-xs sm:text-base min-h-[40px] touch-manipulation shrink-0"
                  >
                    Change Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Global Sprint Provider wraps both dashboard and schedule table */}
        {canViewSprints(selectedUser) && selectedTeam && selectedUser && (
          <GlobalSprintProvider teamId={selectedTeam.id}>
            <ScheduleTable 
              currentUser={selectedUser} 
              teamMembers={teamMembers}
              selectedTeam={selectedTeam}
            />
          </GlobalSprintProvider>
        )}
        
        
        {/* Show schedule table without sprint features if user can't view sprints */}
        {!canViewSprints(selectedUser) && selectedTeam && selectedUser && (
          <ScheduleTable 
            currentUser={selectedUser} 
            teamMembers={teamMembers}
            selectedTeam={selectedTeam}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <TeamProvider>
      <HomeContent />
    </TeamProvider>
  );
}