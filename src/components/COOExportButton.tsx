'use client';

import { useState } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
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
          flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg 
          hover:from-indigo-700 hover:to-purple-700 active:from-indigo-800 active:to-purple-800 
          transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Export Report</span>
            <ChevronDown className="w-3 h-3" />
          </>
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