'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { TeamMember, Team, WeekData, EnhancedExportConfig } from '@/types';
import { generateEnhancedExcelWorkbook, downloadEnhancedExcelFile } from '@/utils/enhancedExcelGeneration';
import EnhancedExportModal from './EnhancedExportModal';

interface EnhancedManagerExportButtonProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
  scheduleData?: WeekData;
  currentWeekDays?: Date[];
}

export default function EnhancedManagerExportButton({
  currentUser,
  teamMembers,
  selectedTeam
}: EnhancedManagerExportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleEnhancedExport = async (config: EnhancedExportConfig) => {
    console.log('👤 Starting enhanced manager export...', { config, team: selectedTeam.name });
    
    setIsExporting(true);

    // Create timeout promise (30 seconds)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Export timeout - operation took too long')), 30000)
    );

    try {
      // Validate inputs
      if (!selectedTeam?.id || !selectedTeam?.name) {
        throw new Error('Invalid team selected');
      }
      
      if (!currentUser?.name) {
        throw new Error('Invalid user information');
      }
      
      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        throw new Error('No team members found');
      }
      
      // Create the main export promise
      const exportPromise = performEnhancedManagerExport(config);
      
      // Race between export and timeout
      await Promise.race([exportPromise, timeoutPromise]);
      
      console.log('✅ Enhanced manager export completed successfully');
      setShowModal(false);
      
    } catch (error) {
      console.error('❌ Enhanced manager export failed:', error);
      throw error; // Re-throw to be handled by the modal
    } finally {
      setIsExporting(false);
    }
  };

  const performEnhancedManagerExport = async (config: EnhancedExportConfig): Promise<void> => {
    try {
      console.log('📊 Performing enhanced manager export...');
      
      // Generate enhanced Excel workbook for manager
      const { workbook, filename } = await generateEnhancedExcelWorkbook(
        config,
        'manager',
        currentUser.name,
        selectedTeam.name,
        selectedTeam.id
      );

      console.log('✅ Enhanced manager Excel workbook generated successfully');

      // Download the file
      downloadEnhancedExcelFile(workbook, filename);

      console.log('✅ Enhanced manager export completed successfully');
      
    } catch (error) {
      console.error('❌ Error in performEnhancedManagerExport:', error);
      throw error;
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isExporting}
        className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm min-h-[44px] touch-manipulation disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-start"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
        <span className="sm:hidden text-xs">Enhanced</span>
      </button>

      <EnhancedExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExport={handleEnhancedExport}
        userRole="manager"
        teamName={selectedTeam.name}
      />
    </>
  );
}