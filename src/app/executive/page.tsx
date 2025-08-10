'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import COOExecutiveDashboard from '@/components/COOExecutiveDashboard';
import ExecutiveLoginScreen from '@/components/ExecutiveLoginScreen';
import MobileCOODashboard from '@/components/mobile/MobileCOODashboard';
import MobileHeader from '@/components/navigation/MobileHeader';
import { COOUser, TeamDailyStatus } from '@/types';
import { DatabaseService } from '@/lib/database';
import { validateCOOPermissions } from '@/utils/permissions';
import { verifyEnvironmentConfiguration } from '@/utils/deploymentSafety';
import { useIsMobile } from '@/hooks/useIsMobile';
import { validateRedirectUrl, validateTeamId } from '@/utils/validation';
import { PageErrorBoundary } from '@/components/ErrorBoundary';

// Safe wrapper component for executive dashboard content
function ExecutiveDashboardContent() {
  const router = useRouter();
  const { isMobile, isLoading: mobileLoading } = useIsMobile();
  const [cooUser, setCooUser] = useState<COOUser | null>(null);
  const [cooUsers, setCooUsers] = useState<COOUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
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

  // Load mobile-specific data
  const loadMobileData = useCallback(async () => {
    try {
      const dailyStatus = await DatabaseService.getDailyCompanyStatus(selectedDate);
      if (!dailyStatus) {
        console.error('No daily status returned');
        setTeamsData([]);
        return;
      }
      
      setTeamsData(dailyStatus.teams || []);
      
      // Calculate company metrics using consistent formula with desktop
      const totalMembers = dailyStatus.total; // Use the total from summary
      const totalAvailable = dailyStatus.summary?.available || 0;
      const totalHalfDay = dailyStatus.summary?.halfDay || 0;
      
      // Calculate capacity in hours
      const maxDailyCapacity = totalMembers * 9; // 9 hours per person per day
      const availableDailyCapacity = (totalAvailable * 9) + (totalHalfDay * 4.5);
      const utilization = maxDailyCapacity > 0 ? (availableDailyCapacity / maxDailyCapacity) * 100 : 0;
      
      setCompanyMetrics({
        totalCapacity: maxDailyCapacity,
        availableCapacity: availableDailyCapacity,
        utilization,
        teamsCount: dailyStatus.teams.length,
        membersCount: totalMembers
      });
      
      console.log(`📱 Mobile data loaded: ${dailyStatus.teams.length} teams, ${totalMembers} members`);
      console.log(`📊 Company metrics: ${utilization.toFixed(1)}% utilization (${availableDailyCapacity}h/${maxDailyCapacity}h)`);
    } catch (error) {
      console.error('❌ Error loading mobile data:', error);
      setTeamsData([]);
    }
  }, [selectedDate]);

  // Load initial data for executive dashboard
  useEffect(() => {
    const loadExecutiveData = async () => {
      try {
        setLoading(true);
        setInitializationError(null);
        
        console.log('🏢 Loading Executive Dashboard data...');
        
        // Wait a brief moment to ensure provider is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        setInitializationError(error instanceof Error ? error.message : 'Failed to load executive data');
        setCooUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadExecutiveData();
  }, [isMobile, mobileLoading, loadMobileData]);


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
    // Validate team ID to prevent injection
    const teamIdResult = validateTeamId(team.id);
    if (!teamIdResult.isValid) {
      console.error('Invalid team ID provided:', team.id);
      return;
    }

    // Build URL with validated parameters
    const targetUrl = `/?team=${teamIdResult.sanitizedValue}&executive=true`;
    
    // Validate the constructed URL to prevent open redirects
    if (!validateRedirectUrl(targetUrl)) {
      console.error('Invalid redirect URL constructed:', targetUrl);
      return;
    }

    // Navigate to team dashboard while maintaining executive context
    router.push(targetUrl);
  };

  // Show initialization error if one occurred
  if (initializationError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Executive Dashboard Error</h2>
            <p className="text-gray-600 mb-4">
              Failed to initialize the executive dashboard.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {initializationError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      {!mobileLoading && isMobile ? (
        <div>
          {/* Enhanced Mobile Header for Executive Dashboard */}
          <MobileHeader
            title="COO Executive Dashboard"
            subtitle={`Welcome, ${cooUser.name}`}
            showBack={true}
            onBack={handleBackToSelection}
            currentUser={{
              id: cooUser.id || 0,
              name: cooUser.name,
              hebrew: cooUser.hebrew || '',
              isManager: true,
              team_id: 0
            }}
            showMenu={true}
            showSearch={false}
          />
          
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
        </div>
      ) : (
        <COOExecutiveDashboard 
          currentUser={cooUser}
          onBack={handleBackToSelection}
          onTeamNavigate={handleTeamNavigateFromCOO}
        />
      )}
    </div>
  );
}

// Main component with error boundary and context checking
export default function ExecutivePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <React.Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Executive Dashboard...</p>
          </div>
        </div>
      }>
        <PageErrorBoundary>
          <ExecutiveDashboardContent />
        </PageErrorBoundary>
      </React.Suspense>
    </div>
  );
}

