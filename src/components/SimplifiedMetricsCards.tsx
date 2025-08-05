'use client';

import React, { useState } from 'react';
import { Users, Calendar, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { COODashboardData } from '@/types';
import { COOMetricCard } from '@/components/ui/COOCard';
import { formatHours, formatPercentage } from '@/lib/calculationService';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import WorkforceStatusModal from '@/components/modals/WorkforceStatusModal';
import SprintPotentialModal from '@/components/modals/SprintPotentialModal';

interface SimplifiedMetricsCardsProps {
  dashboardData: COODashboardData;
  onTotalWorkforceClick?: () => void;
  selectedDate?: Date;
  className?: string;
}

export default function SimplifiedMetricsCards({
  dashboardData,
  onTotalWorkforceClick,
  selectedDate = new Date(),
  className = ''
}: SimplifiedMetricsCardsProps) {
  const { currentSprint } = useGlobalSprint();
  const [isWorkforceModalOpen, setIsWorkforceModalOpen] = useState(false);

  const handleTotalWorkforceClick = () => {
    // First try the provided handler (for backward compatibility)
    if (onTotalWorkforceClick) {
      onTotalWorkforceClick();
    } else {
      // Default behavior: open the workforce status modal
      setIsWorkforceModalOpen(true);
    }
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {/* 1. Total Workforce - Shows daily status with click functionality */}
      <COOMetricCard
        title="Total Workforce"
        value={`${dashboardData.companyOverview.totalMembers}`}
        trend={`${dashboardData.companyOverview.totalTeams} teams`}
        icon={Users}
        variant="primary"
        status="good"
        interactive
        onClick={handleTotalWorkforceClick}
        className="cursor-pointer hover:shadow-md transition-shadow duration-200"
        aria-label={`Total workforce: ${dashboardData.companyOverview.totalMembers} members across ${dashboardData.companyOverview.totalTeams} teams. Click for daily status details.`}
      />

      {/* 2. Max Capacity - Keep existing functionality unchanged */}
      <COOMetricCard
        title="Max Capacity"
        value={formatHours(dashboardData.companyOverview.sprintMax)}
        trend={currentSprint ? 
          `${currentSprint.sprint_length_weeks} weeks × ${dashboardData.companyOverview.totalMembers} × 7h` :
          `${dashboardData.companyOverview.totalMembers} × 2 weeks × 7h`
        }
        icon={Calendar}
        variant="info"
        status="excellent"
      />

      {/* 3. Sprint's Potential - Team potential hours after deductions */}
      <COOMetricCard
        title="Sprint's Potential"
        value={formatHours(dashboardData.companyOverview.sprintPotential)}
        trend="After deducting absences/reasons"
        icon={CheckCircle}
        variant="success"
        status="excellent"
      />

      {/* 4. Capacity Gap - Max capacity minus actual potential */}
      <COOMetricCard
        title="Capacity Gap"
        value={
          Math.abs(dashboardData.companyOverview.capacityGap) < 10
            ? `${dashboardData.companyOverview.capacityGapPercentage}%`
            : formatHours(Math.abs(dashboardData.companyOverview.capacityGap))
        }
        trend={
          Math.abs(dashboardData.companyOverview.capacityGap) < 10
            ? `${formatHours(Math.abs(dashboardData.companyOverview.capacityGap))} capacity ${dashboardData.companyOverview.capacityGap > 0 ? 'lost' : 'gained'}`
            : dashboardData.companyOverview.capacityGap > 0 ? 'Under-utilized' : 'Over-capacity'
        }
        trendDirection={dashboardData.companyOverview.capacityGap > 0 ? 'down' : 'up'}
        icon={Zap}
        variant="warning"
        status={Math.abs(dashboardData.companyOverview.capacityGap) < 10 ? 'good' : 'warning'}
      />

      {/* 5. Current Utilization - Utilization percentage */}
      <COOMetricCard
        title="Current Utilization"
        value={formatPercentage(dashboardData.companyOverview.currentUtilization)}
        trend={dashboardData.companyOverview.currentUtilization >= 90 ? 'Optimal' : 
               dashboardData.companyOverview.currentUtilization >= 80 ? 'Good' : 'Below Target'}
        trendDirection={dashboardData.companyOverview.currentUtilization >= 80 ? 'up' : 'down'}
        icon={TrendingUp}
        variant="primary"
        status={dashboardData.companyOverview.currentUtilization >= 90 ? 'excellent' :
               dashboardData.companyOverview.currentUtilization >= 80 ? 'good' : 'warning'}
      />

      {/* Workforce Status Modal */}
      <WorkforceStatusModal
        isOpen={isWorkforceModalOpen}
        onClose={() => setIsWorkforceModalOpen(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
}