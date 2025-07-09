'use client';

import { useState, useEffect } from 'react';
import { Calendar, User } from 'lucide-react';
import ScheduleTable from '@/components/ScheduleTable';
import { TeamMember } from '@/types';
import { DatabaseService } from '@/lib/database';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        // Initialize team members if needed
        await DatabaseService.initializeTeamMembers();
        // Load team members from database
        const members = await DatabaseService.getTeamMembers();
        setTeamMembers(members);
      } catch (error) {
        console.error('Error loading team members:', error);
        // Fallback to hardcoded data
        const fallbackMembers: TeamMember[] = [
          { id: 1, name: 'Natan Shemesh', hebrew: 'נתן שמש', isManager: false },
          { id: 2, name: 'Ido Keller', hebrew: 'עידו קלר', isManager: false },
          { id: 3, name: 'Amit Zriker', hebrew: 'עמית צריקר', isManager: true },
          { id: 4, name: 'Alon Mesika', hebrew: 'אלון מסיקה', isManager: false },
          { id: 5, name: 'Nadav Aharon', hebrew: 'נדב אהרון', isManager: false },
          { id: 6, name: 'Yarom Kloss', hebrew: 'ירום קלוס', isManager: false },
          { id: 7, name: 'Ziv Edelstein', hebrew: 'זיב אדלשטיין', isManager: false },
          { id: 8, name: 'Harel Mazan', hebrew: 'הראל מזן', isManager: true },
        ];
        setTeamMembers(fallbackMembers);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-6"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center gap-3">
            <Calendar className="text-blue-600" />
            Team Availability Tracker
          </h1>
          <p className="text-gray-600 mb-6 text-center">Select your name to continue:</p>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedUser(member)}
                className="w-full flex items-center gap-3 p-3 text-left bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <User className="text-gray-400" size={20} />
                <div>
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.hebrew}</div>
                  {member.isManager && (
                    <div className="text-xs text-blue-600">Manager</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Calendar className="text-blue-600" />
              <span className="hidden sm:inline">Team Availability Tracker</span>
              <span className="sm:hidden">Team Tracker</span>
            </h1>
            <p className="text-gray-600">Welcome, {selectedUser.name}!</p>
          </div>
          <button
            onClick={() => setSelectedUser(null)}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
          >
            Switch User
          </button>
        </div>
        
        <ScheduleTable 
          currentUser={selectedUser} 
          teamMembers={teamMembers}
        />
      </div>
    </div>
  );
}