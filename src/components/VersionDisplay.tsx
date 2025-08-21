'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Smartphone, Zap, Shield, Users, BarChart3, Palette } from 'lucide-react';

/**
 * Mobile-Optimized Release Notes Component
 * Features Hebrew content with RTL support and touch-first mobile UX
 */
export default function VersionDisplay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasSeenVersion, setHasSeenVersion] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  
  // Safe environment variable access with fallbacks
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '2.2.0';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || Date.now();
  
  // Safe date formatting with error handling
  const buildDate = useMemo(() => {
    try {
      const timestamp = parseInt(buildTime.toString());
      if (isNaN(timestamp)) {
        return new Date().toLocaleString('he-IL');
      }
      return new Date(timestamp).toLocaleString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Error formatting build date:', error);
      return 'תאריך לא זמין';
    }
  }, [buildTime]);

  // Memoized localStorage access functions to prevent re-creation
  const getLastSeenVersion = useCallback((): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('lastSeenVersion');
    } catch (error) {
      console.warn('localStorage read error:', error);
      setStorageError(true);
      return null;
    }
  }, []);
  
  const setLastSeenVersion = useCallback((version: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem('lastSeenVersion', version);
      setStorageError(false);
    } catch (error) {
      console.warn('localStorage write error:', error);
      setStorageError(true);
    }
  }, []);

  // Memoized touch handlers to prevent re-creation and improve performance
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    try {
      if (e.touches && e.touches.length === 1) {
        touchStartY.current = e.touches[0].clientY;
        touchCurrentY.current = e.touches[0].clientY;
      }
    } catch (error) {
      console.warn('Touch start error:', error);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    try {
      if (e.touches && e.touches.length === 1 && modalRef.current) {
        touchCurrentY.current = e.touches[0].clientY;
        const deltaY = touchCurrentY.current - touchStartY.current;
        
        // Only allow downward swipes to close
        if (deltaY > 0) {
          // Prevent default scroll behavior during swipe
          e.preventDefault();
          
          // Visual feedback for swipe down gesture
          const maxDelta = 150;
          const clampedDelta = Math.min(deltaY, maxDelta);
          const opacity = Math.max(0.3, 1 - clampedDelta / 200);
          
          modalRef.current.style.transform = `translateY(${clampedDelta}px)`;
          modalRef.current.style.opacity = opacity.toString();
          modalRef.current.style.transition = 'none';
        }
      }
    } catch (error) {
      console.warn('Touch move error:', error);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsAnimating(false);
    
    // Restore focus to the element that opened the modal
    try {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    } catch (error) {
      console.warn('Error restoring focus:', error);
    }
    
    setTimeout(() => {
      setIsVisible(false);
      // Restore body scroll with error handling
      try {
        if (typeof document !== 'undefined') {
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.top = '';
        }
      } catch (error) {
        console.warn('Error restoring body overflow:', error);
      }
    }, 300);
  }, []);

  const handleTouchEnd = useCallback(() => {
    try {
      if (modalRef.current) {
        const deltaY = touchCurrentY.current - touchStartY.current;
        
        // Reset transition
        modalRef.current.style.transition = '';
        
        // Reset transform and opacity with animation
        modalRef.current.style.transform = '';
        modalRef.current.style.opacity = '';
        
        // Close if swiped down significantly (threshold: 80px)
        if (deltaY > 80) {
          closeModal();
        }
        
        // Reset touch positions
        touchStartY.current = 0;
        touchCurrentY.current = 0;
      }
    } catch (error) {
      console.warn('Touch end error:', error);
    }
  }, [closeModal]);

  const openModal = useCallback(() => {
    // Store current focus for restoration
    try {
      if (typeof document !== 'undefined') {
        previousActiveElement.current = document.activeElement as HTMLElement;
      }
    } catch (error) {
      console.warn('Error storing active element:', error);
    }
    
    setIsVisible(true);
    setIsAnimating(true);
    
    // Prevent body scroll on mobile with error handling
    try {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
        // Also prevent touch scroll on iOS Safari
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = '0';
      }
    } catch (error) {
      console.warn('Error setting body overflow:', error);
    }
    
    // Focus the close button after modal opens
    setTimeout(() => {
      try {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      } catch (error) {
        console.warn('Error focusing close button:', error);
      }
    }, 100);
    
    // Mark version as seen
    setLastSeenVersion(appVersion);
    setHasSeenVersion(true);
  }, [appVersion, setLastSeenVersion]);

  // Version detection on component mount
  useEffect(() => {
    const lastSeen = getLastSeenVersion();
    const isNewVersion = !lastSeen || lastSeen !== appVersion;
    setHasSeenVersion(!isNewVersion);
    
    // Auto-show for new versions (optional behavior)
    // if (isNewVersion) {
    //   setTimeout(() => openModal(), 1000);
    // }
  }, [appVersion, getLastSeenVersion]);
  
  // Memoized keyboard handler and cleanup
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) {
      closeModal();
    }
  }, [isVisible, closeModal]);
  
  useEffect(() => {
    if (isVisible) {
      try {
        if (typeof document !== 'undefined') {
          document.addEventListener('keydown', handleEscape);
        }
      } catch (error) {
        console.warn('Error adding escape listener:', error);
      }
      
      return () => {
        try {
          if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', handleEscape);
          }
        } catch (error) {
          console.warn('Error removing escape listener:', error);
        }
      };
    }
  }, [isVisible, handleEscape]);
  
  // Cleanup effect to ensure no memory leaks
  useEffect(() => {
    return () => {
      // Force cleanup on unmount
      try {
        if (typeof document !== 'undefined') {
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.top = '';
        }
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    };
  }, []);

  // Memoize release notes to prevent re-creation on every render
  // Use a static cache key since release notes don't change during a session
  const releaseNotes = useMemo(() => ({
    version: '2.2',
    hebrewTitle: 'עדכוני מערכת - גרסה 2.2',
    features: [
      {
        icon: BarChart3,
        title: 'דשבורד ניתוח ספרינטים מתקדם',
        description: 'כלי ניתוח מתקדם למעקב אחר ביצועי הצוות, ניתוח מגמות זמינות וחיזוי עומסי עבודה'
      },
      {
        icon: Users,
        title: 'מדדי פרודוקטיביות צוות',
        description: 'מדדים מתקדמים לניתוח פרודוקטיביות, יעילות צוות ומעקב אחר יעדי ביצועים'
      },
      {
        icon: Shield,
        title: 'התראות היעדרות אוטומטיות',
        description: 'מערכת התראות חכמה לניהול היעדרויות, חופשות ותאומי לוחות זמנים'
      },
      {
        icon: Smartphone,
        title: 'חוויית מובייל משופרת',
        description: 'ממשק מובייל מחודש עם תמיכה מלאה בעברית, ניווט מהיר ותמיכה במחוות מגע'
      },
      {
        icon: Zap,
        title: 'פעולות תזמון קבוצתיות',
        description: 'כלים לביצוע פעולות מרוכזות על מספר לוחות זמנים ועדכונים קבוצתיים'
      },
      {
        icon: Palette,
        title: 'ממשקי API לאינטגרציה',
        description: 'ממשקי תכנות מתקדמים לחיבור מערכות חיצוניות וסינכרון נתונים'
      }
    ],
    improvements: [
      'שיפור של 60% במהירות טעינת הדפים והתגובה',
      'אבטחה משופרת עם הצפנה מתקדמת והגנה על נתונים',
      'נגישות טובה יותר עם תמיכה בקוראי מסך ומקלדת',
      'ברירות מחדל חכמות לחסכון בזמן הגדרה',
      'סינון מתקדם עם אפשרויות חיפוש מרובות',
      'תמיכה מלאה ב-RTL לכל רכיבי הממשק',
      'אופטימיזציה למכשירים ניידים וחיסכון בסוללה'
    ]
  }), []);

  const handleRefresh = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.warn('Error reloading page:', error);
      // Fallback: try to navigate to current page
      try {
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = window.location.href;
        }
      } catch (fallbackError) {
        console.error('Failed to reload page:', fallbackError);
      }
    }
  }, []);

  return (
    <>
      {/* Mobile-optimized version button */}
      <button
        onClick={openModal}
        className="
          fixed bottom-4 right-4 z-50
          min-h-[48px] min-w-[48px]
          bg-gradient-to-r from-blue-500 to-indigo-600 
          text-white text-sm px-3 py-2 rounded-lg 
          shadow-lg hover:shadow-xl 
          active:scale-95 transition-all duration-200
          touch-manipulation select-none cursor-pointer
          opacity-80 hover:opacity-100 focus:opacity-100
          flex items-center justify-center gap-2
          focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2
        "
        style={{
          WebkitTapHighlightColor: 'transparent',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden'
        }}
        title="הצג הערות שחרור גרסה 2.2"
        aria-label={`הצג הערות שחרור גרסה ${appVersion}. ${hasSeenVersion ? 'גרסה נצפתה' : 'גרסה חדשה זמינה'}`}
        aria-describedby="version-display-description"
      >
        <Smartphone className="w-4 h-4" aria-hidden="true" />
        <span>v{appVersion}</span>
        {!hasSeenVersion && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
        )}
      </button>
      
      {/* Hidden description for screen readers */}
      <div id="version-display-description" className="sr-only">
        כפתור להצגת הערות שחרור של גרסה {appVersion}. כולל תכונות חדשות, שיפורים ומידע טכני.
      </div>

      {/* Mobile-responsive modal */}
      {isVisible && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          style={{
            height: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
          aria-hidden="true"
        >
          <div 
            ref={modalRef}
            dir="rtl"
            lang="he"
            className={`
              bg-white rounded-xl shadow-2xl
              w-full max-w-lg mx-4
              sm:max-w-xl md:max-w-2xl
              max-h-[90vh] overflow-y-auto
              scrollbar-hide
              transition-all duration-300 ease-out
              ${isAnimating 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-95 translate-y-4'
              }
            `}
            style={{
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              WebkitPerspective: 1000,
              fontFamily: 'Hebrew-System, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              lineHeight: '1.6',
              willChange: isAnimating ? 'transform, opacity' : 'auto'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby="release-notes-title"
            aria-describedby="release-notes-content"
          >
            {/* Header */}
            <div className="p-4 sm:p-6">
              <header className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <h2 id="release-notes-title" className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                      גרסה {releaseNotes.version}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 mt-1 leading-relaxed">{releaseNotes.hebrewTitle}</p>
                  </div>
                </div>
                
                <button 
                  ref={closeButtonRef}
                  onClick={closeModal}
                  className="
                    p-2 text-gray-400 hover:text-gray-600 
                    min-h-[44px] min-w-[44px]
                    flex items-center justify-center
                    touch-manipulation rounded-lg
                    hover:bg-gray-100 active:bg-gray-200 focus:bg-gray-100
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-300
                  "
                  aria-label="סגור חלון הערות שחרור"
                  title="סגור (Escape)"
                >
                  <X className="w-6 h-6" aria-hidden="true" />
                </button>
              </header>

              {/* Content */}
              <div id="release-notes-content" className="space-y-4 sm:space-y-6">
                {/* New Features */}
                <section className="text-right">
                  <h3 
                    className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4"
                    id="new-features-heading"
                  >
                    תכונות חדשות
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {releaseNotes.features.map((feature, index) => {
                      const IconComponent = feature.icon;
                      return (
                        <div 
                          key={`feature-${index}`}
                          className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                          role="listitem"
                        >
                          <div className="flex-1 text-right ml-3">
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 leading-tight">
                              {feature.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <IconComponent className="w-4 h-4 text-white" aria-hidden="true" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Improvements */}
                <section className="text-right">
                  <h3 
                    className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4"
                    id="improvements-heading"
                  >
                    שיפורים ותיקונים
                  </h3>
                  <ul className="space-y-2 text-gray-700" role="list">
                    {releaseNotes.improvements.map((improvement, index) => (
                      <li key={`improvement-${index}`} className="flex items-start gap-2">
                        <span className="text-sm sm:text-base leading-relaxed flex-1">{improvement}</span>
                        <span className="text-green-500 mt-1 text-sm flex-shrink-0 mr-1" aria-hidden="true">●</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Technical Info */}
                <section className="pt-4 border-t border-gray-200">
                  <details className="text-right">
                    <summary 
                      className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                      aria-expanded="false"
                      aria-controls="technical-info"
                    >
                      מידע טכני
                    </summary>
                    <div id="technical-info" role="region" aria-labelledby="technical-info-heading">
                      <div className="mt-3 space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between items-center">
                          <span className="font-mono">v{appVersion}</span>
                          <span>גרסה:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-left">{buildDate}</span>
                          <span>תאריך בנייה:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-left">build-{buildTime}</span>
                          <span>מזהה בנייה:</span>
                        </div>
                        {(() => {
                          try {
                            if (typeof window !== 'undefined') {
                              return (
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-left">{window.innerWidth}×{window.innerHeight}</span>
                                  <span>רזולוציה:</span>
                                </div>
                              );
                            }
                          } catch (error) {
                            console.warn('Error getting window dimensions:', error);
                          }
                          return null;
                        })()}
                        {storageError && (
                          <div className="flex justify-between items-center text-orange-500">
                            <span>מוגבל</span>
                            <span>אחסון מקומי:</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </section>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                <button
                  onClick={handleRefresh}
                  className="
                    w-full bg-gradient-to-r from-blue-500 to-indigo-600 
                    text-white text-sm sm:text-base py-3 px-4 rounded-lg 
                    hover:from-blue-600 hover:to-indigo-700 focus:from-blue-600 focus:to-indigo-700
                    active:scale-95 transition-all duration-200
                    touch-manipulation font-medium
                    focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2
                  "
                  aria-describedby="refresh-description"
                >
                  רענן את האפליקציה
                </button>
                <div id="refresh-description" className="sr-only">
                  כפתור לרענון האפליקציה ויישום השינויים החדשים
                </div>
                
                <button
                  onClick={closeModal}
                  className="
                    w-full bg-gray-100 text-gray-700 text-sm sm:text-base py-3 px-4 rounded-lg 
                    hover:bg-gray-200 focus:bg-gray-200 active:bg-gray-300
                    active:scale-95 transition-all duration-200
                    touch-manipulation font-medium
                    focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                  "
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}