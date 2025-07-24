'use client';

import { useState, useEffect } from 'react';
import { X, User, Users, Save, AlertCircle } from 'lucide-react';
import { TeamMember } from '@/types';

interface MemberFormModalProps {
  isOpen: boolean;
  member: TeamMember | null; // null for add, TeamMember for edit
  onClose: () => void;
  onSave: (memberData: { name: string; hebrew: string }) => void;
  isLoading: boolean;
}

export default function MemberFormModal({ 
  isOpen, 
  member, 
  onClose, 
  onSave, 
  isLoading 
}: MemberFormModalProps) {
  const [name, setName] = useState('');
  const [hebrew, setHebrew] = useState('');
  const [errors, setErrors] = useState<{ name?: string; hebrew?: string }>({});

  const isEditMode = member !== null;

  useEffect(() => {
    if (isOpen) {
      if (member) {
        // Edit mode - populate with existing data
        setName(member.name || '');
        setHebrew(member.hebrew || '');
      } else {
        // Add mode - clear form
        setName('');
        setHebrew('');
      }
      setErrors({});
    }
  }, [isOpen, member]);

  const validateForm = () => {
    const newErrors: { name?: string; hebrew?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!hebrew.trim()) {
      newErrors.hebrew = 'Hebrew name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    onSave({ 
      name: name.trim(), 
      hebrew: hebrew.trim() 
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {isEditMode ? (
              <User className="w-5 h-5 text-blue-600" />
            ) : (
              <Users className="w-5 h-5 text-green-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Edit Team Member' : 'Add Team Member'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-gray-700 mb-2">
              Name (English) *
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter member name"
              autoFocus
            />
            {errors.name && (
              <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </div>
            )}
          </div>

          {/* Hebrew Name Field */}
          <div>
            <label htmlFor="member-hebrew" className="block text-sm font-medium text-gray-700 mb-2">
              Name (Hebrew) *
            </label>
            <input
              id="member-hebrew"
              type="text"
              value={hebrew}
              onChange={(e) => setHebrew(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              dir="rtl"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 ${
                errors.hebrew ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="הכנס שם בעברית"
            />
            {errors.hebrew && (
              <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.hebrew}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Member Information</p>
                <p>New members will be added as regular team members (not managers) and can start filling their schedules immediately.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !hebrew.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isEditMode ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Update Member' : 'Add Member'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}