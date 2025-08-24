'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  ChevronRight, 
  Loader2
} from 'lucide-react';
import { Team, TeamSelectionScreenProps } from '@/types';

export default React.memo(function TeamSelectionScreen({ 
  teams, 
  onTeamSelect 
}: TeamSelectionScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);


  const handleTeamSelect = (team: Team) => {
    setSelectedId(`team-${team.id}`);
    setTimeout(() => {
      onTeamSelect(team);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 sm:p-8 shadow-md max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <Calendar className="text-blue-600 w-16 h-16 mx-auto mb-6" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Team Availability Tracker
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Select your team to continue
          </p>
          
        </div>


        {/* Teams Section */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-8">
            <Users className="w-6 h-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-900">Team Dashboards</h2>
          </div>
          
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Available</h3>
              <p className="text-gray-600 mb-4">
                It looks like teams haven&apos;t been set up yet. Please contact your administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => {
                const isSelected = selectedId === `team-${team.id}`;
                
                return (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSelect(team)}
                    disabled={isSelected}
                    className={`
                      group relative bg-white border-2 rounded-xl p-5 text-left transition-all duration-200 w-full hover:shadow-lg hover:-translate-y-1
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300 active:scale-[0.98]'
                      }
                    `}
                    style={{
                      borderColor: isSelected ? team.color : undefined
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                          {team.name}
                        </h3>
                        {team.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {team.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        )}
                      </div>
                    </div>
                    
                    {/* Team color indicator */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
                      style={{ backgroundColor: team.color }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
});