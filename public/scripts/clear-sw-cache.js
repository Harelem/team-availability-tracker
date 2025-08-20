/**
 * Clear Service Worker Cache Script
 * Run this in browser console to clear service worker and cache issues
 */

(function() {
  'use strict';
  
  console.log('🧹 Clearing service worker and cache...');
  
  async function clearServiceWorkers() {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`Found ${registrations.length} service worker registrations`);
        
        for (const registration of registrations) {
          await registration.unregister();
          console.log('✅ Service worker unregistered:', registration);
        }
        
        console.log('✅ All service workers cleared');
      } catch (error) {
        console.error('❌ Error clearing service workers:', error);
      }
    }
  }
  
  async function clearCaches() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        console.log(`Found ${cacheNames.length} caches`);
        
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('✅ Cache cleared:', cacheName);
        }
        
        console.log('✅ All caches cleared');
      } catch (error) {
        console.error('❌ Error clearing caches:', error);
      }
    }
  }
  
  async function clearAll() {
    await clearServiceWorkers();
    await clearCaches();
    
    // Clear localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Storage cleared');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
    
    console.log('🎉 Cleanup complete! Refresh the page to start fresh.');
  }
  
  // Make function available globally for console use
  window.clearSwCache = clearAll;
  
  console.log('💡 Run clearSwCache() in console to clear everything');
})();