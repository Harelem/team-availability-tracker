'use client';

// import { useState } from 'react';
import { COOUser, EnhancedExportConfig } from '@/types';
import { validateCOOPermissions } from '@/utils/permissions';
import { generateEnhancedExcelWorkbook, downloadEnhancedExcelFile } from '@/utils/enhancedExcelGeneration';
import { generateEmergencyExport, downloadSafeExcelFile } from '@/utils/safeCOOExportUtils';
import EnhancedExportModal from './EnhancedExportModal';

interface COOExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: COOUser;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: () => void;
}

export default function COOExportModal({
  isOpen,
  onClose,
  currentUser,
  onExportStart,
  onExportComplete,
  onExportError
}: COOExportModalProps) {
  // const [exportError, setExportError] = useState<string | null>(null);

  const handleEnhancedExport = async (config: EnhancedExportConfig) => {
    if (!currentUser) {
      throw new Error('User information not available');
    }

    // Validate permissions
    if (!validateCOOPermissions(currentUser, 'export')) {
      throw new Error('You do not have permission to export executive reports');
    }

    console.log('🔍 Starting enhanced COO export...', config);
    
    onExportStart?.();

    // Create timeout promise (30 seconds)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Export timeout - operation took too long')), 30000)
    );

    try {
      // Create the main export promise
      const exportPromise = performEnhancedExport(config);
      
      // Race between export and timeout
      await Promise.race([exportPromise, timeoutPromise]);
      
      console.log('✅ Enhanced COO export completed successfully');
      onExportComplete?.();
      
    } catch (error) {
      console.error('❌ Enhanced COO export failed:', error);
      
      // Determine error type and provide appropriate feedback
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      
      if (errorMessage.includes('timeout')) {
        // setExportError('Export timed out. Please try a simpler export or contact support.');
        // Attempt emergency export
        await attemptEmergencyExport();
      } else if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
        // setExportError('Export data too large. Trying emergency export...');
        await attemptEmergencyExport();
      } else {
        throw error; // Re-throw to be handled by the modal
      }
      
      onExportError?.();
    }
  };

  const performEnhancedExport = async (config: EnhancedExportConfig): Promise<void> => {
    try {
      console.log('📊 Performing enhanced COO export...');
      
      // Generate enhanced Excel workbook
      const { workbook, filename } = await generateEnhancedExcelWorkbook(
        config,
        'coo',
        currentUser!.name
      );

      console.log('✅ Enhanced Excel workbook generated successfully');

      // Download the file
      downloadEnhancedExcelFile(workbook, filename);

      console.log('✅ Enhanced export completed successfully');
      
    } catch (error) {
      console.error('❌ Error in performEnhancedExport:', error);
      throw error;
    }
  };

  const attemptEmergencyExport = async (): Promise<void> => {
    try {
      console.log('🚨 Attempting emergency export...');
      
      const emergencyWorkbook = generateEmergencyExport(currentUser!);
      const emergencyFilename = `Emergency-COO-Report-${Date.now()}.xlsx`;
      
      downloadSafeExcelFile(emergencyWorkbook, emergencyFilename);
      
      // setExportError('Generated emergency report. For detailed data, please try again later.');
      console.log('✅ Emergency export completed');
      
    } catch (emergencyError) {
      console.error('❌ Emergency export also failed:', emergencyError);
      // setExportError('Export system temporarily unavailable. Please try again later.');
    }
  };

  // Show enhanced export modal
  return (
    <EnhancedExportModal
      isOpen={isOpen}
      onClose={onClose}
      onExport={handleEnhancedExport}
      userRole="coo"
    />
  );
}