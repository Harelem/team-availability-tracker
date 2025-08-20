'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  ChevronRight, 
  Loader2, 
  Crown
} from 'lucide-react';
import { Team, TeamStats, TeamSelectionScreenProps } from '@/types';
import { DatabaseService } from '@/lib/database';

export default React.memo(function TeamSelectionScreen({ 
  teams, 
  onTeamSelect 
}: TeamSelectionScreenProps) {
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [currentSprint, setCurrentSprint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const loadTeamStatsAndSprint = async () => {
      try {
        // Load both team stats and current sprint in parallel
        const [statsData, sprintData] = await Promise.all([
          DatabaseService.getTeamStats(),
          DatabaseService.getCurrentGlobalSprint()
        ]);
        
        setTeamStats(statsData);
        setCurrentSprint(sprintData);
      } catch (error) {
        console.error('Error loading team stats and sprint:', error);
        setTeamStats([]);
        setCurrentSprint(null);
      } finally {
        setLoading(false);
      }
    };

    loadTeamStatsAndSprint();
  }, []);


  const handleTeamSelect = (team: Team) => {
    setSelectedId(`team-${team.id}`);
    setTimeout(() => {
      onTeamSelect(team);
    }, 150);
  };

  const getTeamStats = (teamId: number) => {
    return teamStats.find(stat => stat.id === teamId) || { member_count: 0, manager_count: 0 };
  };

  // Calculate sprint hours potential for a team
  const calculateSprintHoursPotential = (memberCount: number) => {
    if (!currentSprint || !memberCount) return 0;
    
    // Calculate working days in sprint (assuming 10 working days for a typical 2-week sprint)
    // This is a simplified calculation - in reality, you'd calculate based on sprint dates
    const workingDaysInSprint = 10;
    const hoursPerDay = 7;
    
    return memberCount * workingDaysInSprint * hoursPerDay;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Access Options...</h2>
          <p className="text-gray-600">Please wait while we load your dashboard options</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 sm:p-8 shadow-md max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <Calendar className="text-blue-600 w-16 h-16 mx-auto mb-6" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Team Availability Tracker
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Select your team to continue
          </p>
          
          {/* Executive Dashboard Link */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <a 
              href="/executive" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Crown className="w-4 h-4" />
              Executive Dashboard Access
            </a>
          </div>
        </div>


        {/* Teams Section */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-8">
            <Users className="w-6 h-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-900">Team Dashboards</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => {
                const stats = getTeamStats(team.id);
                const isSelected = selectedId === `team-${team.id}`;
                
                return (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSelect(team)}
                    disabled={isSelected}
                    className={`
                      group relative bg-white border-2 rounded-xl p-5 text-left transition-all duration-200 w-full hover:shadow-lg hover:-translate-y-1
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300 active:scale-[0.98]'
                      }
                    `}
                    style={{
                      borderColor: isSelected ? team.color : undefined
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                          {team.name}
                        </h3>
                        {team.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {team.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{stats.member_count} members</span>
                        </div>
                        {stats.manager_count > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className="whitespace-nowrap">{stats.manager_count} manager{stats.manager_count > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Team Metrics Preview */}
                      <div className="text-xs text-gray-500">
                        {currentSprint ? (
                          <span className="block truncate">Sprint capacity: {calculateSprintHoursPotential(stats.member_count)}h</span>
                        ) : (
                          <span className="block truncate">Weekly capacity: {stats.member_count * 35}h</span>
                        )}
                      </div>
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
        </section>
      </div>
    </div>
  );
});