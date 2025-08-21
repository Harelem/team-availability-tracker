'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { COOUser } from '@/types';
import COOExportModal from './COOExportModal';
import { validateCOOPermissions } from '@/utils/permissions';

interface COOExportButtonProps {
  currentUser?: COOUser;
  disabled?: boolean;
  className?: string;
}

export default function COOExportButton({ 
  currentUser, 
  disabled = false, 
  className = '' 
}: COOExportButtonProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = () => {
    console.log('🔍 COO Export Button: Clicked', { disabled, isExporting });
    
    if (disabled || isExporting) {
      console.log('🔍 COO Export Button: Disabled or exporting, returning');
      return;
    }
    
    // Check permissions before opening modal
    if (!validateCOOPermissions(currentUser || null, 'export')) {
      console.log('🔍 COO Export Button: Permission denied');
      alert('You do not have permission to export executive reports.');
      return;
    }
    
    console.log('🔍 COO Export Button: Opening modal...');
    setShowExportModal(true);
  };

  const handleExportStart = () => {
    setIsExporting(true);
  };

  const handleExportComplete = () => {
    setIsExporting(false);
    setShowExportModal(false);
  };

  const handleExportError = () => {
    setIsExporting(false);
  };

  return (
    <>
      <button
        onClick={handleExportClick}
        disabled={disabled || isExporting}
        className={`
          flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg 
          transition-colors min-h-[44px] min-w-[44px] p-2 disabled:opacity-50 disabled:cursor-not-allowed
          touch-manipulation
          ${className}
        `}
        aria-label={isExporting ? 'Exporting executive report...' : 'Export Executive Report'}
        title={isExporting ? 'Exporting executive report...' : 'Export Executive Report'}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>

      {/* Export Modal */}
      <COOExportModal
        isOpen={showExportModal}
        onClose={() => {
          console.log('🔍 COO Export Button: Closing modal...');
          setShowExportModal(false);
        }}
        currentUser={currentUser}
        onExportStart={handleExportStart}
        onExportComplete={handleExportComplete}
        onExportError={handleExportError}
      />
    </>
  );
}