'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { DatabaseService, SprintHistoryEntry, CreateSprintRequest } from '@/lib/database';

// Component imports
import SprintCalendarGrid from './SprintCalendarGrid';
import SprintFormModal from './SprintFormModal';
// import SprintCalendarHeader from './SprintCalendarHeader';
// import SprintCalendarSidebar from './SprintCalendarSidebar';

interface SprintPlanningCalendarProps {
  onSprintSelect?: (sprint: SprintHistoryEntry) => void;
}

export default function SprintPlanningCalendar({ onSprintSelect }: SprintPlanningCalendarProps) {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [sprints, setSprints] = useState<SprintHistoryEntry[]>([]);
  const [filteredSprints, setFilteredSprints] = useState<SprintHistoryEntry[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<SprintHistoryEntry | null>(null);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintHistoryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [requiresManualSetup, setRequiresManualSetup] = useState(false);
  const [initMessage, setInitMessage] = useState<string>('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Form state
  const [prefilledDates, setPrefilledDates] = useState<{startDate: string; endDate: string; lengthWeeks: number} | undefined>(undefined);

  // Load sprint data
  useEffect(() => {
    loadSprintData();
  }, []);

  // Apply filters when sprints or filters change
  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprints, statusFilter, searchQuery]);

  const loadSprintData = async () => {
    setIsLoading(true);
    setIsInitializing(true);
    setError(null);
    setRequiresManualSetup(false);
    
    try {
      console.log('🚀 Sprint Calendar: Initializing...');
      
      // First, ensure sprint database is initialized
      const initResult = await DatabaseService.initializeSprintDatabase();
      setInitMessage(initResult.message);
      
      if (!initResult.success) {
        console.warn('❌ Sprint database initialization failed:', initResult.message);
        
        if ('requiresManualSetup' in initResult && initResult.requiresManualSetup) {
          setRequiresManualSetup(true);
          setError(`Database setup required: ${initResult.message}`);
        } else {
          setError(`Initialization failed: ${initResult.message}`);
        }
        return;
      }
      
      console.log('✅ Sprint Calendar: Database initialized successfully');
      setIsInitializing(false);
      
      // Load sprint data
      console.log('📅 Sprint Calendar: Loading sprint history...');
      const sprintData = await DatabaseService.getSprintHistory();
      setSprints(sprintData);
      console.log(`✅ Sprint Calendar: Loaded ${sprintData.length} sprints`);
      
    } catch (err) {
      console.error('❌ Error loading sprint data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Check if error indicates missing table
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        setRequiresManualSetup(true);
        setError('Sprint history table missing - manual setup required');
      } else {
        setError(`Failed to load sprint data: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sprints];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sprint => sprint.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(sprint => 
        sprint.sprint_name?.toLowerCase().includes(query) ||
        sprint.description?.toLowerCase().includes(query) ||
        sprint.sprint_number.toString().includes(query)
      );
    }
    
    setFilteredSprints(filtered);
  };

  const handleSaveSprint = async (sprintData: CreateSprintRequest) => {
    try {
      if (editingSprint) {
        // Update existing sprint
        const updatedSprint = await DatabaseService.updateSprint(editingSprint.id, sprintData);
        if (!updatedSprint) {
          throw new Error('Failed to update sprint');
        }
      } else {
        // Create new sprint
        const newSprint = await DatabaseService.createSprint(sprintData);
        if (!newSprint) {
          throw new Error('Failed to create sprint');
        }
      }
      
      await loadSprintData(); // Reload to get updated data
      setShowSprintForm(false);
      setEditingSprint(null);
      setPrefilledDates(undefined);
    } catch (err) {
      console.error('Error saving sprint:', err);
      throw err; // Re-throw to be handled by form
    }
  };

  const handleDeleteSprint = async (sprintId: number) => {
    if (!confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      return;
    }
    
    try {
      const success = await DatabaseService.deleteSprint(sprintId);
      if (success) {
        await loadSprintData(); // Reload to get updated data
        if (selectedSprint?.id === sprintId) {
          setSelectedSprint(null);
        }
      } else {
        throw new Error('Failed to delete sprint');
      }
    } catch (err) {
      console.error('Error deleting sprint:', err);
      alert('Failed to delete sprint. Please try again.');
    }
  };

  const handleSprintSelect = (sprint: SprintHistoryEntry) => {
    setSelectedSprint(sprint);
    onSprintSelect?.(sprint);
  };

  const handleEditSprint = (sprint: SprintHistoryEntry) => {
    setEditingSprint(sprint);
    setShowSprintForm(true);
  };

  // Date navigation helpers
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle date range selection from calendar grid
  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    // Calculate sprint length in weeks
    const lengthDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const lengthWeeks = Math.ceil(lengthDays / 7);
    
    // Set prefilled dates and show the form
    setPrefilledDates({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      lengthWeeks
    });
    setShowSprintForm(true);
  };

  // Get sprints for current view
  const getSprintsForCurrentView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let startDate: Date, endDate: Date;
    
    if (viewMode === 'month') {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
    } else {
      // Quarter view
      const quarter = Math.floor(month / 3);
      startDate = new Date(year, quarter * 3, 1);
      endDate = new Date(year, (quarter + 1) * 3, 0);
    }
    
    return filteredSprints.filter(sprint => {
      const sprintStart = new Date(sprint.sprint_start_date);
      const sprintEnd = new Date(sprint.sprint_end_date);
      
      // Sprint overlaps with view period
      return sprintStart <= endDate && sprintEnd >= startDate;
    });
  };

  const currentViewSprints = getSprintsForCurrentView();

  if (error) {
    return (
      <div className="sprint-planning-calendar p-6">
        <div className="text-center py-12 max-w-4xl mx-auto">
          {requiresManualSetup ? (
            // Manual setup required
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-yellow-600 mb-4">
                <Calendar className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-yellow-800">Sprint Calendar Setup Required</h3>
                <p className="text-sm mt-2 text-yellow-700">{error}</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 mb-6 text-left">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2">SETUP</span>
                  Manual Database Setup Instructions
                </h4>
                
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    <div>
                      <strong>Go to Supabase Dashboard</strong>
                      <p className="text-gray-600">Navigate to your Supabase project dashboard</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    <div>
                      <strong>Open SQL Editor</strong>
                      <p className="text-gray-600">Click on &ldquo;SQL Editor&rdquo; in the left sidebar</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    <div>
                      <strong>Run Sprint Table Creation Script</strong>
                      <p className="text-gray-600">Copy and execute the SQL script from:</p>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        sql/create-sprint-history-complete.sql
                      </code>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                    <div>
                      <strong>Verify and Refresh</strong>
                      <p className="text-gray-600">Confirm table creation, then refresh this page</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-blue-800 text-xs">
                    <strong>What the script creates:</strong> Complete sprint_history table with indexes, 
                    triggers, sample data, and proper permissions for the sprint calendar functionality.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={loadSprintData}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Check Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          ) : (
            // Regular error
            <div className="text-red-600 mb-4">
              <Calendar className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Failed to Load Sprint Calendar</h3>
              <p className="text-sm mt-2">{error}</p>
              <button 
                onClick={loadSprintData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sprint-planning-calendar h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Sprint Planning Calendar
          </h1>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('quarter')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'quarter' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quarter
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mr-4">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              Active: {sprints.filter(s => s.status === 'active').length}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              Upcoming: {sprints.filter(s => s.status === 'upcoming').length}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              Completed: {sprints.filter(s => s.status === 'completed').length}
            </span>
          </div>

          {/* Create Sprint Button */}
          <button
            onClick={() => setShowSprintForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sprint
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <button
                onClick={navigateToToday}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 transition-colors"
              >
                Today
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sprints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'upcoming' | 'active' | 'completed')}
                className="px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>

              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 border rounded-md hover:bg-gray-100 transition-colors"
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                {isInitializing ? (
                  <div>
                    <p className="text-gray-600 font-medium">Initializing Sprint Calendar...</p>
                    <p className="text-gray-500 text-sm mt-2">Setting up database and checking table structure</p>
                    {initMessage && (
                      <p className="text-blue-600 text-xs mt-1 bg-blue-50 px-3 py-1 rounded-full inline-block">
                        {initMessage}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600">Loading sprint calendar...</p>
                    <p className="text-gray-500 text-sm mt-1">Fetching sprint history and data</p>
                  </div>
                )}
              </div>
            ) : (
              <SprintCalendarGrid
                currentDate={currentDate}
                viewMode={viewMode}
                sprints={currentViewSprints}
                onDateRangeSelect={handleDateRangeSelect}
                onSprintClick={handleSprintSelect}
                selectedSprint={selectedSprint}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div className="w-80 border-l bg-white flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Sprint History</h3>
              <p className="text-sm text-gray-600 mt-1">
                {filteredSprints.length} of {sprints.length} sprints
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredSprints.map(sprint => (
                <div 
                  key={sprint.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSprint?.id === sprint.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSprintSelect(sprint)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">Sprint #{sprint.sprint_number}</div>
                      {sprint.sprint_name && (
                        <div className="text-xs text-gray-600 mt-1">{sprint.sprint_name}</div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sprint.status === 'active' ? 'bg-green-100 text-green-800' :
                      sprint.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sprint.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>{new Date(sprint.sprint_start_date).toLocaleDateString()} - {new Date(sprint.sprint_end_date).toLocaleDateString()}</div>
                    <div>{sprint.sprint_length_weeks} week{sprint.sprint_length_weeks !== 1 ? 's' : ''}</div>
                    {sprint.status === 'active' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${sprint.progress_percentage}%` }}
                          ></div>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {sprint.progress_percentage}% • {sprint.days_remaining} days left
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedSprint?.id === sprint.id && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSprint(sprint);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSprint(sprint.id);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredSprints.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No sprints found</p>
                  {searchQuery && <p className="text-xs mt-1">Try adjusting your search</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sprint Form Modal */}
      <SprintFormModal
        isOpen={showSprintForm}
        onClose={() => {
          setShowSprintForm(false);
          setEditingSprint(null);
          setPrefilledDates(undefined);
        }}
        onSave={handleSaveSprint}
        editingSprint={editingSprint}
        prefilledDates={prefilledDates}
      />
    </div>
  );
}