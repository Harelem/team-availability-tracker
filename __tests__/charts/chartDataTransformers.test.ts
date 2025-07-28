import {
  transformSprintCapacityData,
  transformUtilizationDistributionData,
  getUtilizationColor,
  formatChartTooltip,
  CHART_COLORS
} from '@/utils/chartDataTransformers';

import { TeamCapacityStatus } from '@/types';

describe('Chart Data Transformers', () => {
  const mockTeamCapacityData: TeamCapacityStatus[] = [
    {
      teamId: 1,
      teamName: 'Engineering Team',
      memberCount: 8,
      weeklyPotential: 280,
      actualHours: 245,
      utilization: 87.5,
      capacityGap: 35,
      capacityStatus: 'optimal',
      color: '#3B82F6'
    },
    {
      teamId: 2,
      teamName: 'Design Team',
      memberCount: 4,
      weeklyPotential: 140,
      actualHours: 98,
      utilization: 70,
      capacityGap: 42,
      capacityStatus: 'under',
      color: '#10B981'
    },
    {
      teamId: 3,
      teamName: 'QA Team',
      memberCount: 6,
      weeklyPotential: 210,
      actualHours: 231,
      utilization: 110,
      capacityGap: -21,
      capacityStatus: 'over',
      color: '#EF4444'
    }
  ];

  describe('transformSprintCapacityData', () => {
    it('should transform team capacity data correctly', () => {
      const result = transformSprintCapacityData(mockTeamCapacityData);
      
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        teamName: 'QA Team',
        teamId: 3,
        potential: 210,
        actual: 231,
        utilization: 110,
        color: '#EF4444',
        status: 'over'
      });
      
      expect(result.metadata.totalRecords).toBe(3);
      expect(result.metadata.averages.utilization).toBeCloseTo(89.17, 2);
    });

    it('should handle empty data', () => {
      const result = transformSprintCapacityData([]);
      
      expect(result.data).toHaveLength(0);
      expect(result.metadata.totalRecords).toBe(0);
      expect(result.metadata.averages.utilization).toBe(0);
    });
  });

  describe('transformUtilizationDistributionData', () => {
    it('should calculate utilization distribution correctly', () => {
      const result = transformUtilizationDistributionData(mockTeamCapacityData);
      
      expect(result.data).toHaveLength(3);
      
      const optimalTeam = result.data.find(d => d.status === 'optimal');
      expect(optimalTeam).toEqual({
        status: 'optimal',
        count: 1,
        percentage: 33.33,
        color: CHART_COLORS.utilization.optimal,
        label: 'Optimal (80-100%)'
      });
    });

    it('should handle empty data', () => {
      const result = transformUtilizationDistributionData([]);
      
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getUtilizationColor', () => {
    it('should return correct colors for utilization ranges', () => {
      expect(getUtilizationColor(110)).toBe(CHART_COLORS.utilization.over);
      expect(getUtilizationColor(95)).toBe(CHART_COLORS.utilization.optimal);
      expect(getUtilizationColor(85)).toBe(CHART_COLORS.utilization.optimal);
      expect(getUtilizationColor(75)).toBe(CHART_COLORS.utilization.under);
    });
  });

  describe('formatChartTooltip', () => {
    it('should format values correctly for different types', () => {
      expect(formatChartTooltip(123, 'hours')).toBe('123h');
      expect(formatChartTooltip(87.5, 'percentage')).toBe('87.5%');
      expect(formatChartTooltip(5, 'count')).toBe('5');
    });

    it('should handle edge cases', () => {
      expect(formatChartTooltip(0, 'hours')).toBe('0h');
      expect(formatChartTooltip(100.123, 'percentage')).toBe('100.12%');
    });
  });

  describe('CHART_COLORS constants', () => {
    it('should have all required color definitions', () => {
      expect(CHART_COLORS.utilization.optimal).toBeDefined();
      expect(CHART_COLORS.utilization.under).toBeDefined();
      expect(CHART_COLORS.utilization.over).toBeDefined();
      expect(CHART_COLORS.teams).toHaveLength(8);
      expect(CHART_COLORS.gradients.primary).toHaveLength(2);
    });

    it('should have valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      
      expect(CHART_COLORS.utilization.optimal).toMatch(hexColorRegex);
      expect(CHART_COLORS.utilization.under).toMatch(hexColorRegex);
      expect(CHART_COLORS.utilization.over).toMatch(hexColorRegex);
      
      CHART_COLORS.teams.forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });
});