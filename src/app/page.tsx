'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import ScheduleTable from '@/components/ScheduleTable';
import TeamSelectionScreen from '@/components/TeamSelectionScreen';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import MobileBreadcrumb from '@/components/MobileBreadcrumb';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { canViewSprints, getUserRole } from '@/utils/permissions';
import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import { TeamMember, Team } from '@/types';
import { DatabaseService } from '@/lib/database';
import { verifyEnvironmentConfiguration } from '@/utils/deploymentSafety';
import { performDataPersistenceCheck, verifyDatabaseState } from '@/utils/dataPreservation';

function HomeContent() {
  const { selectedTeam, setSelectedTeam } = useTeam();
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const [teams, setTeams] = useState<Team[]>([]);

  // Load initial data (teams only)
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
        
        // Load teams data
        const teamsData = await DatabaseService.getTeams();
        setTeams(teamsData);
        
        console.log(`✅ Application initialized successfully with ${teamsData.length} teams`);
      } catch (error) {
        console.error('❌ Error loading initial data:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);
  
  // Load team members when a team is selected
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedTeam) return;
      
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
  }, [selectedTeam]);

  // Reset selected user when team changes
  useEffect(() => {
    setSelectedUser(null);
  }, [selectedTeam]);

  // Handle URL parameters for team navigation from COO dashboard
  useEffect(() => {
    const teamParam = searchParams.get('team');
    const executiveParam = searchParams.get('executive');
    
    if (teamParam && teams.length > 0 && !selectedTeam) {
      const teamId = parseInt(teamParam);
      const targetTeam = teams.find(team => team.id === teamId);
      
      if (targetTeam) {
        console.log(`🔗 Auto-selecting team from URL: ${targetTeam.name} (ID: ${teamId})`);
        if (executiveParam === 'true') {
          console.log('🏢 Executive context maintained');
        }
        setSelectedTeam(targetTeam);
      } else {
        console.warn(`⚠️ Team with ID ${teamId} not found in available teams`);
      }
    }
  }, [searchParams, teams, selectedTeam, setSelectedTeam]);

  // Handler functions for team flow
  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleBackToSelection = () => {
    const executiveParam = searchParams.get('executive');
    
    // If coming from executive context, return to COO dashboard
    if (executiveParam === 'true') {
      console.log('🏢 Returning to COO Executive Dashboard');
      window.location.href = '/executive';
      return;
    }
    
    // Otherwise, return to team selection
    setSelectedTeam(null);
    setSelectedUser(null);
  };

  // Show team selection if no team selected
  if (!selectedTeam) {
    return (
      <TeamSelectionScreen 
        teams={teams}
        onTeamSelect={handleTeamSelect}
      />
    );
  }

  // Team loading state
  if (selectedTeam && loading) {
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

  // Show user selection for selected team
  if (selectedTeam && !selectedUser) {
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
                    className="bg-gray-200 text-gray-700 px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors text-sm sm:text-base touch-target shrink-0"
                  >
                    Switch User
                  </button>
                  <button
                    onClick={handleBackToSelection}
                    className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base touch-target shrink-0"
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
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-6"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      }>
        <HomeContent />
      </Suspense>
    </TeamProvider>
  );
}