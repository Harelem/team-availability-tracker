/**
 * Service Worker Initialization Script
 * Securely initializes service worker with aggressive cache invalidation for mobile
 */

(function() {
  'use strict';
  
  // Only enable service worker in production to avoid development conflicts
  var isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' && 
                     !window.location.hostname.includes('.local');
  
  if ('serviceWorker' in navigator && isProduction) {
    window.addEventListener('load', function() {
      try {
        // Force unregister existing service workers first
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          registrations.forEach(function(registration) {
            registration.unregister();
          });
        }).then(function() {
          // Register new service worker with cache-busting parameter
          var swUrl = '/sw.js?v=' + Date.now();
          navigator.serviceWorker.register(swUrl)
            .then(function(registration) {
              console.log('SW registered with cache-bust: ', registration);
              
              // Listen for service worker updates
              registration.addEventListener('updatefound', function() {
                var newWorker = registration.installing;
                newWorker.addEventListener('statechange', function() {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New SW version available, updating...');
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                });
              });
              
              // Listen for messages from service worker
              navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'CACHE_UPDATED') {
                  console.log('Cache updated, forcing page refresh...');
                  window.location.reload(true);
                }
              });
              
              // Force refresh on mobile devices
              var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
              if (isMobile && registration.active) {
                registration.active.postMessage({ 
                  type: 'CACHE_CLEAR',
                  payload: { forceMobileRefresh: true }
                });
              }
            })
            .catch(function(registrationError) {
              console.log('SW registration failed: ', registrationError);
            });
        });
      } catch (error) {
        console.error('ServiceWorker initialization error:', error);
      }
    });
    
    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      console.log('Service worker controller changed');
      if (navigator.serviceWorker.controller) {
        window.location.reload();
      }
    });
  } else if ('serviceWorker' in navigator) {
    console.log('Service worker disabled in development mode');
  } else {
    console.log('Service workers are not supported');
  }
  
  // Force page refresh on browser back/forward for mobile cache issues
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      console.log('Page loaded from cache, forcing refresh on mobile...');
      var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.reload(true);
      }
    }
  });
})();