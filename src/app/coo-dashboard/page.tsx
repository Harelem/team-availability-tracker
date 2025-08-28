'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, RotateCcw } from 'lucide-react';
import { withCOOAuth } from '@/hooks/useCOOAuth';
import SprintManager from '@/components/coo/SprintManager';
import DailyStatus from '@/components/coo/DailyStatus';
import CompanyMetrics from '@/components/coo/CompanyMetrics';

type TabType = 'metrics' | 'sprints' | 'daily' | 'teams';

function COODashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: 'metrics' as TabType, label: 'Company Metrics', description: 'Overall performance overview' },
    { id: 'sprints' as TabType, label: 'Sprint Management', description: 'Create and manage sprints' },
    { id: 'daily' as TabType, label: 'Daily Status', description: 'Today\'s attendance overview' },
    { id: 'teams' as TabType, label: 'Team Overview', description: 'Team performance breakdown' }
  ];

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Home</span>
                </button>
                
                <div className="h-8 w-px bg-gray-300" />
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">COO Dashboard</h1>
                    <p className="text-sm text-gray-600">Company-wide management and analytics</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshAll}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh All Data"
                >
                  <RotateCcw className="w-4 h-4" />
                  Refresh
                </button>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">Nir Shilo</div>
                  <div className="text-xs text-gray-500">Chief Operating Officer</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div>{tab.label}</div>
                    <div className="text-xs mt-1 opacity-75">{tab.description}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Content Area */}
          <div key={refreshKey}>
            {activeTab === 'metrics' && <CompanyMetrics />}
            {activeTab === 'sprints' && <SprintManager />}
            {activeTab === 'daily' && <DailyStatus />}
            {activeTab === 'teams' && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">🚧</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Team Overview</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Team breakdown view coming soon. For now, use the Daily Status tab to see team-by-team attendance.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 py-4 px-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>🔒 COO Access Only</span>
              <span>•</span>
              <span>Secure Dashboard</span>
              <span>•</span>
              <span>Real-time Data</span>
            </div>
            <div>
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the protected component
export default withCOOAuth(COODashboard);