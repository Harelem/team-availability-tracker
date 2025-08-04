'use client';

import { useState } from 'react';
import { Save, Plus, Edit, Trash2, Search, Filter, Star, Users, Eye, EyeOff } from 'lucide-react';
import { 
  TemplateManagerProps, 
  AvailabilityTemplate, 
  CreateTemplateRequest, 
  WeeklyPattern,
  WORK_VALUES,
  HOURS_PER_DAY,
  DAY_LABELS,
  ISRAELI_WORK_WEEK
} from '@/types/templateTypes';
import { useAvailabilityTemplates, extractPatternFromSchedule } from '@/hooks/useAvailabilityTemplates';

export default function TemplateManager({
  onApplyTemplate,
  currentWeekPattern,
  teamId,
  currentUserId,
  className = ''
}: TemplateManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AvailabilityTemplate | null>(null);

  const { 
    templates, 
    isLoading, 
    error, 
    saveTemplate, 
    deleteTemplate, 
    useTemplate,
    clearError 
  } = useAvailabilityTemplates({
    teamId,
    createdBy: currentUserId,
    initialFilters: {
      searchQuery: searchQuery || undefined,
      isPublic: showPublicOnly ? true : undefined
    }
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPublic = !showPublicOnly || template.isPublic;
    
    return matchesSearch && matchesPublic;
  });

  const handleApplyTemplate = async (template: AvailabilityTemplate) => {
    try {
      // Use the already instantiated hook's useTemplate function
      // eslint-disable-next-line react-hooks/rules-of-hooks
      await useTemplate(template.id);
      onApplyTemplate(template.pattern);
    } catch (err) {
      console.error('Error applying template:', err);
    }
  };

  const handleSaveCurrentAsTemplate = () => {
    if (currentWeekPattern) {
      setSelectedTemplate(null);
      setShowCreateModal(true);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(templateId);
      } catch (err) {
        console.error('Error deleting template:', err);
      }
    }
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-red-700">Error loading templates: {error}</p>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            <Star className="w-5 h-5" />
            Availability Templates
            <span className="text-sm font-normal text-gray-500">
              ({filteredTemplates.length})
            </span>
          </button>
          
          <div className="flex items-center gap-2">
            {currentWeekPattern && (
              <button
                onClick={handleSaveCurrentAsTemplate}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Current · שמור נוכחי
              </button>
            )}
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              New · חדש
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPublicOnly(!showPublicOnly)}
                className={`flex items-center gap-1 px-3 py-2 text-sm rounded-md border ${
                  showPublicOnly
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {showPublicOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Public Only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-gray-500">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium mb-1">No templates found</p>
              <p className="text-sm">
                {searchQuery 
                  ? 'Try adjusting your search or filters · נסה לשנות את החיפוש או הסינון'
                  : 'Create your first template to get started · צור את התבנית הראשונה שלך'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={() => handleApplyTemplate(template)}
                  onEdit={() => {
                    setSelectedTemplate(template);
                    setShowCreateModal(true);
                  }}
                  onDelete={() => handleDeleteTemplate(template.id)}
                  isOwner={template.createdBy === currentUserId}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onSave={async (templateData) => {
            try {
              await saveTemplate(templateData);
              setShowCreateModal(false);
              setSelectedTemplate(null);
            } catch (err) {
              console.error('Error saving template:', err);
            }
          }}
          initialPattern={selectedTemplate?.pattern || currentWeekPattern}
          existingTemplate={selectedTemplate}
          teamId={teamId}
          isLoading={false}
        />
      )}
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: AvailabilityTemplate;
  onApply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
  showActions?: boolean;
}

function TemplateCard({ 
  template, 
  onApply, 
  onEdit, 
  onDelete, 
  isOwner = false,
  showActions = true 
}: TemplateCardProps) {
  const totalHours = Object.entries(template.pattern)
    .filter(([key]) => key !== 'reason')
    .reduce((sum, [, value]) => sum + (HOURS_PER_DAY[value as keyof typeof HOURS_PER_DAY] || 0), 0);

  const workingDays = Object.entries(template.pattern)
    .filter(([key, value]) => key !== 'reason' && value > 0).length;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
          {template.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {template.isPublic && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <Users className="w-3 h-3" />
              Public
            </div>
          )}
          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            {template.usageCount} uses
          </div>
        </div>
      </div>

      {/* Pattern Preview */}
      <div className="mb-3">
        <TemplatePatternPreview 
          pattern={template.pattern} 
          size="sm"
          showLabels={false}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>{workingDays} days</span>
        <span>{totalHours}h total</span>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply · החל
          </button>
          
          {isOwner && onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit template"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          
          {isOwner && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete template"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Template Pattern Preview Component
interface TemplatePatternPreviewProps {
  pattern: WeeklyPattern;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

function TemplatePatternPreview({ 
  pattern, 
  size = 'md', 
  showLabels = true,
  className = ''
}: TemplatePatternPreviewProps) {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-8 text-sm',
    lg: 'h-10 text-base'
  };

  const days = ISRAELI_WORK_WEEK.WORKING_DAYS; // Sunday-Thursday working days

  return (
    <div className={`${className}`}>
      {showLabels && (
        <div className="grid grid-cols-5 gap-1 mb-1">
          {days.map(day => (
            <div key={day} className="text-center text-xs text-gray-500" title={DAY_LABELS[day].hebrew}>
              {DAY_LABELS[day].abbr}
            </div>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-5 gap-1">
        {days.map(day => {
          const value = pattern[day];
          let bgColor = 'bg-gray-100';
          let textColor = 'text-gray-400';
          
          if (value === WORK_VALUES.FULL) {
            bgColor = 'bg-green-100';
            textColor = 'text-green-800';
          } else if (value === WORK_VALUES.HALF) {
            bgColor = 'bg-yellow-100';
            textColor = 'text-yellow-800';
          }
          
          return (
            <div
              key={day}
              className={`${sizeClasses[size]} ${bgColor} ${textColor} rounded flex items-center justify-center font-medium`}
            >
              {value === 0 ? '0' : value}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Create Template Modal Component
interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: CreateTemplateRequest) => Promise<void>;
  initialPattern?: WeeklyPattern;
  existingTemplate?: AvailabilityTemplate | null;
  teamId?: number;
  isLoading?: boolean;
}

function CreateTemplateModal({
  isOpen,
  onClose,
  onSave,
  initialPattern,
  existingTemplate,
  teamId,
  isLoading = false
}: CreateTemplateModalProps) {
  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [isPublic, setIsPublic] = useState(existingTemplate?.isPublic || false);
  const [pattern, setPattern] = useState<WeeklyPattern>(
    existingTemplate?.pattern || initialPattern || {
      sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0
    }
  );

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    const templateData: CreateTemplateRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      pattern,
      isPublic,
      teamId
    };

    await onSave(templateData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {existingTemplate ? 'Edit Template' : 'Create Template'}
          </h3>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter template name"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional description"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Pattern Preview */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pattern Preview
            </label>
            <TemplatePatternPreview 
              pattern={pattern} 
              size="lg"
              className="bg-gray-50 p-3 rounded-md"
            />
          </div>

          {/* Public Toggle */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Make this template public (visible to all team members)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}