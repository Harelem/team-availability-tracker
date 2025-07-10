'use client';

import { useState, useEffect } from 'react';
import { Bug, Database, User, Settings } from 'lucide-react';
import { Team, TeamMember, TeamSprint } from '@/types';
import { DatabaseService } from '@/lib/database';

interface SprintDebugPanelProps {
  selectedTeam: Team;
  selectedUser: TeamMember;
  teamMembers: TeamMember[];
}

export default function SprintDebugPanel({ selectedTeam, selectedUser, teamMembers }: SprintDebugPanelProps) {
  const [currentSprint, setCurrentSprint] = useState<TeamSprint | null>(null);
  const [sprintError, setSprintError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    testSprintData();
    checkSupabaseConfig();
  }, [selectedTeam.id]);

  const checkSupabaseConfig = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const configured = url && key && url !== 'your_supabase_url_here' && key !== 'your_supabase_anon_key_here';
    setSupabaseConfigured(!!configured);
    console.log('🔧 Supabase Config Check:', { url: url?.substring(0, 20) + '...', key: key?.substring(0, 20) + '...', configured });
  };

  const testSprintData = async () => {
    setLoading(true);
    setSprintError(null);
    
    try {
      console.log('🧪 Testing sprint data for team:', selectedTeam.id);
      const sprint = await DatabaseService.getCurrentSprint(selectedTeam.id);
      setCurrentSprint(sprint);
      
      if (!sprint) {
        setSprintError('No current sprint found for this team');
      }
    } catch (error) {
      console.error('🧪 Sprint test error:', error);
      setSprintError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getManagerCount = () => {
    return teamMembers.filter(member => member.isManager).length;
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Bug className="w-5 h-5 text-red-600" />
        <h3 className="font-bold text-red-800">🔍 Sprint Features Debug Panel</h3>
        <button
          onClick={testSprintData}
          className="ml-auto bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
        >
          Refresh Test
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* User & Permissions */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 font-semibold text-red-700">
            <User className="w-4 h-4" />
            User & Permissions
          </div>
          <div className="bg-white p-2 rounded border text-gray-700 space-y-1">
            <div>User: <span className="font-mono">{selectedUser?.name}</span></div>
            <div>User ID: <span className="font-mono">{selectedUser?.id}</span></div>
            <div>Is Manager: <span className={`font-mono ${selectedUser?.isManager ? 'text-green-600' : 'text-red-600'}`}>
              {selectedUser?.isManager ? '✅ TRUE' : '❌ FALSE'}
            </span></div>
            <div>Team: <span className="font-mono">{selectedTeam?.name}</span></div>
            <div>Team ID: <span className="font-mono">{selectedTeam?.id}</span></div>
            <div>Total Members: <span className="font-mono">{teamMembers.length}</span></div>
            <div>Manager Count: <span className="font-mono">{getManagerCount()}</span></div>
          </div>
        </div>

        {/* Database & Sprint Data */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 font-semibold text-red-700">
            <Database className="w-4 h-4" />
            Database & Sprint Data
          </div>
          <div className="bg-white p-2 rounded border text-gray-700 space-y-1">
            <div>Supabase Configured: <span className={`font-mono ${supabaseConfigured ? 'text-green-600' : 'text-red-600'}`}>
              {supabaseConfigured ? '✅ YES' : '❌ NO'}
            </span></div>
            <div>Sprint Length: <span className="font-mono">{selectedTeam?.sprint_length_weeks || 'undefined'}</span></div>
            <div>Loading: <span className={`font-mono ${loading ? 'text-yellow-600' : 'text-gray-600'}`}>
              {loading ? '⏳ YES' : '✅ NO'}
            </span></div>
            {sprintError && (
              <div className="text-red-600 text-xs bg-red-100 p-1 rounded">
                Error: {sprintError}
              </div>
            )}
            {currentSprint ? (
              <div className="text-green-600 text-xs bg-green-100 p-1 rounded">
                ✅ Sprint #{currentSprint.sprint_number} found
              </div>
            ) : !loading && (
              <div className="text-yellow-600 text-xs bg-yellow-100 p-1 rounded">
                ⚠️ No current sprint data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Visibility Tests */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-1 font-semibold text-red-700">
          <Settings className="w-4 h-4" />
          Feature Visibility Tests
        </div>
        <div className="bg-white p-2 rounded border text-xs text-gray-700 space-y-1">
          <div>Sprint Button Should Show: <span className={`font-mono ${selectedUser?.isManager ? 'text-green-600' : 'text-red-600'}`}>
            {selectedUser?.isManager ? '✅ YES (User is manager)' : '❌ NO (User not manager)'}
          </span></div>
          <div>Sprint Analytics Should Show: <span className={`font-mono ${selectedUser?.isManager ? 'text-green-600' : 'text-red-600'}`}>
            {selectedUser?.isManager ? '✅ YES (User is manager)' : '❌ NO (User not manager)'}
          </span></div>
          <div>Sprint Progress Should Show: <span className="font-mono text-green-600">
            ✅ YES (All users)
          </span></div>
        </div>
      </div>

      {/* Current Sprint Data */}
      {currentSprint && (
        <div className="mt-4 space-y-2">
          <div className="font-semibold text-red-700">📊 Current Sprint Details</div>
          <div className="bg-white p-2 rounded border text-xs text-gray-700 font-mono">
            <pre>{JSON.stringify(currentSprint, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}