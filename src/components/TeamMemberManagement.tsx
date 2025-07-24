'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { DatabaseService } from '@/lib/database';
import MemberFormModal from './MemberFormModal';

interface TeamMemberManagementProps {
  currentUser: TeamMember;
  selectedTeam: Team;
  onMembersUpdated: () => void;
}

export default function TeamMemberManagement({ 
  currentUser, 
  selectedTeam, 
  onMembersUpdated 
}: TeamMemberManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<TeamMember | null>(null);

  // Only show for managers
  if (!currentUser.isManager) {
    return null;
  }

  useEffect(() => {
    loadTeamMembers();
  }, [selectedTeam.id]);

  const loadTeamMembers = async () => {
    try {
      const members = await DatabaseService.getTeamMembers(selectedTeam.id);
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleAddMember = async (memberData: { name: string; hebrew: string }) => {
    setIsLoading(true);
    try {
      const newMember = await DatabaseService.addTeamMember({
        name: memberData.name,
        hebrew: memberData.hebrew,
        teamId: selectedTeam.id,
        isManager: false
      });

      if (newMember) {
        await loadTeamMembers();
        onMembersUpdated();
        setShowAddMember(false);
        console.log('✅ Team member added successfully');
      } else {
        alert('Failed to add team member. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error adding team member:', error);
      alert('Failed to add team member: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMember = async (memberData: { name: string; hebrew: string }) => {
    if (!editingMember) return;
    
    setIsLoading(true);
    try {
      const success = await DatabaseService.updateTeamMember(
        editingMember.id, 
        memberData, 
        currentUser.id
      );

      if (success) {
        await loadTeamMembers();
        onMembersUpdated();
        setEditingMember(null);
        console.log('✅ Team member updated successfully');
      } else {
        alert('Failed to update team member. Please check your permissions.');
      }
    } catch (error) {
      console.error('❌ Error updating team member:', error);
      alert('Failed to update team member: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (member.isManager) {
      alert('Cannot delete team managers. Please contact system administrator.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to remove ${member.name} from the team? This will also delete all their schedule data and cannot be undone.`
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const success = await DatabaseService.deleteTeamMember(member.id, currentUser.id);

      if (success) {
        await loadTeamMembers();
        onMembersUpdated();
        setDeleteConfirmMember(null);
        console.log('✅ Team member removed successfully');
      } else {
        alert('Failed to remove team member. Please check your permissions.');
      }
    } catch (error) {
      console.error('❌ Error removing team member:', error);
      alert('Failed to remove team member: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="team-member-management bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Manage Team Members
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Add, edit, or remove members from {selectedTeam.name}
          </p>
        </div>
        <button 
          onClick={() => setShowAddMember(true)}
          disabled={isLoading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No team members found</p>
          <p className="text-sm">Add team members to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teamMembers.map(member => (
            <div 
              key={member.id} 
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{member.name}</span>
                  <span className="text-gray-600">({member.hebrew})</span>
                  {member.isManager && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Manager
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Team Member ID: {member.id}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setEditingMember(member)}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                
                {!member.isManager && (
                  <button 
                    onClick={() => handleDeleteMember(member)}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 px-3 py-1 rounded-md hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manager Protection Notice */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">Security Notice</p>
          <p>You can only manage members from your own team. Team managers cannot be deleted through this interface.</p>
        </div>
      </div>

      {/* Add/Edit Member Modal */}
      <MemberFormModal 
        isOpen={showAddMember || editingMember !== null}
        member={editingMember}
        onClose={() => {
          setShowAddMember(false);
          setEditingMember(null);
        }}
        onSave={editingMember ? handleUpdateMember : handleAddMember}
        isLoading={isLoading}
      />
    </div>
  );
}