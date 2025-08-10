'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Users, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { ReasonBadge } from './ui/ReasonBadge';
import { TeamMember } from '@/types';

interface ReasonEntry {
  member: TeamMember;
  date: Date;
  value: '0.5' | 'X';
  reason: string;
}

interface CompactReasonsDisplayProps {
  reasons: ReasonEntry[];
  groupBy?: 'date' | 'member' | 'type' | 'none';
  showSearch?: boolean;
  showFilters?: boolean;
  maxInitialDisplay?: number;
  onReasonClick?: (reason: ReasonEntry) => void;
  className?: string;
}

const CompactReasonsDisplay: React.FC<CompactReasonsDisplayProps> = ({
  reasons,
  groupBy = 'date',
  showSearch = true,
  showFilters = true,
  maxInitialDisplay = 20,
  onReasonClick,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | '0.5' | 'X'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Filter and search logic
  const filteredReasons = useMemo(() => {
    return reasons.filter(entry => {
      const matchesSearch = !searchTerm || 
        entry.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.member.hebrew && entry.member.hebrew.includes(searchTerm));
      
      const matchesFilter = filterType === 'all' || entry.value === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [reasons, searchTerm, filterType]);

  // Grouping logic
  const groupedReasons = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Reasons': filteredReasons };
    }

    return filteredReasons.reduce((groups, entry) => {
      let groupKey: string;
      
      switch (groupBy) {
        case 'date':
          groupKey = entry.date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          });
          break;
        case 'member':
          groupKey = entry.member.name;
          break;
        case 'type':
          groupKey = entry.value === '0.5' ? 'Half Day' : 'Absence';
          break;
        default:
          groupKey = 'All Reasons';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
      return groups;
    }, {} as Record<string, ReasonEntry[]>);
  }, [filteredReasons, groupBy]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getValueLabel = (value: '0.5' | 'X') => {
    return value === '0.5' ? 'Half Day' : 'Absence';
  };

  const getGroupIcon = (groupKey: string) => {
    if (groupBy === 'date') return <Calendar className="w-4 h-4" />;
    if (groupBy === 'member') return <Users className="w-4 h-4" />;
    return <Filter className="w-4 h-4" />;
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const totalCount = filteredReasons.length;
  const displayCount = showAll ? totalCount : Math.min(totalCount, maxInitialDisplay);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter Controls */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reasons or members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          )}
          
          {showFilters && (
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="0.5">Half Day</option>
                <option value="X">Absence</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>
          {totalCount} reason{totalCount !== 1 ? 's' : ''} found
          {searchTerm && ` for "${searchTerm}"`}
        </span>
        {totalCount > maxInitialDisplay && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? 'Show Less' : `Show All (${totalCount})`}
          </button>
        )}
      </div>

      {/* Grouped Reasons Display */}
      {Object.keys(groupedReasons).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No reasons found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedReasons)
            .slice(0, showAll ? undefined : Math.ceil(maxInitialDisplay / 5))
            .map(([groupKey, groupReasons]) => {
              const isExpanded = expandedGroups.has(groupKey) || groupBy === 'none';
              const displayReasons = isExpanded ? groupReasons : groupReasons.slice(0, 3);
              
              return (
                <div key={groupKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Group Header */}
                  {groupBy !== 'none' && (
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        {getGroupIcon(groupKey)}
                        <span className="font-medium text-gray-900">{groupKey}</span>
                        <span className="text-sm text-gray-500">
                          ({groupReasons.length} reason{groupReasons.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                  
                  {/* Group Content */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {displayReasons.map((entry, index) => (
                        <div
                          key={`${entry.member.id}-${entry.date.toISOString()}-${index}`}
                          className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => onReasonClick?.(entry)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-gray-900 truncate">
                                {entry.member.name}
                              </span>
                              {entry.member.hebrew && (
                                <span className="text-xs text-gray-500 truncate" dir="rtl">
                                  {entry.member.hebrew}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatDate(entry.date)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <ReasonBadge
                              reason={entry.reason}
                              type={entry.value}
                              size="sm"
                              className="flex-1 min-w-0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Show More in Group */}
                    {!isExpanded && groupReasons.length > 3 && (
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Show {groupReasons.length - 3} more...
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default CompactReasonsDisplay;