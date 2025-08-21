'use client';

import React, { useState } from 'react';
import { Users, Calendar, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { COODashboardData } from '@/types';
import { COOMetricCard } from '@/components/ui/COOCard';
import { formatHours, formatPercentage } from '@/lib/calculationService';
import WorkforceStatusModal from '@/components/modals/WorkforceStatusModal';
import { DESIGN_SYSTEM, combineClasses } from '@/utils/designSystem';

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
    <div className={combineClasses(
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
      DESIGN_SYSTEM.grids.gap.md,
      className
    )}>
      {/* 1. Total Workforce - Shows daily status with click functionality */}
      <div
        onClick={handleTotalWorkforceClick}
        className="ui-card cursor-pointer focus-ring touch-target-large"
        aria-label={`Total workforce: ${dashboardData.companyOverview.totalMembers} members across ${dashboardData.companyOverview.totalTeams} teams. Click for daily status details.`}
        role="button"
        tabIndex={0}
      >
        <COOMetricCard
          title="Total Workforce"
          value={`${dashboardData.companyOverview.totalMembers}`}
          trend={`${dashboardData.companyOverview.totalTeams} teams`}
          icon={Users}
          variant="primary"
          status="good"
        />
      </div>

      {/* 2. Max Capacity - Keep existing functionality unchanged */}
      <COOMetricCard
        title="Max Capacity"
        value={formatHours(dashboardData.companyOverview.sprintMax)}
        trend={`${dashboardData.companyOverview.totalMembers} × 2 sprints × 35h`}
        icon={Calendar}
        variant="primary"
        status="excellent"
        className="ui-card"
      />

      {/* 3. Current Potential - Team potential hours after deductions */}
      <COOMetricCard
        title="Current Potential"
        value={formatHours(dashboardData.companyOverview.sprintPotential)}
        trend="After deducting absences/reasons"
        icon={CheckCircle}
        variant="success"
        status="excellent"
        className="ui-card"
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
        className="ui-card"
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
        className="ui-card"
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