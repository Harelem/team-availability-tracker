'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export default function BottomSheetModal({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '80vh'
}: BottomSheetModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 200); // Wait for animation to complete
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-200 ${
        isOpen && isAnimating
          ? 'bg-black/50 backdrop-blur-sm'
          : 'bg-transparent'
      }`}
      onClick={handleOverlayClick}
    >
      <div
        ref={sheetRef}
        className={`w-full max-w-lg bg-white rounded-t-3xl shadow-2xl transform transition-all duration-300 ease-out ${
          isOpen && isAnimating
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0'
        }`}
        style={{ maxHeight }}
      >
        {/* Handle bar for visual indication */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 active:text-gray-900 transition-colors rounded-full hover:bg-gray-100 active:bg-gray-200 min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}