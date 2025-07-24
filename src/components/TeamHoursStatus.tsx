'use client';

import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, AlertTriangle, XCircle, Calendar } from 'lucide-react';
import { Team, TeamMember, CurrentGlobalSprint } from '@/types';
import { DatabaseService } from '@/lib/database';
import { calculateSprintPeriod, calculateWorkingDaysInPeriod, getSprintDescription, formatSprintDateRange } from '@/utils/sprintCalculations';

interface MemberHoursStatus {
  memberId: number;
  memberName: string;
  memberHebrew: string;
  isManager: boolean;
  filledDays: number;
  totalDays: number;
  completionRate: number;
  isComplete: boolean;
  status: 'complete' | 'partial' | 'missing';
}

interface TeamHoursStatusProps {
  selectedTeam: Team;
  currentSprint: CurrentGlobalSprint;
}

export default function TeamHoursStatus({ selectedTeam, currentSprint }: TeamHoursStatusProps) {
  const [currentSprintStatus, setCurrentSprintStatus] = useState<MemberHoursStatus[]>([]);
  const [nextSprintStatus, setNextSprintStatus] = useState<MemberHoursStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTeam && currentSprint) {
      loadHoursStatus();
    }
  }, [selectedTeam, currentSprint]);

  const loadHoursStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading hours status for team:', selectedTeam.name);
      
      // Calculate sprint periods
      const currentPeriod = calculateSprintPeriod(currentSprint, 0); // Current sprint
      const nextPeriod = calculateSprintPeriod(currentSprint, 1); // Next sprint
      
      console.log('📅 Current sprint period:', currentPeriod);
      console.log('📅 Next sprint period:', nextPeriod);
      
      // Load team members
      const members = await DatabaseService.getTeamMembers(selectedTeam.id);
      console.log('👥 Team members loaded:', members.length);
      
      if (members.length === 0) {
        setCurrentSprintStatus([]);
        setNextSprintStatus([]);
        return;
      }
      
      // Check current sprint status
      const currentStatus = await checkSprintHoursStatus(members, currentPeriod);
      setCurrentSprintStatus(currentStatus);
      
      // Check next sprint status
      const nextStatus = await checkSprintHoursStatus(members, nextPeriod);
      setNextSprintStatus(nextStatus);
      
      console.log('✅ Hours status loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading hours status:', error);
      setError('Failed to load hours status');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSprintHoursStatus = async (
    members: TeamMember[], 
    sprintPeriod: { start: string; end: string }
  ): Promise<MemberHoursStatus[]> => {
    const memberStatus: MemberHoursStatus[] = [];
    
    // Get schedule entries for the period
    const scheduleData = await DatabaseService.getScheduleEntries(
      sprintPeriod.start, 
      sprintPeriod.end, 
      selectedTeam.id
    );
    
    const workingDays = calculateWorkingDaysInPeriod(sprintPeriod.start, sprintPeriod.end);
    
    for (const member of members) {
      const memberSchedule = scheduleData[member.id] || {};
      const filledDays = Object.keys(memberSchedule).length;
      const completionRate = workingDays > 0 ? (filledDays / workingDays) * 100 : 0;
      
      memberStatus.push({
        memberId: member.id,
        memberName: member.name,
        memberHebrew: member.hebrew,
        isManager: member.isManager || false,
        filledDays,
        totalDays: workingDays,
        completionRate,
        isComplete: completionRate >= 100,
        status: completionRate >= 100 ? 'complete' : 
                completionRate >= 50 ? 'partial' : 'missing'
      });
    }
    
    return memberStatus.sort((a, b) => {
      // Sort by manager first, then by completion rate
      if (a.isManager && !b.isManager) return -1;
      if (!a.isManager && b.isManager) return 1;
      return b.completionRate - a.completionRate;
    });
  };

  const StatusBadge = ({ status }: { status: 'complete' | 'partial' | 'missing' }) => {
    const badges = {
      complete: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
      partial: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      missing: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    const { icon: Icon, color, bg } = badges[status];
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color} ${bg}`}>
        <Icon className="w-3 h-3" />
        {status === 'complete' ? 'Complete' : status === 'partial' ? 'Partial' : 'Missing'}
      </div>
    );
  };

  const CompletionSummary = ({ statusList }: { statusList: MemberHoursStatus[] }) => {
    const complete = statusList.filter(m => m.status === 'complete').length;
    const partial = statusList.filter(m => m.status === 'partial').length;
    const missing = statusList.filter(m => m.status === 'missing').length;
    const total = statusList.length;
    const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Team Completion</span>
          <span className="font-medium">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              percentage >= 80 ? 'bg-green-500' : 
              percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>{complete} complete</span>
          <span>{partial} partial</span>
          <span>{missing} missing</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="team-hours-status bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-100 p-4 rounded-lg h-40"></div>
            <div className="bg-gray-100 p-4 rounded-lg h-40"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-hours-status bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="text-center text-red-600">
          <XCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-hours-status bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Hours Completion Status</h3>
          <p className="text-sm text-gray-600">Track team progress for current and upcoming sprints</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current Sprint Status */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-blue-900">
              {getSprintDescription(0)}
            </h4>
          </div>
          <p className="text-xs text-blue-700 mb-4">
            {formatSprintDateRange(calculateSprintPeriod(currentSprint, 0))}
          </p>
          
          {currentSprintStatus.length === 0 ? (
            <div className="text-center py-4 text-blue-700">
              <p className="text-sm">No team members found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {currentSprintStatus.map(member => (
                  <div key={member.memberId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {member.memberName}
                      </span>
                      {member.isManager && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded">
                          Manager
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {member.filledDays}/{member.totalDays}
                      </span>
                      <StatusBadge status={member.status} />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-3 border-t border-blue-200">
                <CompletionSummary statusList={currentSprintStatus} />
              </div>
            </>
          )}
        </div>
        
        {/* Next Sprint Status */}
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-green-900">
              {getSprintDescription(1)}
            </h4>
          </div>
          <p className="text-xs text-green-700 mb-4">
            {formatSprintDateRange(calculateSprintPeriod(currentSprint, 1))}
          </p>
          
          {nextSprintStatus.length === 0 ? (
            <div className="text-center py-4 text-green-700">
              <p className="text-sm">No team members found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {nextSprintStatus.map(member => (
                  <div key={member.memberId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {member.memberName}
                      </span>
                      {member.isManager && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-800 rounded">
                          Manager
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {member.filledDays}/{member.totalDays}
                      </span>
                      <StatusBadge status={member.status} />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-3 border-t border-green-200">
                <CompletionSummary statusList={nextSprintStatus} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}