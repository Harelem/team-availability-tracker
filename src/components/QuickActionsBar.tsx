'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Star, Plus, Save, Users, Zap } from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { AvailabilityTemplate, WeeklyPattern } from '@/types/templateTypes';
import { useAvailabilityTemplates } from '@/hooks/useAvailabilityTemplates';

interface QuickActionsBarProps {
  currentUser: TeamMember;
  selectedTeam: Team;
  currentWeekPattern?: WeeklyPattern;
  onApplyTemplate: (pattern: WeeklyPattern) => void;
  onFullWeekSet: (memberId: number) => void;
  onSaveCurrentAsTemplate: () => void;
}

export default function QuickActionsBar({
  currentUser,
  selectedTeam,
  currentWeekPattern,
  onApplyTemplate,
  onFullWeekSet,
  onSaveCurrentAsTemplate
}: QuickActionsBarProps) {
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { templates, isLoading } = useAvailabilityTemplates({
    teamId: selectedTeam.id,
    createdBy: currentUser.id,
    initialFilters: {
      searchQuery: searchQuery || undefined
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyTemplate = async (template: AvailabilityTemplate) => {
    try {
      // Note: useTemplate hook should be called at component level, not in handler
      // For now, we'll just apply the pattern directly
      onApplyTemplate(template.pattern);
      setIsTemplateDropdownOpen(false);
    } catch (err) {
      console.error('Error applying template:', err);
    }
  };

  const filteredTemplates = templates.filter(template => 
    !searchQuery || 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularTemplates = filteredTemplates
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 5);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Template Actions */}
        <div className="flex items-center gap-3">
          {/* Template Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm min-h-[40px] border border-blue-200"
            >
              <Star className="w-4 h-4" />
              <span>Templates • תבניות</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isTemplateDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* Search Header */}
                <div className="p-3 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search templates... חפש תבניות"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Templates List */}
                <div className="max-h-64 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-pulse">Loading templates...</div>
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">
                        {searchQuery ? 'No templates found • לא נמצאו תבניות' : 'No templates yet • אין תבניות עדיין'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {/* Popular Templates Section */}
                      {!searchQuery && popularTemplates.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Popular • פופולרי
                          </div>
                          {popularTemplates.map((template) => (
                            <TemplateDropdownItem
                              key={template.id}
                              template={template}
                              onApply={() => handleApplyTemplate(template)}
                            />
                          ))}
                          {filteredTemplates.length > popularTemplates.length && (
                            <div className="border-t border-gray-200 my-2" />
                          )}
                        </>
                      )}

                      {/* All Templates */}
                      {(searchQuery || popularTemplates.length === 0) && filteredTemplates.map((template) => (
                        <TemplateDropdownItem
                          key={template.id}
                          template={template}
                          onApply={() => handleApplyTemplate(template)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="border-t border-gray-200 p-3">
                  <div className="flex gap-2">
                    {currentWeekPattern && (
                      <button
                        onClick={() => {
                          onSaveCurrentAsTemplate();
                          setIsTemplateDropdownOpen(false);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        Save Current • שמור נוכחי
                      </button>
                    )}
                    <button
                      onClick={() => setIsTemplateDropdownOpen(false)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      New Template • תבנית חדשה
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <button
            onClick={() => onFullWeekSet(currentUser.id)}
            className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm min-h-[40px] border border-green-200"
          >
            <Zap className="w-4 h-4" />
            <span>Full Week • שבוע מלא</span>
          </button>
        </div>

        {/* Right: Info */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{templates.length} templates available</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Dropdown Item Component
interface TemplateDropdownItemProps {
  template: AvailabilityTemplate;
  onApply: () => void;
}

function TemplateDropdownItem({ template, onApply }: TemplateDropdownItemProps) {
  const totalHours = Object.entries(template.pattern)
    .filter(([key]) => key !== 'reason')
    .reduce((sum, [, value]) => {
      const hours = { '1': 7, '0.5': 3.5, '0': 0 }[value as string] || 0;
      return sum + hours;
    }, 0);

  const workingDays = Object.entries(template.pattern)
    .filter(([key, value]) => key !== 'reason' && value > 0).length;

  return (
    <button
      onClick={onApply}
      className="w-full text-left p-2 hover:bg-gray-50 rounded-md transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate text-sm group-hover:text-blue-600">
              {template.name}
            </h4>
            {template.isPublic && (
              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                <Users className="w-3 h-3" />
                Public
              </div>
            )}
          </div>
          
          {template.description && (
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
              {template.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{workingDays} days</span>
            <span>{totalHours}h total</span>
            <span>{template.usageCount || 0} uses</span>
          </div>
        </div>
        
        {/* Mini Pattern Preview */}
        <div className="flex gap-0.5 ml-2 flex-shrink-0">
          {['sun', 'mon', 'tue', 'wed', 'thu'].map(day => {
            const value = template.pattern[day as keyof typeof template.pattern];
            let bgColor = 'bg-gray-200';
            
            if (value === 1) bgColor = 'bg-green-400';
            else if (value === 0.5) bgColor = 'bg-yellow-400';
            
            return (
              <div
                key={day}
                className={`w-2 h-2 rounded-sm ${bgColor}`}
                title={`${day}: ${value}`}
              />
            );
          })}
        </div>
      </div>
    </button>
  );
}