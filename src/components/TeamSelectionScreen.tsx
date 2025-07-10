'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  ChevronRight, 
  Loader2, 
  Building2,
  BarChart3,
  TrendingUp,
  Zap,
  Crown
} from 'lucide-react';
import { Team, TeamStats, COOUser, TeamSelectionScreenProps } from '@/types';
import { DatabaseService } from '@/lib/database';

export default function TeamSelectionScreen({ 
  teams, 
  cooUsers, 
  onTeamSelect, 
  onCOOAccess 
}: TeamSelectionScreenProps) {
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const loadTeamStats = async () => {
      try {
        const statsData = await DatabaseService.getTeamStats();
        setTeamStats(statsData);
      } catch (error) {
        console.error('Error loading team stats:', error);
        setTeamStats([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeamStats();
  }, []);

  const handleCOOAccess = (cooUser: COOUser) => {
    setSelectedId(`coo-${cooUser.id}`);
    setTimeout(() => {
      onCOOAccess(cooUser);
    }, 150);
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedId(`team-${team.id}`);
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
        <div className="text-center mb-8">
          <Calendar className="text-blue-600 w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Team Availability Tracker
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Choose your access level to continue
          </p>
        </div>

        {/* Executive Section */}
        {cooUsers.length > 0 && (
          <section className="mb-8">
            <div className="executive-section p-6 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-6 h-6 text-yellow-300" />
                <h2 className="text-xl font-bold">Executive Dashboard</h2>
              </div>
              
              <div className="space-y-4">
                {cooUsers.map((cooUser) => {
                  const isSelected = selectedId === `coo-${cooUser.id}`;
                  
                  return (
                    <button
                      key={cooUser.id}
                      onClick={() => handleCOOAccess(cooUser)}
                      disabled={isSelected}
                      className={`
                        w-full group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 text-left transition-all duration-200 hover:bg-white/20 hover:scale-[1.02] active:scale-95 touch-manipulation
                        ${isSelected ? 'bg-white/20 scale-95' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {cooUser.name}
                            </h3>
                            <p className="text-white/80 text-sm mb-2">
                              {cooUser.hebrew} • {cooUser.title}
                            </p>
                            <p className="text-white/70 text-sm mb-3">
                              {cooUser.description}
                            </p>
                            
                            {/* Executive Features Preview */}
                            <div className="flex flex-wrap gap-3 text-xs">
                              <div className="flex items-center gap-1 text-white/80">
                                <BarChart3 className="w-3 h-3" />
                                <span>Company-wide analytics</span>
                              </div>
                              <div className="flex items-center gap-1 text-white/80">
                                <TrendingUp className="w-3 h-3" />
                                <span>Cross-team insights</span>
                              </div>
                              <div className="flex items-center gap-1 text-white/80">
                                <Zap className="w-3 h-3" />
                                <span>Strategic planning</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 shrink-0">
                          {isSelected ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                          )}
                        </div>
                      </div>
                      
                      {/* Executive Metrics Preview */}
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-white">{teams.length}</div>
                            <div className="text-xs text-white/70">Teams</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">
                              {teamStats.reduce((sum, stat) => sum + stat.member_count, 0)}
                            </div>
                            <div className="text-xs text-white/70">Members</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">Real-time</div>
                            <div className="text-xs text-white/70">Analytics</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Teams Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Team Dashboards</h2>
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
                const isSelected = selectedId === `team-${team.id}`;
                
                return (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSelect(team)}
                    disabled={isSelected}
                    className={`
                      group relative bg-white border-2 rounded-lg p-6 text-left transition-all duration-200 min-h-[140px] touch-manipulation hover:shadow-md
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 scale-95' 
                        : 'border-gray-200 hover:border-blue-300 active:scale-95'
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
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
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
                    
                    <div className="space-y-2">
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
                      
                      {/* Team Metrics Preview */}
                      <div className="text-xs text-gray-500">
                        Weekly capacity: {stats.member_count * 35}h
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
}