'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CompanyMetrics {
  currentSprint: {
    id: number;
    sprint_number: number;
    sprint_name?: string;
    start_date: string;
    end_date: string;
    status: string;
    progress_percentage: number;
    days_remaining: number;
    total_days: number;
    working_days_total: number;
    working_days_remaining: number;
  } | null;
  totalTeams: number;
  totalMembers: number;
  excludedMembers: string[];
  companyPotentialHours: number;
  currentSprintCapacity: number;
  sprintUtilization: number;
  weeklyMetrics: {
    thisWeekHours: number;
    thisWeekPotential: number;
    thisWeekUtilization: number;
  };
}

export default function CompanyMetrics() {
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyMetrics();
  }, []);

  const loadCompanyMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get active sprint
      const { data: activeSprint, error: sprintError } = await supabase
        .from('sprint_history')
        .select('*')
        .eq('status', 'active')
        .single();

      if (sprintError && sprintError.code !== 'PGRST116') { // PGRST116 = no rows
        throw sprintError;
      }

      // 2. Get all teams count
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name');

      if (teamsError) throw teamsError;

      // 3. Get all team members (for accurate counting)
      const { data: allMembers, error: membersError } = await supabase
        .from('team_members')
        .select('id, name, hebrew');

      if (membersError) throw membersError;

      // 4. Excluded members as per requirements
      const excludedMembers = ['Nir Shilo', 'Ran Avraham'];
      const eligibleMembers = allMembers?.filter(
        member => !excludedMembers.includes(member.name)
      ) || [];

      let sprintWorkingDays = 0;
      let workingDaysRemaining = 0;
      let sprintCapacity = 0;
      let currentSprintHours = 0;

      if (activeSprint) {
        // Calculate working days (exclude weekends - Friday & Saturday in Israel)
        const startDate = new Date(activeSprint.sprint_start_date);
        const endDate = new Date(activeSprint.sprint_end_date);
        const today = new Date();

        // Count working days in sprint
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay();
          // Skip Friday (5) and Saturday (6)
          if (dayOfWeek !== 5 && dayOfWeek !== 6) {
            sprintWorkingDays++;
          }
        }

        // Count remaining working days
        const remainingStart = today > startDate ? today : startDate;
        for (let date = new Date(remainingStart); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 5 && dayOfWeek !== 6) {
            workingDaysRemaining++;
          }
        }

        // Calculate sprint capacity (eligible members × working days × 7 hours)
        sprintCapacity = eligibleMembers.length * sprintWorkingDays * 7;

        // Get actual sprint hours
        const { data: sprintEntries, error: sprintEntriesError } = await supabase
          .from('schedule_entries')
          .select('member_id, value')
          .gte('date', activeSprint.sprint_start_date)
          .lte('date', activeSprint.sprint_end_date)
          .in('member_id', eligibleMembers.map(m => m.id));

        if (sprintEntriesError) throw sprintEntriesError;

        // Calculate actual hours
        sprintEntries?.forEach(entry => {
          switch (entry.value) {
            case '1':
              currentSprintHours += 7;
              break;
            case '0.5':
              currentSprintHours += 3.5;
              break;
            case 'X':
              currentSprintHours += 0;
              break;
          }
        });
      }

      // 5. Calculate this week's metrics
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

      // Count this week's working days
      let thisWeekWorkingDays = 0;
      for (let date = new Date(startOfWeek); date <= endOfWeek; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
          thisWeekWorkingDays++;
        }
      }

      const thisWeekPotential = eligibleMembers.length * thisWeekWorkingDays * 7;

      // Get this week's actual hours
      const { data: weekEntries, error: weekEntriesError } = await supabase
        .from('schedule_entries')
        .select('member_id, value')
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .in('member_id', eligibleMembers.map(m => m.id));

      if (weekEntriesError) throw weekEntriesError;

      let thisWeekActualHours = 0;
      weekEntries?.forEach(entry => {
        switch (entry.value) {
          case '1':
            thisWeekActualHours += 7;
            break;
          case '0.5':
            thisWeekActualHours += 3.5;
            break;
          case 'X':
            thisWeekActualHours += 0;
            break;
        }
      });

      // Build metrics object
      const companyMetrics: CompanyMetrics = {
        currentSprint: activeSprint ? {
          id: activeSprint.id,
          sprint_number: activeSprint.sprint_number,
          sprint_name: activeSprint.sprint_name,
          start_date: activeSprint.sprint_start_date,
          end_date: activeSprint.sprint_end_date,
          status: activeSprint.status,
          progress_percentage: activeSprint.progress_percentage,
          days_remaining: activeSprint.days_remaining,
          total_days: Math.ceil((new Date(activeSprint.sprint_end_date).getTime() - new Date(activeSprint.sprint_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
          working_days_total: sprintWorkingDays,
          working_days_remaining: workingDaysRemaining
        } : null,
        totalTeams: teams?.length || 0,
        totalMembers: allMembers?.length || 0,
        excludedMembers,
        companyPotentialHours: sprintCapacity,
        currentSprintCapacity: sprintCapacity,
        sprintUtilization: sprintCapacity > 0 ? Math.round((currentSprintHours / sprintCapacity) * 100) : 0,
        weeklyMetrics: {
          thisWeekHours: thisWeekActualHours,
          thisWeekPotential: thisWeekPotential,
          thisWeekUtilization: thisWeekPotential > 0 ? Math.round((thisWeekActualHours / thisWeekPotential) * 100) : 0
        }
      };

      setMetrics(companyMetrics);

    } catch (err) {
      console.error('Error loading company metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
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

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Unable to load company metrics</p>
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
            <Target className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Company Metrics</h2>
              <p className="text-sm text-gray-600">Overall performance and capacity overview</p>
            </div>
          </div>
          <button
            onClick={loadCompanyMetrics}
            className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
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

      <div className="p-6 space-y-6">
        {/* Current Sprint Info */}
        {metrics.currentSprint ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Sprint #{metrics.currentSprint.sprint_number}
                  {metrics.currentSprint.sprint_name && ` - ${metrics.currentSprint.sprint_name}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(metrics.currentSprint.start_date).toLocaleDateString()} - {new Date(metrics.currentSprint.end_date).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                metrics.currentSprint.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {metrics.currentSprint.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${metrics.currentSprint.progress_percentage}%` }}
                    />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{metrics.currentSprint.progress_percentage}%</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Days Remaining</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.currentSprint.days_remaining}</p>
                <p className="text-xs text-gray-500">of {metrics.currentSprint.total_days} total</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Working Days Left</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.currentSprint.working_days_remaining}</p>
                <p className="text-xs text-gray-500">of {metrics.currentSprint.working_days_total} working</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Sprint Utilization</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.sprintUtilization}%</p>
                <p className="text-xs text-gray-500">capacity used</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-900">No Active Sprint</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Create and activate a sprint to track company metrics
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Company Structure</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {metrics.totalTeams} Teams
                </p>
                <p className="text-sm text-blue-600">
                  {metrics.totalMembers} total members
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {metrics.totalMembers - metrics.excludedMembers.length} eligible for capacity
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Sprint Capacity</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {metrics.companyPotentialHours.toLocaleString()}h
                </p>
                <p className="text-sm text-green-600">
                  Total potential hours
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Excludes weekends & specified personnel
                </p>
              </div>
              <Clock className="w-12 h-12 text-green-600 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">This Week</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {metrics.weeklyMetrics.thisWeekUtilization}%
                </p>
                <p className="text-sm text-purple-600">
                  {metrics.weeklyMetrics.thisWeekHours}h / {metrics.weeklyMetrics.thisWeekPotential}h
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  Weekly utilization
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-80" />
            </div>
          </div>
        </div>

        {/* Exclusions Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-900">Capacity Calculation Notes</h4>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                <li>• Working days exclude weekends (Friday & Saturday)</li>
                <li>• Excluded from capacity calculations: {metrics.excludedMembers.join(', ')}</li>
                <li>• Standard working day = 7 hours</li>
                <li>• Half day = 3.5 hours, Absent = 0 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}