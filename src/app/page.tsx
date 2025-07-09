'use client';

import { useState, useEffect } from 'react';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import ScheduleTable from '@/components/ScheduleTable';
import TeamSelectionScreen from '@/components/TeamSelectionScreen';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import { TeamProvider, useTeam } from '@/contexts/TeamContext';
import { TeamMember } from '@/types';
import { DatabaseService } from '@/lib/database';

function HomeContent() {
  const { selectedTeam, setSelectedTeam } = useTeam();
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!selectedTeam) return;
      
      try {
        setLoading(true);
        // Initialize team members if needed
        await DatabaseService.initializeTeamMembers();
        // Load team members from database for selected team
        const members = await DatabaseService.getTeamMembers(selectedTeam.id);
        setTeamMembers(members);
      } catch (error) {
        console.error('Error loading team members:', error);
        // Fallback to empty array for team-specific loading
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

  // Show team selection screen if no team is selected
  if (!selectedTeam) {
    return <TeamSelectionScreen onTeamSelect={setSelectedTeam} />;
  }

  if (loading) {
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

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-md max-w-md w-full">
          {/* Back button */}
          <div className="mb-4">
            <button
              onClick={() => setSelectedTeam(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Teams</span>
            </button>
          </div>
          
          {/* Breadcrumb navigation */}
          <BreadcrumbNavigation
            selectedTeam={selectedTeam}
            selectedUser={selectedUser}
            onNavigateToTeamSelection={() => setSelectedTeam(null)}
            onNavigateToMemberSelection={() => setSelectedUser(null)}
          />
          
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
            {/* Breadcrumb navigation */}
            <BreadcrumbNavigation
              selectedTeam={selectedTeam}
              selectedUser={selectedUser}
              onNavigateToTeamSelection={() => setSelectedTeam(null)}
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
                    <strong>{selectedTeam.name}</strong> • Welcome, <strong>{selectedUser.name}</strong>
                    {selectedUser.isManager && <span className="text-blue-600 ml-1">(Manager)</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="bg-gray-200 text-gray-700 px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors text-xs sm:text-base min-h-[40px] touch-manipulation shrink-0"
                >
                  Switch User
                </button>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-xs sm:text-base min-h-[40px] touch-manipulation shrink-0"
                >
                  Switch Team
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <ScheduleTable 
          currentUser={selectedUser} 
          teamMembers={teamMembers}
          selectedTeam={selectedTeam}
        />
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