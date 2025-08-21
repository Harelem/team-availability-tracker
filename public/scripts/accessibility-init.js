/**
 * Accessibility Preferences Initialization Script
 * Applies saved accessibility preferences immediately to prevent flash
 */

(function() {
  'use strict';
  
  try {
    // Apply saved accessibility preferences immediately to prevent flash
    var prefs = localStorage.getItem('accessibility-preferences');
    if (prefs) {
      var preferences = JSON.parse(prefs);
      var root = document.documentElement;
      
      if (preferences.highContrast) {
        root.classList.add('high-contrast');
      }
      
      if (preferences.reducedMotion) {
        root.classList.add('reduce-motion');
      }
      
      if (preferences.darkMode) {
        root.classList.add('dark');
      }
      
      if (preferences.fontSize) {
        root.setAttribute('data-font-size', preferences.fontSize);
      }
      
      if (preferences.colorBlindMode && preferences.colorBlindMode !== 'none') {
        root.setAttribute('data-colorblind-mode', preferences.colorBlindMode);
      }
      
      if (preferences.focusIndicators) {
        root.setAttribute('data-focus-mode', preferences.focusIndicators);
      }
    }
    
    // Respect system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduce-motion');
    }
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }

    // Set up preference change listener
    window.addEventListener('storage', function(e) {
      if (e.key === 'accessibility-preferences' && e.newValue) {
        try {
          var newPrefs = JSON.parse(e.newValue);
          // Reapply preferences when changed in another tab
          window.location.reload();
        } catch (error) {
          console.error('Error parsing accessibility preferences:', error);
        }
      }
    });

  } catch (e) {
    console.warn('Error applying accessibility preferences:', e);
  }
})();