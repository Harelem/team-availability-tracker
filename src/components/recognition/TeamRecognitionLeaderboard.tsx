/* RECOGNITION FEATURES TEMPORARILY DISABLED FOR PRODUCTION

'use client';

import { useState, useMemo } from 'react';
import { Crown, Trophy, Medal, TrendingUp, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  TeamRecognitionLeaderboardProps,
  LeaderboardTimeframe,
  LeaderboardEntry,
  ACHIEVEMENT_CONFIGS
} from '@/types/recognitionTypes';
import { useRecognitionLeaderboard } from '@/hooks/useRecognitionSystem';
import RecognitionBadge, { AchievementBadgeGrid } from './RecognitionBadge';

export default function TeamRecognitionLeaderboard({
  teamId,
  timeframe = 'week',
  limit = 10,
  showTeamStats = true,
  onMemberClick,
  className = ''
}: TeamRecognitionLeaderboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<LeaderboardTimeframe>(timeframe);
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<'consistency' | 'achievements' | 'streak'>('consistency');
  
  const { leaderboard, isLoading, error, refetch } = useRecognitionLeaderboard(selectedTimeframe, teamId);

  // Sort leaderboard based on selected criteria
  const sortedLeaderboard = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => {
      switch (sortBy) {
        case 'consistency':
          return b.consistencyScore - a.consistencyScore;
        case 'achievements':
          return b.totalAchievements - a.totalAchievements;
        case 'streak':
          return b.streakCount - a.streakCount;
        default:
          return b.consistencyScore - a.consistencyScore;
      }
    });
    
    return showAll ? sorted : sorted.slice(0, limit);
  }, [leaderboard, sortBy, showAll, limit]);

  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (leaderboard.length === 0) return null;
    
    const totalMembers = leaderboard.length;
    const averageConsistency = leaderboard.reduce((sum, member) => sum + member.consistencyScore, 0) / totalMembers;
    const totalAchievements = leaderboard.reduce((sum, member) => sum + member.totalAchievements, 0);
    const activeMembers = leaderboard.filter(member => member.consistencyScore > 0).length;
    
    return {
      totalMembers,
      activeMembers,
      averageConsistency: Math.round(averageConsistency),
      totalAchievements
    };
  }, [leaderboard]);

  const handleMemberClick = (member: LeaderboardEntry) => {
    if (onMemberClick) {
      onMemberClick(member);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          {showTeamStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-700">
            <Trophy className="h-5 w-5" />
            <span>Error loading leaderboard: {error}</span>
          </div>
          <button
            onClick={refetch}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">Team Recognition Leaderboard</h3>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Timeframe Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'quarter'] as LeaderboardTimeframe[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedTimeframe(period)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedTimeframe === period
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="consistency">Sort by Consistency</option>
            <option value="achievements">Sort by Achievements</option>
            <option value="streak">Sort by Streak</option>
          </select>
        </div>
      </div>

      {/* Team Statistics */}
      {showTeamStats && teamStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Users}
            title="Total Members"
            value={teamStats.totalMembers}
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            title="Active Members"
            value={teamStats.activeMembers}
            subtitle={`${Math.round((teamStats.activeMembers / teamStats.totalMembers) * 100)}% participation`}
            color="green"
          />
          <StatCard
            icon={Trophy}
            title="Avg Consistency"
            value={`${teamStats.averageConsistency}%`}
            color="orange"
          />
          <StatCard
            icon={Medal}
            title="Total Achievements"
            value={teamStats.totalAchievements}
            color="purple"
          />
        </div>
      )}

      {/* Leaderboard */}
      <div className="space-y-3">
        {sortedLeaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <div className="text-sm">No leaderboard data available</div>
            <div className="text-xs text-gray-400 mt-1">
              Team members need to start updating their schedules
            </div>
          </div>
        ) : (
          sortedLeaderboard.map((member, index) => (
            <LeaderboardRow
              key={member.id}
              member={member}
              rank={index + 1}
              onClick={() => handleMemberClick(member)}
              timeframe={selectedTimeframe}
            />
          ))
        )}
        
        {/* Show More/Less Button */}
        {leaderboard.length > limit && (
          <div className="text-center pt-4">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 mx-auto"
            >
              <span>{showAll ? 'Show Less' : `Show All ${leaderboard.length} Members`}</span>
              {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleDateString()} • 
          <button 
            onClick={refetch}
            className="ml-1 text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

*/

// Leaderboard Row Component
interface LeaderboardRowProps {
  member: LeaderboardEntry;
  rank: number;
  onClick: () => void;
  timeframe: LeaderboardTimeframe;
}

function LeaderboardRow({ member, rank, onClick, timeframe }: LeaderboardRowProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-orange-400" />;
      default:
        return null;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-400 text-yellow-900';
      case 2:
        return 'bg-gray-300 text-gray-800';
      case 3:
        return 'bg-orange-400 text-orange-900';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const recentAchievements = member.recentAchievements?.slice(0, 3) || [];

  return (
    <div 
      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        {/* Rank */}
        <div className="flex items-center justify-center">
          {getRankIcon(rank) || (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeColor(rank)}`}>
              {rank}
            </div>
          )}
        </div>
        
        {/* Member Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium text-gray-900">{member.name}</div>
              <div className="text-sm text-gray-500">{member.hebrew}</div>
              {member.teamName && (
                <div className="text-xs text-gray-400">{member.teamName}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats and Achievements */}
      <div className="flex items-center space-x-6">
        {/* Metrics */}
        <div className="text-right">
          <div className="font-semibold text-gray-900">{member.consistencyScore}%</div>
          <div className="text-sm text-gray-500">Consistency</div>
        </div>
        
        <div className="text-right">
          <div className="font-semibold text-gray-900">{member.totalAchievements}</div>
          <div className="text-sm text-gray-500">Achievements</div>
        </div>
        
        <div className="text-right">
          <div className="font-semibold text-gray-900">{member.streakCount}</div>
          <div className="text-sm text-gray-500">Streak</div>
        </div>
        
        {/* Recent Achievement Icons */}
        <div className="flex space-x-1">
          {recentAchievements.length > 0 ? (
            recentAchievements.map((achievement, i) => {
              const config = ACHIEVEMENT_CONFIGS[achievement.achievementType];
              return (
                <div 
                  key={i} 
                  className="text-lg" 
                  title={config?.title}
                >
                  {config?.icon}
                </div>
              );
            })
          ) : (
            <div className="text-gray-300 text-sm">No recent achievements</div>
          )}
        </div>
      </div>
    </div>
  );
}

*/

// Stat Card Component
interface StatCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string | number;
  subtitle?: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

function StatCard({ icon: Icon, title, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    green: 'bg-green-50 text-green-900 border-green-200',
    orange: 'bg-orange-50 text-orange-900 border-orange-200',
    purple: 'bg-purple-50 text-purple-900 border-purple-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center space-x-2 mb-2">
        <Icon className="h-5 w-5" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className="text-xs opacity-75 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

*/

// Compact version for sidebar or smaller spaces
interface CompactLeaderboardProps {
  teamId?: number;
  timeframe?: LeaderboardTimeframe;
  limit?: number;
  onMemberClick?: (member: LeaderboardEntry) => void;
  className?: string;
}

export function CompactLeaderboard({
  teamId,
  timeframe = 'week',
  limit = 5,
  onMemberClick,
  className = ''
}: CompactLeaderboardProps) {
  const { leaderboard, isLoading } = useRecognitionLeaderboard(timeframe, teamId);
  
  const topMembers = leaderboard.slice(0, limit);

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-12 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {topMembers.map((member, index) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
          onClick={() => onMemberClick?.(member)}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              index === 0 ? 'bg-yellow-400 text-yellow-900' :
              index === 1 ? 'bg-gray-300 text-gray-800' :
              index === 2 ? 'bg-orange-400 text-orange-900' :
              'bg-blue-100 text-blue-800'
            }`}>
              {index + 1}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{member.name}</div>
              <div className="text-xs text-gray-500">{member.consistencyScore}%</div>
            </div>
          </div>
          
          <div className="flex space-x-1">
            {member.recentAchievements?.slice(0, 2).map((achievement, i) => {
              const config = ACHIEVEMENT_CONFIGS[achievement.achievementType];
              return (
                <span key={i} className="text-sm" title={config?.title}>
                  {config?.icon}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

*/