'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Team, TeamContextType } from '@/types';

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams] = useState<Team[]>([]);

  // Load team selection from localStorage on mount
  useEffect(() => {
    const savedTeam = localStorage.getItem('selectedTeam');
    if (savedTeam) {
      try {
        const team = JSON.parse(savedTeam);
        setSelectedTeam(team);
      } catch (error) {
        console.error('Error parsing saved team:', error);
        localStorage.removeItem('selectedTeam');
      }
    }
  }, []);

  // Save team selection to localStorage when it changes
  useEffect(() => {
    if (selectedTeam) {
      localStorage.setItem('selectedTeam', JSON.stringify(selectedTeam));
    } else {
      localStorage.removeItem('selectedTeam');
    }
  }, [selectedTeam]);

  const switchTeam = () => {
    setSelectedTeam(null);
  };

  const value: TeamContextType = {
    selectedTeam,
    teams,
    setSelectedTeam,
    switchTeam
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}