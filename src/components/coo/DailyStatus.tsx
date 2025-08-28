'use client';

import React, { useState, useEffect } from 'react';
import { Users, Clock, AlertCircle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TeamMember {
  id: number;
  name: string;
  hebrew: string;
  team_id: number;
  is_manager: boolean;
}

interface Team {
  id: number;
  name: string;
  color: string;
}

interface MemberDailyStatus {
  id: number;
  name: string;
  hebrew: string;
  team_name: string;
  team_color: string;
  value: '1' | '0.5' | 'X' | null;
  reason?: string;
  hours: number;
  status: 'present' | 'half-day' | 'absent';
  is_manager: boolean;
}

interface TeamDailyStatus {
  team_id: number;
  team_name: string;
  team_color: string;
  total_members: number;
  present: number;
  half_day: number;
  absent: number;
  members: MemberDailyStatus[];
}

interface DailySummary {
  total_members: number;
  present: number;
  half_day: number;
  absent: number;
  potential_hours: number;
  actual_hours: number;
  utilization: number;
}

export default function DailyStatus() {
  const [teamStatuses, setTeamStatuses] = useState<TeamDailyStatus[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    loadDailyStatus();
  }, [selectedDate]);

  const loadDailyStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all team members with their teams
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          name,
          hebrew,
          team_id,
          is_manager,
          teams (
            id,
            name,
            color
          )
        `)
        .order('name');

      if (membersError) throw membersError;

      // Get schedule entries for the selected date
      const { data: scheduleEntries, error: scheduleError } = await supabase
        .from('schedule_entries')
        .select('member_id, value, reason')
        .eq('date', selectedDate);

      if (scheduleError) throw scheduleError;

      // Create a map of member schedule entries
      const scheduleMap = new Map<number, { value: string; reason?: string }>();
      scheduleEntries?.forEach(entry => {
        scheduleMap.set(entry.member_id, {
          value: entry.value,
          reason: entry.reason
        });
      });

      // Process the data to create team statuses
      const teamsMap = new Map<number, TeamDailyStatus>();
      let totalMembers = 0;
      let totalPresent = 0;
      let totalHalfDay = 0;
      let totalAbsent = 0;
      let totalPotentialHours = 0;
      let totalActualHours = 0;

      members?.forEach(member => {
        if (!member.teams) return;

        const team = member.teams as any;
        const schedule = scheduleMap.get(member.id);
        const value = schedule?.value as '1' | '0.5' | 'X' | null;
        
        // Exclude Nir Shilo and Ran Avraham from calculations as per requirements
        const isExcluded = member.name === 'Nir Shilo' || member.name === 'Ran Avraham';
        
        // Calculate status and hours
        let status: 'present' | 'half-day' | 'absent' = 'absent';
        let hours = 0;
        
        if (value === '1') {
          status = 'present';
          hours = 7;
        } else if (value === '0.5') {
          status = 'half-day';
          hours = 3.5;
        } else {
          status = 'absent';
          hours = 0;
        }

        const memberStatus: MemberDailyStatus = {
          id: member.id,
          name: member.name,
          hebrew: member.hebrew,
          team_name: team.name,
          team_color: team.color,
          value,
          reason: schedule?.reason,
          hours,
          status,
          is_manager: member.is_manager || false
        };

        // Initialize or update team status
        if (!teamsMap.has(team.id)) {
          teamsMap.set(team.id, {
            team_id: team.id,
            team_name: team.name,
            team_color: team.color,
            total_members: 0,
            present: 0,
            half_day: 0,
            absent: 0,
            members: []
          });
        }

        const teamStatus = teamsMap.get(team.id)!;
        teamStatus.members.push(memberStatus);
        teamStatus.total_members++;

        // Update team counts
        if (status === 'present') {
          teamStatus.present++;
        } else if (status === 'half-day') {
          teamStatus.half_day++;
        } else {
          teamStatus.absent++;
        }

        // Update company totals (excluding specified people)
        if (!isExcluded) {
          totalMembers++;
          totalPotentialHours += 7; // 7 hours per working day
          totalActualHours += hours;
          
          if (status === 'present') {
            totalPresent++;
          } else if (status === 'half-day') {
            totalHalfDay++;
          } else {
            totalAbsent++;
          }
        }
      });

      const teamStatusArray = Array.from(teamsMap.values());
      setTeamStatuses(teamStatusArray);

      // Set summary
      const utilization = totalPotentialHours > 0 ? (totalActualHours / totalPotentialHours) * 100 : 0;
      setSummary({
        total_members: totalMembers,
        present: totalPresent,
        half_day: totalHalfDay,
        absent: totalAbsent,
        potential_hours: totalPotentialHours,
        actual_hours: totalActualHours,
        utilization: Math.round(utilization * 100) / 100
      });

    } catch (err) {
      console.error('Error loading daily status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load daily status');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamExpansion = (teamId: number) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'half-day':
        return 'bg-yellow-100 text-yellow-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daily Status</h2>
              <p className="text-sm text-gray-600">Company-wide attendance overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={loadDailyStatus}
              className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Members</p>
                  <p className="text-2xl font-bold text-blue-900">{summary.total_members}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Present</p>
                  <p className="text-2xl font-bold text-green-900">{summary.present}</p>
                </div>
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Half Day</p>
                  <p className="text-2xl font-bold text-yellow-900">{summary.half_day}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Absent</p>
                  <p className="text-2xl font-bold text-red-900">{summary.absent}</p>
                </div>
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✗</span>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Utilization</p>
                  <p className="text-2xl font-bold text-purple-900">{summary.utilization}%</p>
                  <p className="text-xs text-purple-600">
                    {summary.actual_hours}h / {summary.potential_hours}h
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Breakdown */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Team Breakdown</h3>
        
        <div className="space-y-4">
          {teamStatuses.map(team => (
            <div key={team.team_id} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleTeamExpansion(team.team_id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.team_color }}
                  />
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{team.team_name}</h4>
                    <p className="text-sm text-gray-500">
                      {team.total_members} members • {team.present} present • {team.half_day} half-day • {team.absent} absent
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {team.present}
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                      {team.half_day}
                    </span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                      {team.absent}
                    </span>
                  </div>
                  {expandedTeams.has(team.team_id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              
              {expandedTeams.has(team.team_id) && (
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {team.members.map(member => (
                      <div
                        key={member.id}
                        className="bg-white rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {member.name}
                              {member.is_manager && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                  MGR
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{member.hebrew}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(member.status)}`}>
                            {member.status === 'half-day' ? 'Half' : member.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{member.hours}h</span>
                          {member.reason && (
                            <span className="text-right truncate ml-2" title={member.reason}>
                              {member.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {teamStatuses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No team data available for {new Date(selectedDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}