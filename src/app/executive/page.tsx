'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import COOExecutiveDashboard from '@/components/COOExecutiveDashboard';
import ExecutiveLoginScreen from '@/components/ExecutiveLoginScreen';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { COOUser } from '@/types';
import { DatabaseService } from '@/lib/database';
import { validateCOOPermissions } from '@/utils/permissions';
import { verifyEnvironmentConfiguration } from '@/utils/deploymentSafety';

export default function ExecutivePage() {
  const router = useRouter();
  const [cooUser, setCooUser] = useState<COOUser | null>(null);
  const [cooUsers, setCooUsers] = useState<COOUser[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        console.log(`✅ Executive data loaded: ${cooUsersData.length} COO users`);
      } catch (error) {
        console.error('❌ Error loading executive data:', error);
        setCooUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadExecutiveData();
  }, []);

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

  // Show COO Executive Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalSprintProvider>
        <COOExecutiveDashboard 
          currentUser={cooUser}
          onBack={handleBackToSelection}
          onTeamNavigate={handleTeamNavigateFromCOO}
        />
      </GlobalSprintProvider>
    </div>
  );
}