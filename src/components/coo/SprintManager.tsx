'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Sprint {
  id: number;
  sprint_number: number;
  sprint_name?: string;
  sprint_start_date: string;
  sprint_end_date: string;
  sprint_length_weeks: number;
  description?: string;
  status: 'upcoming' | 'active' | 'completed';
  progress_percentage: number;
  days_remaining: number;
  created_at: string;
  updated_at: string;
}

interface SprintFormData {
  sprint_name?: string;
  sprint_start_date: string;
  sprint_end_date: string;
  sprint_length_weeks: number;
  description?: string;
}

export default function SprintManager() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SprintFormData>({
    sprint_name: '',
    sprint_start_date: '',
    sprint_end_date: '',
    sprint_length_weeks: 2,
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSprints();
  }, []);

  const loadSprints = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('sprint_history')
        .select('*')
        .order('sprint_number', { ascending: false });

      if (fetchError) throw fetchError;
      setSprints(data || []);
    } catch (err) {
      console.error('Error loading sprints:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sprints');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data: SprintFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.sprint_start_date) {
      errors.sprint_start_date = 'Start date is required';
    }

    if (!data.sprint_end_date) {
      errors.sprint_end_date = 'End date is required';
    } else if (data.sprint_start_date && new Date(data.sprint_end_date) <= new Date(data.sprint_start_date)) {
      errors.sprint_end_date = 'End date must be after start date';
    }

    if (!data.sprint_length_weeks || data.sprint_length_weeks < 1 || data.sprint_length_weeks > 8) {
      errors.sprint_length_weeks = 'Sprint length must be between 1 and 8 weeks';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) return;

    try {
      if (editingId) {
        // Update existing sprint
        const { error: updateError } = await supabase
          .from('sprint_history')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        // Create new sprint
        const { error: insertError } = await supabase
          .from('sprint_history')
          .insert([{
            ...formData,
            created_by: 'Nir Shilo'
          }]);

        if (insertError) throw insertError;
      }

      // Reset form and reload
      setFormData({
        sprint_name: '',
        sprint_start_date: '',
        sprint_end_date: '',
        sprint_length_weeks: 2,
        description: ''
      });
      setShowAddForm(false);
      setEditingId(null);
      setFormErrors({});
      await loadSprints();

    } catch (err) {
      console.error('Error saving sprint:', err);
      setError(err instanceof Error ? err.message : 'Failed to save sprint');
    }
  };

  const handleEdit = (sprint: Sprint) => {
    setFormData({
      sprint_name: sprint.sprint_name || '',
      sprint_start_date: sprint.sprint_start_date,
      sprint_end_date: sprint.sprint_end_date,
      sprint_length_weeks: sprint.sprint_length_weeks,
      description: sprint.description || ''
    });
    setEditingId(sprint.id);
    setShowAddForm(true);
    setFormErrors({});
  };

  const handleDelete = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('sprint_history')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await loadSprints();
      setDeletingId(null);
    } catch (err) {
      console.error('Error deleting sprint:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete sprint');
    }
  };

  const toggleActiveStatus = async (sprint: Sprint) => {
    try {
      // First, if activating a sprint, deactivate all others
      if (sprint.status !== 'active') {
        await supabase
          .from('sprint_history')
          .update({ status: 'upcoming' })
          .neq('id', sprint.id)
          .eq('status', 'active');
      }

      // Then toggle this sprint's status
      const newStatus = sprint.status === 'active' ? 'upcoming' : 'active';
      const { error: updateError } = await supabase
        .from('sprint_history')
        .update({ status: newStatus })
        .eq('id', sprint.id);

      if (updateError) throw updateError;
      await loadSprints();
    } catch (err) {
      console.error('Error toggling sprint status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle sprint status');
    }
  };

  const cancelForm = () => {
    setFormData({
      sprint_name: '',
      sprint_start_date: '',
      sprint_end_date: '',
      sprint_length_weeks: 2,
      description: ''
    });
    setShowAddForm(false);
    setEditingId(null);
    setFormErrors({});
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sprint Management</h2>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Sprint
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Sprint' : 'Create New Sprint'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.sprint_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sprint_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Q3 Foundation Sprint"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint Length (Weeks) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.sprint_length_weeks}
                  onChange={(e) => setFormData(prev => ({ ...prev, sprint_length_weeks: parseInt(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.sprint_length_weeks ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.sprint_length_weeks && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.sprint_length_weeks}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.sprint_start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, sprint_start_date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.sprint_start_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.sprint_start_date && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.sprint_start_date}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.sprint_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, sprint_end_date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.sprint_end_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.sprint_end_date && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.sprint_end_date}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sprint goals and objectives"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingId ? 'Update Sprint' : 'Create Sprint'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sprints Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sprint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sprints.map((sprint) => {
              const statusColors = {
                upcoming: 'bg-blue-100 text-blue-800',
                active: 'bg-green-100 text-green-800',
                completed: 'bg-gray-100 text-gray-800'
              };

              return (
                <tr key={sprint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Sprint #{sprint.sprint_number}
                        {sprint.sprint_name && ` - ${sprint.sprint_name}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sprint.sprint_length_weeks} weeks
                      </div>
                      {sprint.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {sprint.description}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{new Date(sprint.sprint_start_date).toLocaleDateString()}</div>
                    <div className="text-gray-500">to {new Date(sprint.sprint_end_date).toLocaleDateString()}</div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActiveStatus(sprint)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${statusColors[sprint.status]}`}
                    >
                      {sprint.status}
                    </button>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${sprint.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{sprint.progress_percentage}%</span>
                    </div>
                    {sprint.days_remaining > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {sprint.days_remaining} days remaining
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(sprint)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit Sprint"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      {deletingId === sprint.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(sprint.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Confirm Delete"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Cancel Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(sprint.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Sprint"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {sprints.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No sprints created yet</p>
            <p className="text-sm">Click "New Sprint" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}