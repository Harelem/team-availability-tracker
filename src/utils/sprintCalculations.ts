import { CurrentGlobalSprint } from '@/types';

export interface SprintPeriod {
  start: string;
  end: string;
}

export const calculateSprintPeriod = (currentSprint: CurrentGlobalSprint, offset: number = 0): SprintPeriod => {
  const sprintStart = new Date(currentSprint.sprint_start_date);
  const sprintWeeks = currentSprint.sprint_length_weeks;
  
  // Calculate target sprint start (current + offset)
  const targetSprintStart = new Date(sprintStart);
  targetSprintStart.setDate(sprintStart.getDate() + (offset * sprintWeeks * 7));
  
  const targetSprintEnd = new Date(targetSprintStart);
  targetSprintEnd.setDate(targetSprintStart.getDate() + (sprintWeeks * 7) - 1);
  
  return {
    start: targetSprintStart.toISOString().split('T')[0],
    end: targetSprintEnd.toISOString().split('T')[0]
  };
};

export const calculateWorkingDaysInPeriod = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    // Sunday (0) to Thursday (4) are working days
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      workingDays++;
    }
  }
  
  return workingDays;
};

export const getSprintDescription = (offset: number): string => {
  switch (offset) {
    case -1:
      return 'Previous Sprint';
    case 0:
      return 'Current Sprint';
    case 1:
      return 'Next Sprint';
    default:
      return `Sprint ${offset > 0 ? '+' : ''}${offset}`;
  }
};

export const formatSprintDateRange = (period: SprintPeriod): string => {
  const start = new Date(period.start);
  const end = new Date(period.end);
  
  const startFormatted = start.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  const endFormatted = end.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${startFormatted} - ${endFormatted}`;
};