'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TeamStats {
  team_id: number;
  team_name: string;
  description: string;
  color: string;
  team_size: number;
  manager_count: number;
  current_sprint_number: number;
  sprint_start_date: string;
  sprint_end_date: string;
  progress_percentage: number;
  days_remaining: number;
  is_active: boolean;
  sprint_hours: string;
  current_week_hours: string;
  potential_hours: number;
  capacity_utilization: string;
}

interface COOMetrics {
  totalTeams: number;
  totalMembers: number;
  averageUtilization: number;
  activeSprintNumber: number;
  daysRemaining: number;
}

export default function COODashboard() {
  const router = useRouter();
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [metrics, setMetrics] = useState<COOMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCOOData();
  }, []);

  const loadCOOData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch team statistics from the recreated view
      const { data: teams, error: teamsError } = await supabase
        .from('team_sprint_stats')
        .select('*')
        .order('team_name');

      if (teamsError) {
        throw teamsError;
      }

      setTeamStats(teams || []);

      // Calculate overall metrics
      if (teams && teams.length > 0) {
        const totalMembers = teams.reduce((sum, team) => sum + team.team_size, 0);
        const averageUtilization = teams.reduce((sum, team) => 
          sum + parseFloat(team.capacity_utilization), 0
        ) / teams.length;

        setMetrics({
          totalTeams: teams.length,
          totalMembers,
          averageUtilization: Math.round(averageUtilization * 100) / 100,
          activeSprintNumber: teams[0]?.current_sprint_number || 0,
          daysRemaining: teams[0]?.days_remaining || 0,
        });
      }

    } catch (err) {
      console.error('Error loading COO data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="coo-dashboard-loading" className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading COO Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="coo-dashboard-error" className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadCOOData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div data-testid="coo-dashboard" className="coo-dashboard max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">COO Dashboard</h1>
                <p className="text-gray-600">Company-wide team performance overview</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Sprint {metrics?.activeSprintNumber}</div>
              <div className="text-sm text-gray-500">{metrics?.daysRemaining} days remaining</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Teams</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalTeams}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalMembers}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.averageUtilization}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Days Remaining</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.daysRemaining}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Performance Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Team Performance Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sprint Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamStats.map((team) => {
                  const utilization = parseFloat(team.capacity_utilization);
                  const utilizationColor = utilization >= 80 ? 'text-green-600' : 
                                         utilization >= 60 ? 'text-yellow-600' : 'text-red-600';
                  const statusColor = utilization >= 80 ? 'bg-green-100 text-green-800' : 
                                    utilization >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                  const status = utilization >= 80 ? 'Excellent' : 
                               utilization >= 60 ? 'Good' : 'Needs Attention';

                  return (
                    <tr key={team.team_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-4 w-4 rounded-full mr-3"
                            style={{ backgroundColor: team.color }}
                          ></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{team.team_name}</div>
                            <div className="text-sm text-gray-500">{team.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {team.team_size} members
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {team.sprint_hours}h / {team.potential_hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {team.current_week_hours}h
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${utilizationColor}`}>
                        {team.capacity_utilization}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Data refreshed at {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}