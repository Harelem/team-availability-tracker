'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Achievement, 
  RecognitionBadgeProps, 
  ACHIEVEMENT_CONFIGS 
} from '@/types/recognitionTypes';

export default function RecognitionBadge({
  achievement,
  size = 'md',
  showDetails = false,
  onClick,
  className = ''
}: RecognitionBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const config = ACHIEVEMENT_CONFIGS[achievement.achievementType];
  
  if (!config) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const handleClick = () => {
    if (onClick) {
      onClick(achievement);
    }
  };

  const formatAchievementDetails = () => {
    const { achievementData } = achievement;
    const details = [];

    if (achievementData.completion_rate) {
      details.push(`${achievementData.completion_rate}% completion`);
    }

    if (achievementData.streak_length) {
      details.push(`${achievementData.streak_length} week streak`);
    }

    if (achievementData.early_planning_count) {
      details.push(`${achievementData.early_planning_count} days early`);
    }

    if (achievementData.team_members_helped) {
      details.push(`helped ${achievementData.team_members_helped} teammates`);
    }

    return details.join(', ');
  };

  return (
    <div className="relative">
      <div
        className={`
          inline-flex items-center space-x-2 rounded-full border font-medium transition-all duration-200
          ${config.color}
          ${sizeClasses[size]}
          ${onClick ? 'cursor-pointer hover:shadow-md active:scale-95' : ''}
          ${className}
        `}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={showDetails ? undefined : config.description}
      >
        <span className={`${iconSizes[size]}`}>{config.icon}</span>
        <span className="font-medium">{config.title}</span>
        
        {showDetails && (
          <div className="ml-2 text-xs opacity-75">
            {formatDistanceToNow(new Date(achievement.earnedAt), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Detailed tooltip for larger badges */}
      {isHovered && size !== 'sm' && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
            <div className="font-medium mb-1">{config.title}</div>
            <div className="mb-2">{config.description}</div>
            
            {formatAchievementDetails() && (
              <div className="text-gray-300 mb-2">
                {formatAchievementDetails()}
              </div>
            )}
            
            <div className="text-gray-400">
              Earned {formatDistanceToNow(new Date(achievement.earnedAt), { addSuffix: true })}
            </div>
            
            {achievement.weekStart && (
              <div className="text-gray-400 text-xs mt-1">
                Week of {new Date(achievement.weekStart).toLocaleDateString()}
              </div>
            )}
            
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Achievement Badge Grid - for displaying multiple badges
interface AchievementBadgeGridProps {
  achievements: Achievement[];
  maxDisplay?: number;
  badgeSize?: 'sm' | 'md' | 'lg';
  onBadgeClick?: (achievement: Achievement) => void;
  className?: string;
}

export function AchievementBadgeGrid({
  achievements,
  maxDisplay = 6,
  badgeSize = 'sm',
  onBadgeClick,
  className = ''
}: AchievementBadgeGridProps) {
  const displayAchievements = achievements.slice(0, maxDisplay);
  const remainingCount = Math.max(0, achievements.length - maxDisplay);

  if (achievements.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        <div className="text-2xl mb-2">🏆</div>
        <div className="text-sm">No achievements yet</div>
        <div className="text-xs text-gray-400 mt-1">
          Keep updating your schedule to earn badges!
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {displayAchievements.map((achievement) => (
          <RecognitionBadge
            key={achievement.id}
            achievement={achievement}
            size={badgeSize}
            onClick={onBadgeClick}
          />
        ))}
        
        {remainingCount > 0 && (
          <div className={`
            inline-flex items-center justify-center rounded-full border border-gray-300 
            bg-gray-50 text-gray-600 font-medium
            ${badgeSize === 'sm' ? 'px-2 py-1 text-xs min-w-[2rem]' : 
              badgeSize === 'md' ? 'px-3 py-1.5 text-sm min-w-[2.5rem]' : 
              'px-4 py-2 text-base min-w-[3rem]'}
          `}>
            +{remainingCount}
          </div>
        )}
      </div>
      
      {achievements.length > 0 && (
        <div className="text-xs text-gray-500">
          {achievements.length} achievement{achievements.length !== 1 ? 's' : ''} earned
        </div>
      )}
    </div>
  );
}

// Recent Achievement Notification - for showing new achievements
interface RecentAchievementNotificationProps {
  achievement: Achievement;
  isVisible: boolean;
  onDismiss: () => void;
  autoHideDuration?: number;
}

export function RecentAchievementNotification({
  achievement,
  isVisible,
  onDismiss,
  autoHideDuration = 5000
}: RecentAchievementNotificationProps) {
  const config = ACHIEVEMENT_CONFIGS[achievement.achievementType];
  
  if (!config || !isVisible) return null;

  // Auto-hide after duration
  if (autoHideDuration > 0) {
    setTimeout(() => {
      onDismiss();
    }, autoHideDuration);
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-lg
              ${config.color}
            `}>
              {config.icon}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                Achievement Earned!
              </p>
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {config.title}
            </p>
            
            <p className="text-sm text-gray-600 mt-1">
              {config.description}
            </p>
            
            {achievement.achievementData.completion_rate && (
              <p className="text-xs text-gray-500 mt-2">
                {achievement.achievementData.completion_rate}% completion rate
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 text-center">
            +{config.points} recognition points
          </div>
        </div>
      </div>
    </div>
  );
}

// Achievement Summary - compact view for dashboard cards
interface AchievementSummaryProps {
  achievements: Achievement[];
  showCount?: boolean;
  showRecent?: boolean;
  className?: string;
}

export function AchievementSummary({
  achievements,
  showCount = true,
  showRecent = true,
  className = ''
}: AchievementSummaryProps) {
  const recentAchievements = achievements
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 3);

  const achievementTypes = [...new Set(achievements.map(a => a.achievementType))];
  const uniqueBadges = achievementTypes.map(type => ACHIEVEMENT_CONFIGS[type]?.icon).filter(Boolean);

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        {showCount && (
          <span className="text-2xl font-bold text-gray-900">
            {achievements.length}
          </span>
        )}
        
        <div className="flex space-x-1">
          {uniqueBadges.slice(0, 4).map((icon, index) => (
            <span key={index} className="text-lg">
              {icon}
            </span>
          ))}
          {uniqueBadges.length > 4 && (
            <span className="text-sm text-gray-500 ml-1">
              +{uniqueBadges.length - 4}
            </span>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        Total Achievements
      </div>
      
      {showRecent && recentAchievements.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Recent:</div>
          <div className="space-y-1">
            {recentAchievements.map((achievement) => {
              const config = ACHIEVEMENT_CONFIGS[achievement.achievementType];
              return (
                <div key={achievement.id} className="flex items-center space-x-2">
                  <span className="text-sm">{config?.icon}</span>
                  <span className="text-xs text-gray-600 truncate">
                    {config?.title}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(achievement.earnedAt), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}