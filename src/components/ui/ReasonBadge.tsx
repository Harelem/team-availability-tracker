'use client';

import React from 'react';
import { Badge } from './badge';

// Reason type detection based on common Hebrew and English patterns
const REASON_PATTERNS = {
  sick: {
    keywords: ['מחלה', 'מחליא', 'חולה', 'sick', 'ill', 'אי הרגשה', 'רופא', 'doctor', 'רפואי', 'medical'],
    emoji: '🤒',
    variant: 'destructive' as const,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  personal: {
    keywords: ['אישי', 'personal', 'עניין אישי', 'משפחתי', 'family'],
    emoji: '👤',
    variant: 'default' as const,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  vacation: {
    keywords: ['חופש', 'vacation', 'יום חופש', 'חופשה', 'holiday', 'off'],
    emoji: '🏖️',
    variant: 'secondary' as const,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  reserve: {
    keywords: ['שמירה', 'מילואים', 'reserve', 'guard', 'duty', 'military'],
    emoji: '🛡️',
    variant: 'outline' as const,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  appointment: {
    keywords: ['תור', 'appointment', 'פגישה', 'meeting'],
    emoji: '📅',
    variant: 'secondary' as const,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  }
};

interface ReasonBadgeProps {
  reason: string;
  type?: '0.5' | 'X';
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
  className?: string;
  onClick?: () => void;
}

// Determine reason category from text content
const categorizeReason = (reason: string): keyof typeof REASON_PATTERNS | 'other' => {
  const lowerReason = reason.toLowerCase();
  
  for (const [category, config] of Object.entries(REASON_PATTERNS)) {
    if (config.keywords.some(keyword => lowerReason.includes(keyword.toLowerCase()))) {
      return category as keyof typeof REASON_PATTERNS;
    }
  }
  
  return 'other';
};

// Truncate long reasons for display
const truncateReason = (reason: string, maxLength: number = 25): string => {
  if (reason.length <= maxLength) return reason;
  return reason.substring(0, maxLength - 3) + '...';
};

export const ReasonBadge: React.FC<ReasonBadgeProps> = ({
  reason,
  type,
  size = 'md',
  showEmoji = true,
  className = '',
  onClick
}) => {
  const category = categorizeReason(reason);
  const config = REASON_PATTERNS[category as keyof typeof REASON_PATTERNS];
  
  // Size variations
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  // Default colors for 'other' category
  const defaultColor = type === 'X' 
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-yellow-50 text-yellow-700 border-yellow-200';
  
  const badgeColor = config?.color || defaultColor;
  const emoji = config?.emoji || (type === 'X' ? '❌' : '⚠️');
  
  const displayText = truncateReason(reason);
  
  const badgeContent = showEmoji 
    ? `${emoji} ${displayText}`
    : displayText;

  // Map old badge variants to new ones
  const mapBadgeVariant = (variant: string) => {
    switch (variant) {
      case 'destructive': return 'error';
      case 'default': return 'primary';
      case 'secondary': return 'secondary';
      case 'outline': return 'outline';
      default: return 'secondary';
    }
  };

  const badgeElement = (
    <Badge
      variant={mapBadgeVariant(config?.variant || 'secondary')}
      className={`
        ${sizeClasses[size]}
        ${badgeColor}
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-sm hover:scale-105 active:scale-95' : ''}
        ${className}
      `}
    >
      <span className="truncate" title={reason}>
        {badgeContent}
      </span>
    </Badge>
  );

  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0}>
        {badgeElement}
      </div>
    );
  }

  return badgeElement;
};

// Specialized variants for common use cases

export const ReasonChip: React.FC<ReasonBadgeProps & { 
  compact?: boolean;
  interactive?: boolean;
}> = ({
  reason,
  type,
  compact = false,
  interactive = false,
  onClick,
  className = '',
  ...props
}) => {
  return (
    <ReasonBadge
      reason={reason}
      type={type}
      size={compact ? 'sm' : 'md'}
      showEmoji={!compact}
      onClick={interactive ? onClick : undefined}
      className={`
        ${compact ? 'min-w-0 max-w-24' : 'min-w-16 max-w-32'}
        ${interactive ? 'hover:bg-opacity-80' : ''}
        ${className}
      `}
      {...props}
    />
  );
};

// Collection component for multiple reasons
export const ReasonBadgeGroup: React.FC<{
  reasons: Array<{ reason: string; type?: '0.5' | 'X'; date?: string }>;
  compact?: boolean;
  maxDisplay?: number;
  onReasonClick?: (reason: string, index: number) => void;
  className?: string;
}> = ({
  reasons,
  compact = false,
  maxDisplay = 5,
  onReasonClick,
  className = ''
}) => {
  const displayReasons = reasons.slice(0, maxDisplay);
  const remainingCount = reasons.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {displayReasons.map((item, index) => (
        <ReasonChip
          key={index}
          reason={item.reason}
          type={item.type}
          compact={compact}
          interactive={!!onReasonClick}
          onClick={() => onReasonClick?.(item.reason, index)}
        />
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className={`
            ${compact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}
            bg-gray-50 text-gray-600 border-gray-300
          `}
        >
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

export default ReasonBadge;