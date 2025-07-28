'use client';

import React from 'react';
import { ChartGridLayoutProps } from '@/types/charts';

/**
 * Chart Grid Layout Component
 * 
 * Provides a responsive grid layout for displaying multiple charts.
 * Supports different column configurations and gap spacing.
 */
export function ChartGridLayout({
  children,
  columns = 2,
  gap = 6,
  className = ''
}: ChartGridLayoutProps) {
  // Generate grid classes based on column count
  const getGridClasses = () => {
    const baseClasses = 'grid w-full';
    
    const columnClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 lg:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
    };

    const gapClasses = {
      2: 'gap-2',
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8'
    };

    return `${baseClasses} ${columnClasses[columns]} ${gapClasses[gap as keyof typeof gapClasses] || 'gap-6'}`;
  };

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {children}
    </div>
  );
}