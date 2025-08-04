'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import COOExecutiveDashboard from '@/components/COOExecutiveDashboard';
import ExecutiveLoginScreen from '@/components/ExecutiveLoginScreen';
import MobileCOODashboard from '@/components/mobile/MobileCOODashboard';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { COOUser, TeamDailyStatus } from '@/types';
import { DatabaseService } from '@/lib/database';
import { validateCOOPermissions } from '@/utils/permissions';
import { verifyEnvironmentConfiguration } from '@/utils/deploymentSafety';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function ExecutivePage() {
  const router = useRouter();
  const { isMobile, isLoading: mobileLoading } = useIsMobile();
  const [cooUser, setCooUser] = useState<COOUser | null>(null);
  const [cooUsers, setCooUsers] = useState<COOUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mobile-specific state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [teamsData, setTeamsData] = useState<TeamDailyStatus[]>([]);
  const [companyMetrics, setCompanyMetrics] = useState({
    totalCapacity: 0,
    availableCapacity: 0,
    utilization: 0,
    teamsCount: 0,
    membersCount: 0
  });

  // Load initial data for executive dashboard
  useEffect(() => {
    const loadExecutiveData = async () => {
      try {
        setLoading(true);
        
        console.log('🏢 Loading Executive Dashboard data...');
        
        // Environment verification for executive access
        const envVerification = verifyEnvironmentConfiguration();
        if (!envVerification.isConfigValid) {
          console.error('🚨 Environment configuration issues detected for executive access!');
          envVerification.warnings.forEach(warning => {
            console.warn(`⚠️ ${warning}`);
          });
        }
        
        // Load COO users for executive access
        const cooUsersData = await DatabaseService.getCOOUsers();
        setCooUsers(cooUsersData);
        
        // Load mobile-specific data if needed
        if (isMobile && !mobileLoading) {
          await loadMobileData();
        }
        
        console.log(`✅ Executive data loaded: ${cooUsersData.length} COO users`);
      } catch (error) {
        console.error('❌ Error loading executive data:', error);
        setCooUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadExecutiveData();
  }, [isMobile, mobileLoading]);

  // Load mobile-specific data
  const loadMobileData = async () => {
    try {
      const dailyStatus = await DatabaseService.getDailyCompanyStatus(selectedDate);
      setTeamsData(dailyStatus.teams || []);
      
      // Calculate company metrics
      const totalMembers = dailyStatus.teams.reduce((sum, team) => sum + team.total, 0);
      const totalAvailable = dailyStatus.teams.reduce((sum, team) => sum + team.available, 0);
      const totalCapacity = totalMembers * 9; // 9 hours per day
      const availableCapacity = totalAvailable * 9 + dailyStatus.teams.reduce((sum, team) => sum + team.halfDay, 0) * 4.5;
      const utilization = totalCapacity > 0 ? (availableCapacity / totalCapacity) * 100 : 0;
      
      setCompanyMetrics({
        totalCapacity,
        availableCapacity,
        utilization,
        teamsCount: dailyStatus.teams.length,
        membersCount: totalMembers
      });
      
      console.log(`📱 Mobile data loaded: ${dailyStatus.teams.length} teams, ${totalMembers} members`);
    } catch (error) {
      console.error('❌ Error loading mobile data:', error);
      setTeamsData([]);
    }
  };

  const handleCOOAccess = (user: COOUser) => {
    // Validate COO permissions before granting access
    if (!validateCOOPermissions(user, 'dashboard')) {
      console.error('🚫 Unauthorized COO dashboard access attempt:', user.name);
      return;
    }
    
    setCooUser(user);
    console.log('🏢 COO dashboard access granted:', user.name);
  };

  const handleBackToSelection = () => {
    setCooUser(null);
  };

  const handleTeamNavigateFromCOO = (team: { id: number; name: string }) => {
    // Navigate to team dashboard while maintaining executive context
    // This will redirect to the main app with team context
    router.push(`/?team=${team.id}&executive=true`);
  };

  // Show login screen if no COO user selected
  if (!cooUser) {
    return (
      <ExecutiveLoginScreen 
        cooUsers={cooUsers}
        loading={loading}
        onCOOAccess={handleCOOAccess}
      />
    );
  }

  // Show COO Executive Dashboard (Mobile or Desktop)
  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalSprintProvider>
        {!mobileLoading && isMobile ? (
          <MobileCOODashboard
            teams={teamsData}
            selectedDate={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date);
              loadMobileData();
            }}
            loading={loading}
            companyMetrics={companyMetrics}
          />
        ) : (
          <COOExecutiveDashboard 
            currentUser={cooUser}
            onBack={handleBackToSelection}
            onTeamNavigate={handleTeamNavigateFromCOO}
          />
        )}
      </GlobalSprintProvider>
    </div>
  );
}