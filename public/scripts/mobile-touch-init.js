/**
 * Mobile Touch and Viewport Initialization Script
 * Applies iOS viewport fixes and touch optimizations
 */

(function() {
  'use strict';

  // Check if device is iOS
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  // Check if device is iOS Safari
  function isIOSSafari() {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  }

  // Check if device is in standalone PWA mode
  function isStandalonePWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Apply iOS viewport height fixes
  function applyIOSViewportFixes() {
    // Fix iOS viewport height issues
    function setVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', vh + 'px');
    }

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', function() {
      setTimeout(setVH, 100); // Small delay for orientation change
    });

    // Prevent iOS scroll bounce on body
    document.body.style.overscrollBehavior = 'none';
  }

  // Add device-specific CSS classes
  function addDeviceClasses() {
    const html = document.documentElement;
    
    if (isIOS()) {
      html.classList.add('ios');
      
      if (isIOSSafari()) {
        html.classList.add('ios-safari');
      }
      
      if (isStandalonePWA()) {
        html.classList.add('ios-standalone');
      }
    }

    // Add touch capability detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      html.classList.add('touch-device');
    } else {
      html.classList.add('no-touch');
    }

    // Add hover capability detection
    if (window.matchMedia('(hover: hover)').matches) {
      html.classList.add('hover-capable');
    } else {
      html.classList.add('hover-none');
    }
  }

  // Optimize touch targets
  function optimizeTouchTargets() {
    // Find potentially problematic touch targets
    const interactiveElements = document.querySelectorAll(
      'button, a[href], [role="button"], [onclick], input[type="button"], input[type="submit"], .clickable, .btn'
    );

    interactiveElements.forEach(function(element) {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // iOS minimum touch target size

      // Add minimum touch target size if needed
      if (rect.width < minSize || rect.height < minSize) {
        element.style.minWidth = minSize + 'px';
        element.style.minHeight = minSize + 'px';
        
        // Add flexbox centering for better visual appearance
        if (element.tagName === 'BUTTON') {
          element.style.display = 'flex';
          element.style.alignItems = 'center';
          element.style.justifyContent = 'center';
        }
      }

      // Add touch manipulation
      element.style.touchAction = 'manipulation';
      
      // Prevent iOS touch callouts and selection
      element.style.webkitTouchCallout = 'none';
      element.style.webkitUserSelect = 'none';
      element.style.userSelect = 'none';
    });
  }

  // Add touch feedback to interactive elements
  function addTouchFeedback() {
    function addTouchActiveStates(element) {
      element.addEventListener('touchstart', function() {
        element.classList.add('touch-active');
      }, { passive: true });

      element.addEventListener('touchend', function() {
        setTimeout(function() {
          element.classList.remove('touch-active');
        }, 150);
      }, { passive: true });

      element.addEventListener('touchcancel', function() {
        element.classList.remove('touch-active');
      }, { passive: true });
    }

    // Apply to interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, .btn, [role="button"], .clickable, .touch-feedback'
    );

    interactiveElements.forEach(addTouchActiveStates);
  }

  // Add haptic feedback helper
  function addHapticFeedback() {
    window.hapticFeedback = function(type) {
      type = type || 'light';
      
      // Use Web Vibration API as fallback
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[type] || patterns.light);
      }

      // Use iOS Haptic Feedback API if available
      if ('haptic' in navigator) {
        navigator.haptic.impact(type);
      }
    };
  }

  // Fix iOS input zoom
  function fixIOSInputZoom() {
    const inputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"], input[type="number"], textarea, select'
    );

    inputs.forEach(function(input) {
      // Set font size to 16px to prevent zoom on iOS
      if (window.innerWidth <= 768) {
        input.style.fontSize = '16px';
      }
    });
  }

  // Performance optimization for scrolling
  function optimizeScrolling() {
    const scrollableElements = document.querySelectorAll('[data-scroll], .overflow-auto, .overflow-y-auto');
    
    scrollableElements.forEach(function(element) {
      element.style.webkitOverflowScrolling = 'touch';
      element.style.overscrollBehavior = 'contain';
    });
  }

  // Initialize everything when DOM is ready
  function init() {
    try {
      addDeviceClasses();
      applyIOSViewportFixes();
      addHapticFeedback();
      
      // Add a small delay for DOM-dependent optimizations
      setTimeout(function() {
        optimizeTouchTargets();
        addTouchFeedback();
        fixIOSInputZoom();
        optimizeScrolling();
      }, 100);

      console.log('📱 Mobile touch optimizations initialized');
    } catch (error) {
      console.warn('⚠️ Error initializing mobile touch optimizations:', error);
    }
  }

  // Initialize on DOMContentLoaded or immediately if DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-optimize when new content is added
  const observer = new MutationObserver(function(mutations) {
    let shouldReOptimize = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any interactive elements were added
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const interactiveElements = node.querySelectorAll ? 
              node.querySelectorAll('button, a[href], [role="button"], [onclick]') : [];
            
            if (interactiveElements.length > 0 || 
                (node.tagName && ['BUTTON', 'A'].includes(node.tagName))) {
              shouldReOptimize = true;
              break;
            }
          }
        }
      }
    });

    if (shouldReOptimize) {
      setTimeout(function() {
        optimizeTouchTargets();
        addTouchFeedback();
      }, 50);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Clean up observer on page unload
  window.addEventListener('beforeunload', function() {
    observer.disconnect();
  });

})();