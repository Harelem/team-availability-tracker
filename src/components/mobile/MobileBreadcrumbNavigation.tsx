/**
 * Touch-Friendly Mobile Breadcrumb Navigation
 * 
 * Provides hierarchical navigation with touch-optimized interactions
 * and accessibility support for mobile devices.
 */

'use client';

import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { useTouchFriendly } from '@/hooks/useTouchGestures';

interface BreadcrumbItem {
  id: string;
  label: string;
  path?: string;
  isActive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MobileBreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

const MobileBreadcrumbNavigation: React.FC<MobileBreadcrumbNavigationProps> = ({
  items,
  onNavigate,
  onBack,
  showBackButton = true,
  className = ''
}) => {
  const { getInteractionProps } = useTouchFriendly();

  // Don't render if no items
  if (!items.length) return null;

  const currentItem = items[items.length - 1];
  const parentItems = items.slice(0, -1);

  return (
    <nav 
      className={`bg-white border-b border-gray-200 ${className}`}
      role="navigation"
      aria-label="Breadcrumb navigation"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Back Button */}
          {showBackButton && onBack && parentItems.length > 0 && (
            <button
              {...getInteractionProps(onBack, { hapticFeedback: true })}
              className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Breadcrumb Items */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Desktop-style breadcrumb on larger mobile screens */}
            <div className="hidden sm:flex items-center gap-1 flex-1 min-w-0">
              {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const IconComponent = item.icon;

                return (
                  <React.Fragment key={item.id}>
                    {/* Breadcrumb Item */}
                    <div className="flex items-center gap-2 min-w-0">
                      {IconComponent && index === 0 && (
                        <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      
                      {item.path && !isLast ? (
                        <button
                          {...getInteractionProps(() => onNavigate(item.path!), { hapticFeedback: true })}
                          className="text-sm text-blue-600 hover:text-blue-800 truncate max-w-[120px] transition-colors py-1 px-2 rounded hover:bg-blue-50 active:bg-blue-100"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <span 
                          className={`text-sm truncate max-w-[120px] py-1 px-2 rounded ${
                            isLast 
                              ? 'text-gray-900 font-medium bg-gray-100' 
                              : 'text-gray-600'
                          }`}
                          aria-current={isLast ? 'page' : undefined}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>

                    {/* Separator */}
                    {!isLast && (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Mobile-compact breadcrumb on small screens */}
            <div className="flex sm:hidden items-center justify-between flex-1 min-w-0">
              {/* Parent context (if exists) */}
              {parentItems.length > 0 && (
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    {...getInteractionProps(() => {
                      const parent = parentItems[parentItems.length - 1];
                      if (parent.path) onNavigate(parent.path);
                    }, { hapticFeedback: true })}
                    className="text-xs text-gray-500 hover:text-gray-700 truncate max-w-[100px] py-1 px-2 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    {parentItems[parentItems.length - 1].label}
                  </button>
                  <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </div>
              )}

              {/* Current page */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {currentItem.icon && (
                  <currentItem.icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <span 
                  className="text-sm font-medium text-gray-900 truncate"
                  aria-current="page"
                >
                  {currentItem.label}
                </span>
              </div>
            </div>
          </div>

          {/* Home Button (always accessible) */}
          <button
            {...getInteractionProps(() => onNavigate('/'), { hapticFeedback: true })}
            className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            aria-label="Go to home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator (when deep in navigation) */}
        {items.length > 2 && (
          <div className="mt-2 flex items-center gap-1">
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (items.length - 1) * 25)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 ml-2">
              {items.length - 1} levels deep
            </span>
          </div>
        )}
      </div>
    </nav>
  );
};

export default MobileBreadcrumbNavigation;