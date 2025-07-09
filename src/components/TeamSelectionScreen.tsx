'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { Team, TeamStats } from '@/types';
import { DatabaseService } from '@/lib/database';

interface TeamSelectionScreenProps {
  onTeamSelect: (team: Team) => void;
}

export default function TeamSelectionScreen({ onTeamSelect }: TeamSelectionScreenProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        // Initialize teams if needed
        await DatabaseService.initializeTeams();
        
        // Load teams and stats
        const [teamsData, statsData] = await Promise.all([
          DatabaseService.getTeams(),
          DatabaseService.getTeamStats()
        ]);
        
        setTeams(teamsData);
        setTeamStats(statsData);
      } catch (error) {
        console.error('Error loading teams:', error);
        // Fallback to empty arrays
        setTeams([]);
        setTeamStats([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, []);

  const handleTeamSelect = (team: Team) => {
    setSelectedTeamId(team.id);
    // Small delay for visual feedback
    setTimeout(() => {
      onTeamSelect(team);
    }, 150);
  };

  const getTeamStats = (teamId: number) => {
    return teamStats.find(stat => stat.id === teamId) || { member_count: 0, manager_count: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Teams...</h2>
          <p className="text-gray-600">Please wait while we load your teams</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 sm:p-8 shadow-md max-w-4xl w-full">
        <div className="text-center mb-8">
          <Calendar className="text-blue-600 w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Team Availability Tracker
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Select your team to continue
          </p>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Available</h3>
            <p className="text-gray-600 mb-4">
              It looks like teams haven&apos;t been set up yet. Please contact your administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => {
              const stats = getTeamStats(team.id);
              const isSelected = selectedTeamId === team.id;
              
              return (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelect(team)}
                  disabled={isSelected}
                  className={`
                    group relative bg-white border-2 rounded-lg p-6 text-left transition-all duration-200 min-h-[140px] touch-manipulation
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 scale-95' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md active:scale-95'
                    }
                  `}
                  style={{
                    borderColor: isSelected ? team.color : undefined
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {team.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 shrink-0">
                      {isSelected ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{stats.member_count} members</span>
                    </div>
                    {stats.manager_count > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>{stats.manager_count} manager{stats.manager_count > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Team color indicator */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
                    style={{ backgroundColor: team.color }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}