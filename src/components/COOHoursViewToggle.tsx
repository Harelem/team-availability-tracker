'use client';

import { useState, useEffect } from 'react';
import { HoursViewToggleProps, HoursViewType, Team, TeamMember } from '@/types';
import { HoursCalculationService } from '@/utils/hoursCalculations';

interface ExtendedHoursViewToggleProps extends HoursViewToggleProps {
  allTeams: (Team & { team_members?: TeamMember[] })[];
}

export default function COOHoursViewToggle({ 
  currentView, 
  onViewChange, 
  sprintData,
  allTeams 
}: ExtendedHoursViewToggleProps) {
  const [totals, setTotals] = useState({
    weekly: 0,
    sprint: 0,
    loading: true
  });

  useEffect(() => {
    calculateHoursTotals();
  }, [allTeams, sprintData]); // Fixed: Remove function dependency to prevent infinite loop

  const calculateHoursTotals = async () => {
    setTotals(prev => ({ ...prev, loading: true }));
    
    try {
      const companyTotals = await HoursCalculationService.calculateCompanyTotals(
        allTeams,
        currentView,
        sprintData
      );
      
      setTotals({
        weekly: companyTotals.weekly,
        sprint: companyTotals.sprint,
        loading: false
      });
      
    } catch (error) {
      console.error('Error calculating hours totals:', error);
      setTotals({ weekly: 0, sprint: 0, loading: false });
    }
  };

  const handleViewChange = (view: HoursViewType) => {
    onViewChange(view);
  };

  // Removed weekRange as it's no longer needed for sprint-based UI

  return (
    <div className="hours-view-control mb-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">📊 Hours View Control</h3>
            <p className="text-sm text-gray-600">
              Dashboard metrics now show Sprint Potential ({sprintData?.sprint_length_weeks || 2} weeks) • Choose view detail level
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Sprint-Based Calculations Active:</span>{' '}
            {sprintData ? 
              `Sprint ${sprintData.current_sprint_number} (${sprintData.sprint_length_weeks} weeks) • ${sprintData.sprint_length_weeks * 35}h potential per person` :
              'Default 2-week sprint (70h per person)'
            } • All capacity metrics use sprint timeframe
          </div>
          
          {/* THIS IS THE TOGGLE THE USER WANTS */}
          <div className="flex bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => handleViewChange('weekly')}
              className={`px-6 py-3 rounded-md font-medium transition-all flex items-center gap-2 ${
                currentView === 'weekly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span>📅 Weekly Hours</span>
              <div className="text-xs">
                {totals.loading ? '...' : `${totals.weekly}h`} company total
              </div>
            </button>
            
            <button
              onClick={() => handleViewChange('sprint')}
              className={`px-6 py-3 rounded-md font-medium transition-all flex items-center gap-2 ${
                currentView === 'sprint'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-green-600 hover:bg-green-50'
              }`}
            >
              <span>🏃‍♂️ Sprint Hours</span>
              <div className="text-xs">
                {totals.loading ? '...' : `${totals.sprint}h`} company total
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility component for displaying view comparison
export function ViewComparisonTooltip({ 
  weeklyHours, 
  sprintHours 
}: { 
  weeklyHours: number; 
  sprintHours: number; 
}) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
      <div className="font-medium text-gray-900 mb-2">Hours Comparison</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-blue-600">📅 Weekly:</span>
          <span className="font-medium">{weeklyHours}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-600">🏃‍♂️ Sprint:</span>
          <span className="font-medium">{sprintHours}h</span>
        </div>
      </div>
    </div>
  );
}