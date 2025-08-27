'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Users, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ExecutiveMetrics {
  total_teams: number;
  total_members: number;
  total_managers: number;
  active_sprint: number;
  average_capacity_utilization: number;
  total_sprint_hours: number;
  total_potential_hours: number;
  performance_score: number;
}

interface TeamPerformance {
  team_name: string;
  team_size: number;
  capacity_utilization: number;
  sprint_hours: number;
  potential_hours: number;
  color: string;
}

interface Alert {
  type: 'warning' | 'danger' | 'info';
  message: string;
  team?: string;
}

export default function ExecutiveDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExecutiveData();
  }, []);

  const loadExecutiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if executive views exist, fallback to team_sprint_stats
      try {
        await supabase
          .from('executive_daily_intelligence')
          .select('*')
          .limit(1)
          .single();
        // Executive data loaded successfully
      } catch (error) {
        console.log('Executive view not available, using fallback data');
      }

      // Fallback to team_sprint_stats view
      const { data: teams, error: teamsError } = await supabase
        .from('team_sprint_stats')
        .select('*')
        .order('capacity_utilization', { ascending: false });

      if (teamsError) {
        throw teamsError;
      }

      const teamsData = teams || [];
      setTeamPerformance(teamsData);

      // Calculate executive metrics from team data
      if (teamsData.length > 0) {
        const totalMembers = teamsData.reduce((sum, team) => sum + team.team_size, 0);
        const totalManagers = teamsData.reduce((sum, team) => sum + team.manager_count, 0);
        const totalSprintHours = teamsData.reduce((sum, team) => sum + parseFloat(team.sprint_hours), 0);
        const totalPotentialHours = teamsData.reduce((sum, team) => sum + team.potential_hours, 0);
        const avgUtilization = teamsData.reduce((sum, team) => 
          sum + parseFloat(team.capacity_utilization), 0
        ) / teamsData.length;
        
        // Calculate performance score based on utilization
        const performanceScore = avgUtilization >= 75 ? 85 + (avgUtilization - 75) / 2 : 
                                avgUtilization >= 50 ? 60 + avgUtilization / 3 : 
                                40 + avgUtilization / 2;

        setMetrics({
          total_teams: teamsData.length,
          total_members: totalMembers,
          total_managers: totalManagers,
          active_sprint: teamsData[0]?.current_sprint_number || 0,
          average_capacity_utilization: Math.round(avgUtilization * 100) / 100,
          total_sprint_hours: Math.round(totalSprintHours * 100) / 100,
          total_potential_hours: totalPotentialHours,
          performance_score: Math.round(performanceScore * 100) / 100,
        });

        // Generate alerts based on team performance
        const alertsArray: Alert[] = [];
        
        const lowPerformingTeams = teamsData.filter(team => 
          parseFloat(team.capacity_utilization) < 50
        );
        
        const highPerformingTeams = teamsData.filter(team => 
          parseFloat(team.capacity_utilization) > 90
        );

        lowPerformingTeams.forEach(team => {
          alertsArray.push({
            type: 'danger',
            message: `Low capacity utilization (${team.capacity_utilization}%)`,
            team: team.team_name,
          });
        });

        highPerformingTeams.forEach(team => {
          alertsArray.push({
            type: 'warning',
            message: `High capacity utilization (${team.capacity_utilization}%) - risk of burnout`,
            team: team.team_name,
          });
        });

        if (teamsData[0]?.days_remaining <= 3) {
          alertsArray.push({
            type: 'info',
            message: `Sprint ${teamsData[0].current_sprint_number} ending in ${teamsData[0].days_remaining} days`,
          });
        }

        setAlerts(alertsArray);
      }

    } catch (err) {
      console.error('Error loading executive data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load executive dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="executive-dashboard-loading" className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Executive Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="executive-dashboard-error" className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadExecutiveData}
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
      <div data-testid="executive-dashboard" className="dashboard-container max-w-7xl mx-auto p-6">
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
                <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
                <p className="text-gray-600">Strategic overview of company performance</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Sprint {metrics?.active_sprint}</div>
              <div className="text-sm text-gray-500">Performance Score: {metrics?.performance_score}%</div>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Teams</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.total_teams}</p>
                  <p className="text-xs text-gray-400">{metrics.total_members} members</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.average_capacity_utilization}%</p>
                  <p className="text-xs text-gray-400">Company-wide average</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Sprint Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.total_sprint_hours.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">of {metrics.total_potential_hours.toLocaleString()} potential</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Performance Score</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.performance_score}%</p>
                  <p className="text-xs text-gray-400">Overall health metric</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Executive Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const alertColor = alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                                 alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                 'bg-blue-50 border-blue-200 text-blue-800';
                
                return (
                  <div key={index} className={`p-3 rounded-lg border ${alertColor}`}>
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <div>
                        {alert.team && <span className="font-medium">{alert.team}: </span>}
                        {alert.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Team Performance Overview */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Team Performance Matrix</h2>
            <p className="text-sm text-gray-500">Strategic view of team capacity and utilization</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamPerformance.map((team, index) => {
                const utilization = team.capacity_utilization;
                // const efficiency = (team.sprint_hours / team.potential_hours) * 100; // Future use
                const statusColor = utilization >= 80 ? 'border-green-500 bg-green-50' :
                                  utilization >= 60 ? 'border-yellow-500 bg-yellow-50' :
                                  'border-red-500 bg-red-50';

                return (
                  <div key={index} className={`border-l-4 ${statusColor} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{team.team_name}</h3>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color }}
                      ></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Team Size:</span>
                        <span className="font-medium">{team.team_size} members</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Utilization:</span>
                        <span className="font-medium">{utilization}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sprint Hours:</span>
                        <span className="font-medium">{team.sprint_hours}h</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${
                            utilization >= 80 ? 'bg-green-500' :
                            utilization >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Executive dashboard • Data refreshed at {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}