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
  currentSprintDays?: Date[];
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
        className="flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] p-2 disabled:opacity-50 touch-manipulation"
        aria-label={isExporting ? 'Exporting...' : 'Export Enhanced Report'}
        title={isExporting ? 'Exporting...' : 'Export Enhanced Report'}
      >
        <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
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