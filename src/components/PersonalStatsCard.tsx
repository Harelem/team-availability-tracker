'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { DESIGN_SYSTEM, getCardStyling, combineClasses } from '@/utils/designSystem';

interface PersonalStatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray';
  description?: string;
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    title: 'text-blue-900',
    value: 'text-blue-800',
    description: 'text-blue-600'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    title: 'text-green-900',
    value: 'text-green-800',
    description: 'text-green-600'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    title: 'text-purple-900',
    value: 'text-purple-800',
    description: 'text-purple-600'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    iconBg: 'bg-yellow-100',
    iconText: 'text-yellow-600',
    title: 'text-yellow-900',
    value: 'text-yellow-800',
    description: 'text-yellow-600'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    title: 'text-red-900',
    value: 'text-red-800',
    description: 'text-red-600'
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    title: 'text-gray-900',
    value: 'text-gray-800',
    description: 'text-gray-600'
  }
};

export default function PersonalStatsCard({
  title,
  value,
  icon: Icon,
  color,
  description,
  onClick
}: PersonalStatsCardProps) {
  const colors = colorClasses[color];
  
  const cardClasses = combineClasses(
    colors.bg,
    colors.border,
    DESIGN_SYSTEM.radius.md,
    DESIGN_SYSTEM.spacing.md,
    'border',
    onClick && DESIGN_SYSTEM.cards.hover,
    DESIGN_SYSTEM.transitions.all
  );

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.iconText}`} />
        </div>
      </div>
      
      <div className="space-y-1">
        <p className={`text-sm font-medium ${colors.title}`}>
          {title}
        </p>
        <p className={`text-2xl font-bold ${colors.value}`}>
          {value}
        </p>
        {description && (
          <p className={`text-xs ${colors.description}`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}