'use client';

import { useState } from 'react';
import { TrendingUp, Award, Flame, Calendar, Target, Clock, ChevronRight } from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  RecognitionDashboardProps,
  AchievementProgress,
  LeaderboardTimeframe,
  ACHIEVEMENT_CONFIGS
} from '@/types/recognitionTypes';
import { useRecognitionSystem } from '@/hooks/useRecognitionSystem';
import RecognitionBadge, { AchievementBadgeGrid, AchievementSummary } from './RecognitionBadge';

export default function RecognitionDashboard({
  userId,
  teamView = false,
  timeframe = 'week',
  onAchievementClick,
  className = ''
}: RecognitionDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardTimeframe>(timeframe);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  
  const { 
    achievements, 
    metrics, 
    dashboardData, 
    leaderboard,
    isLoading, 
    error,
    checkForNewAchievements,
    clearError 
  } = useRecognitionSystem({
    userId,
    timeframe: selectedPeriod,
    autoRefresh: true
  });

  const handleAchievementClick = (achievement: any) => {
    if (onAchievementClick) {
      onAchievementClick(achievement);
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-700">
            <Award className="h-5 w-5" />
            <span>Error loading recognition data: {error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  const currentMetrics = dashboardData?.currentMetrics || {
    weeklyCompletionRate: 0,
    consistencyStreak: 0,
    totalAchievements: 0,
    currentRank: 0
  };

  const progressToNext = dashboardData?.progressToNext || [];
  const weeklyTrend = dashboardData?.weeklyTrend || [];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Award className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Recognition & Achievements
          </h3>
        </div>
        
        {/* Period Selector */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['week', 'month', 'quarter'] as LeaderboardTimeframe[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Consistency Score */}
        <MetricCard
          title="Consistency Score"
          value={`${currentMetrics.weeklyCompletionRate}%`}
          icon={TrendingUp}
          color="blue"
          trend={weeklyTrend.length >= 2 ? 
            weeklyTrend[weeklyTrend.length - 1].value - weeklyTrend[weeklyTrend.length - 2].value : 0
          }
        />

        {/* Total Achievements */}
        <MetricCard
          title="Total Achievements"
          value={currentMetrics.totalAchievements}
          icon={Award}
          color="green"
        />

        {/* Current Streak */}
        <MetricCard
          title="Current Streak"
          value={`${currentMetrics.consistencyStreak} weeks`}
          icon={Flame}
          color="orange"
        />
      </div>

      {/* Recent Achievements */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Recent Achievements</h4>
          {achievements.length > 6 && (
            <button
              onClick={() => setShowAllAchievements(!showAllAchievements)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>{showAllAchievements ? 'Show Less' : 'View All'}</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showAllAchievements ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>

        {achievements.length > 0 ? (
          <div className="space-y-3">
            {(showAllAchievements ? achievements : achievements.slice(0, 6)).map((achievement) => (
              <div key={achievement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <RecognitionBadge 
                    achievement={achievement} 
                    size="sm" 
                    onClick={handleAchievementClick}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {ACHIEVEMENT_CONFIGS[achievement.achievementType]?.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(achievement.earnedAt).toLocaleDateString()} 
                      {achievement.weekStart && ` • Week of ${new Date(achievement.weekStart).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium text-blue-600">
                  +{ACHIEVEMENT_CONFIGS[achievement.achievementType]?.points} pts
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <div className="text-sm">No achievements yet</div>
            <div className="text-xs text-gray-400 mt-1">
              Keep updating your availability to earn recognition!
            </div>
          </div>
        )}
      </div>

      {/* Progress to Next Achievements */}
      {progressToNext.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Progress to Next Achievement</h4>
          <div className="space-y-3">
            {progressToNext.map((progress, index) => (
              <ProgressCard key={index} progress={progress} />
            ))}
          </div>
        </div>
      )}

      {/* Weekly Trend Chart */}
      {weeklyTrend.length > 2 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Consistency Trend</h4>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  domain={[0, 100]}
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Completion Rate']}
                  labelFormatter={(label) => `Week of ${new Date(label).toLocaleDateString()}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Leaderboard Position */}
      {currentMetrics.currentRank > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">Your Team Rank:</div>
              <div className="text-lg font-bold text-gray-900">#{currentMetrics.currentRank}</div>
            </div>
            
            <button
              onClick={checkForNewAchievements}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Target className="h-4 w-4" />
              <span>Check for New Achievements</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
  trend?: number;
}

function MetricCard({ title, value, icon: Icon, color, trend }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-900 bg-blue-600',
    green: 'from-green-50 to-green-100 text-green-900 bg-green-600',
    yellow: 'from-yellow-50 to-yellow-100 text-yellow-900 bg-yellow-600',
    red: 'from-red-50 to-red-100 text-red-900 bg-red-600',
    purple: 'from-purple-50 to-purple-100 text-purple-900 bg-purple-600',
    orange: 'from-orange-50 to-orange-100 text-orange-900 bg-orange-600'
  };

  const colorClass = colorClasses[color];
  const [bgGradient, textColor, iconBg] = colorClass.split(' ');

  return (
    <div className={`bg-gradient-to-br ${bgGradient} rounded-lg p-4`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 ${iconBg} rounded-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
          <div className={`text-sm ${textColor.replace('900', '700')}`}>{title}</div>
          {trend !== undefined && trend !== 0 && (
            <div className={`text-xs mt-1 flex items-center space-x-1 ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trend > 0 ? '↗' : '↘'}</span>
              <span>{Math.abs(trend)}{typeof value === 'string' && value.includes('%') ? 'pp' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress Card Component
interface ProgressCardProps {
  progress: AchievementProgress;
}

function ProgressCard({ progress }: ProgressCardProps) {
  const config = ACHIEVEMENT_CONFIGS[progress.achievementType];
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{config?.icon}</span>
          <div>
            <div className="font-medium text-gray-900">{progress.title}</div>
            <div className="text-sm text-gray-600">{progress.description}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {progress.currentValue} / {progress.targetValue}
          </div>
          <div className="text-xs text-gray-500">
            {Math.round(progress.progress)}%
          </div>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progress.progress, 100)}%` }}
        />
      </div>
      
      {progress.estimatedCompletion && (
        <div className="text-xs text-gray-500 mt-2">
          Est. completion: {progress.estimatedCompletion}
        </div>
      )}
    </div>
  );
}