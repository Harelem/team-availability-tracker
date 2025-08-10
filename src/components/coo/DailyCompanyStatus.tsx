'use client';

import { useState } from 'react';
import { Calendar, X, Users, Building2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDailyCompanyStatus } from '@/hooks/useDailyCompanyStatus';
import TeamStatusGrid from './TeamStatusGrid';
import DailyMembersList from './DailyMembersList';

interface DailyCompanyStatusProps {
  selectedDate?: Date;
  className?: string;
}

export default function DailyCompanyStatus({ 
  selectedDate: initialDate = new Date(),
  className = ''
}: DailyCompanyStatusProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [filterByReason, setFilterByReason] = useState<string | null>(null);

  const { data: dailyStatus, isLoading, error, refetch } = useDailyCompanyStatus(selectedDate);

  // Status categories with Hebrew labels and colors
  const statusCategories = {
    available: { 
      label: 'זמינים', 
      englishLabel: 'Available',
      color: 'bg-green-500', 
      lightColor: 'bg-green-50 border-green-200',
      icon: '✅'
    },
    halfDay: { 
      label: 'חצי יום', 
      englishLabel: 'Half Day',
      color: 'bg-yellow-500', 
      lightColor: 'bg-yellow-50 border-yellow-200',
      icon: '⏰'
    },
    unavailable: { 
      label: 'לא זמינים', 
      englishLabel: 'Unavailable',
      color: 'bg-red-500', 
      lightColor: 'bg-red-50 border-red-200',
      icon: '❌'
    },
    reserve: { 
      label: 'שמירה', 
      englishLabel: 'Reserve Duty',
      color: 'bg-blue-500', 
      lightColor: 'bg-blue-50 border-blue-200',
      icon: '🛡️'
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatHebrewDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-500 font-medium">Error loading daily status</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Date Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <span>מצב החברה היומי</span>
              <span className="text-lg text-gray-600">• Daily Company Status</span>
            </h1>
            <p className="text-gray-600 mt-1">
              מבט כללי על זמינות כל העובדים • Complete workforce availability overview
            </p>
            <div className="mt-2 text-sm text-gray-500">
              <div>{formatHebrewDate(selectedDate)}</div>
              <div>{formatDate(selectedDate)}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-4 py-2 rounded-md transition-colors ${
                isToday(selectedDate)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              disabled={isToday(selectedDate)}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>היום • Today</span>
              </div>
            </button>

            <button
              onClick={refetch}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      )}

      {/* Company Overview Cards */}
      {dailyStatus && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(statusCategories).map(([key, category]) => {
              const count = dailyStatus.summary[key as keyof typeof dailyStatus.summary] || 0;
              const percentage = dailyStatus.total ? Math.round((count / dailyStatus.total) * 100) : 0;
              
              return (
                <div
                  key={key}
                  className={`${category.lightColor} rounded-lg p-4 border cursor-pointer hover:shadow-md transition-all ${
                    filterByReason === key ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setFilterByReason(filterByReason === key ? null : key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-600">
                        <div>{category.label}</div>
                        <div className="text-xs text-gray-500">{category.englishLabel}</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{count}</div>
                      <div className="text-sm text-gray-500">
                        {percentage}% • מהחברה of company
                      </div>
                    </div>
                    <div className="text-3xl">{category.icon}</div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${category.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span>פירוט לפי צוותים • Team Breakdown</span>
                </h2>
                
                <div className="flex items-center gap-3">
                  {filterByReason && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                      <span className="text-sm text-blue-800">
                        מסנן: {statusCategories[filterByReason as keyof typeof statusCategories].label} • 
                        Filter: {statusCategories[filterByReason as keyof typeof statusCategories].englishLabel}
                      </span>
                      <button
                        onClick={() => setFilterByReason(null)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                  <select
                    value={selectedTeam || ''}
                    onChange={(e) => setSelectedTeam(e.target.value || null)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">כל הצוותים • All Teams</option>
                    {dailyStatus.teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              <TeamStatusGrid 
                teams={dailyStatus.teams}
                selectedTeam={selectedTeam}
                filterByReason={filterByReason}
                selectedDate={selectedDate}
                onTeamSelect={setSelectedTeam}
              />
            </div>
          </div>

          {/* Detailed Member List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span>פירוט מפורט • Detailed Member List</span>
              </h2>
            </div>
            
            <DailyMembersList 
              members={dailyStatus.members}
              teams={dailyStatus.teams}
              selectedTeam={selectedTeam}
              filterByReason={filterByReason}
              selectedDate={selectedDate}
            />
          </div>
        </>
      )}
    </div>
  );
}