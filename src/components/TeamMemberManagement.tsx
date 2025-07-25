'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<TeamMember | null>(null);
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized

  // Load team members
  useEffect(() => {
    if (currentUser.isManager) {
      loadTeamMembers();
    }
  }, [selectedTeam.id, currentUser.isManager]);

  // Only show for managers
  if (!currentUser.isManager) {
    return null;
  }

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
    <div className="team-member-management mb-6">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Collapsible Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-t-lg"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">👥 Manage Team Members</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Add, edit, or remove team members</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick Stats Preview When Minimized */}
            {isMinimized && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{teamMembers.length} members</span>
                <span>{teamMembers.filter(m => m.isManager).length} managers</span>
              </div>
            )}
            
            <button className="text-gray-400 hover:text-gray-600 p-1">
              {isMinimized ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* Expandable Content */}
        {!isMinimized && (
          <div className="px-4 pb-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Manage your team members: add new members, edit names, or remove members who are no longer part of the team.
              </p>
              <button 
                onClick={() => setShowAddMember(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            </div>

            <div className="space-y-2">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">
                        {member.hebrew} {member.isManager && '• Manager'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingMember(member)}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                      title="Edit member"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!member.isManager && ( // Can't delete managers
                      <button 
                        onClick={() => handleDeleteMember(member)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {teamMembers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No team members found</p>
                <p className="text-sm">Click &quot;Add Member&quot; to get started</p>
              </div>
            )}
          </div>
        )}
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