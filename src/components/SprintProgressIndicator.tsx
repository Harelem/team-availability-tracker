'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Target, TrendingUp } from 'lucide-react';
import { Team, TeamSprint } from '@/types';
import { DatabaseService } from '@/lib/database';

interface SprintProgressIndicatorProps {
  team: Team;
  className?: string;
}

export default function SprintProgressIndicator({ team, className = '' }: SprintProgressIndicatorProps) {
  const [currentSprint, setCurrentSprint] = useState<TeamSprint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentSprint();
  }, [team.id]);

  const loadCurrentSprint = async () => {
    setLoading(true);
    try {
      const sprint = await DatabaseService.getCurrentSprint(team.id);
      setCurrentSprint(sprint);
    } catch (error) {
      console.error('Error loading current sprint:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressPercentage = () => {
    if (!currentSprint) return 0;
    
    const now = new Date();
    const start = new Date(currentSprint.start_date);
    const end = new Date(currentSprint.end_date);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.round((elapsed / total) * 100);
  };

  const getDaysRemaining = () => {
    if (!currentSprint) return 0;
    
    const now = new Date();
    const end = new Date(currentSprint.end_date);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const getStatusColor = () => {
    const daysRemaining = getDaysRemaining();
    const progressPercentage = getProgressPercentage();
    
    if (daysRemaining <= 1) return 'bg-red-500';
    if (daysRemaining <= 3) return 'bg-yellow-500';
    if (progressPercentage >= 50) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    const daysRemaining = getDaysRemaining();
    
    if (daysRemaining === 0) return 'Sprint ends today';
    if (daysRemaining === 1) return '1 day remaining';
    return `${daysRemaining} days remaining`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (!currentSprint) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">No active sprint</span>
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();
  const daysRemaining = getDaysRemaining();

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">
            Sprint #{currentSprint.sprint_number}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDate(currentSprint.start_date)} - {formatDate(currentSprint.end_date)}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs text-gray-600">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-600">{getStatusText()}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-600">{team.sprint_length_weeks || 1}w sprint</span>
        </div>
      </div>
    </div>
  );
}