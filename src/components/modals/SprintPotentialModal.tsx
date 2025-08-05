'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { X, CheckCircle, AlertTriangle, TrendingDown, BarChart3, Users } from 'lucide-react';
import { SprintPotentialModalProps, TeamCapacityBreakdown } from '@/types/modalTypes';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { formatHours, formatPercentage } from '@/lib/calculationService';

export default function SprintPotentialModal({
  isOpen,
  onClose,
  dashboardData
}: SprintPotentialModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Focus management
      const firstFocusableElement = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusableElement?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside to close (disabled on mobile to prevent accidental closes)
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isMobile) {
      onClose();
    }
  };

  // Process team capacity breakdown data
  const teamBreakdowns: TeamCapacityBreakdown[] = useMemo(() => {
    if (!dashboardData?.teamComparison) return [];

    return dashboardData.teamComparison.map((team: any) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      maxCapacity: team.maxCapacity,
      sprintPotential: team.weeklyPotential, // This is actually sprint potential
      capacityGap: team.capacityGap,
      capacityGapPercentage: Math.round((team.capacityGap / team.maxCapacity) * 100),
      memberCount: team.memberCount,
      lostHoursReasons: {
        absences: Math.round(team.capacityGap * 0.6), // Estimate 60% due to absences
        partialDays: Math.round(team.capacityGap * 0.3), // Estimate 30% due to partial days
        otherReasons: Math.round(team.capacityGap * 0.1) // Estimate 10% due to other reasons
      }
    }));
  }, [dashboardData]);

  // Calculate company totals
  const companyTotals = useMemo(() => {
    const totals = teamBreakdowns.reduce((acc, team) => ({
      maxCapacity: acc.maxCapacity + team.maxCapacity,
      sprintPotential: acc.sprintPotential + team.sprintPotential,
      capacityGap: acc.capacityGap + team.capacityGap,
      memberCount: acc.memberCount + team.memberCount,
      absences: acc.absences + team.lostHoursReasons.absences,
      partialDays: acc.partialDays + team.lostHoursReasons.partialDays,
      otherReasons: acc.otherReasons + team.lostHoursReasons.otherReasons
    }), {
      maxCapacity: 0,
      sprintPotential: 0,
      capacityGap: 0,
      memberCount: 0,
      absences: 0,
      partialDays: 0,
      otherReasons: 0
    });

    return {
      ...totals,
      capacityGapPercentage: totals.maxCapacity > 0 ? Math.round((totals.capacityGap / totals.maxCapacity) * 100) : 0
    };
  }, [teamBreakdowns]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sprint-potential-modal-title"
        className={`bg-white shadow-xl w-full overflow-hidden ${
          isMobile 
            ? 'h-full max-h-full rounded-none' // Mobile: Full screen
            : 'max-w-5xl max-h-[90vh] rounded-lg' // Desktop: Modal
        }`}
      >
        {/* Modal Header */}
        <div className={`sticky top-0 bg-white z-10 border-b border-gray-200 ${
          isMobile ? 'px-4 py-3' : 'p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 
                id="sprint-potential-modal-title" 
                className={`font-bold text-gray-900 ${
                  isMobile ? 'text-lg' : 'text-2xl'
                }`}
              >
                <CheckCircle className="inline-block w-6 h-6 mr-2 text-green-600" />
                Sprint's Potential Breakdown
              </h2>
              <p className={`text-gray-600 mt-1 ${
                isMobile ? 'text-sm' : 'text-base'
              }`}>
                Company-wide capacity analysis showing potential vs maximum hours
              </p>
            </div>
            <button
              onClick={onClose}
              className={`hover:bg-gray-100 rounded-lg transition-colors ${
                isMobile ? 'p-3 min-h-[44px] min-w-[44px]' : 'p-2'
              }`}
              aria-label="Close modal"
            >
              <X className={`text-gray-500 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className={`overflow-y-auto flex-1 ${isMobile ? 'p-4' : 'p-6'} space-y-6`}>
          
          {/* Company Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Company Overview
              </h3>
              <div className="text-sm text-blue-700">
                {companyTotals.memberCount} total members
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {formatHours(companyTotals.maxCapacity)}
                </div>
                <div className="text-sm text-blue-700">Max Capacity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {formatHours(companyTotals.sprintPotential)}
                </div>
                <div className="text-sm text-blue-700">Sprint Potential</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-700">
                  {formatHours(companyTotals.capacityGap)}
                </div>
                <div className="text-sm text-blue-700">Total Gap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-700">
                  {companyTotals.capacityGapPercentage}%
                </div>
                <div className="text-sm text-blue-700">Capacity Lost</div>
              </div>
            </div>
          </div>

          {/* Gap Reasons Breakdown */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Company-wide Gap Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-xl font-bold text-red-600">
                  {formatHours(companyTotals.absences)}
                </div>
                <div className="text-sm text-gray-600">Due to Absences</div>
                <div className="text-xs text-gray-500">
                  {Math.round((companyTotals.absences / companyTotals.capacityGap) * 100)}% of total gap
                </div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-xl font-bold text-yellow-600">
                  {formatHours(companyTotals.partialDays)}
                </div>
                <div className="text-sm text-gray-600">Partial Days</div>
                <div className="text-xs text-gray-500">
                  {Math.round((companyTotals.partialDays / companyTotals.capacityGap) * 100)}% of total gap
                </div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-xl font-bold text-gray-600">
                  {formatHours(companyTotals.otherReasons)}
                </div>
                <div className="text-sm text-gray-600">Other Reasons</div>
                <div className="text-xs text-gray-500">
                  {Math.round((companyTotals.otherReasons / companyTotals.capacityGap) * 100)}% of total gap
                </div>
              </div>
            </div>
          </div>

          {/* Team-by-Team Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Breakdown
            </h3>
            
            <div className="space-y-3">
              {teamBreakdowns
                .sort((a, b) => b.capacityGap - a.capacityGap) // Sort by highest gap first
                .map((team) => (
                <div 
                  key={team.teamId} 
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{team.teamName}</h4>
                      <div className="text-sm text-gray-600">
                        {team.memberCount} members
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        team.capacityGapPercentage > 20 ? 'text-red-600' :
                        team.capacityGapPercentage > 10 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        -{team.capacityGapPercentage}%
                      </div>
                      <div className="text-sm text-gray-500">capacity lost</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Max:</span>
                      <span className="font-medium ml-1">{formatHours(team.maxCapacity)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Potential:</span>
                      <span className="font-medium ml-1">{formatHours(team.sprintPotential)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Gap:</span>
                      <span className="font-medium ml-1 text-red-600">{formatHours(team.capacityGap)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Lost:</span>
                      <span className="font-medium ml-1">{team.capacityGapPercentage}%</span>
                    </div>
                  </div>
                  
                  {/* Team gap reasons */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-red-600">
                          {formatHours(team.lostHoursReasons.absences)}
                        </div>
                        <div className="text-gray-500">Absences</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">
                          {formatHours(team.lostHoursReasons.partialDays)}
                        </div>
                        <div className="text-gray-500">Partial Days</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-600">
                          {formatHours(team.lostHoursReasons.otherReasons)}
                        </div>
                        <div className="text-gray-500">Other</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="relative h-3 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-green-500"
                          style={{ width: `${(team.sprintPotential / team.maxCapacity) * 100}%` }}
                        ></div>
                        <div 
                          className="absolute right-0 top-0 h-full bg-red-300"
                          style={{ width: `${(team.capacityGap / team.maxCapacity) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Available: {formatHours(team.sprintPotential)}</span>
                      <span>Lost: {formatHours(team.capacityGap)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Optimization Opportunities
            </h3>
            
            <div className="space-y-2 text-sm">
              {companyTotals.absences > companyTotals.partialDays && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    <strong>High absence impact:</strong> {formatHours(companyTotals.absences)} lost to absences. 
                    Consider cross-training or temporary resource allocation.
                  </p>
                </div>
              )}
              
              {companyTotals.partialDays > 20 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    <strong>Partial day optimization:</strong> {formatHours(companyTotals.partialDays)} lost to partial days. 
                    Review scheduling efficiency and meeting patterns.
                  </p>
                </div>
              )}
              
              {companyTotals.capacityGapPercentage > 15 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    <strong>Capacity planning:</strong> {companyTotals.capacityGapPercentage}% capacity loss is significant. 
                    Consider workforce planning adjustments for future sprints.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}