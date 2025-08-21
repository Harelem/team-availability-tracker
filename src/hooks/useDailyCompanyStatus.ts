'use client';

import { useState, useEffect, useCallback } from 'react';
import { DailyCompanyStatusData } from '@/types';
import { DatabaseService } from '@/lib/database';

export const useDailyCompanyStatus = (selectedDate: Date) => {
  const [data, setData] = useState<DailyCompanyStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🏢 Fetching daily company status for:', selectedDate.toDateString());
      
      const statusData = await DatabaseService.getDailyCompanyStatus(selectedDate);
      
      if (statusData) {
        setData(statusData);
        console.log('✅ Daily status loaded:', {
          totalMembers: statusData.total,
          available: statusData.summary.available,
          teams: statusData.teams.length
        });
      } else {
        setError('Failed to load daily status data');
      }

    } catch (err) {
      console.error('❌ Error fetching daily status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDailyStatus();
  }, [selectedDate]); // Only re-run when selectedDate changes

  return { 
    data, 
    isLoading, 
    error, 
    refetch: fetchDailyStatus 
  };
};

export default useDailyCompanyStatus;